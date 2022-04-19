const prevCursor = document.body.style.cursor
document.body.style.cursor = 'none'

ipcRenderer.send('captureMaskReady')

let bgCanvas

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
    video.style.border = '1px solid red'
    bgCanvas = document.createElement('canvas')
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

let isDragging = false
let startPosition
let selectedArea
let canvas

document.addEventListener('mousedown', (e) => {
  isDragging = true
  startPosition = {
    x: e.clientX,
    y: e.clientY
  }
  canvas = document.createElement('canvas')
  canvas.className = 'draw-canvas'

  canvas.style.left = startPosition.x + 'px'
  canvas.style.top = startPosition.y + 'px'
  canvas.style.width = '0px'
  canvas.style.height = '0px'

  document.body.appendChild(canvas)
  console.log(e)
})

document.addEventListener('mousemove', (e) => {
  if (!isDragging) { return }

  const width = e.clientX - startPosition.x
  const height = e.clientY - startPosition.y

  if (!width || !height) { return }

  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')

  ctx.drawImage(bgCanvas, startPosition.x, startPosition.y, width, height, 0, 0, width, height)
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#67bade'
  ctx.lineWidth = 2
  ctx.strokeRect(0, 0, width, height)
  // const bgCtx = bgCanvas.getContext('2d')
  // const imgData = bgCtx.getImageData(startPosition.x, startPosition.y, width, height)
  // ctx.putImageData(imgData, 0, 0)
  selectedArea = {
    x: startPosition.x,
    y: startPosition.y,
    width: width,
    height: height
  }
})

document.addEventListener('mouseup', (e) => {
  isDragging = false
  const { x, y, width, height } = selectedArea
  const bgCtx = bgCanvas.getContext('2d')
  const imageData = bgCtx.getImageData(x, y, width, height)
  const resCanvas = document.createElement('canvas')
  resCanvas.width = width
  resCanvas.height = height
  const resCtx = resCanvas.getContext('2d')
  resCtx.putImageData(imageData, 0, 0)
  ipcRenderer.send('finishedScreenshotEdit', resCanvas.toDataURL())
})
