import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import { fileTypeFromBuffer } from "file-type";

const DEFAULT_TEMPLATE_URLS = [
  "https://birwmrxbaazcjeoafnft.supabase.co/storage/v1/object/public/apalah/lottie-template-01.zip",
  "https://birwmrxbaazcjeoafnft.supabase.co/storage/v1/object/public/apalah/lottie-template-02.zip",
  "https://birwmrxbaazcjeoafnft.supabase.co/storage/v1/object/public/apalah/lottie-template-03.zip",
  "https://birwmrxbaazcjeoafnft.supabase.co/storage/v1/object/public/apalah/lottie-template-04.zip",
  "https://birwmrxbaazcjeoafnft.supabase.co/storage/v1/object/public/apalah/lottie-template-05.zip",
  "https://birwmrxbaazcjeoafnft.supabase.co/storage/v1/object/public/apalah/lottie-template-06.zip",
  "https://birwmrxbaazcjeoafnft.supabase.co/storage/v1/object/public/apalah/lottie-template-07.zip",
  "https://birwmrxbaazcjeoafnft.supabase.co/storage/v1/object/public/apalah/lottie-template-08.zip",
  "https://birwmrxbaazcjeoafnft.supabase.co/storage/v1/object/public/apalah/lottie-template-09.zip",
  "https://birwmrxbaazcjeoafnft.supabase.co/storage/v1/object/public/apalah/lottie-template-10.zip",
  "https://birwmrxbaazcjeoafnft.supabase.co/storage/v1/object/public/apalah/lottie-template-11.zip",
  "https://birwmrxbaazcjeoafnft.supabase.co/storage/v1/object/public/apalah/lottie-template-12.zip",
  "https://birwmrxbaazcjeoafnft.supabase.co/storage/v1/object/public/apalah/lottie-template-13.zip",
  "https://birwmrxbaazcjeoafnft.supabase.co/storage/v1/object/public/apalah/lottie-template-15.zip",
  "https://birwmrxbaazcjeoafnft.supabase.co/storage/v1/object/public/apalah/lottie-template-16.zip",
];
const DEFAULT_TEMPLATE_URL = DEFAULT_TEMPLATE_URLS[0];
const TEMPLATE_ERROR_MESSAGE = "Template lottie tidak valid";
const SECONDARY_PATH = "animation/animation_secondary.json";
const METADATA_PATH = "animation/animation.json.overridden_metadata";
const WATERMARK = { pack: "Made with Amy Bot", author: "LNTRL" };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const cachedTemplates = new Map();

const lottieError = (cause, message = TEMPLATE_ERROR_MESSAGE) => {
  const err = new Error(message);
  err.code = "LOTTIE_TEMPLATE_INVALID";
  err.cause = cause;
  return err;
};

const toPos = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
};

const pick = (items) => items[Math.floor(Math.random() * items.length)];

const pickUrl = (value) => {
  const urls = Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
  return pick(urls.length ? urls : DEFAULT_TEMPLATE_URLS);
};

const dataBuf = (value = "") => {
  const match = /^data:[^,]+,\s*(.+)$/i.exec(String(value));
  return match ? Buffer.from(match[1].replace(/\s/g, ""), "base64") : null;
};

const imgSize = async (asset) => {
  const fallback = { width: toPos(asset?.w, 540), height: toPos(asset?.h, 540) };
  try {
    const buffer = dataBuf(asset?.p);
    if (!buffer?.length) return fallback;
    const meta = await sharp(buffer, { animated: false }).metadata();
    return { width: toPos(meta.width, fallback.width), height: toPos(meta.height, fallback.height) };
  } catch {
    return fallback;
  }
};

const secSize = (secondary) => {
  const width = toPos(secondary?.w, 432);
  const height = toPos(secondary?.h, 432);
  const ratio = Math.min(432 / width, 432 / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
};

const boundsOf = async (buffer) => {
  const { data, info } = await sharp(buffer, { animated: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bounds = { left: info.width, top: info.height, right: -1, bottom: -1 };
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + info.channels - 1] > 8) {
        bounds.left = Math.min(bounds.left, x);
        bounds.top = Math.min(bounds.top, y);
        bounds.right = Math.max(bounds.right, x);
        bounds.bottom = Math.max(bounds.bottom, y);
      }
    }
  }
  return bounds.right < 0
    ? null
    : {
      left: bounds.left,
      top: bounds.top,
      width: bounds.right - bounds.left + 1,
      height: bounds.bottom - bounds.top + 1,
    };
};

