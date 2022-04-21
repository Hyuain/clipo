const COLOR =  {
  PRIMARY: '#67bade',
  WHITE: '#fff',
  TRANSPARENT: 'rgba(255, 255, 255, 0)'
}

const ANCHOR_RADIUS = 4

export class ScreenshotEditor {
  // the container for the editor
  container = null
  // the canvas to save the original screenshot data
  srcCanvas = null
  // the background canvas, containing the screenshot and the gray mask
  bgCanvas = null
  // the canvas to draw the selection area
  canvas = null
  // the context of the canvas of the selection area
  ctx = null

  isDragging = false
  resizeDirection = null
  anchorsPaths = new Set()
  startPosition = {}
  selectedArea = {}

  constructor(container, { width, height, imageSource, defaultCursor }) {
    this.container = container
    this.defaultCursor = defaultCursor || 'default'

    this.srcCanvas = document.createElement('canvas')
    this.srcCanvas.width = width
    this.srcCanvas.height = height
    this.srcCanvas.getContext('2d').drawImage(imageSource, 0, 0)

    this.bgCanvas = document.createElement('canvas')
    this.bgCanvas.width = width
    this.bgCanvas.height = height
    this.bgCanvas.style.position = 'absolute'
    const bgCtx = this.bgCanvas.getContext('2d')
    bgCtx.drawImage(this.srcCanvas, 0, 0)
    bgCtx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    bgCtx.fillRect(0, 0, width, height)

    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.canvas.style.position = 'absolute'
    this.ctx = this.canvas.getContext('2d')
    this.ctx.fillStyle = COLOR.TRANSPARENT
    this.ctx.fillRect(0, 0, width, height)
  }

  init() {
    this.container.appendChild(this.bgCanvas)
    this.container.appendChild(this.canvas)
    this.bindEvents()
  }

  destroy() {
    this.container.removeChild(this.bgCanvas)
    this.container.removeChild(this.canvas)
  }

  bindEvents() {
    this.container.addEventListener('mousedown', (e) => this.handleMousedown(e))
    this.container.addEventListener('mousemove', (e) => this.handleMousemove(e))
    this.container.addEventListener('mouseup', (e) => this.handleMouseup(e))
  }

  handleMousedown(e) {
    this.isDragging = true
    this.resizeDirection = null
    for (const { path, position } of this.anchorsPaths) {
      if (this.ctx.isPointInPath(path, e.clientX, e.clientY)) {
        this.resizeDirection = position
        break
      }
    }
    this.startPosition = this.resizeDirection
      ? this.anchorConfig(this.resizeDirection).startPosition
      : { x: e.clientX, y: e.clientY }
    if (!this.resizeDirection) {
      this.clearCanvas(this.canvas)
    }
  }

  handleMousemove(e) {
    const x = e.clientX
    const y = e.clientY
    if (this.isDragging) {
      this.drawSelectedArea(x, y)
    }
    if (['leftMiddle', 'rightMiddle', 'middleTop', 'middleBottom'].includes(this.resizeDirection)) {
      this.setCursor(this.anchorConfig(this.resizeDirection).cursor)
    } else {
      for (const { path, position } of this.anchorsPaths) {
        if (!this.ctx.isPointInPath(path, x, y)) { continue }
        this.setCursor(this.anchorConfig(position).cursor)
        return
      }
      this.setCursor()
    }
  }

  handleMouseup(e) {
    this.isDragging = false
    this.resizeDirection = null
    let { x, y, width, height } = this.selectedArea
    const imageData = this.srcCanvas.getContext('2d').getImageData(x, y, width, height)
    const resCanvas = document.createElement('canvas')
    resCanvas.width = width
    resCanvas.height = height
    const resCtx = resCanvas.getContext('2d')
    resCtx.putImageData(imageData, 0, 0)
    ipcRenderer.send('finishedScreenshotEdit', resCanvas.toDataURL())
    this.setCursor()
  }

  drawSelectedArea(x, y) {
    this.clearCanvas(this.canvas)

    const selectedArea = this.anchorConfig(this.resizeDirection).getSelectedAreaCoordinate(x, y)
    // prevent error when get the selected image data from srcCanvas
    if (!selectedArea.width || !selectedArea.height) { return }
    this.selectedArea = selectedArea

    this.drawImage()
    this.drawBorder()
    this.drawAnchors()
  }

  // draw image in the selected area
  drawImage() {
    const { x, y, width, height } = this.selectedArea
    this.ctx.drawImage(this.srcCanvas, x, y, width, height, x, y, width, height)
  }

  // draw border of the selection area
  drawBorder() {
    const { x, y, width, height } = this.selectedArea
    this.ctx.fillStyle = COLOR.WHITE
    this.ctx.strokeStyle = COLOR.PRIMARY
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(x, y, width, height)
  }

