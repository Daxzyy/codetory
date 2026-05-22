const axios = require('axios')

async function imeiCheck(imei) {
  try {
    const { data } = await axios.get(
      `https://dash.imei.info/api/check/0/?imei=${encodeURIComponent(imei)}&API_KEY=f43f0d0c-27b0-408a-abd0-585fabea6adf`,
      {
        headers: {
          'User-Agent': 'okhttp/4.9.2',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Encoding': 'gzip'
        }
      }
    )

    if (!data?.result?.header) {
      return {
        success: false,
        creator: '𝖸𝖺𝖻𝖾𝗌',
        error: 'Invalid response'
      }
    }

    const { header, items } = data.result

    const toKey = (str) => str.trim().replace(/\s+/g, '_')

    const formatBool = (val) => {
      if (val === 'True') return 'Support'
      if (val === 'False') return 'Not support'
      return val
    }

    const result = {}
    let currentGroup = null
    let index = 0

    while (index < items.length) {
      if (items[index].role === 'header') {
        currentGroup = toKey(items[index].title)
        result[currentGroup] = {}
        index++

        while (index < items.length && items[index].role !== 'header') {
          if (items[index].role === 'item') {
            result[currentGroup][toKey(items[index].title)] =
              currentGroup === 'Network'
                ? formatBool(items[index].content)
                : items[index].content
          }

          if (
            items[index].role === 'button' &&
            items[index].title === 'Full device specification'
          ) {
            result.full_spec = items[index].content
            index = items.length
            break
          }

          index++
        }
      } else {
        index++
      }
    }

    return {
      success: true,
      creator: '𝖸𝖺𝖻𝖾𝗌',
      results: {
        imei: header.imei,
        brand: header.brand,
        model: header.model,
        photo: header.photo,
        ...result
      }
    }
  } catch (err) {
    return {
      success: false,
      creator: '𝖸𝖺𝖻𝖾𝗌',
      error: err.message
    }
  }
}

return await imeiCheck('358180005339211')