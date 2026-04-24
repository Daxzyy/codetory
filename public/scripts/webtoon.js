import fs from 'fs';
import axios from 'axios';
import PDFDocument from 'pdfkit';
import {
    finished
} from 'stream/promises';
import sharp from 'sharp';

const TMP_DIR = './tmp';
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

const WEBTOON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'image/webp,image/apng,image/,/;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.webtoons.com/',
    'Origin': 'https://www.webtoons.com'
};

const getBuffer = async (url) => {
    try {
        const res = await axios.get(url, {
            headers: WEBTOON_HEADERS,
            responseType: 'arraybuffer',
            timeout: 20000
        });
        return Buffer.from(res.data);
    } catch {
        return null;
    }
};

const downloadImage = async (url, path) => {
    const res = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        headers: WEBTOON_HEADERS,
        timeout: 20000,
        validateStatus: s => s < 500
    });

    if (res.status !== 200) throw new Error('Bad image');

    const writer = fs.createWriteStream(path);
    res.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
};

let handler = async (m, {
    args,
    conn
}) => {
    const subcommand = (args[0] || '').toLowerCase();

    switch (subcommand) {

        case 'search': {
            const keyword = args.slice(1).join(' ');
            if (!keyword) return m.reply('Masukkan judul webtoon');

            await m.reply('Mencari...');

            try {
                const url = global.API('theresav', '/manga/webtoon/search', {
                    q: encodeURIComponent(keyword)
                }, 'apikey');

                const {
                    data
                } = await axios.get(url);

                if (!data?.status || !data?.result)
                    return m.reply('Tidak ditemukan');

                const all = [...(data.result.original || []), ...(data.result.canvas || [])];

                const seen = new Set();
                const unique = all.filter(v => {
                    if (!v?.link) return false;
                    if (seen.has(v.link)) return false;
                    seen.add(v.link);
                    return true;
                });

                if (!unique.length) return m.reply('Tidak ditemukan');

                let rows = unique.map(v => ({
                    header: v.viewCount || '',
                    title: v.title || 'No title',
                    description: v.author || '-',
                    id: \`.webtoon detail \${v.link}\`
                }));

                await conn.sendMessage(m.chat, {
                    text: \`Hasil pencarian \${keyword}\`,
                    footer: \`Original: \${data.total_original} | Canvas: \${data.total_canvas}\`,
                    buttons: [{
                        buttonId: 'action',
                        buttonText: {
                            displayText: 'Pilih Webtoon'
                        },
                        type: 4,
                        nativeFlowInfo: {
                            name: 'single_select',
                            paramsJson: JSON.stringify({
                                title: 'List Webtoon',
                                sections: [{
                                    title: 'Hasil',
                                    rows
                                }]
                            })
                        }
                    }],
                    viewOnce: true
                }, {
                    quoted: m
                });

            } catch (e) {
                console.error('SEARCH ERROR:', e?.response?.data || e.message);
                m.reply('Error API');
            }
            break;
        }

        case 'detail': {
            let url = args[1];
            if (!url) return m.reply('Link tidak valid');

            url = decodeURIComponent(url);

            await m.reply('Mengambil detail...');

            try {
                const apiUrl = global.API('theresav', '/manga/webtoon/detail', {
                    url
                }, 'apikey');

                const {
                    data
                } = await axios.get(apiUrl);

                if (!data?.status || !data?.result)
                    return m.reply('Gagal mengambil detail');

                const r = data.result;

                let teks = \`\${r.title || '-'}\\n\`;
                teks += \`Genre: \${r.genre || '-'}\\n\`;
                teks += \`Author: \${r.authors?.join(', ') || '-'}\\n\`;
                teks += \`Views: \${r.stats?.views || '-'} | Subs: \${r.stats?.subscribers || '-'}\\n\\n\`;
                teks += \`\${r.description || '-'}\`;

                const thumbBuffer = await getBuffer(r.thumbnail);

                if (!r.episodes?.length) {
                    return conn.sendMessage(m.chat, {
                        ...(thumbBuffer ? {
                            image: thumbBuffer
                        } : {}),
                        caption: teks + '\\n\\n(Tidak ada episode)'
                    }, {
                        quoted: m
                    });
                }

                const rows = r.episodes.map(ep => ({
                    id: \`.webtoon download \${ep.link}\`,
                    title: ep.title || 'No title',
                    description: \`\${ep.episodeNumber || '-'} • \${ep.date || '-'} • ❤️ \${ep.likes || 0}\`
                }));

                await conn.sendMessage(m.chat, {
                    ...(thumbBuffer ? {
                        image: thumbBuffer
                    } : {}),
                    caption: teks,
                    footer: \`Total Episode: \${r.episodes.length}\`,
                    buttons: [{
                        buttonId: 'action',
                        buttonText: {
                            displayText: 'Pilih Episode'
                        },
                        type: 4,
                        nativeFlowInfo: {
                            name: 'single_select',
                            paramsJson: JSON.stringify({
                                title: 'Episode',
                                sections: [{
                                    title: 'List Episode',
                                    rows
                                }]
                            })
                        }
                    }]
                }, {
                    quoted: m
                });

            } catch (e) {
                console.error('DETAIL ERROR:', e?.response?.data || e.message);
                m.reply('Error detail');
            }
            break;
        }

        case 'download': {
            let url = args[1];
            if (!url || !url.startsWith('http'))
                return m.reply('Link tidak valid');

            url = decodeURIComponent(url);

            await m.reply('Download & membuat PDF...');

            try {
                const apiUrl = global.API('theresav', '/manga/webtoon/download', {
                    url
                }, 'apikey');

                const {
                    data
                } = await axios.get(apiUrl);

                if (!data?.status || !data?.images)
                    return m.reply('Gagal ambil data');

                const images = data.images;

                const cleanName = (data.title || 'webtoon')
                    .replace(/[^\\w\\s]/gi, '')
                    .replace(/\\s+/g, '-');

                const pdfPath = \`\${TMP_DIR}/\${Date.now()}.pdf\`;
                const imgPaths = [];

                const limit = 5;

                for (let i = 0; i < images.length; i += limit) {
                    const batch = images.slice(i, i + limit);

                    const results = await Promise.allSettled(
                        batch.map((img, idx) => {
                            const path = \`\${TMP_DIR}/\${Date.now()}-\${i + idx}.jpg\`;
                            return downloadImage(img, path).then(() => path);
                        })
                    );

                    results.forEach(r => {
                        if (r.status === 'fulfilled') imgPaths.push(r.value);
                    });
                }

                if (!imgPaths.length) return m.reply('Semua gambar gagal');

                const doc = new PDFDocument({
                    autoFirstPage: false,
                    margin: 0
                });
                const stream = fs.createWriteStream(pdfPath);
                doc.pipe(stream);

                for (const img of imgPaths) {
                    try {
                        const meta = await sharp(img).metadata();
                        doc.addPage({
                            size: [meta.width, meta.height],
                            margin: 0
                        });
                        doc.image(img, 0, 0, {
                            width: meta.width,
                            height: meta.height
                        });
                    } catch {}

                    try {
                        fs.unlinkSync(img);
                    } catch {}
                }

                doc.end();
                await finished(stream);

                await conn.sendMessage(m.chat, {
                    document: fs.readFileSync(pdfPath),
                    mimetype: 'application/pdf',
                    fileName: cleanName + '.pdf',
                    caption: \`📖 \${data.title}\\nTotal: \${data.total || imgPaths.length} halaman\`
                }, {
                    quoted: m
                });

                fs.unlinkSync(pdfPath);

            } catch (e) {
                console.error('DOWNLOAD ERROR:', e?.response?.data || e.message);
                m.reply('Error download');
            }
            break;
        }

        default:
            m.reply(
                '.webtoon search <judul>\\n' +
                '.webtoon detail <url>\\n' +
                '.webtoon download <url>'
            );
    }
};

handler.command = /^(webtoon)\$/i;
handler.help = [
    'webtoon search <judul>',
    'webtoon detail <url>',
    'webtoon download <url>'
];
handler.tags = ['anime'];
handler.limit = true;
handler.register = true;

export default handler;