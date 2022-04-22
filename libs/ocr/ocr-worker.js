const { createWorker } = require('tesseract.js')
const path = require('path')

let worker
let isWorkerInitialized = false

const recognize = async (data) => {
  console.log(data)
  return 1
  // if (!isWorkerInitialized) {
  //   await initializeWorker()
  // }
  // return await worker.recognize(data)
}

const initializeWorker = async () => {
  if (isWorkerInitialized) { return }
  // tesserect.js
  // worker = createWorker({
  //   langPath: path.join(__dirname, 'trained-data'),
  // })
  // console.log("xxxInitializing worker...")
  // await worker.load()
  // console.log("xxxLoadlanguage")
  // await worker.loadLanguage('eng+chi_sim+chi_tra')
  // console.log("xxxInitilized worker")
  // await worker.initialize('eng+chi_sim+chi_tra')
  // isWorkerInitialized = true

  // paddle-ocr
  worker = paddleOCR
  await worker.init()
  console.log('xxxxxInitialized worker')
}

module.exports = {
  recognize
}
