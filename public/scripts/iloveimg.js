const axios = require('axios')
const fs = require('fs')
const FormData = require('form-data')

const config = ['2', '4']

async function gettoken() {
  const html = await axios.get('https://www.iloveimg.com/upscale-image').then(r => r.data)
  const token = html.match(/"token":"(eyJ[^"]+)"/)?.[1]
  const task = html.match(/ilovepdfConfig\\.taskId\\s*=\\s*'([^']+)'/)?.[1]
  return { token, task }
}

async function upimage(img, token, task) {
  const form = new FormData()
  form.append('name', img.split('/').pop())
  form.append('chunk', '0')
  form.append('chunks', '1')
  form.append('task', task)
  form.append('preview', '1')
  form.append('v', 'web.0')
  form.append('file', fs.createReadStream(img))

  const r = await axios.post('https://api29g.iloveimg.com/v1/upload',
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: \`Bearer \${token}\`,
        Origin: 'https://www.iloveimg.com',
        Referer: 'https://www.iloveimg.com/'
      }
    }
  )

  return r.data.server_filename
}

async function doUpscale(serverfilename, token, task, scale) {
  if (!config.includes(String(scale))) throw 'invalid scale'

  const form = new FormData()
  form.append('task', task)
  form.append('server_filename', serverfilename)
  form.append('scale', scale)

  const r = await axios.post('https://api29g.iloveimg.com/v1/upscale',
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: \`Bearer \${token}\`,
        Origin: 'https://www.iloveimg.com',
        Referer: 'https://www.iloveimg.com/'
      },
      responseType: 'arraybuffer'
    }
  )

  return r.data
}

async function upscale(img, scale) {
  const { token, task } = await gettoken()
  const serverfilename = await upimage(img, token, task)
  return await doUpscale(serverfilename, token, task, scale)
}

upscale('./target.jpg', '4')
.then(b => fs.writeFileSync('output.png', b))
.catch(console.error)