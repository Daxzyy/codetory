const fetch = require('node-fetch')
const cheerio = require('cheerio')

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  'Accept-Language': 'id-ID,id;q=0.9'
}

async function search(keyword) {
  const url = `https://www.reelshort.com/id/search?keywords=${encodeURIComponent(keyword)}`
  const res = await fetch(url, { headers: HEADERS })
  const html = await res.text()
  const $ = cheerio.load(html)
  const json = JSON.parse($('#__NEXT_DATA__').text())
  const books = json.props.pageProps.books || []
  const total = json.props.pageProps.total || 0
  return {
    total,
    results: books.map(b => ({
      title: b.book_title,
      id: b.book_id,
      cover: b.book_pic,
      description: b.special_desc,
      episodes: b.chapter_count,
      views: b.read_count,
      url: `https://www.reelshort.com/id/movie/${b.book_id}`
    }))
  }
}

async function detail(url) {
  const res = await fetch(url, { headers: HEADERS })
  const html = await res.text()
  const $ = cheerio.load(html)
  const json = JSON.parse($('#__NEXT_DATA__').text())
  const d = json.props.pageProps.data
  return {
    title: d.book_title,
    id: d.book_id,
    cover: d.book_pic,
    description: d.special_desc,
    totalEpisodes: d.total,
    views: d.read_count,
    collected: d.collect_count,
    status: d.update_status === 1 ? 'ongoing' : 'completed',
    tags: d.tag_list.map(t => t.text),
    episodes: d.online_base.map(e => ({
      number: e.serial_number,
      id: e.chapter_id,
      likes: e.like_count,
      url: `https://www.reelshort.com/id/episodes/episode-${e.serial_number}-${d.book_id}-${e.chapter_id}`
    }))
  }
}

async function episode(input) {
  const url = input.startsWith('http')
    ? input
    : `https://www.reelshort.com/id/episodes/${input}`
  const res = await fetch(url, { headers: HEADERS })
  const html = await res.text()
  const $ = cheerio.load(html)
  const json = JSON.parse($('#__NEXT_DATA__').text())
  const d = json.props.pageProps.data
  return {
    title: d.book_title,
    bookId: d.book_id,
    chapterId: d.chapter_id,
    episodeNumber: d.serial_number,
    description: d.chapter_desc,
    cover: d.book_pic,
    thumbnail: d.video_pic,
    duration: d.duration,
    videoUrl: d.video_url,
    totalEpisodes: d.chapter_count,
    paidStart: d.paid_start,
    tags: d.tag_list.map(t => t.text),
    publishTime: d.publish_time
  }
}

return episode("https://www.reelshort.com/id/episodes/episode-1-kebangkitan-sang-naga-6a17a2041c7d51a0620d54ea-1lt3lbe4xg")