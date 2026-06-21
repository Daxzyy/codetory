const axios = require("axios");
const cheerio = require("cheerio");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Referer": "https://www.gorecenter.com/",
};

async function search(query = "", page = 1) {
  const url = query
    ? `https://www.gorecenter.com/?s=${encodeURIComponent(query)}&paged=${page}`
    : `https://www.gorecenter.com/page/${page}/`;

  const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
  const $ = cheerio.load(data);
  const results = [];

  $("a#articlelink").each((_, el) => {
    const link = $(el).attr("href") || "";
    const title = $(el).find("#header007").text().trim();
    const thumb = $(el).find("#thumb007 img").attr("src") || "";
    const date = $(el).find("#date007").text().replace(/[^\d/]/g, "").trim();
    const uploader = $(el).find("#uploader007").text().replace(/\s+/g, " ").trim();
    const hasCW = $(el).find(".cw-badge").length > 0;

    if (title && link) results.push({ title, link, thumb, date, uploader, cw: hasCW });
  });

  const totalPagesText = $(".sfwppa-pages").first().text().trim();
  const totalPages = parseInt(totalPagesText.match(/of\s+(\d+)/)?.[1] || "1");

  return { page, totalPages, results };
}

async function detail(url) {
  const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
  const $ = cheerio.load(data);

  const title = $("h1.entry-title").text().trim();
  const description = $(".entry-content p").first().text().trim();
  const date = $(".no-break").first().text().replace(/[^\d/]/g, "").trim();
  const views = $(".no-break").eq(1).text().replace(/[^\d]/g, "").trim();
  const comments = $(".no-break").eq(2).text().replace(/[^\d]/g, "").trim();
  const votes = $(".no-break").eq(3).text().replace(/[^\d]/g, "").trim();
  const uploader = $("h6").first().text().trim();
  const rating = $(".main99-rank-val").text().replace(/\/5.*/s, "").trim();

  const category = $(".entry-content ~ div .no-break a[href*='/category/']").first().text().trim()
    || $("a[href*='/category/']").first().text().trim();

  const tags = [];
  $("a[href*='/tag/']").each((_, el) => {
    const t = $(el).text().trim();
    if (t) tags.push(t);
  });

  const images = [];
  $(".entry-content img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("href") || "";
    const alt = $(el).attr("alt") || "";
    if (src && !src.includes("avatar")) images.push({ src, alt });
  });

  const videos = [];
  $(".kgvid_videodiv").each((_, el) => {
    const vars = $(el).attr("data-kgvid_video_vars");
    if (!vars) return;
    try {
      const parsed = JSON.parse(vars);
      const src = $(`#video_${parsed.id} source`).attr("src")?.split("?")[0] || "";
      const thumb = $(`#video_${parsed.id}`).attr("poster") || "";
      const caption = $(`#video_${parsed.id}_below .kgvid-caption`).text().trim();
      if (src) videos.push({ src, thumb, caption, title: parsed.title || "" });
    } catch {}
  });

  const related = [];
  $(".related-post .item").each((_, el) => {
    const relTitle = $(el).find(".post_title").text().trim();
    const relLink = $(el).find("a.post_title").attr("href") || "";
    const relThumb = $(el).find("img").attr("src") || "";
    if (relTitle && relLink) related.push({ title: relTitle, link: relLink, thumb: relThumb });
  });

  return {
    title,
    description,
    uploader,
    date,
    views,
    comments,
    votes,
    rating,
    category,
    tags: [...new Set(tags)],
    images,
    videos,
    related,
  };
}

return detail("https://www.gorecenter.com/female-police-officer-killed-after-being-hit-by-city-bus/")