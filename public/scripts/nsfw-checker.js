const https = require('https')

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    }).on('error', reject)
  })
}

function postMultipart(hostname, path, boundary, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path, method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve(JSON.parse(data)))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function nsfwChecker(imageUrl) {
  try {
    const imgBuffer = await fetchBuffer(imageUrl)
    const boundary = '----FormBoundary' + Date.now()
    const filename = Date.now() + '.jpg'
    const bodyParts = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`),
      imgBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ])
    const result = await postMultipart(
      'www.nyckel.com',
      '/v1/functions/o2f0jzcdyut2qxhu/invoke',
      boundary,
      bodyParts
    )
    return { success: true, result }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

const input = process.argv[2] || 'https://athars.space/uploads/ddb95627.jpg'
nsfwChecker(input).then(r => console.log(JSON.stringify(r, null, 2)))
