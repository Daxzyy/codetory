const https = require('https')

function get(url, headers) {
  return new Promise(function(resolve, reject) {
    const u = new URL(url)

    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: headers
    }, function(res) {
      const chunks = []

      res.on('data', function(c) {
        chunks.push(c)
      })

      res.on('end', function() {
        const text = Buffer.concat(chunks).toString()

        try {
          resolve(JSON.parse(text))
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

async function bloxFruitStock() {
  try {
    const data = await get('https://www.gamersberg.com/api/v1/blox-fruits/stock', {
      'RSC': '1',
      'Next-Router-State-Tree': '1',
      'Next-Router-Prefetch': '1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.gamersberg.com/blox-fruits-stock/',
      'Accept': 'application/json'
    })

    const stock = data.data[0]

    return {
      success: true,
      normal: stock.normalStock,
      mirage: stock.mirageStock,
      player: stock.playerName,
      timestamp: stock.timestamp
    }

  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}

const input = process.argv[2]

bloxFruitStock(input).then(function(r) {
  console.log(JSON.stringify(r, null, 2))
})
