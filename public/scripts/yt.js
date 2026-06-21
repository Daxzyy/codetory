const axios = require("axios");

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0];
    return u.searchParams.get("v");
  } catch { return null; }
}

async function ytdl(url) {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("URL tidak valid");

  const baseHeaders = {
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
    "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"',
  };

  const [oembed, widget] = await Promise.all([
    axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
      headers: { ...baseHeaders, "origin": "https://yt1s.africa.com", "referer": "https://yt1s.africa.com/" }
    }),
    axios.get(`https://api.ytmp3.tube/widgetplus?url=https://www.youtube.com/watch?v=${videoId}&title=video`, {
      headers: {
        ...baseHeaders,
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "referer": "https://yt1s.africa.com/",
        "sec-fetch-dest": "iframe",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "cross-site",
        "upgrade-insecure-requests": "1",
      }
    })
  ]);

  const { title, author_name: author, thumbnail_url: thumb } = oembed.data;

  const match = widget.data.match(/<script[^>]*id="widget-data"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("widget-data tidak ditemukan");
  const { token, timestamp, encryptedVideoId: secretToken } = JSON.parse(match[1].trim());

  const apiHeaders = {
    ...baseHeaders,
    "accept": "*/*",
    "content-type": "application/json",
    "origin": "https://api.ytmp3.tube",
    "referer": "https://api.ytmp3.tube/",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
  };

  const postApi = (endpoint, body) =>
    axios.post(`https://api.ytmp3.tube${endpoint}`, { id: videoId, token, timestamp, secretToken, ...body }, { headers: apiHeaders })
      .then(r => r.data).catch(() => null);

  const pollMp3 = async (bitrate, maxRetry = 10) => {
    for (let i = 0; i < maxRetry; i++) {
      const r = await postApi("/api/download/mp3", { audioBitrate: bitrate });
      if (!r) break;
      if (r.status === "ok" && r.link) return r.link;
      if (r.status === "fail") return null;
      await new Promise(res => setTimeout(res, 1500));
    }
    return null;
  };

  const mp4Qualities = ["1080", "720", "480", "360", "240"];
  const mp3Bitrates = ["320", "256", "192", "128", "64"];

  const [mp4Results, mp3Results] = await Promise.all([
    Promise.all(mp4Qualities.map(q => postApi("/api/download/mp4", { videoQuality: q }))),
    Promise.all(mp3Bitrates.map(b => pollMp3(b))),
  ]);

  const seenMp4 = new Set();
  const mp4 = mp4Results.map((r, i) => {
    const link = r?.status === "ok" && r?.link ? r.link : null;
    if (!link) return null;
    const itag = link.match(/itag=(\d+)/)?.[1] || "";
    if (seenMp4.has(itag)) return null;
    seenMp4.add(itag);
    return { quality: mp4Qualities[i] + "p", url: link };
  }).filter(Boolean);

  const seenMp3 = new Set();
  const mp3 = mp3Results.map((link, i) => {
    if (!link) return null;
    const key = link.split("?")[0];
    if (seenMp3.has(key)) return null;
    seenMp3.add(key);
    return { quality: mp3Bitrates[i] + "kbps", url: link };
  }).filter(Boolean);

  return { title, author, thumb, videoId, mp4, mp3 };
}

return ytdl("https://youtu.be/dQw4w9WgXcQ");