const videoExt = async (buffer, mimetype = "") => {
  const detected = await fileTypeFromBuffer(buffer).catch(() => null);
  if (detected?.ext) return detected.ext;
  if (/quicktime/i.test(mimetype)) return "mov";
  if (/webm/i.test(mimetype)) return "webm";
  return "mp4";
};

const getDuration = (file) => new Promise((resolve) => {
  ffmpeg.ffprobe(file, (err, data) => resolve(err ? 0 : Number(data?.format?.duration) || 0));
});

const videoFrames = async (buffer, { mimetype, maxDurationSeconds, hd = false } = {}) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "amy-lottie-"));
  const input = path.join(dir, `input.${await videoExt(buffer, mimetype)}`);
  const output = path.join(dir, "frame-%05d.jpg");
  try {
    await fs.writeFile(input, buffer);
    const duration = await getDuration(input);
    if (maxDurationSeconds && duration > maxDurationSeconds) {
      throw new Error(`Video/GIF maksimal ${maxDurationSeconds} detik`);
    }
    await new Promise((resolve, reject) => {
      ffmpeg(input)
        .outputOptions([
          hd ? "-vf fps=15" : "-vf fps=15,scale=128:-1:flags=lanczos",
          "-q:v 5",
        ])
        .output(output)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });
    const files = (await fs.readdir(dir)).filter((name) => /^frame-\d+\.jpg$/.test(name)).sort();
    if (!files.length) throw new Error("Frame kosong");
    return Promise.all(files.map((name) => fs.readFile(path.join(dir, name))));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
};

const centeredImage = async (buffer, target) => {
  let frame = await sharp(buffer, { animated: false }).rotate().png().toBuffer();
  const meta = await sharp(frame).metadata();
  const bounds = await boundsOf(frame);

  if (bounds && (bounds.width < meta.width || bounds.height < meta.height)) {
    frame = await sharp(frame).extract(bounds).png().toBuffer();
  } else {
    const trimmed = await sharp(frame)
      .trim({ threshold: 20 })
      .png()
      .toBuffer({ resolveWithObject: true })
      .catch(() => null);
    if (trimmed && (trimmed.info.width < meta.width || trimmed.info.height < meta.height)) frame = trimmed.data;
  }

  return {
    buffer: await sharp(frame)
      .resize(target.width, target.height, { fit: "contain", background: TRANSPARENT })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer(),
    mime: "image/png",
  };
};

const defaultConvert = async (buffer, options = {}) => centeredImage(
  buffer,
  options.target || { width: 540, height: 540 },
);

const dataUri = (image) => `data:${image.mime};base64,${image.buffer.toString("base64")}`;

const frameJson = (frames, name = "VideoToLottie") => {
  const width = toPos(frames[0]?.width, 128);
  const height = toPos(frames[0]?.height, 128);

  return {
    v: "5.12.1",
    fr: 15,
    ip: 0,
    op: frames.length,
    w: width,
    h: height,
    nm: name,
    ddd: 0,
    assets: frames.map((frame, index) => ({
      id: `img_${index}`,
      w: width,
      h: height,
      u: "",
      p: dataUri(frame),
      e: 1,
    })),
    layers: frames.map((_frame, index) => ({
      ddd: 0,
      ind: index + 1,
      ty: 2,
      nm: `img_${index}`,
      refId: `img_${index}`,
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [width / 2, height / 2, 0] },
        a: { a: 0, k: [width / 2, height / 2, 0] },
        s: { a: 0, k: [65, 65, 100] },
      },
      ip: index,
      op: index + 1,
      st: index,
      bm: 0,
    })),
  };
};

const webpJson = async (buffer, { maxDurationSeconds, hd = false } = {}) => {
  const meta = await sharp(buffer, { animated: true }).metadata();
  if ((meta.pages || 1) < 2 || !meta.pageHeight) return null;

  const duration = Array.isArray(meta.delay) ? meta.delay.reduce((total, delay) => total + delay, 0) / 1000 : 0;
  if (maxDurationSeconds && duration > maxDurationSeconds) {
    throw new Error(`Video/GIF maksimal ${maxDurationSeconds} detik`);
  }

  const sheet = await sharp(buffer, { animated: true }).ensureAlpha().png().toBuffer();
  const targetWidth = hd ? meta.width : Math.min(meta.width, 128);
  const frames = [];

  for (let index = 0; index < meta.pages; index += 1) {
    const frame = await sharp(sheet)
      .extract({ left: 0, top: index * meta.pageHeight, width: meta.width, height: meta.pageHeight })
      .resize({ width: targetWidth, withoutEnlargement: true })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    const frameMeta = await sharp(frame).metadata();
    frames.push({ buffer: frame, mime: "image/png", width: frameMeta.width, height: frameMeta.height });
  }

  return frameJson(frames, "AnimatedStickerToLottie");
};

