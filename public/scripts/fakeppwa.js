
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas')
const fs = require('fs')
const path = require('path')

const potong_atass = 50 

async function getbufer(url) {
  const res = await fetch(url)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

function drawcircleimg(ctx, img, x, y, size) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(img, x, y, size, size)
  ctx.restore()
}

async function loadAssets() {
  const fontPath = path.join(__dirname, 'WhatsAppFont.ttf')
  if (!fs.existsSync(fontPath)) {
    const res = await fetch('https://uploader.zenzxz.dpdns.org/uploads/1775659852069.ttf')
    const arrayBuffer = await res.arrayBuffer()
    fs.writeFileSync(fontPath, Buffer.from(arrayBuffer))
  }
  GlobalFonts.registerFromPath(fontPath, 'WhatsApp')
}

async function fakewa({ ppurl, nama, tentang, telepon }) {
  await loadAssets()

  const baground = 'https://uploader.zenzxz.dpdns.org/uploads/1775722039920.png'

  const [bgBuffer, ppBuffer] = await Promise.all([
    getbufer(baground),
    getbufer(ppurl)
  ])

  const bg = await loadImage(bgBuffer)
  const ppImg = await loadImage(ppBuffer)

  const canvasHeight = bg.height - potong_atasss
  const canvas = createCanvas(bg.width, canvasHeight)
  const ctx = canvas.getContext('2d')

  ctx.drawImage(
    bg, 
    0, potong_atasss,
    bg.width, bg.height - potong_atasss, 
    0, 0,
    bg.width, canvasHeight
  )

  const ppSize = 360
  const ppX = 360
  const ppY = 200 - potong_atasss
  drawcircleimg(ctx, ppImg, ppX, ppY, ppSize)

  ctx.fillStyle = '#889093'
  ctx.font = '30px WhatsApp'
  ctx.textAlign = 'left'

  ctx.fillText(nama, 157, 870 - potong_atasss)
  ctx.fillText(tentang, 169, 1030 - potong_atass)
  ctx.fillText(telepon, 172, 1190 - potong_atass)

  return canvas.toBuffer('image/png')
}

const outputdir = '/storage/emulated/0/zzabcd'
const filename = 'fake_wa_pp.png'
const outputPath = path.join(outputdir, filename)

if (!fs.existsSync(outputdir)) {
  fs.mkdirSync(outputdir, { recursive: true })
}

fakewa({
  ppurl: 'https://uploader.zenzxz.dpdns.org/uploads/1772884412595.jpeg',
  nama: 'ZennzXD',
  tentang: 'Available',
  telepon: '+62 878-6258-123'})
.then(buffer => {
  fs.writeFileSync(outputPath, buffer)
})
.catch(err => {
  console.error(err)
})