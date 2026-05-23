const https = require('https')

function fetchBuffer(url) {
  return new Promise(function(resolve, reject) {
    https.get(url, function(res) {
      const chunks = []
      res.on('data', function(c) { chunks.push(c) })
      res.on('end', function() { resolve(Buffer.concat(chunks)) })
    }).on('error', reject)
  })
}

function postMultipart(hostname, path, boundary, body) {
  return new Promise(function(resolve, reject) {
    const req = https.request({
      hostname: hostname, path: path, method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Content-Length': body.length }
    }, function(res) {
      let d = ''
      res.on('data', function(c) { d += c })
      res.on('end', function() { try { resolve(JSON.parse(d)) } catch(e) { reject(e) } })
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
      Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="' + filename + '"\r\nContent-Type: image/jpeg\r\n\r\n'),
      imgBuffer,
      Buffer.from('\r\n--' + boundary + '--\r\n')
    ])
    const result = await postMultipart('www.nyckel.com', '/v1/functions/o2f0jzcdyut2qxhu/invoke', boundary, bodyParts)
    return { success: true, result: result }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

const input = process.argv[2] || 'https://athars.space/uploads/ddb95627.jpg'
nsfwChecker(input).then(function(r) { console.log(JSON.stringify(r, null, 2)) })
