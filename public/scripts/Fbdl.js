const axios = require("axios");
const NodeRSA = require("node-rsa");

const API_HOST = "https://api.hitube.io";
const FB_DOWNLOAD_PATH = "/st-tik-video/fb/dl2";

const RSA_PUB = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDCAdf/EyIbLBxjGqmh7qLU6/CP
Czru+75+82OSPZ+nf4BFvg88drpZ6KigNW0J8TNgxe6Yms1irCZNVDyu+RXsl4y/
7c2KOHc4OGTzHB5fUMiMasFUvcEs2P70e6yA/sKHZfBLG1XPhlb84Ibs3nhD3W5e
2SuC+4EuVkaqzN08LQIDAQAB
-----END PUBLIC KEY-----`;

function generateSessionID(ts) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return `common_${s}_${ts}`;
}

function resolveUrl(raw) {
  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw : `${API_HOST}/st-tik/token/${raw}`;
}

function detectFbUrlType(url) {
  if (!url) return "unknown";
  const u = url.toLowerCase();
  if (u.includes("/reel/") || u.includes("/reels/") || u.includes("fb.watch") || u.includes("/share/r/")) return "reels";
  if (u.includes("/videos/") || u.includes("/video/") || u.includes("/watch") || u.includes("/share/v/")) return "video";
  if (u.includes("/photos/") || u.includes("/photo/") || u.includes("/share/p/")) return "photo";
  if (u.includes("/stories/") || u.includes("/share/s/")) return "story";
  return "unknown";
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchWithRetry(url, sessionid, encrypted, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(`${API_HOST}${FB_DOWNLOAD_PATH}`, {
        params: { url, sessionid },
        headers: {
          "X-Secure-Message": encrypted,
          "Referer": "https://www.fvidgo.com/",
          "Origin": "https://www.fvidgo.com",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        },
        timeout: 15000,
      });
      return res.data;
    } catch (e) {
      const status = e?.response?.status;
      if (status === 503 || status === 502 || status === 504) {
        if (i < retries - 1) await sleep(delay * (i + 1));
        else throw e;
      } else {
        throw e;
      }
    }
  }
}

async function fbdl(url) {
  const urlType = detectFbUrlType(url);
  const ts = Date.now();
  const key = new NodeRSA();
  key.importKey(RSA_PUB, "public");
  key.setOptions({ encryptionScheme: "pkcs1" });
  const encrypted = key.encrypt(ts.toString(), "base64");
  const sessionid = generateSessionID(ts);

  const data = await fetchWithRetry(url, sessionid, encrypted);

  if (data.code !== 200) {
    if (data.msg === "PRIVATE_URL") throw new Error("PRIVATE_URL");
    return null;
  }
  if (!data.result?.fbBos?.length) return null;

  const results = [];

  for (const bo of data.result.fbBos) {
    const item = {
      id: bo.id,
      urlType,
      ...(bo.desc && { desc: bo.desc }),
      cover: resolveUrl(bo.cover || bo.thumb),
      url: resolveUrl(bo.url),
      type: "video",
    };

    if (bo.multiResolutions?.length) {
      const videos = [];
      const audios = [];

      for (const r of bo.multiResolutions) {
        if (!r.url) continue;
        const rUrl = resolveUrl(r.url);
        const label = r.label || r.tag || r.quality || "";
        const o = { url: rUrl };
        if (r.size) o.size = r.size;

        if (!label) {
          o.label = "MP3";
          audios.push(o);
        } else {
          o.label = label;
          videos.push(o);
        }
      }

      if (videos.length) item.resolutions = videos;
      if (audios.length) item.audio = audios;
    }

    if (!item.resolutions && !item.audio) {
      item.type = urlType === "photo" ? "image" : "video";
    } else if (item.audio && !item.resolutions) {
      item.type = "audio";
    }

    results.push(item);
  }

  return results.length === 1 ? results[0] : results;
}

return fbdl("https://www.facebook.com/share/1815DTFbF9/")