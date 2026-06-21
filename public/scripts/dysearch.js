const axios = require("axios")
const cheerio = require("cheerio")
const vm = require("vm")

class DouyinSearchPage {
  constructor() {
    this.baseURL = "https://so.douyin.com/"
    this.defaultParams = {
      search_entrance: "aweme",
      enter_method: "normal_search",
      innerWidth: "431",
      innerHeight: "814",
      reloadNavStart: String(Date.now()),
      is_no_width_reload: "1",
      keyword: "",
    }
    this.cookies = {}
    this.api = this.createAxiosInstance()
  }

  createAxiosInstance() {
    const instance = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        referer: "https://so.douyin.com/",
        "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      },
    })

    instance.interceptors.response.use(
      (res) => {
        const setCookies = res.headers["set-cookie"]
        if (setCookies) {
          setCookies.forEach((c) => {
            const [name, value] = c.split(";")[0].split("=")
            if (name && value) this.cookies[name] = value
          })
        }
        return res
      },
      (error) => Promise.reject(error)
    )

    instance.interceptors.request.use((config) => {
      if (Object.keys(this.cookies).length) {
        config.headers["Cookie"] = Object.entries(this.cookies)
          .map(([k, v]) => `${k}=${v}`)
          .join("; ")
      }
      return config
    })

    return instance
  }

  async initialize() {
    const res = await this.api.get("/")
    if (!res.data || res.data.length < 100) throw new Error(`Init gagal, HTML terlalu pendek: ${res.data?.length} chars`)
    return true
  }

  async search({ query }) {
    await this.initialize()

    const params = {
      ...this.defaultParams,
      keyword: query,
      reloadNavStart: String(Date.now()),
    }

    const res = await this.api.get("s", { params })
    const html = res.data

    if (!html || html.length < 100) throw new Error(`HTML kosong: ${html?.length} chars`)

    const $ = cheerio.load(html)
    let scriptWithData = ""

    $("script").each((_, el) => {
      const text = $(el).html()
      if (text && text.includes("let data =") && text.includes('"business_data":')) {
        scriptWithData = text
        return false
      }
    })

    if (!scriptWithData) throw new Error("Script data tidak ditemukan")

    const match = scriptWithData.match(/let\s+data\s*=\s*(\{[\s\S]+?\});/)
    if (!match || !match[1]) throw new Error("Regex gagal match data object")

    const sandbox = { console: { log: () => {} } }
    vm.createContext(sandbox)
    vm.runInContext(`data = ${match[1]}`, sandbox)

    const businessData = sandbox.data?.business_data
    if (!businessData || !Array.isArray(businessData)) throw new Error("business_data tidak valid")

    const awemeInfos = businessData
      .map((entry) => entry?.data?.aweme_info)
      .filter((info) => info && info.aweme_id)

    if (awemeInfos.length === 0) throw new Error("Tidak ada video ditemukan")

    return awemeInfos.map((v) => {
      const images = v.images || []
      const playUrl = v.video?.play_addr?.url_list?.[0] || v.video?.download_addr?.url_list?.[0] || null
      const coverUrl = v.video?.cover?.url_list?.[0] || null
      const duration = v.duration ? Math.floor(v.duration / 1000) : 0

      return {
        id: v.aweme_id,
        type: images.length > 0 ? "image" : "video",
        desc: v.desc || "",
        author: v.author?.nickname || "Unknown",
        author_id: v.author?.unique_id || v.author?.short_id || "",
        create_time: v.create_time || 0,
        cover: coverUrl,
        play_url: playUrl,
        duration,
        images: images.map((img) => img?.url_list?.[0] || img?.download_url_list?.[0]).filter(Boolean),
        likes: v.statistics?.digg_count || 0,
        comments: v.statistics?.comment_count || 0,
        shares: v.statistics?.share_count || 0,
        collects: v.statistics?.collect_count || 0,
        share_url: v.share_url || "",
      }
    })
  }
}

return new DouyinSearchPage().search({ query: "girl" })