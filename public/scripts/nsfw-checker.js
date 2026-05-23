const axios = require('axios')
const FormData = require('form-data')

async function nsfwChecker(imageUrl) {
  try {
    const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' })
    const imgBuffer = Buffer.from(imgRes.data)

    const form = new FormData()
    form.append('file', imgBuffer, { filename: Date.now() + '.jpg', contentType: 'image/jpeg' })

    const { data } = await axios.post(
      'https://www.nyckel.com/v1/functions/o2f0jzcdyut2qxhu/invoke',
      form,
      { headers: form.getHeaders() }
    )

    return { success: true, result: data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

const input = process.argv[2] || 'https://athars.space/uploads/ddb95627.jpg'
nsfwChecker(input).then(function(r) { console.log(JSON.stringify(r, null, 2)) })
