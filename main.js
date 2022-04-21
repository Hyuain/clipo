const { app, BrowserWindow, ipcMain, Menu, MenuItem } = require('electron')
const path = require('path')
const { showCaptureMask } = require('./libs/capture-screen/capture-mask/capture-mask-main')

let isShowCaptureMask = false

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  })

  win.loadFile('index.html')

  win.webContents.openDevTools()
}

const menu = new Menu()
menu.append(new MenuItem({
  label: 'Capture',
  accelerator: 'F2',
  click: () => {
    startCapture()
  }
}))

Menu.setApplicationMenu(menu)

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on('showCaptureMask', () => {
  startCapture()
})

function startCapture() {
  if (isShowCaptureMask) { return }
  isShowCaptureMask = true
  showCaptureMask()
}
