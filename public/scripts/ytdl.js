const axios = require("axios");
const crypto = require("crypto");

const SALT = "6HTugjCXxR";

const HEADERS_BASE = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Origin": "https://snapany.com",
  "Referer": "https://snapany.com/",
};

const DOWNLOAD_HEADERS_YT = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
};

const DOWNLOAD_HEADERS_BILI = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Referer": "https://www.bilibili.com/",
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomIp() {
  return `${rand(1, 254)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`;
}

function getPlatform(url) {
  try {
    const host = new URL(url).hostname.replace("www.", "");
    if (host.includes("youtube") || host.includes("youtu.be")) return "youtube";
    if (host.includes("bilibili") || host.includes("b23.tv")) return "bilibili";
    return null;
  } catch {
    return null;
  }
}

async function ytdl(url, retries = 3) {
  const site = getPlatform(url);
  if (!site) throw new Error("URL tidak didukung, hanya YouTube dan Bilibili");

  for (let i = 0; i < retries; i++) {
    try {
      const timestamp = String(Date.now());
      const siteLang = "zh";
      const sign = crypto
        .createHash("md5")
        .update(`${url}${siteLang}${timestamp}${SALT}`)
        .digest("hex");

      const { data } = await axios.post(
        "https://api.snapany.com/v1/extract/post",
        { link: url },
        {
          headers: {
            ...HEADERS_BASE,
            "Content-Type": "application/json",
            "Accept-Language": siteLang,
            "G-Timestamp": timestamp,
            "G-Footer": sign,
            "X-Forwarded-For": randomIp(),
            "X-Real-IP": randomIp(),
          },
        }
      );

      const title = data.text || "untitled";
      const videoMedias = (data.medias || []).filter(m => m.media_type === "video");
      const audioMedias = (data.medias || []).filter(m => m.media_type === "audio");
      const videoMedia = videoMedias[0] || {};
      const dlHeaders = site === "bilibili" ? DOWNLOAD_HEADERS_BILI : DOWNLOAD_HEADERS_YT;

      let downloadUrl, audioUrl;

      if (videoMedia.formats) {
        const sorted = videoMedia.formats
          .filter(f => f.video_url)
          .sort((a, b) => {
            const qa = parseInt(String(a.quality).match(/\d+/)?.[0] || 0);
            const qb = parseInt(String(b.quality).match(/\d+/)?.[0] || 0);
            return qb - qa;
          });
        downloadUrl = sorted[0]?.video_url;
        audioUrl = sorted[0]?.audio_url;
      } else {
        downloadUrl = videoMedia.resource_url || videoMedia.preview_url;
      }

      if (!audioUrl && audioMedias.length) {
        audioUrl = audioMedias[0].resource_url || audioMedias[0].preview_url;
      }

      return {
        title,
        url: downloadUrl,
        audio: audioUrl || null,
        thumb: data.preview_url || videoMedias[0]?.preview_url || null,
        dlHeaders,
        raw: data,
      };
    } catch (err) {
      if (err?.response?.status === 401 && i < retries - 1) {
        await new Promise(r => setTimeout(r, 3000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

return ytdl("https://youtu.be/latubAUbE0U?si=Bw2LFvjJmbKhH0Pt")