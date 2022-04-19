const { screen, BrowserWindow, ipcMain, desktopCapturer} = require('electron')
const path = require('path')

let captureMask = null

const showCaptureMask = () => {
  if (captureMask) { return }
  let { width, height } = screen.getPrimaryDisplay().bounds
  captureMask = new BrowserWindow({
    // TODO: windows 使用 fullscreen, mac 设置为 undefined
    fullscreen: process.platform === 'win32' || undefined,
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    skipTaskbar: true,
    autoHideMenuBar: true,
    movable: false,
    resizable: false,
    enableLargerThanScreen: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'capture-mask-preload.js'),
    }
  })
  captureMask.setAlwaysOnTop(true, 'screen-saver')
  captureMask.setVisibleOnAllWorkspaces(true)
  captureMask.setFullScreenable(false)
  captureMask.webContents.openDevTools()

  captureMask.loadFile(path.join(__dirname, 'capture-mask.html'))

  captureMask.on('closed', () => {
    captureMask = null
  })

  ipcMain.once('captureMaskReady', () => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      captureMask.webContents.send('setScreenshot', sources[0].id)
    })
  })
}

module.exports = {
  showCaptureMask,
}
