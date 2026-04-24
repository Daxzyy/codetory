const headers = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Content-Type': 'application/json',
  'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
  'sec-ch-ua-mobile': '?1',
  'sec-ch-ua-platform': '"Android"',
  'origin': 'https://teraboxdl.site',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-mode': 'cors',
  'sec-fetch-dest': 'empty',
  'referer': 'https://teraboxdl.site/',
  'accept-language': 'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6'
}

async function teraboxdl(url) {
  const r = await fetch('https://teraboxdl.site/api/proxy', {
    method: 'POST',
    headers,
    body: JSON.stringify({ url })
  })

  return r.json()
}

teraboxdl('https://www.terabox.com/wap/share/filelist?surl=9Oa_cfmGq5CSmmJo2GRDng')
.then(console.log)
.catch(console.error)