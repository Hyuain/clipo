const { createWorker } = require('tesseract.js')
const path = require('path')

let worker = createWorker({
  langPath: path.join(__dirname, 'trained-data'),
})

let isWorkerInitialized = false

const recognize = async (data) => {
  if (!isWorkerInitialized) {
    await initializeWorker()
  }
  return await worker.recognize(data)
}

const initializeWorker = async () => {
  if (isWorkerInitialized) { return }
  console.log("xxxInitializing worker...")
  await worker.load()
  console.log("xxxLoadlanguage")
  await worker.loadLanguage('eng+chi_sim+chi_tra')
  console.log("xxxInitilized worker")
  await worker.initialize('eng+chi_sim+chi_tra')
  isWorkerInitialized = true
}

module.exports = {
  recognize
}
