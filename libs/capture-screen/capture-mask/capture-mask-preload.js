const exposeApi = require('../../../utils/expose-api')

exposeApi({
  ipcRendererConfig: {
    validSendChannels: ['captureMaskReady'],
    validOnChannels: ['setScreenshot'],
  }
})
