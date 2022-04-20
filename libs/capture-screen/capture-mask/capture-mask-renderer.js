const prevCursor = document.body.style.cursor
document.body.style.cursor = 'none'

ipcRenderer.send('captureMaskReady')

// the canvas to save the original screenshot data
let srcCanvas
// the background canvas, containing the screenshot and the gray mask
let bgCanvas
// the canvas to draw the selection area
let canvas
// the context of the canvas of the selection area
let ctx

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

    // create srcCanvas to save the original screenshot data
    srcCanvas = document.createElement('canvas')
    srcCanvas.width = video.videoWidth
    srcCanvas.height = video.videoHeight
    srcCanvas.getContext('2d').drawImage(video, 0, 0)

    // draw the background canvas filled with gray mask
    bgCanvas = document.createElement('canvas')
    bgCanvas.width = srcCanvas.width
    bgCanvas.height = srcCanvas.height
    bgCanvas.style.position = 'absolute'
    const bgCtx = bgCanvas.getContext('2d')
    bgCtx.drawImage(srcCanvas, 0, 0)
    bgCtx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height)

    // create the canvas to draw the selection area
    canvas = document.createElement('canvas')
    canvas.width = srcCanvas.width
    canvas.height = srcCanvas.height
    canvas.style.position = 'absolute'
    ctx = canvas.getContext('2d')
    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // clear the video element and reset cursor
    video.remove()
    video = null
    document.body.style.cursor = prevCursor

    container.appendChild(bgCanvas)
    container.appendChild(canvas)
  }
  document.body.appendChild(video)
})

let isDragging = false
let startPosition
let selectedArea
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
  ctx.clearRect(0, 0, canvas.width, canvas.height)
})

document.addEventListener('mousemove', (e) => {
  if (!isDragging) { return }

  const width = e.clientX - startPosition.x
  const height = e.clientY - startPosition.y

  console.log("xxx", width, height)

  // prevent error when get the selected image data from srcCanvas
  if (!width || !height) { return }

  ctx.clearRect(0, 0, canvas.width, canvas.height)

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
  let { x, y, width, height } = selectedArea
  if (width < 0) {
    x += width
    width = -width
  }
  if (height < 0) {
    y += height
    height = -height
  }
  const imageData = srcCanvas.getContext('2d').getImageData(x, y, width, height)
  const resCanvas = document.createElement('canvas')
  resCanvas.width = width
  resCanvas.height = height
  const resCtx = resCanvas.getContext('2d')
  resCtx.putImageData(imageData, 0, 0)
  ipcRenderer.send('finishedScreenshotEdit', resCanvas.toDataURL())
})

// draw image in the selection area
const drawImage = () => {
  const { x, y, width, height } = selectedArea

  ctx.drawImage(srcCanvas, x, y, width, height, x, y, width, height)
}

// draw border of the selection area
const drawBorder = () => {
  const { x, y, width, height } = selectedArea

  ctx.fillStyle = COLOR.WHITE
  ctx.strokeStyle = COLOR.PRIMARY
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, width, height)
}

// draw anchors in border of the selection area
const drawAnchors = () => {
  const { x, y, width, height } = selectedArea
  const anchors = [
    { x, y },
    { x, y: y + height / 2 },
    { x, y: y + height },
    { x: x + width / 2, y },
    { x: x + width / 2, y: y + height },
    { x: x + width, y },
    { x: x + width, y: y + height / 2 },
    { x: x + width, y: y + height },
  ]
  anchors.forEach((config) => {
    drawAnchor(config)
  })

  drawAnchor(CANVAS_MARGIN, CANVAS_MARGIN)
}

const drawAnchor = ({ x, y }) => {
  const circle = new Path2D()
  circle.arc(x, y, ANCHOR_RADIUS, 0, 2 * Math.PI)
  const circleBorder = new Path2D()
  circleBorder.arc(x, y, ANCHOR_RADIUS, 0, 2 * Math.PI)
  ctx.fillStyle = COLOR.PRIMARY
  ctx.strokeStyle = COLOR.WHITE
  ctx.lineWidth = 1
  ctx.fill(circle)
  ctx.stroke(circleBorder)
}
