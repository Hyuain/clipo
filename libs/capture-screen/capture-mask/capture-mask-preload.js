const exposeApi = require('../../../utils/expose-api')

exposeApi({
  ipcRendererConfig: {
    validSendChannels: ['captureMaskReady', 'finishedScreenshotEdit'],
    validOnChannels: ['gotRawScreenshot'],
  }
})