  // draw anchors in border of the selection area
  drawAnchors() {
    const { x, y, width, height } = this.selectedArea
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
    this.anchorsPaths.clear()
    anchors.forEach((config) => {
      this.drawAnchor(config)
    })
  }

  drawAnchor({ x, y, position }) {
    const hotSpot = new Path2D()
    hotSpot.arc(x, y, ANCHOR_RADIUS * 4, 0, 2 * Math.PI)
    this.ctx.fillStyle = COLOR.TRANSPARENT
    this.ctx.fill(hotSpot)
    const circle = new Path2D()
    circle.arc(x, y, ANCHOR_RADIUS, 0, 2 * Math.PI)
    this.ctx.fillStyle = COLOR.PRIMARY
    this.ctx.fill(circle)
    const border = new Path2D()
    border.arc(x, y, ANCHOR_RADIUS, 0, 2 * Math.PI)
    this.ctx.strokeStyle = COLOR.WHITE
    this.ctx.lineWidth = 1
    this.ctx.stroke(border)
    this.anchorsPaths.add({ path: hotSpot, position })
  }

  // config the behaviours when mousedown/mousemove on anchors
  anchorConfig(position) {
    const configs = {
      leftTop: {
        // the startPosition when mousedown on the anchor
        startPosition: {
          x: this.selectedArea.x + this.selectedArea.width,
          y: this.selectedArea.y + this.selectedArea.height,
        },
        // the method to get the new coordinate of the selectedArea when drag the anchor
        getSelectedAreaCoordinate: (x, y) => this.getSelectedAreaCoordinate(x, y),
        // the cursor when mouseover the anchor
        cursor: 'nwse-resize',
      },
      leftMiddle: {
        startPosition: {
          x: this.selectedArea.x + this.selectedArea.width,
          y: this.selectedArea.y
        },
        getSelectedAreaCoordinate: (x, y) => this.getSelectedAreaCoordinate(x, this.selectedArea.y + this.selectedArea.height),
        cursor: 'ew-resize',
      },
      leftBottom: {
        startPosition: {
          x: this.selectedArea.x + this.selectedArea.width,
          y: this.selectedArea.y
        },
        getSelectedAreaCoordinate: (x, y) => this.getSelectedAreaCoordinate(x, y),
        cursor: 'nesw-resize',
      },
      middleTop: {
        startPosition: {
          x: this.selectedArea.x,
          y: this.selectedArea.y + this.selectedArea.height,
        },
        getSelectedAreaCoordinate: (x, y) => this.getSelectedAreaCoordinate(this.selectedArea.x + this.selectedArea.width, y),
        cursor: 'ns-resize',
      },
      middleBottom: {
        startPosition: {
          x: this.selectedArea.x,
          y: this.selectedArea.y
        },
        getSelectedAreaCoordinate: (x, y) => this.getSelectedAreaCoordinate(this.selectedArea.x + this.selectedArea.width, y),
        cursor: 'ns-resize',
      },
      rightTop: {
        startPosition: {
          x: this.selectedArea.x,
          y: this.selectedArea.y + this.selectedArea.height,
        },
        getSelectedAreaCoordinate: (x, y) => this.getSelectedAreaCoordinate(x, y),
        cursor: 'nesw-resize',
      },
      rightMiddle: {
        startPosition: {
          x: this.selectedArea.x,
          y: this.selectedArea.y
        },
        getSelectedAreaCoordinate: (x, y) => this.getSelectedAreaCoordinate(x, this.selectedArea.y + this.selectedArea.height),
        cursor: 'ew-resize',
      },
      rightBottom: {
        startPosition: {
          x: this.selectedArea.x,
          y: this.selectedArea.y
        },
        getSelectedAreaCoordinate: (x, y) => this.getSelectedAreaCoordinate(x, y),
        cursor: 'nwse-resize',
      },
      null: {
        getSelectedAreaCoordinate: (x, y) => this.getSelectedAreaCoordinate(x, y),
      }
    }
    return configs[position]
  }

  getSelectedAreaCoordinate(x, y) {
    const width = x - this.startPosition.x
    const height = y - this.startPosition.y
    // keep the width and height always be positive
    // so that the position property of anchors always be correct
    return {
      x: width > 0 ? this.startPosition.x : this.startPosition.x + width,
      y: height > 0 ? this.startPosition.y : this.startPosition.y + height,
      width: Math.abs(width),
      height: Math.abs(height)
    }
  }

  setCursor(cursor = this.defaultCursor) {
    this.container.style.cursor = cursor
  }

  clearCanvas(canvas) {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }
}
