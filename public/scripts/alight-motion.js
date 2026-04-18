const axios = require('axios');

class AlightMotion {
    constructor(options = {}) {
        this.email = options.email || null;
        this.initialize = false;
        this.token = null;
        this.refreshToken = null;
        
        this.google = axios.create({
            baseURL: 'https://www.googleapis.com/identitytoolkit/v3/relyingparty',
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
            },
            params: {
                key: 'AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0'
            }
        });
        
        this.alight = axios.create({
            baseURL: 'https://us-central1-alight-creative.cloudfunctions.net',
            headers: {
                'accept-encoding': 'gzip',
                'content-type': 'application/json; charset=utf-8',
                'firebase-instance-id-token': 'fc6bqgfcTGu_ZBBe4tVPwV:APA91bFHrAkrm7xVzZDvQbuK51muxf72x391Zv7dgsAWikyQoaBrO60JlfEHotVWThR7ZL7h5xWCg8peCtVA09Eq41i0VXpgYmMBRBFZubgqvVnh42AYQjg',
                'user-agent': 'okhttp/4.12.0',
                'x-firebase-appcheck': 'eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ=='
            }
        });
    }
    
    login = async function () {
        try {
            if (!this.email) throw new Error('Email is required.');
            if (this.initialize) return;
            
            const { data: a } = await this.google.post('/createAuthUri', {
                identifier: this.email,
                continueUri: 'http://localhost'
            });
            
            if (!a.registered) throw new Error('Email is not registered.');
            
            const { data } = await this.google.post('/getOobConfirmationCode', {
                requestType: 6,
                email: this.email,
                androidInstallApp: true,
                canHandleCodeInApp: true,
                continueUrl: 'https://alightcreative.com?ui_sid=9448689949&ui_sd=0',
                iosBundleId: 'com.alightcreative.motion',
                androidPackageName: 'com.alightcreative.motion',
                androidMinimumVersion: '585',
                clientType: 'CLIENT_TYPE_ANDROID'
            });
            
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    verifyLink = async function (url) {
        try {
            if (!url.includes('https://alight-creative.firebaseapp.com/__/auth/links')) throw new Error('Invalid url.');
            
            const innerLink = new URL(url).searchParams.get('link');
            const oobCode = new URL(innerLink).searchParams.get('oobCode');
            
            const { data } = await this.google.post('/emailLinkSignin', {
                email: this.email,
                oobCode: oobCode,
                clientType: 'CLIENT_TYPE_ANDROID'
            });
            
            this.initialize = true;
            this.alight.defaults.headers.common['authorization'] = `Bearer ${data.idToken}`;
            this.token = data.idToken;
            this.refreshToken = data.refresh_token;
            
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    refreshTokens = async function (re) {
        try {
            if (!re && !this.refreshToken) throw new Error('Refresh token is required.');
            
            const { data } = await this.google.post('https://securetoken.googleapis.com/v1/token', {
                grant_type: 'refresh_token',
                refresh_token: re || this.refreshToken
            }, {
                params: {
                    key: 'AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0'
                }
            });
            
            this.initialize = true;
            this.alight.defaults.headers.common['authorization'] = `Bearer ${data.idToken}`;
            this.token = data.idToken;
            this.refreshToken = data.refresh_token;
            
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    accountInfo = async function () {
        try {
            if (!this.initialize) throw new Error('Login first.');
            
            const { data } = await this.google.post('/getAccountInfo', {
                idToken: this.token
            });
            
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    getPresetMetadata = async function (url) { // No login required
        try {
            const match = url.match(/\/u\/([^\/]+)\/p\/([^\/\?#]+)/);
            if (!match) throw new Error('Invalid url.');
            
            const { data } = await this.alight.post('/getProjectMetadata', {
                data: {
                    uid: match[1],
                    pid: match[2],
                    platform: 'android',
                    appBuild: 1028417,
                    acctTestMode: 'normal'
                }
            });
            
            return data.result;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    getPresetDownload = async function (url) {
        try {
            if (!this.initialize) throw new Error('Login first.');
            
            const match = url.match(/\/u\/([^\/]+)\/p\/([^\/\?#]+)/);
            if (!match) throw new Error('Invalid url.');
            
            const { data: a } = await this.alight.post('/requestProjectDownload', {
                data: {
                    uid: match[1],
                    pid: match[2],
                    platform: 'android',
                    appBuild: 1028417,
                    liteVersion: false,
                    acctTestMode: 'normal'
                }
            });
            
            if (!a.result.downloadUri) throw new Error('DownloadUri not found.');
            
            const { data } = await axios.get(`https://firebasestorage.googleapis.com/v0/b/alight-creative.appspot.com/o/${encodeURIComponent(a.result.downloadUri)}?alt=media`, {
                headers: {
                    authorization: `Firebase ${this.token}`
                },
                responseType: 'arraybuffer'
            });
            
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

// Usage:
const am = new AlightMotion();
am.getPresetMetadata('https://alightcreative.com/am/share/u/x4tThs8XerfqEPEq1kKoprJCBdR2/p/lZY0V9q97T-e2412874534b2079').then(console.log);