const scale = (frames, factor) => frames.map((item) => ({
  ...item,
  s: [item.s[0] * factor, item.s[1] * factor, item.s[2]],
}));

const stillJson = (image, { width, height }, style) => {
  const center = [width / 2, height / 2, 0];
  const asset = { id: "image_0", w: width, h: height, u: "", p: dataUri(image), e: 1 };
  const layer = ({ nm, op, ks }) => ({
    ddd: 0,
    ind: 1,
    ty: 2,
    nm,
    refId: "image_0",
    sr: 1,
    ks,
    ao: 0,
    ip: 0,
    op,
    st: 0,
    bm: 0,
  });
  const doc = (nm, op, ks) => ({
    v: "5.12.1",
    fr: 60,
    ip: 0,
    op,
    w: width,
    h: height,
    nm,
    ddd: 0,
    assets: [asset],
    layers: [layer({ nm: `Layer_${nm}`, op, ks })],
  });
  const jumpscare = {
    v: "5.12.1",
    fr: 60,
    ip: 0,
    op: 240,
    w: width,
    h: height,
    nm: "Jumpscare",
    ddd: 0,
    assets: [asset],
    layers: [{
      ddd: 0,
      ind: 1,
      ty: 2,
      nm: "Layer_Muter",
      refId: "image_0",
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [0] }, { t: 5, s: [100] }] },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: 0, s: center },
            { t: 8, s: [center[0] - 5, center[1] + 5, 0] },
            { t: 12, s: [center[0] + 5, center[1] - 5, 0] },
            { t: 16, s: [center[0] - 2, center[1] + 8, 0] },
            { t: 20, s: center },
            { t: 240, s: center },
          ],
        },
        a: { a: 0, k: center },
        s: {
          a: 1,
          k: scale([
            { t: 0, s: [25, 25, 100] },
            { t: 6, s: [140, 140, 100] },
            { t: 240, s: [140, 140, 100] },
          ], 0.65),
        },
      },
      ao: 0,
      ip: 0,
      op: 240,
      st: 0,
      bm: 0,
    }],
  };
  const spin = {
    v: "5.12.1",
    fr: 60,
    ip: 0,
    op: 600,
    w: width,
    h: height,
    nm: "SpinPause",
    ddd: 0,
    assets: [asset],
    layers: [{
      ddd: 0,
      ind: 1,
      ty: 2,
      nm: "Layer_Spin",
      refId: "image_0",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [{ t: 0, s: [0] }, { t: 180, s: [360] }, { t: 300, s: [360] }, { t: 600, s: [720] }] },
        p: { a: 0, k: center },
        a: { a: 0, k: center },
        s: {
          a: 1,
          k: scale([
            { t: 0, s: [100, 100, 100] },
            { t: 200, s: [100, 100, 100] },
            { t: 250, s: [102, 102, 100] },
            { t: 300, s: [100, 100, 100] },
            { t: 600, s: [100, 100, 100] },
          ], 0.65),
        },
      },
      ao: 0,
      ip: 0,
      op: 600,
      st: 0,
      bm: 0,
    }],
  };
  const pulse = doc("PulsePop", 240, {
    o: { a: 1, k: [{ t: 0, s: [0] }, { t: 8, s: [100] }, { t: 220, s: [100] }, { t: 240, s: [0] }] },
    r: { a: 0, k: 0 },
    p: { a: 0, k: center },
    a: { a: 0, k: center },
    s: {
      a: 1,
      k: scale([
        { t: 0, s: [40, 40, 100] },
        { t: 12, s: [112, 112, 100] },
        { t: 22, s: [94, 94, 100] },
        { t: 34, s: [102, 102, 100] },
        { t: 240, s: [100, 100, 100] },
      ], 0.65),
    },
  });
  const swing = doc("Swing", 300, {
    o: { a: 0, k: 100 },
    r: {
      a: 1,
      k: [
        { t: 0, s: [-10] },
        { t: 30, s: [10] },
        { t: 60, s: [-7] },
        { t: 90, s: [7] },
        { t: 120, s: [0] },
        { t: 300, s: [0] },
      ],
    },
    p: { a: 0, k: center },
    a: { a: 0, k: center },
    s: { a: 0, k: [65, 65, 100] },
  });
  const slide = doc("SlideBounce", 240, {
    o: { a: 1, k: [{ t: 0, s: [0] }, { t: 12, s: [100] }] },
    r: { a: 0, k: 0 },
    p: {
      a: 1,
      k: [
        { t: 0, s: [-width * 0.2, center[1], 0] },
        { t: 18, s: [center[0] + 16, center[1], 0] },
        { t: 30, s: [center[0] - 8, center[1], 0] },
        { t: 42, s: center },
        { t: 240, s: center },
      ],
    },
    a: { a: 0, k: center },
    s: { a: 0, k: [65, 65, 100] },
  });
  const shake = doc("TinyShake", 180, {
    o: { a: 0, k: 100 },
    r: { a: 0, k: 0 },
    p: {
      a: 1,
      k: [
        { t: 0, s: center },
        { t: 5, s: [center[0] - 4, center[1] + 2, 0] },
        { t: 10, s: [center[0] + 4, center[1] - 2, 0] },
        { t: 15, s: [center[0] - 2, center[1] + 4, 0] },
        { t: 20, s: center },
        { t: 180, s: center },
      ],
    },
    a: { a: 0, k: center },
    s: { a: 0, k: [65, 65, 100] },
  });

  if (style === "jumpscare") return jumpscare;
  if (style === "spin") return spin;
  if (style === "pulse") return pulse;
  if (style === "swing") return swing;
  if (style === "slide") return slide;
  if (style === "shake") return shake;
  return pick([jumpscare, spin, pulse, swing, slide, shake]);
};

