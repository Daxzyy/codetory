const axios = require('axios')
const FormData = require('form-data')

async function nsfwChecker(imageUrl) {
  try {
    const { data: image } = await axios.get(imageUrl, {
      responseType: 'arraybuffer'
    })

    const form = new FormData()
    form.append('file', Buffer.from(image), `${Date.now()}.jpg`)

    const { data } = await axios.post(
      'https://www.nyckel.com/v1/functions/o2f0jzcdyut2qxhu/invoke',
      form,
      {
        headers: form.getHeaders()
      }
    )

    return {
      success: true,
      result: data
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

return await nsfwChecker('https://athars.space/uploads/ddb95627.jpg')