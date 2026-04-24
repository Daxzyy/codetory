import fs from 'fs';
import crypto from 'crypto';
import sizeOf from 'image-size';

export async function upscale(path) {
    try {
        const buf = fs.readFileSync(path);
        const stat = fs.statSync(path);
        const dim = sizeOf(buf);
        const name = path.split('/').pop();

        // upload image to tmpfiles
        const f = new FormData();
        f.append('file', new Blob([buf]), name);
        const up = await fetch('https://tmpfiles.org/api/v1/upload', {
            method: 'POST',
            body: f
        }).then(r => r.json());
        if (!up?.data?.url) throw 'upload tmpfiles gagal';
        const imgUrl = up.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');

        // login & get apikey/cookies
        const id = crypto.randomBytes(4).toString('hex');
        const login = await fetch('https://bigjpg.com/login', {
            method: 'POST',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                username: \`user_\${id}@gmail.com\`,
                password: \`Pass\${id}123\`
            })
        });

        const loginJson = await login.json();
        if (loginJson.status !== 'ok') throw 'login gagal';

        const cookie = login.headers.getSetCookie().map(v => v.split(';')[0]).join('; ');

        // submit task
        const task = await fetch('https://bigjpg.com/api/task/', {
            method: 'POST',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
                'Referer': 'https://bigjpg.com/',
                'Origin': 'https://bigjpg.com'
            },
            body: new URLSearchParams({
                conf: JSON.stringify({
                    style: 'photo', // 'art' atau 'photo
                    noise: '3', // Level denoise (-1 s/d 3)
                    x2: '2', // Perbesaran '1' (2x), '2' (4x)
                    input: imgUrl,
                    file_name: name,
                    files_size: stat.size,
                    file_width: dim.width,
                    file_height: dim.height
                })
            })
        }).then(r => r.json());

        const tid = task.tid || task?.[0];
        if (!tid) throw 'task id null';

        // polling
        let final;
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const chk = await fetch(\`https://bigjpg.com/api/task/\${tid}\`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cookie': cookie
                }
            }).then(r => r.json());

            const t = chk?.[tid];
            if (!t) continue;
            if (t.status === 'error') throw 'server error';
            if (t.status === 'success') {
                final = t.url;
                break;
            }
        }

        if (!final) throw 'timeout';
        console.log(\`original: \${imgUrl}\\nresult: \${final}\`);

    } catch (e) {
        console.error('❌', e);
        throw e;
    }
}
// useage
upscale('./test.png')
/* respon
original: http://tmpfiles.org/dl/.../test.png
result: https://dcdn.disk.zipjpg.com/reg/....png?x-oss-process=image/format,png&big.png
*/

// sample result:
// origin: https://qu.ax/x/giHKR.png
// result: https://qu.ax/x/oxGXN.png