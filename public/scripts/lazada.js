const axios = require("axios");
const cheerio = require("cheerio");

function stripHtml(html) {
  if (!html) return null;
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function search(query) {
  const { data } = await axios.get("https://www.lazada.co.id/catalog/", {
    params: { ajax: true, q: query, page: 1 },
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Referer": `https://www.lazada.co.id/catalog/?q=${encodeURIComponent(query)}`,
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  return (data?.mods?.listItems || []).map(item => ({
    id: item.itemId,
    name: item.name,
    price: item.price,
    originalPrice: item.originalPrice || null,
    discount: item.discount || null,
    sold: item.sold || null,
    rating: item.ratingScore || null,
    location: item.location || null,
    url: `https:${item.itemUrl}`,
    image: item.image,
    shop: item.sellerName,
  }));
}

async function detail(itemId) {
  const url = `https://www.lazada.co.id/products/pdp-i${itemId}.html`;

  const { data } = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "id-ID,id;q=0.9",
      "Referer": "https://www.lazada.co.id/",
    },
  });

  const $ = cheerio.load(data);

  const moduleScript = $("script").filter((_, el) => {
    return $(el).html().includes("__moduleData__");
  }).first().html();

  const moduleMatch = moduleScript.match(/var __moduleData__\s*=\s*(\{[\s\S]*?\});\s*var __googleBot__/);
  if (!moduleMatch) throw new Error("__moduleData__ tidak ditemukan");

  const mod = JSON.parse(moduleMatch[1]);
  const fields = mod?.data?.root?.fields || {};

  const tracking = fields.tracking || {};
  const primaryKey = fields.primaryKey || {};
  const product = fields.product || {};
  const skuBase = fields.productOption?.skuBase || {};

  const images = (fields.skuGalleries?.["0"] || [])
    .filter(g => g.type === "img")
    .map(g => `https:${g.src}`);

  const normalizeSize = str => str.replace(/^(EU|eu)\s*:\s*/, "EU: ").trim();

  const sizes = (skuBase.properties || [])
    .find(p => p.name === "Ukuran")
    ?.values?.map(v => normalizeSize(v.name)) || [];

  const colors = (skuBase.properties || [])
    .find(p => p.name === "Warna")
    ?.values?.map(v => v.name) || [];

  return {
    id: tracking.pdt_sku,
    skuId: primaryKey.skuId || null,
    name: tracking.pdt_name,
    price: tracking.pdt_price,
    discount: tracking.pdt_discount || null,
    category: tracking.pdt_category || [],
    brand: tracking.brand_name || null,
    brandId: tracking.brand_id || null,
    sellerId: primaryKey.sellerId || null,
    images,
    sizes,
    colors,
    description: stripHtml(product.desc) || $("meta[property='og:description']").attr("content") || null,
    url: $("link[rel='canonical']").attr("href") || url,
  };
}

return detail("8779692207")