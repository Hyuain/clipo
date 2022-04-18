const { contextBridge, ipcRenderer } = require('electron')

module.exports = (validChannels = []) => {
  contextBridge.exposeInMainWorld(
    "ipcRenderer", {
      send: (channel, ...args) => {
        if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, ...args)
        }
      },
    }
  )
}
