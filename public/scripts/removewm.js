import fs from 'fs'
import axios from 'axios'
import FormData from 'form-data'
import path from 'path'
import process from 'process'

async function ezremove(filePath) {
  const form = new FormData()
  form.append('image_file', fs.createReadStream(filePath), path.basename(filePath))

  const create = await axios.post(
    'https://api.ezremove.ai/api/ez-remove/watermark-remove/create-job',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'Mozilla/5.0',
        origin: 'https://ezremove.ai',
        'product-serial': 'sr-' + Date.now()
      }
    }
  ).then(v => v.data).catch(() => null)

  if (!create || !create.result || !create.result.job_id) {
    return { status: 'error' }
  }

  const job = create.result.job_id

  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 2000))

    const check = await axios.get(
      `https://api.ezremove.ai/api/ez-remove/watermark-remove/get-job/${job}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          origin: 'https://ezremove.ai',
          'product-serial': 'sr-' + Date.now()
        }
      }
    ).then(v => v.data).catch(() => null)

    if (check && check.code === 100000 && check.result && check.result.output) {
      return { job, result: check.result.output[0] }
    }

    if (!check || !check.code || check.code !== 300001) break
  }

  return { status: 'processing', job }
}

async function downloadImage(url, outPath) {
  const res = await axios.get(url, { responseType: 'stream' })
  const writer = fs.createWriteStream(outPath)
  res.data.pipe(writer)
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

const inputUrl = process.argv[2]
if (!inputUrl) {
  console.log('Usage: node removewm.js <url_gambar>')
  process.exit(1)
}

const tmpDir = './tmp'
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)

const tmpFile = `${tmpDir}/image_${Date.now()}.jpg`

try {
  console.log('Downloading image...')
  await downloadImage(inputUrl, tmpFile)

  console.log('Processing remove watermark...')
  const result = await ezremove(tmpFile)

  fs.unlinkSync(tmpFile)

  if (result.status === 'error') {
    console.log('Failed remove watermark')
    process.exit(1)
  }

  console.log('Success')
  console.log(result.result)
} catch (e) {
  console.log('Error:', e.message)
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
}