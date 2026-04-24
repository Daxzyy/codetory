/**
 * @project  : Shizuku-AI (FF Lobby Maker)
 * @author   : @ryuukaaaaaaa
 * @desc     : Create fake FF lobby with custom name using FFmpeg
 */

import { exec } from 'child_process'
import fs from 'fs'
import axios from 'axios'

const imageUrls = {
    1:  'https://cloud-fukushima.vercel.app/uploader/8fjhd6ftps.jpg',
    2:  'https://cloud-fukushima.vercel.app/uploader/oz8hb4ow75.jpg',
    3:  'https://cloud-fukushima.vercel.app/uploader/tvz1cie8df.jpg',
    4:  'https://cloud-fukushima.vercel.app/uploader/yo9sg4vmo3.jpg',
    5:  'https://files.catbox.moe/cuatgd.jpg',
    6:  'https://files.catbox.moe/kfl1lb.jpg',
    7:  'https://files.catbox.moe/8vyh2k.jpg',
    8:  'https://files.catbox.moe/jxzw2r.jpg',
    9:  'https://files.catbox.moe/mmgua4.jpg',
    10: 'https://files.catbox.moe/rcgn6z.jpg',
    11: 'https://files.catbox.moe/v2np8h.jpg'
}

const TOTAL = Object.keys(imageUrls).length

let handler = async (m, { conn, text, command }) => {
    // Menggunakan global.prefix sesuai permintaanmu
    const pref = global.prefix 
    
    if (!text) return m.reply(\`*Format salah!*\\n\\nContoh: \${pref + command} 1|Kyuu Depeloger\`)

    const match = text.trim().match(/^(\\d+)\\s[|\\uff5c\\/]\\s(.+)\$/)
    if (!match) return m.reply(\`*Format salah!*\\n\\nPastikan menggunakan pemisah | (pipe).\\nContoh: \${pref + command} 5|Kyuu\`)

    const num  = match[1]
    const name = match[2].trim()

    const imageUrl = imageUrls[parseInt(num)]
    if (!imageUrl) return m.reply(\`Template [ \${num} ] tidak tersedia. Pilih 1-\${TOTAL}.\`)

    const fontPath = \`/home/container/library/ff-solo/TeutonNormal.otf\`
    if (!fs.existsSync(fontPath)) return m.reply(\`Font system tidak ditemukan.\`)

    const timestamp     = Date.now()
    const tempImagePath = \`./tmp_raw_\${timestamp}.jpg\`
    const outputPath    = \`./tmp_ff_\${timestamp}.jpg\`

    const cleanup = () => {
        [tempImagePath, outputPath].forEach(f => {
            if (fs.existsSync(f)) fs.unlinkSync(f)
        })
    }

    try {
        await m.react('⏳')

        const res = await axios.get(imageUrl, { responseType: 'arraybuffer' })
        fs.writeFileSync(tempImagePath, Buffer.from(res.data))

        const nameLen  = name.length
        const fontSize = nameLen <= 6 ? 'w*0.055' : nameLen <= 10 ? 'w*0.045' : 'w*0.035'
        const safeName = name.trim().replace(/'/g, "\\\\'").replace(/:/g, '\\\\:')

        // FFmpeg Command - Drawing Name
        const ffCmd = [
            'ffmpeg -y',
            \`-i "\${tempImagePath}"\`,
            \`-vf "drawtext=fontfile='\${fontPath}':text='\${safeName}':x=((w-text_w)/2)+(w*0.02):y=h*0.80-(text_h/2):fontsize=\${fontSize}:fontcolor=yellow:shadowcolor=black:shadowx=3:shadowy=3"\`,
            \`-q:v 2\`,
            \`"\${outputPath}"\`
        ].join(' ')

        await new Promise((resolve, reject) => {
            exec(ffCmd, (err, stdout, stderr) => {
                if (err) reject(new Error(stderr || err.message))
                else resolve()
            })
        })

        const imageBuffer = fs.readFileSync(outputPath)

        await conn.sendMessage(m.chat, {
            image: imageBuffer,
            caption: \`乂  *F R E E  F I R E  L O B B Y*\\n\\n\` +
                     \`◦ *Name* : \${name.toUpperCase()}\\n\` +
                     \`◦ *Template* : No. \${num}\\n\\n\` +
                     \`_© Shizuku-AI by Kyuu_\`,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                externalAdReply: {
                    title: 'S H I Z U K U  A I',
                    body: 'D E P E L O G E R  E D I T I O N',
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    thumbnailUrl: 'https://files.catbox.moe/k4jup3.jpg',
                    sourceUrl: null
                }
            }
        }, { quoted: m })

        cleanup()
        await m.react('✅')

    } catch (e) {
        cleanup()
        console.error('[fakeff-error]', e)
        await m.react('❌')
        m.reply(\`Error: \${e.message}\`)
    }
}

handler.help = ['fakeff']
handler.tags = ['maker']
handler.command = /^(fakeff)\$/i
handler.limit = true

export default handler