const axios = require('axios');
const FormData = require('form-data');

async function catbox(image) {
    try {
        if (!Buffer.isBuffer(image)) throw new Error('Image must be a buffer.');
        
        const form = new FormData();
        form.append('userhash', '');
        form.append('reqtype', 'fileupload');
        form.append('reqtype', 'fileupload');
        form.append('userhash', '');
        form.append('fileToUpload', image, `${Date.now()}_rynn.jpg`);
        
        const { headers } = await axios.get('https://catbox.moe/');
        const { data } = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: {
                ...form.getHeaders(),
                cookie: headers['set-cookie'].join('; '),
                origin: 'https://catbox.moe',
                referer: 'https://catbox.moe/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
                'x-requested-with': 'XMLHttpRequest'
            }
        });
        
        return data;
    } catch (error) {
        throw new Error(error.message);
    }
}

// Usage:
const fs = require('fs');
catbox(fs.readFileSync('./ex/image.jpg')).then(console.log);
