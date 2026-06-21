const fetch = require('node-fetch');
const cheerio = require('cheerio');

function findAllPosts(obj, results = []) {
  if (!obj || typeof obj !== 'object') return results;
  if (obj.thread_items && Array.isArray(obj.thread_items)) {
    for (const item of obj.thread_items) {
      if (item?.post) results.push(item.post);
    }
  }
  for (const v of Object.values(obj)) {
    findAllPosts(v, results);
  }
  return results;
}

function extractMedia(post) {
  const items = [];
  const carousel = post?.carousel_media || [];
  if (carousel.length > 0) {
    for (const item of carousel) {
      const vid = item?.video_versions?.[0];
      if (vid) {
        items.push({ type: 'video', url: vid.url, width: vid.width || null, height: vid.height || null });
      } else {
        const img = item?.image_versions2?.candidates?.[0];
        if (img) items.push({ type: 'image', url: img.url, width: img.width || null, height: img.height || null });
      }
    }
  } else {
    const vid = post?.video_versions?.[0];
    if (vid) {
      items.push({ type: 'video', url: vid.url, width: vid.width || null, height: vid.height || null });
    } else {
      const img = post?.image_versions2?.candidates?.[0];
      if (img) items.push({ type: 'image', url: img.url, width: img.width || null, height: img.height || null });
    }
  }
  return items;
}

async function threadl(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  const ogDesc = $('meta[property="og:description"]').attr('content') || '';
  const ogUrl = $('meta[property="og:url"]').attr('content') || url;

  const username = ogTitle.match(/@([\w.]+)/)?.[1] || '';
  const shortcode = ogUrl.match(/\/post\/([A-Za-z0-9_-]+)/)?.[1] || '';
  const hashtags = [...ogDesc.matchAll(/#(\w+)/g)].map(m => m[1]);
  const caption = ogDesc.replace(/#\w+/g, '').replace(/\n{3,}/g, '\n\n').trim();

  let postId = '';
  let relayScript = null;
  let allParsed = [];

  $('script[data-sjs]').each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const str = JSON.stringify(parsed);
      if (!postId) {
        const m = str.match(/"post_id":"(\d+)"/);
        if (m) postId = m[1];
      }
      if (str.includes('BarcelonaPostPageDirectQueryRelayPreloader') && str.includes('thread_items')) {
        relayScript = parsed;
      }
      if (str.includes('thread_items')) allParsed.push(parsed);
    } catch (_) {}
  });

  const targetSource = relayScript ? [relayScript] : allParsed;

  let mediaItems = [];
  let likeCount = 0;
  let replyCount = 0;
  let repostCount = 0;
  let quoteCount = 0;
  let authorName = '';
  let authorAvatar = '';
  let isVerified = false;
  let targetPost = null;

  for (const parsed of targetSource) {
    const posts = findAllPosts(parsed);
    const match = posts.find(p => Array.isArray(p?.carousel_media) && p.carousel_media.length > 0);
    if (match) { targetPost = match; break; }
    if (!targetPost && posts.length > 0) targetPost = posts[0];
  }

  if (!targetPost) {
    for (const parsed of allParsed) {
      const posts = findAllPosts(parsed);
      const match = posts.find(p => Array.isArray(p?.carousel_media) && p.carousel_media.length > 0);
      if (match) { targetPost = match; break; }
      if (!targetPost && posts.length > 0) targetPost = posts[0];
    }
  }

  if (targetPost) {
    authorName = targetPost?.user?.full_name || '';
    authorAvatar = targetPost?.user?.profile_pic_url || '';
    isVerified = targetPost?.user?.is_verified || false;
    likeCount = targetPost?.like_count || 0;

    const tpInfo = targetPost?.text_post_app_info;
    replyCount = tpInfo?.direct_reply_count || 0;
    repostCount = tpInfo?.repost_count || 0;
    quoteCount = tpInfo?.quote_count || 0;

    mediaItems = extractMedia(targetPost);
  }

  if (mediaItems.length === 0) {
    $('meta[property="og:image"]').each((_, el) => {
      const content = $(el).attr('content');
      if (content) mediaItems.push({ type: 'image', url: content });
    });
  }

  return {
    shortcode,
    postId,
    username,
    authorName,
    authorAvatar,
    isVerified,
    caption,
    description: ogDesc,
    hashtags,
    likeCount,
    replyCount,
    repostCount,
    quoteCount,
    media: mediaItems,
    url: ogUrl,
  };
}
return threadl("https://www.threads.com/@nagasdenson/post/DXTLogFkaAA?xmt=AQF03f6gfvsHcHRs-xIqxfXdlhfh6I-Dm03YNpEXRgUTkg")