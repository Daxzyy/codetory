const https = require('https')

const GOOGLE_KEY = 'AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0'

function request(options, body, isBuffer) {
  return new Promise(function(resolve, reject) {
    const req = https.request(options, function(res) {
      const chunks = []

      res.on('data', function(c) {
        chunks.push(c)
      })

      res.on('end', function() {
        const buffer = Buffer.concat(chunks)

        if (isBuffer) return resolve(buffer)

        const text = buffer.toString()

        try {
          resolve(JSON.parse(text))
        } catch (e) {
          resolve(text)
        }
      })
    })

    req.on('error', reject)

    if (body) req.write(body)
    req.end()
  })
}

function googleRequest(path, data) {
  return request({
    hostname: 'www.googleapis.com',
    path: '/identitytoolkit/v3/relyingparty' + path + '?key=' + GOOGLE_KEY,
    method: 'POST',
    headers: {
      'accept-encoding': 'gzip',
      'accept-language': 'in-ID, en-US',
      'connection': 'Keep-Alive',
      'content-type': 'application/json',
      'user-agent': 'Dalvik/2.1.0 (Linux; U; Android 10; SM-J700F Build/QQ3A.200805.001)',
      'x-android-cert': 'ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8',
      'x-android-package': 'com.alightcreative.motion',
      'x-client-version': 'Android/Fallback/X23002001/FirebaseUI-Android',
      'x-firebase-appcheck': 'eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ==',
      'x-firebase-client': 'H4sIAAAAAAAAAKtWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA',
      'x-firebase-gmpid': '1:414370328124:android:f1394131c8b84de3',
      'x-firebase-locale': 'in-ID, en-US'
    }
  }, JSON.stringify(data))
}

function secureTokenRequest(data) {
  return request({
    hostname: 'securetoken.googleapis.com',
    path: '/v1/token?key=' + GOOGLE_KEY,
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    }
  }, JSON.stringify(data))
}

function alightRequest(path, data, token) {
  const headers = {
    'accept-encoding': 'gzip',
    'content-type': 'application/json; charset=utf-8',
    'firebase-instance-id-token': 'fc6bqgfcTGu_ZBBe4tVPwV:APA91bFHrAkrm7xVzZDvQbuK51muxf72x391Zv7dgsAWikyQoaBrO60JlfEHotVWThR7ZL7h5xWCg8peCtVA09Eq41i0VXpgYmMBRBFZubgqvVnh42AYQjg',
    'user-agent': 'okhttp/4.12.0',
    'x-firebase-appcheck': 'eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ=='
  }

  if (token) headers.authorization = 'Bearer ' + token

  return request({
    hostname: 'us-central1-alight-creative.cloudfunctions.net',
    path: path,
    method: 'POST',
    headers: headers
  }, JSON.stringify(data))
}

function downloadFile(path, token) {
  return request({
    hostname: 'firebasestorage.googleapis.com',
    path: path,
    method: 'GET',
    headers: {
      authorization: 'Firebase ' + token
    }
  }, null, true)
}

async function login(email) {
  try {
    if (!email) throw new Error('Email is required.')

    const check = await googleRequest('/createAuthUri', {
      identifier: email,
      continueUri: 'http://localhost'
    })

    if (!check.registered) throw new Error('Email is not registered.')

    const result = await googleRequest('/getOobConfirmationCode', {
      requestType: 6,
      email: email,
      androidInstallApp: true,
      canHandleCodeInApp: true,
      continueUrl: 'https://alightcreative.com?ui_sid=9448689949&ui_sd=0',
      iosBundleId: 'com.alightcreative.motion',
      androidPackageName: 'com.alightcreative.motion',
      androidMinimumVersion: '585',
      clientType: 'CLIENT_TYPE_ANDROID'
    })

    return {
      success: true,
      result: result
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}

async function verifyLink(url, email) {
  try {
    if (!url.includes('https://alight-creative.firebaseapp.com/__/auth/links')) {
      throw new Error('Invalid url.')
    }

    const innerLink = new URL(url).searchParams.get('link')
    const oobCode = new URL(innerLink).searchParams.get('oobCode')

    const result = await googleRequest('/emailLinkSignin', {
      email: email,
      oobCode: oobCode,
      clientType: 'CLIENT_TYPE_ANDROID'
    })

    return {
      success: true,
      result: result
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}

async function refreshTokens(refreshToken) {
  try {
    if (!refreshToken) throw new Error('Refresh token is required.')

    const result = await secureTokenRequest({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })

    return {
      success: true,
      result: result
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}

async function accountInfo(token) {
  try {
    if (!token) throw new Error('Token is required.')

    const result = await googleRequest('/getAccountInfo', {
      idToken: token
    })

    return {
      success: true,
      result: result
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}

async function getPresetMetadata(url) {
  try {
    const match = url.match(/\/u\/([^\/]+)\/p\/([^\/\?#]+)/)

    if (!match) throw new Error('Invalid url.')

    const result = await alightRequest('/getProjectMetadata', {
      data: {
        uid: match[1],
        pid: match[2],
        platform: 'android',
        appBuild: 1028417,
        acctTestMode: 'normal'
      }
    })

    return {
      success: true,
      result: result.result
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}

async function getPresetDownload(url, token) {
  try {
    if (!token) throw new Error('Token is required.')

    const match = url.match(/\/u\/([^\/]+)\/p\/([^\/\?#]+)/)

    if (!match) throw new Error('Invalid url.')

    const download = await alightRequest('/requestProjectDownload', {
      data: {
        uid: match[1],
        pid: match[2],
        platform: 'android',
        appBuild: 1028417,
        liteVersion: false,
        acctTestMode: 'normal'
      }
    }, token)

    if (!download.result || !download.result.downloadUri) {
      throw new Error('DownloadUri not found.')
    }

    const file = await downloadFile(
      '/v0/b/alight-creative.appspot.com/o/' +
      encodeURIComponent(download.result.downloadUri) +
      '?alt=media',
      token
    )

    return {
      success: true,
      result: file
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}

const input = process.argv[2] || 'https://alightcreative.com/am/share/u/PcAXT2rWG6fN7uII1zrw9ld4f9G2/p/ORp2VxLWge-ebec08bb3e641792'

getPresetMetadata(input).then(function(r) {
  console.log(JSON.stringify(r, null, 2))
})