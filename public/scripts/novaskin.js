> const { fetch } = require('wreq-js')
const cheerio = require('cheerio')

const BASE_API = 'https://api.novaskin.me/v2/'

async function search(query) {
   const res = await fetch(`https://minecraft.novaskin.me/search?q=${encodeURIComponent(query)}`, {
      browser: 'chrome_137'
   })
   const html = await res.text()
   const $ = cheerio.load(html)
   const results = []

   $('a[href*="/post/"]').each((i, el) => {
      const href = $(el).attr('href')
      const idMatch = href.match(/\/post\/(\d+)\//)
      if (!idMatch) return
      const id = idMatch[1]
      const title = $(el).text().trim().replace(/\s+/g, ' ') || href.split('/').pop().replace(/-/g, ' ')
      if (!results.find(r => r.id === id)) {
         results.push({
            id,
            title,
            link: `https://minecraft.novaskin.me${href}`,
            thumb: `https://p.novaskin.me/${id}.png?class=thumbnail`,
            download: `https://p.novaskin.me/${id}.png`
         })
      }
   })

   return results.slice(0, 20)
}

async function detail(url) {
   const idMatch = url.match(/\/post\/(\d+)\//)
   if (!idMatch) return { error: 'URL tidak valid' }
   const id = idMatch[1]

   const [postRes, pageRes] = await Promise.all([
      fetch(`${BASE_API}post/${id}`, { browser: 'chrome_137' }),
      fetch(url, { browser: 'chrome_137' })
   ])

   const post = await postRes.json()
   const html = await pageRes.text()

   const sha256Match = html.match(/api="similar\/([a-f0-9]{64})"/)
   const sha256 = sha256Match?.[1]

   let similar = []
   if (sha256) {
      const simRes = await fetch(`${BASE_API}posts?sha256=${sha256}&limit=10`, { browser: 'chrome_137' })
      const simRaw = await simRes.text()
      try {
         const simJson = JSON.parse(simRaw)
         similar = (simJson.posts || []).map(p => ({
            id: p.id,
            title: p.title,
            link: `https://minecraft.novaskin.me/post/${p.id}/${p.slug || ''}`,
            thumb: `https://p.novaskin.me/${p.id}.png?class=thumbnail`,
            download: `https://p.novaskin.me/${p.id}.png`
         }))
      } catch {}
   }

   const $ = cheerio.load(html)
   const textures = []
   const packs = []
   const seenIds = new Set([id])
   const seenPackUrls = new Set()

   $('a[href*="/post/"]').each((i, el) => {
      const href = $(el).attr('href') || ''
      const text = $(el).text().trim().replace(/\s+/g, ' ').split('\n')[0].trim()
      const idM = href.match(/\/post\/(\d+)\//)
      if (!idM || seenIds.has(idM[1])) return
      seenIds.add(idM[1])
      const pid = idM[1]
      const item = {
         id: pid,
         title: text,
         link: `https://minecraft.novaskin.me${href}`,
         download: `https://p.novaskin.me/${pid}.png`
      }
      if (/texture/i.test(text) || /texture/i.test(href)) {
         textures.push(item)
      } else if (/pack|resource/i.test(text) || /pack/i.test(href)) {
         packs.push(item)
      }
   })

   const mcpackHref = (() => {
      const m = html.match(/href="(\/download\/\d+\?mcpack[^"]*)"/i)
      return m ? m[1] : `/download/${id}?mcpack`
   })()
   packs.push({
      title: 'Bedrock Resource Pack (.mcpack)',
      link: `https://minecraft.novaskin.me${mcpackHref}`
   })

   $('a[href*="/resourcepacks"]').each((i, el) => {
      const href = $(el).attr('href') || ''
      const fullUrl = href.startsWith('http') ? href : `https://minecraft.novaskin.me${href}`
      if (seenPackUrls.has(fullUrl)) return
      seenPackUrls.add(fullUrl)
      packs.push({
         title: 'Browse Resource Packs',
         link: fullUrl
      })
   })

   return {
      id: post.id,
      title: post.title,
      author: post.description?.replace(/^by\s*/i, '') || '',
      model: post.model,
      tags: post.tags || [],
      votes: post.votes,
      favorites: post.favorites,
      uploadDate: post.added,
      thumb: `https://p.novaskin.me/${id}.png?class=thumbnail`,
      download: `https://p.novaskin.me/${id}.png`,
      link: url,
      textures: textures.slice(0, 5),
      packs: packs.slice(0, 5),
      similar: similar.slice(0, 10)
   }
}

const action = "detail"
const target = "https://minecraft.novaskin.me/post/4702597958074368/zombie-steve"

if (action === "search") {
   return search(target)
} else {
   return detail(target)
}