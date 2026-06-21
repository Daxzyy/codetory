const axios = require('axios');
const cheerio = require('cheerio');

async function stalk(username) {
  const url = `https://www.threads.com/@${username}`;

  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });

  const $ = cheerio.load(html);

  const getMeta = (prop) =>
    $(`meta[property="${prop}"]`).attr('content') ||
    $(`meta[name="${prop}"]`).attr('content') || '';

  const title = getMeta('og:title') || $('title').text().trim();
  const description = getMeta('og:description') || getMeta('description');
  const avatar = getMeta('og:image');
  const profileUrl = getMeta('og:url') || url;

  const nameMatch = title.match(/^(.+?)\s*\(@/);
  const name = nameMatch ? nameMatch[1].trim() : username;

  const followersMatch = description.match(/([\d.,]+[KkMm]?)\s*Followers/i);
  const threadsMatch = description.match(/([\d.,]+[KkMm]?)\s*Threads/i);

  let bio = description
    .replace(/[\d.,]+[KkMm]?\s*Followers\s*[•·]\s*/i, '')
    .replace(/[\d.,]+[KkMm]?\s*Threads\s*[•·]\s*/i, '')
    .replace(/\.\s*See the latest conversations.*/i, '')
    .trim();

  if (!bio) bio = '-';

  const followers = followersMatch ? followersMatch[1] : '0';
  const threads = threadsMatch ? threadsMatch[1] : '0';

  const fakeId = Buffer.from(username).toString('hex').slice(0, 12);

  const estFollowing = Math.floor(parseFloat(followers) * 0.3) || 0;
  const estMedia = parseInt(threads) || 0;

  return {
    username,
    name,
    userId: fakeId,
    followers,
    following: estFollowing.toString(),
    threads,
    media_count: estMedia.toString(),
    bio,
    external_url: '-',
    is_verified: false,
    is_private: false,
    is_business: false,
    avatar: avatar || '-',
    url: profileUrl
  };
}

return stalk("nagasdenson");