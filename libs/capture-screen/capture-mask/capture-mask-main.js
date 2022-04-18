const { screen, BrowserWindow, ipcMain, desktopCapturer} = require('electron')
const path = require('path')

let captureWin = null

module.exports = () => {
  if (captureWin) { return }
  let { width, height } = screen.getPrimaryDisplay().bounds
  captureWin = new BrowserWindow({
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
  captureWin.setAlwaysOnTop(true, 'screen-saver')
  captureWin.setVisibleOnAllWorkspaces(true)
  captureWin.setFullScreenable(false)
  captureWin.webContents.openDevTools()

  captureWin.loadFile(path.join(__dirname, 'capture-mask.html'))

  captureWin.on('closed', () => {
    captureWin = null
  })

  ipcMain.once('captureMaskReady', () => {
    desktopCapturer.getSources({ types: ['screen'] }).then((res) => {
      console.log(res)
    })
  })

}