const videoJson = async (buffer, options = {}) => {
  const frames = await videoFrames(buffer, options);
  return frameJson(await Promise.all(frames.map(async (buffer) => {
    const meta = await sharp(buffer, { animated: false }).metadata();
    return { buffer, mime: "image/jpeg", width: meta.width, height: meta.height };
  })));
};

class LottieSticker {
  constructor(opt = {}) {
    this.opt = {
      templateBuffer: null,
      templateUrl: DEFAULT_TEMPLATE_URLS,
      watermark: WATERMARK,
      convertStickerImage: defaultConvert,
      mediaType: null,
      mimetype: "",
      maxDurationSeconds: 10,
      hd: false,
      animated: false,
      animationStyle: null,
      ...opt,
    };
    this.zip = null;
  }

  async loadZip() {
    const { templateBuffer: tpl, templateUrl: urlOpt } = this.opt;

    try {
      const url = pickUrl(urlOpt);
      if (!tpl && !cachedTemplates.has(url)) {
        const res = await fetch(url);
        if (!res.ok) throw lottieError(null, `${TEMPLATE_ERROR_MESSAGE}: HTTP ${res.status}`);
        cachedTemplates.set(url, Buffer.from(await res.arrayBuffer()));
      }

      const file = tpl || cachedTemplates.get(url);
      if (!Buffer.isBuffer(file) || !file.length) throw lottieError();
      this.zip = await JSZip.loadAsync(file);
    } catch (err) {
      if (err.code === "LOTTIE_TEMPLATE_INVALID") throw err;
      throw lottieError(err);
    }
  }

  async readJson(filePath) {
    const file = this.zip.file(filePath);
    if (!file) throw lottieError();

    try {
      return JSON.parse(await file.async("string"));
    } catch (err) {
      throw lottieError(err);
    }
  }

  async target(sec) {
    const img = sec.assets?.find((item) => item?.id === "image_0")
      || sec.assets?.find((item) => typeof item?.p === "string");
    return img ? imgSize(img) : secSize(sec);
  }

  async makeStill(buf, target) {
    const {
      convertStickerImage: convert,
      mediaType,
      mimetype,
      animationStyle,
    } = this.opt;
    const img = await convert(buf, { mediaType, mimetype, target });
    if (!Buffer.isBuffer(img?.buffer) || !img.buffer.length || !img.mime) {
      throw new Error("Gagal mengubah sticker ke gambar lottie");
    }
    return stillJson(img, target, animationStyle);
  }

  async makeWebp(buf) {
    const { maxDurationSeconds, hd } = this.opt;
    return webpJson(buf, { maxDurationSeconds, hd });
  }

  async makeVideo(buf) {
    const { mimetype, maxDurationSeconds, hd } = this.opt;
    return videoJson(buf, { mimetype, maxDurationSeconds, hd });
  }

