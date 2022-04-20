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
    bgCanvas = document.createElement('canvas')
    bgCanvas.width = video.videoWidth
    bgCanvas.height = video.videoHeight
    const bgCtx = bgCanvas.getContext('2d')
    bgCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
    bg.style.backgroundImage = `url(${bgCanvas.toDataURL()})`
    bg.className = 'gray-mask'
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
const CANVAS_MARGIN = 8
const ANCHOR_RADIUS = 4
const COLOR =  {
  PRIMARY: '#67bade',
  WHITE: '#fff',
}

document.addEventListener('mousedown', (e) => {
  isDragging = true
  startPosition = {
    x: e.clientX,
    y: e.clientY
  }
  canvas = document.createElement('canvas')
  canvas.className = 'draw-canvas'

  canvas.style.left = startPosition.x - CANVAS_MARGIN + 'px'
  canvas.style.top = startPosition.y - CANVAS_MARGIN + 'px'
  canvas.height = CANVAS_MARGIN
  canvas.width = CANVAS_MARGIN

  document.body.appendChild(canvas)
  console.log(e)
})

document.addEventListener('mousemove', (e) => {
  if (!isDragging) { return }

  const width = e.clientX - startPosition.x
  const height = e.clientY - startPosition.y

  console.log("xxx", width, height)

  if (!width || !height) { return }

  // reset width and height will clear canvas
  canvas.width = width + 2 * CANVAS_MARGIN
  canvas.height = height + 2 * CANVAS_MARGIN

  selectedArea = {
    x: startPosition.x,
    y: startPosition.y,
    width: width,
    height: height
  }

  drawImage()
  drawBorder()
  drawAnchors()
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

const drawImage = () => {
  const { x, y, width, height } = selectedArea
  const ctx = canvas.getContext('2d')

  ctx.drawImage(bgCanvas, x, y, width, height, CANVAS_MARGIN, CANVAS_MARGIN, width, height)
  // const bgCtx = bgCanvas.getContext('2d')
  // const imgData = bgCtx.getImageData(startPosition.x, startPosition.y, width, height)
  // ctx.putImageData(imgData, 0, 0)
}

const drawBorder = () => {
  const { x, y, width, height } = selectedArea
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = COLOR.WHITE
  ctx.strokeStyle = COLOR.PRIMARY
  ctx.lineWidth = 2
  ctx.strokeRect(CANVAS_MARGIN, CANVAS_MARGIN, width, height)
}

const drawAnchors = () => {
  const { x, y, width, height } = selectedArea
  const ctx = canvas.getContext('2d')

  const circle = new Path2D()
  circle.arc(CANVAS_MARGIN, CANVAS_MARGIN, ANCHOR_RADIUS, 0, 2 * Math.PI)
  const circleBorder = new Path2D()
  circleBorder.arc(CANVAS_MARGIN, CANVAS_MARGIN, ANCHOR_RADIUS, 0, 2 * Math.PI)
  ctx.fillStyle = COLOR.PRIMARY
  ctx.strokeStyle = COLOR.WHITE
  ctx.lineWidth = 1
  ctx.fill(circle)
  ctx.stroke(circleBorder)
}
