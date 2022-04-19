const exposeApi = require('./utils/expose-api')

exposeApi({
  ipcRendererConfig: {
    validSendChannels: ['showCaptureMask'],
  }
})
