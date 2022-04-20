const defaultCursor = document.body.style.cursor

const setCursor = (cursor = defaultCursor) => {
  document.body.style.cursor = cursor
}

setCursor('none')

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
    ctx.fillStyle = COLOR.TRANSPARENT
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // clear the video element and reset cursor
    video.remove()
    video = null
    setCursor()

    container.appendChild(bgCanvas)
    container.appendChild(canvas)
  }
  document.body.appendChild(video)
})

let isDragging = false
let startPosition
let selectedArea
let resizeDirection

const CANVAS_MARGIN = 8
const ANCHOR_RADIUS = 4
const COLOR =  {
  PRIMARY: '#67bade',
  WHITE: '#fff',
  TRANSPARENT: 'rgba(255, 255, 255, 0)'
}
const anchorsPaths = new Set()

document.addEventListener('mousedown', (e) => {
  isDragging = true
  for ({ path, position } of anchorsPaths) {
    if (!ctx.isPointInPath(path, e.clientX, e.clientY)) { continue }
    resizeDirection = position
    if (resizeDirection === "leftMiddle") {
      startPosition = {
        x: selectedArea.x + selectedArea.width,
        y: selectedArea.y
      }
    } else if (resizeDirection === "middleTop") {
      startPosition = {
        x: selectedArea.x,
        y: selectedArea.y + selectedArea.height,
      }
    } else {
      startPosition = {
        x: selectedArea.x,
        y: selectedArea.y,
      }
    }
    return
  }
  startPosition = {
    x: e.clientX,
    y: e.clientY
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height)
})

document.addEventListener('mousemove', (e) => {
  if (!isDragging) { return }
  this.drawSelectedArea(e)
})

document.addEventListener('mouseup', (e) => {
  isDragging = false
  let { x, y, width, height } = selectedArea
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
  // the position will be correct only when the width and height are positive
  const anchors = [
    { x, y, position: "leftTop" },
    { x, y: y + height / 2, position: "leftMiddle" },
    { x, y: y + height, position: "leftBottom" },
    { x: x + width / 2, y, position: "middleTop" },
    { x: x + width / 2, y: y + height, position: "middleBottom" },
    { x: x + width, y, position: "rightTop" },
    { x: x + width, y: y + height / 2, position: "rightMiddle" },
    { x: x + width, y: y + height, position: "rightBottom" },
  ]
  anchorsPaths.clear()
  anchors.forEach((config) => {
    drawAnchor(config)
  })

  drawAnchor(CANVAS_MARGIN, CANVAS_MARGIN)
}

const drawAnchor = ({ x, y, position }) => {
  const hotSpot = new Path2D()
  hotSpot.arc(x, y, ANCHOR_RADIUS * 10, 0, 2 * Math.PI)
  ctx.fillStyle = COLOR.TRANSPARENT
  ctx.fill(hotSpot)
  const circle = new Path2D()
  circle.arc(x, y, ANCHOR_RADIUS, 0, 2 * Math.PI)
  ctx.fillStyle = COLOR.PRIMARY
  ctx.fill(circle)
  const border = new Path2D()
  border.arc(x, y, ANCHOR_RADIUS, 0, 2 * Math.PI)
  ctx.strokeStyle = COLOR.WHITE
  ctx.lineWidth = 1
  ctx.stroke(border)
  anchorsPaths.add({ path: hotSpot, position })
}

const cursorMap = {
  leftTop: "nwse-resize",
  leftMiddle: "ew-resize",
  leftBottom: "nesw-resize",
  middleTop: "ns-resize",
  middleBottom: "ns-resize",
  rightTop: "nesw-resize",
  rightMiddle: "ew-resize",
  rightBottom: "nwse-resize",
}

function drawSelectedArea(e) {
  const x = e.clientX
  const y = e.clientY

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (!resizeDirection || ['leftTop', 'leftBottom', 'rightTop', 'rightBottom'].includes(resizeDirection)) {
    selectedArea = determineSelectedAreaCoordinate(x, y)
  }
  if (['leftMiddle', 'rightMiddle'].includes(resizeDirection)) {
    selectedArea = determineSelectedAreaCoordinate(x, selectedArea.y + selectedArea.height)
  }
  if (['middleTop', 'middleBottom'].includes(resizeDirection)) {
    selectedArea = determineSelectedAreaCoordinate(selectedArea.x + selectedArea.width, y)
  }

  // prevent error when get the selected image data from srcCanvas
  if (!selectedArea.width || !selectedArea.height) {
    return
  }

  drawImage()
  drawBorder()
  drawAnchors()
}

const determineSelectedAreaCoordinate = (x, y) => {
  const width = x - startPosition.x
  const height = y - startPosition.y
  // keep the width and height always be positive
  // so that the position property of anchors always be correct
  return {
    x: width > 0 ? startPosition.x : startPosition.x + width,
    y: height > 0 ? startPosition.y : startPosition.y + height,
    width: Math.abs(width),
    height: Math.abs(height)
  }
}
