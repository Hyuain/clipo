const prevCursor = document.body.style.cursor
document.body.style.cursor = 'none'

ipcRenderer.send('captureMaskReady')

ipcRenderer.on('setScreenshot', async (event, sourceId) => {
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
    video.style.border = '1px solid red'
    const bgCanvas = document.createElement('canvas')
    bgCanvas.width = video.videoWidth
    bgCanvas.height = video.videoHeight
    const bgCtx = bgCanvas.getContext('2d')
    bgCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
    bg.style.backgroundImage = `url(${bgCanvas.toDataURL()})`

    video.remove()
    video = null
    document.body.style.cursor = prevCursor
  }
  document.body.appendChild(video)
})