  async writeSecondary(buf, target) {
    const { mediaType, mimetype, animated } = this.opt;
    let sec;

    if (mediaType === "sticker" && animated) {
      sec = (await this.makeWebp(buf)) || (await this.makeStill(buf, target));
    } else if (mediaType === "video" || /^video\//i.test(mimetype || "")) {
      sec = await this.makeVideo(buf);
    } else {
      sec = await this.makeStill(buf, target);
    }

    this.zip.file(SECONDARY_PATH, JSON.stringify(sec));
  }

  async writeMeta() {
    if (!this.zip.file(METADATA_PATH)) return;

    const meta = await this.readJson(METADATA_PATH);
    const { watermark } = this.opt;
    this.zip.file(METADATA_PATH, JSON.stringify({
      ...meta,
      "sticker-pack-id": `amy-${Date.now()}`,
      "sticker-pack-name": watermark.pack,
      "sticker-pack-publisher": watermark.author,
    }));
  }

  async build(buf) {
    if (!Buffer.isBuffer(buf) || !buf.length) throw new Error("Sticker tidak valid");

    await this.loadZip();
    const sec = await this.readJson(SECONDARY_PATH);
    await this.writeSecondary(buf, await this.target(sec));
    await this.writeMeta();

    try {
      return await this.zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 9 },
      });
    } catch (err) {
      throw lottieError(err);
    }
  }
}

const buildLottieSticker = (buf, opt = {}) => new LottieSticker(opt).build(buf);

// =============== HANDLER UTAMA ===============
let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  let q = m.quoted ? m.quoted : m;
  let mime = (q.msg || q).mimetype || '';
  
  // Validasi style harus diinput via text
  const validStyles = ['jumpscare', 'spin', 'pulse', 'swing', 'slide', 'shake'];
  
  // Cek apakah style ada di text
  let style = null;
  if (text && text.trim()) {
    style = text.trim().toLowerCase();
  }
  
  // Jika tidak ada style, cek dari quoted message
  if (!style && m.quoted && m.quoted.text) {
    style = m.quoted.text.trim().toLowerCase();
  }
  
  if (!style || !validStyles.includes(style)) {
    return m.reply(`❌ Harap input style melalui text!\n\n*Style yang tersedia:*\n${validStyles.map(s => `• ${s}`).join('\n')}\n\n*Contoh:* ${usedPrefix + command} spin\n(Reply gambar/video/stiker)`);
  }
  
  if (!/image|video|webp/.test(mime)) {
    return m.reply('Reply gambar, video atau stiker untuk membuat Lottie sticker.');
  }

  if (/image|video|webp/.test(mime)) {
    const isVideoLike = /video|gif/.test(mime) || (q.mediaType === 'videoMessage');
    const seconds = Number(q.msg?.seconds || q.seconds || q.duration || 0);
    if (isVideoLike && seconds > 10) {
      return m.reply('Video harus berdurasi di bawah 10 detik.');
    }

    let media = await q.download();
    
    try {
      // Tentukan tipe media
      let mediaType = 'image';
      if (/video/.test(mime)) mediaType = 'video';
      if (/webp/.test(mime)) mediaType = 'sticker';
      
      // Kirim pesan proses
      await m.reply(`⏳ Sedang membuat Lottie sticker dengan style *${style}*, mohon tunggu...`);
      
      // Buat Lottie sticker (hasilkan ZIP)
      const lottieBuffer = await buildLottieSticker(media, {
        mediaType: mediaType,
        mimetype: mime,
        maxDurationSeconds: 10,
        hd: false,
        animated: mediaType === 'sticker' || mediaType === 'video',
        animationStyle: style,
        watermark: { pack: "Myana kyu tyawu", author: "Pika Amy" }
      });
      
      // Upload ke buffer atau langsung kirim
      // Kirim sebagai Lottie sticker ke WhatsApp
      await conn.sendMessage(m.chat, {
        sticker: lottieBuffer,
        mimetype: "application/was",
        isAnimated: true,
        isLottie: true
      }, { quoted: m });
      
    } catch (error) {
      console.error(error);
      m.reply(`❌ Gagal membuat Lottie sticker: ${error.message}`);
    }
    return;
  }
  return m.reply('Kirim atau reply media untuk dijadikan Lottie sticker.');
}

handler.help = ['slottie <style>'];
handler.tags = ['maker'];
handler.command = /^slottie$/i;
handler.register = true;

export default handler;