> const axios = require("axios");
const cheerio = require("cheerio");

async function detail(url) {
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);

  const promptMatch = html.match(/const promptData\s*=\s*(\{[\s\S]*?\});/);
  const promptData = promptMatch ? JSON.parse(promptMatch[1]) : null;

  return {
    url,
    meta: {
      title: $("title").text().trim(),
      ogTitle: $('meta[property="og:title"]').attr("content"),
      ogDescription: $('meta[property="og:description"]').attr("content"),
      ogImage: $('meta[property="og:image"]').attr("content"),
    },
    detail: {
      category: $(".cat-badge img").attr("alt"),
      title: $("h2.text-xl").text().trim(),
      author: $(".author-link").first().text().replace("@", "").trim(),
      createdAt: $(".time-ago").attr("data-created-at"),
      timestamp: Number($(".time-ago").attr("data-timestamp")),
      imageUrl: $(".image-container img").attr("src"),
      stats: {
        views: Number($("#viewsCount").text()),
        copies: Number($("#copiesCount").text()),
        downloads: Number($("#downloadsCount").text()),
      },
      descriptionText: $(".text-sm.leading-relaxed.mb-3").text().trim(),
    },
    prompt: {
      judul: promptData?.judul,
      slug: promptData?.slug,
      isi: promptData?.isi,
    },
  };
}

return detail("https://ai-prompthub.web.id/prompt/moody-aesthetic-portrait");