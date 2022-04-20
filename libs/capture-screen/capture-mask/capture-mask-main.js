const { screen, BrowserWindow, ipcMain, desktopCapturer} = require('electron')
const path = require('path')
const fs = require('fs')
const { recognize } = require('../../ocr/ocr-worker')

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
      captureMask.webContents.send('gotRawScreenshot', sources[0].id)
    })
  })

  ipcMain.on('finishedScreenshotEdit', async (event, data) => {
    const base64Image = data.replace(/^data:image\/png;base64,/, "")
    // const { data: { text } } = await recognize(data)
    // console.log("xxxAfterRecognize", text)
    // Tesseract.recognize(
    //   data,
    //   'eng+chi_tra',
    //   { logger: m => console.log(m) }
    // ).then((res) => {
    //   console.log("recRes", res.data.text)
    // })
    const screenshotsDirPath = path.join(__dirname, '..', '..', '..', 'screenshots')
    fs.mkdir(screenshotsDirPath, { recursive: true }, (err) => {
      if (err) { return console.error(err) }
      fs.writeFile(path.join(screenshotsDirPath, `screenshot_${Date.now()}.png`), base64Image, {
        encoding: 'base64'
      }, (err) => {
        if (err) { console.error(err) }
      })
    })

  })
}

module.exports = {
  showCaptureMask,
}


