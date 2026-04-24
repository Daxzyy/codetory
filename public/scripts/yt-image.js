'use strict';

const axios   = require('axios');
const cheerio = require('cheerio');

// ── Core scraper ──────────────────────────────────────────────
const PAGE_CONFIG = {
    thumb: {
        page:     'https://imageyoutube.com/thumbnail-download/',
        endpoint: 'https://imageyoutube.com/thumbnail-download/imgyt',
        extra:    { usertimezone: 'Asia/Jakarta', device: 'computer' },
        field:    'v',
    },
    profile: {
        page:     'https://imageyoutube.com/profile-photo-download/',
        endpoint: 'https://imageyoutube.com/profile-photo-download/imgyt',
        extra:    { mcountry: 'en' },
        field:    'v',
    },
    banner: {
        page:     'https://imageyoutube.com/banner-download/',
        endpoint: 'https://imageyoutube.com/banner-download/imgyt',
        extra:    { mcountry: 'en' },
        field:    'v',
    },
    comment: {
        page:     'https://imageyoutube.com/comment-images/',
        endpoint: 'https://imageyoutube.com/comment-images/imgyt',
        extra:    { usertimezone: 'Asia/Jakarta', device: 'computer' },
        field:    'v',
    },
};

async function fetchResult(url, mode) {
    const cfg = PAGE_CONFIG[mode];
    if (!cfg) throw new Error('Mode tidak valid');

    const pageRes = await axios.get(cfg.page, {
        headers:  { 'User-Agent': 'Mozilla/5.0' },
        timeout:  15000,
        maxRedirects: 5,
    });

    const cookie = (pageRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
    const \$page  = cheerio.load(pageRes.data);
    const csrf   = \$page('input[name=csrf_token]').val() || '';

    const body = new URLSearchParams({
        [cfg.field]: url,
        csrf_token:  csrf,
        ...cfg.extra,
    }).toString();

    const res = await axios.post(cfg.endpoint, body, {
        headers: {
            'Content-Type':       'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With':   'XMLHttpRequest',
            'Cookie':             cookie,
            'Origin':             'https://imageyoutube.com',
            'Referer':            cfg.page,
            'User-Agent':         'Mozilla/5.0',
        },
        timeout: 20000,
    });

    return res.data;
}

function parseThumbOrProfile(html) {
    const \$   = cheerio.load(html);
    const out = { thumbnails: [], profile: [], banner: [], frames: { start: [], middle: [], end: [] } };

    \$('section').each((_, el) => {
        const title = \$(el).find('h5').text().toLowerCase();
        const items = [];
        \$(el).find('a[href]').each((_, a) => {
            const href  = \$(a).attr('href');
            const label = \$(a).text().trim() || \$(a).find('button').text().trim() || null;
            if (href) items.push({ resolution: label, url: href });
        });
        if (!items.length) return;
        if (title.includes('profile'))         out.profile        = items;
        else if (title.includes('banner'))     out.banner         = items;
        else if (title.includes('player'))     out.thumbnails     = items;
        else if (title.includes('start'))      out.frames.start   = items;
        else if (title.includes('middle'))     out.frames.middle  = items;
        else if (title.includes('end'))        out.frames.end     = items;
    });

    return out;
}

function parseComment(html) {
    const \$    = cheerio.load(html);
    const list = [];
    \$('.youtube-image-options a, section a[href]').each((_, el) => {
        const url = \$(el).attr('href');
        const res = \$(el).find('button').text().trim() || \$(el).text().trim();
        if (url) list.push({ resolution: res, url });
    });
    return list;
}

// ── Ambil video ID dari berbagai format link ───────────────────
function extractVideoId(input) {
    const m = input.match(/(?:v=|youtu\\.be\\/|\\/shorts\\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
}

// ── Handler ───────────────────────────────────────────────────
const handler = async (m, { manzxy, args, text, command, reply }) => {
    const sub = command === 'ytimage' ? (args[0] || '').toLowerCase() : command;
    const url = command === 'ytimage' ? args.slice(1).join(' ').trim() : text;

    /* Help */
    if (!sub || !url) return reply(
        \`🎬 *YouTube Image Downloader*\\n\` +
        \`\${'─'.repeat(30)}\\n\\n\` +
        \`*Command:*\\n\` +
        \`• *.ytthumb <link>* — thumbnail video\\n\` +
        \`• *.ytprofile <link>* — foto profil channel\\n\` +
        \`• *.ytbanner <link>* — banner channel\\n\` +
        \`• *.ytcomment <link>* — gambar komentar\\n\\n\` +
        \`*Atau pakai:*\\n\` +
        \`• *.ytimage thumb <link>*\\n\` +
        \`• *.ytimage profile <link>*\\n\\n\` +
        \`*Contoh:*\\n\` +
        \`_.ytthumb https://youtu.be/SO28AlBZvO8_\`
    );

    const MODE_MAP = {
        ytthumb:    'thumb',
        ytprofile:  'profile',
        ytbanner:   'banner',
        ytcomment:  'comment',
        thumb:      'thumb',
        profile:    'profile',
        banner:     'banner',
        comment:    'comment',
    };

    const mode = MODE_MAP[sub];
    if (!mode) return reply(\`❌ Mode tidak valid.\\nPilihan: thumb | profile | banner | comment\`);

    // Validasi: perlu URL YouTube
    if (!/youtu/.test(url) && !/youtube\\.com/.test(url)) {
        return reply(\`❌ Masukkan link YouTube yang valid.\\nContoh: _https://youtu.be/xxxxx_\`);
    }

    const sent = await manzxy.sendMessage(m.chat, { text: '⏳ _mengambil gambar..._' }, { quoted: m });
    const edit  = txt => manzxy.sendMessage(m.chat, { text: txt, edit: sent.key });

    try {
        const html = await fetchResult(url, mode);

        if (mode === 'comment') {
            const list = parseComment(html);
            if (!list.length) return edit('❌ Tidak ada gambar ditemukan.');

            await manzxy.sendMessage(m.chat, { delete: sent.key });

            // Kirim semua ukuran
            for (const item of list.slice(0, 4)) {
                await manzxy.sendMessage(m.chat, {
                    image:   { url: item.url },
                    caption: \`🖼️ \${item.resolution || 'Gambar Komentar'}\`,
                }, { quoted: m });
            }
            return;
        }

        const data = parseThumbOrProfile(html);

        let items = [];
        if (mode === 'thumb')   items = data.thumbnails;
        if (mode === 'profile') items = data.profile;
        if (mode === 'banner')  items = data.banner;

        if (!items.length) return edit('❌ Tidak ada gambar ditemukan. Pastikan link valid.');

        await manzxy.sendMessage(m.chat, { delete: sent.key });

        const MODE_LABEL = {
            thumb:   '🖼️ Thumbnail',
            profile: '👤 Foto Profil',
            banner:  '🎨 Banner',
        };

        // Kirim gambar terbaik (ukuran terbesar biasanya di atas)
        for (const item of items.slice(0, 3)) {
            await manzxy.sendMessage(m.chat, {
                image:   { url: item.url },
                caption: \`\${MODE_LABEL[mode] || '📷'} — \${item.resolution || '-'}\`,
            }, { quoted: m });
        }

        // Info extra: frames kalau ada
        if (mode === 'thumb') {
            const allFrames = [
                ...data.frames.start,
                ...data.frames.middle,
                ...data.frames.end,
            ];
            if (allFrames.length) {
                let info = \`📽️ *Frame tersedia (\${allFrames.length})*\\n\`;
                info += allFrames.slice(0, 6).map((f, i) => \`\${i+1}. \${f.resolution} → \${f.url}\`).join('\\n');
                await manzxy.sendMessage(m.chat, { text: info }, { quoted: m });
            }
        }

    } catch (e) {
        console.error('[ytimage]', e.message);
        await edit('❌ gagal: ' + e.message);
    }
};

handler.command = ['ytimage', 'ytthumb', 'ytprofile', 'ytbanner', 'ytcomment'];
handler.tags    = ['downloader'];
handler.limit   = true;
handler.fitur   = {
    ytimage:   'download gambar dari YouTube (thumb/profile/banner/comment)',
    ytthumb:   'download thumbnail video YouTube',
    ytprofile: 'download foto profil channel YouTube',
    ytbanner:  'download banner channel YouTube',
    ytcomment: 'download gambar komentar YouTube',
};

module.exports = handler;