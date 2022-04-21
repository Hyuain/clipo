import { ScreenshotEditor } from '../screenshot-editor.js'

const defaultCursor = document.body.style.cursor

const setCursor = (cursor = defaultCursor) => {
  document.body.style.cursor = cursor
}

setCursor('none')

ipcRenderer.send('captureMaskReady')

ipcRenderer.on('gotRawScreenshot', async (event, sourceId) => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId,
        minWidth: 0,
        maxWidth: 99999,
        minHeight: 0,
        maxHeight: 99999
      }
    }
  })

  let video = document.createElement('video')
  video.srcObject = stream

  video.onloadedmetadata = (e) => {
    video.play()
    video.style.height = video.videoHeight + 'px'
    video.style.width = video.videoWidth + 'px'

    const screenshotEditor = new ScreenshotEditor(container, {
      width: video.videoWidth,
      height: video.videoHeight,
      imageSource: video,
      defaultCursor,
      onSelectionDone: (url) => {
        ipcRenderer.send('finishedScreenshotEdit', url)
      }
    })
    screenshotEditor.init()

    // clear the video element and reset cursor
    video.remove()
    video = null
    setCursor()
  }
  document.body.appendChild(video)
})

