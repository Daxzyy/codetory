> const axios = require('axios');
const crypto = require('crypto');

async function megadl(url) {
    const match = url.match(/mega\.nz\/(?:file|folder)\/([a-zA-Z0-9_-]+)#([a-zA-Z0-9_-]+)/);
    if (!match) throw new Error('Invalid MEGA URL');

    const fileId = match[1];
    const keyBuf = Buffer.from(match[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    const a32 = [];
    for (let i = 0; i < 8; i++) a32.push(keyBuf.readUInt32BE(i * 4));

    const aesKey = Buffer.alloc(16);
    for (let i = 0; i < 4; i++) aesKey.writeUInt32BE((a32[i] ^ a32[i + 4]) >>> 0, i * 4);

    const { data } = await axios.post(
        'https://g.api.mega.co.nz/cs',
        [{ a: 'g', g: 1, p: fileId }]
    );

    const res = data[0];
    if (typeof res === 'number') throw new Error(`MEGA API error: ${res}`);

    const atBuf = Buffer.from(res.at.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const decipher = crypto.createDecipheriv('aes-128-cbc', aesKey, Buffer.alloc(16));
    decipher.setAutoPadding(false);
    const dec = Buffer.concat([decipher.update(atBuf), decipher.final()]);

    const atStr = dec.toString('utf8').replace(/\0+$/, '');
    if (!atStr.startsWith('MEGA{')) throw new Error('Attribute decryption failed');

    const { n: filename } = JSON.parse(atStr.slice(4));

    return {
        url: res.g,
        filename,
        size: res.s
    };
}
return megadl("https://mega.nz/file/p4YFyRCK#zVv8OJ-Rd9O3h6_7BUdnHw2YpzjU7RTC2nzUcqFnkH4")