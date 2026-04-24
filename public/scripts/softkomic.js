import fs from 'fs';
import axios from 'axios';
import PDFDocument from 'pdfkit';
import {
    finished
} from 'stream/promises';
import sharp from 'sharp';

const TMP_DIR = './tmp';
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

const HEADERS = {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'image/webp,image/,/;q=0.8',
    'Referer': 'https://softkomik.co/'
};

const getBuffer = async (url) => {
    try {
        const res = await axios.get(url, {
            headers: HEADERS,
            responseType: 'arraybuffer'
        });
        return Buffer.from(res.data);
    } catch {
        return null;
    }
};

const downloadImage = async (url, dest) => {
    const res = await axios.get(url, {
        headers: HEADERS,
        responseType: 'arraybuffer',
        validateStatus: s => s < 500
    });

    if (res.status !== 200) throw new Error('Bad image');

    await sharp(Buffer.from(res.data))
        .jpeg({
            quality: 90
        })
        .toFile(dest);
};

let handler = async (m, {
    args,
    conn
}) => {
    const cmd = (args[0] || '').toLowerCase();

    switch (cmd) {

        case 'search': {
            const q = args.slice(1).join(' ');
            if (!q) return m.reply('Masukkan judul');

            await m.reply('Mencari...');

            try {
                const {
                    data
                } = await axios.get(
                    global.API('theresav', '/manga/softkomik/search', {
                        q
                    }, 'apikey')
                );

                if (!data?.status || !data?.result?.length)
                    return m.reply('Tidak ditemukan');

                const rows = data.result.map(v => ({
                    title: v.title,
                    description: v.href,
                    id: \`.softkomik detail \${encodeURIComponent(v.href)}\`
                }));

                await conn.sendMessage(m.chat, {
                    text: \`Hasil: \${q}\`,
                    footer: \`Total: \${data.total}\`,
                    buttons: [{
                        buttonId: 'action',
                        buttonText: {
                            displayText: 'Pilih'
                        },
                        type: 4,
                        nativeFlowInfo: {
                            name: 'single_select',
                            paramsJson: JSON.stringify({
                                title: 'List Komik',
                                sections: [{
                                    title: 'Hasil',
                                    rows
                                }]
                            })
                        }
                    }]
                }, {
                    quoted: m
                });

            } catch (e) {
                console.error(e);
                m.reply('Error search');
            }
            break;
        }

        case 'detail': {
            let url = args[1];
            if (!url) return m.reply('Link tidak valid');

            url = decodeURIComponent(url);

            await m.reply('Mengambil detail...');

            try {
                const {
                    data
                } = await axios.get(
                    global.API('theresav', '/manga/softkomik/info', {
                        url
                    }, 'apikey')
                );

                if (!data?.status) return m.reply('Gagal');

                const r = data.result;

                let teks = \`📖 \${r.title}\\n\`;
                teks += \`Genre: \${(r.genres || []).join(', ') || '-'}\\n\\n\`;
                teks += \`\${r.synopsis || '-'}\`;

                const thumb = await getBuffer(r.thumbnail);

                const chapters = r.chapters.filter(v =>
                    v.href.includes('/chapter/')
                );

                if (!chapters.length) {
                    return conn.sendMessage(m.chat, {
                        ...(thumb ? {
                            image: thumb
                        } : {}),
                        caption: teks + '\\n\\n(Tidak ada chapter)'
                    }, {
                        quoted: m
                    });
                }

                const rows = chapters.map(ch => ({
                    title: ch.title,
                    description: ch.date || '-',
                    id: \`.softkomik download \${encodeURIComponent(ch.href)}\`
                }));

                await conn.sendMessage(m.chat, {
                    ...(thumb ? {
                        image: thumb
                    } : {}),
                    caption: teks,
                    footer: \`Total Chapter: \${chapters.length}\`,
                    buttons: [{
                        buttonId: 'action',
                        buttonText: {
                            displayText: 'Pilih Chapter'
                        },
                        type: 4,
                        nativeFlowInfo: {
                            name: 'single_select',
                            paramsJson: JSON.stringify({
                                title: 'Chapter',
                                sections: [{
                                    title: 'List',
                                    rows
                                }]
                            })
                        }
                    }]
                }, {
                    quoted: m
                });

            } catch (e) {
                console.error(e);
                m.reply('Error detail');
            }
            break;
        }

        case 'download': {
            let url = args[1];
            if (!url) return m.reply('Link tidak valid');

            url = decodeURIComponent(url);

            await m.reply('Download PDF...');

            try {
                const {
                    data
                } = await axios.get(
                    global.API('theresav', '/manga/softkomik/download', {
                        url
                    }, 'apikey')
                );

                if (!data?.status || !data?.result?.length)
                    return m.reply('Gagal ambil gambar');

                const images = data.result
                    .map(v => v.image)
                    .filter(v => v && v.startsWith('http') && !v.includes('sharethis'));

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

                if (!imgPaths.length) return m.reply('Semua gagal');

                const doc = new PDFDocument({
                    autoFirstPage: false,
                    margin: 0
                });
                const stream = fs.createWriteStream(pdfPath);
                doc.pipe(stream);

                for (const img of imgPaths) {
                    const meta = await sharp(img).metadata();

                    doc.addPage({
                        size: [meta.width, meta.height],
                        margin: 0
                    });

                    doc.image(img, 0, 0, {
                        width: meta.width,
                        height: meta.height
                    });

                    fs.unlinkSync(img);
                }

                doc.end();
                await finished(stream);

                await conn.sendMessage(m.chat, {
                    document: fs.readFileSync(pdfPath),
                    mimetype: 'application/pdf',
                    fileName: \`softkomik.pdf\`,
                    caption: \`📄 Total: \${imgPaths.length} halaman\`
                }, {
                    quoted: m
                });

                fs.unlinkSync(pdfPath);

            } catch (e) {
                console.error(e);
                m.reply('Error download');
            }
            break;
        }

        default:
            m.reply(
                '.softkomik search <judul>\\n' +
                '.softkomik detail <url>\\n' +
                '.softkomik download <url>'
            );
    }
};

handler.command = /^(softkomik)\$/i;
handler.tags = ['anime'];
handler.help = [
    'softkomik search <judul>',
    'softkomik detail <url>',
    'softkomik download <url>'
];
handler.limit = true;

export default handler;