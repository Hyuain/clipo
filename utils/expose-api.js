const { contextBridge, ipcRenderer } = require('electron')

module.exports = ({ ipcRendererConfig }) => {
  if (ipcRendererConfig) {
    contextBridge.exposeInMainWorld(
      "ipcRenderer", {
        send: (channel, ...args) => {
          if (ipcRendererConfig.validSendChannels?.includes(channel)) {
            ipcRenderer.send(channel, ...args)
          }
        },
        on: (channel, callback) => {
          if (ipcRendererConfig.validOnChannels?.includes(channel)) {
            ipcRenderer.on(channel, callback)
          }
        }
      }
    )
  }
}
