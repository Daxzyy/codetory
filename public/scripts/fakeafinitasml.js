const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas')
const fs = require('fs')
const path = require('path')

async function getbufer(url) {
  const res = await fetch(url)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

function drawroundedimg(ctx, img, x, y, size, radius) {
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + size - radius, y)
  ctx.quadraticCurveTo(x + size, y, x + size, y + radius)
  ctx.lineTo(x + size, y + size - radius)
  ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size)
  ctx.lineTo(x + radius, y + size)
  ctx.quadraticCurveTo(x, y + size, x, y + size - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(img, x, y, size, size)
  ctx.restore()
}

async function loadAssets() {
  const fontBoldPath = path.join(__dirname, 'RobotoBold.ttf')
  const fontRegularPath = path.join(__dirname, 'RobotoRegular.ttf')

  if (!fs.existsSync(fontBoldPath)) {
    const res = await fetch('https://uploader.zenzxz.dpdns.org/uploads/1775138842054.ttf')
    const arrayBuffer = await res.arrayBuffer()
    fs.writeFileSync(fontBoldPath, Buffer.from(arrayBuffer))
  }

  if (!fs.existsSync(fontRegularPath)) {
    const res = await fetch('https://uploader.zenzxz.dpdns.org/uploads/1775138866574.ttf')
    const arrayBuffer = await res.arrayBuffer()
    fs.writeFileSync(fontRegularPath, Buffer.from(arrayBuffer))
  }

  GlobalFonts.registerFromPath(fontRegularPath, 'Roboto')
  GlobalFonts.registerFromPath(fontBoldPath, 'Roboto')
}

async function fakemlafinitas(inputimg) {
  await loadAssets()

  const baground = 'https://uploader.zenzxz.dpdns.org/uploads/1775228325905.jpeg'
  const border = 'https://uploader.zenzxz.dpdns.org/uploads/1775232236060.png'

  const [bgBuffer, inputBuffer, borderBuffer] = await Promise.all([
    getbufer(baground),
    getbufer(inputimg),
    getbufer(border)
  ])

  const bg = await loadImage(bgBuffer)
  const inputImage = await loadImage(inputBuffer)
  const borderImage = await loadImage(borderBuffer)

  const canvas = createCanvas(bg.width, bg.height)
  const ctx = canvas.getContext('2d')

  ctx.drawImage(bg, 0, 0, bg.width, bg.height)

  const ppSize = 236
  const ppX = 235
  const ppY = 500
  const ppRadius = 40

  const bdrSize = 320
  const bdrX = 195
  const bdrY = 460

  drawroundedimg(ctx, inputImage, ppX, ppY, ppSize, ppRadius)
  ctx.drawImage(borderImage, bdrX, bdrY, bdrSize, bdrSize)

  return canvas.toBuffer('image/png')
}

const outputdir = '/storage/emulated/0/zzabcd'
const filename = 'fakeafinitasml.png'
const outputPath = path.join(outputdir, filename)

if (!fs.existsSync(outputdir)) {
  fs.mkdirSync(outputdir, { recursive: true })
}

fakemlafinitas('https://uploader.zenzxz.dpdns.org/uploads/1772884412595.jpeg')
.then(buffer => {
fs.writeFileSync(outputPath, buffer)})
.catch(err => {
console.error(err)})