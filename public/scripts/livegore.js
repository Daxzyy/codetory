const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.livegore.com/',
  'Origin': 'https://www.livegore.com',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
  'Sec-CH-UA': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-CH-UA-Mobile': '?0',
  'Sec-CH-UA-Platform': '"Windows"',
  'Cache-Control': 'max-age=0'
};

async function searchLivegore(query) {
  const url = `https://www.livegore.com/search?q=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url, { headers: HEADERS });
  const $ = cheerio.load(data);
  const results = [];

  $('.box.rb-q-list-item').each((_, el) => {
    const title = $(el).find('.rb-q-item-title a').text().trim();
    const href = $(el).find('.rb-q-item-title a').attr('href');
    const category = $(el).find('.rb-category-link').text().trim();
    const views = $(el).find('.rb-view-count-data').text().trim();
    const comments = $(el).find('.rb-a-count-data').text().trim();
    const votes = $(el).find('.rb-netvote-count-data').text().trim();
    const thumb = $(el).find('a.boxa').attr('style')?.match(/url\('(.+?)'\)/)?.[1] || null;
    const link = href?.startsWith('http') ? href : `https://www.livegore.com/${href?.replace(/^\.\//, '')}`;

    if (title) results.push({ title, link, category, views, comments, votes, thumb });
  });

  return results;
}

async function detailLivegore(url) {
  const { data } = await axios.get(url, {
    headers: {
      ...HEADERS,
      'Referer': 'https://www.livegore.com/',
      'Sec-Fetch-Site': 'same-origin'
    }
  });
  const $ = cheerio.load(data);

  const title = $('.entry-title').first().text().trim();
  const description = $('.rb-q-view-extra-content1').text().trim();
  const category = $('.rb-category-link').first().text().trim();
  const views = $('.rb-view-count-data').first().text().trim();
  const votes = $('.rb-netvote-count-data').first().text().trim();
  const date = $('.meta-when-data .value-title').first().attr('title') || '';

  const tags = [];
  $('.rb-q-view-tag-list .rb-tag-link').each((_, el) => {
    tags.push($(el).text().trim());
  });

  const videoSrc = $('video source').attr('src') || null;
  const thumb = $('meta[property="og:image"]').attr('content') || null;

  const comments = [];
  $('.rb-a-list-item').each((_, el) => {
    const user = $(el).find('.meta-who-data .rb-user-link').text().trim() || 'anonymous';
    const text = $(el).find('.rb-a-item-content .entry-content').text().trim();
    const commentVotes = $(el).find('.rb-netvote-count-data').first().text().trim();
    const commentDate = $(el).find('.meta-when-data .value-title').first().attr('title') || '';

    const replies = [];
    $(el).find('.rb-c-list-item').each((_, rel) => {
      const replyUser = $(rel).find('.meta-who-data .rb-user-link').text().trim() || 'anonymous';
      const replyText = $(rel).find('.rb-c-item-content .entry-content').text().trim();
      const replyDate = $(rel).find('.meta-when-data .value-title').first().attr('title') || '';
      if (replyText) replies.push({ user: replyUser, text: replyText, date: replyDate });
    });

    if (text) comments.push({ user, text, votes: commentVotes, date: commentDate, replies });
  });

  const related = [];
  $('.rb-related').each((_, el) => {
    const relTitle = $(el).find('.rb-q-item-title a').text().trim();
    const relHref = $(el).find('.rb-q-item-title a').attr('href');
    const relThumb = $(el).find('a.boxa').attr('style')?.match(/url\('(.+?)'\)/)?.[1] || null;
    const relComments = $(el).find('.rb-a-count-data').text().trim();
    const relVotes = $(el).find('.rb-netvote-count-data').text().trim();
    const relLink = relHref ? 'https://www.livegore.com/' + relHref.replace(/^\.\.\//, '') : null;
    if (relTitle) related.push({ title: relTitle, link: relLink, thumb: relThumb, comments: relComments, votes: relVotes });
  });

  return { title, description, category, views, votes, date, tags, videoSrc, thumb, comments, related };
}

return detailLivegore("https://www.livegore.com/203583/bus-hit-and-run-motorcyclist?show=203583#q203583")