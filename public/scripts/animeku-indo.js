const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

class Animekuindo {
  constructor() {
    this.baseUrl = 'https://s2.animekuindo.life';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': this.baseUrl,
      'Upgrade-Insecure-Requests': '1',
      'Sec-Ch-Ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Linux"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1'
    };
  }

  generateCookies() {
    const timestamp = Date.now();
    const random1 = crypto.randomBytes(4).readUInt32BE(0);
    const random2 = crypto.randomBytes(4).readUInt32BE(0);
    
    return \`g_state={"i_l":0,"i_ll":\${timestamp + 86400000},"i_b":"\${crypto.randomBytes(32).toString('base64')}","i_e":{"enable_itp_optimization":0}}; _ga_JC7F2NZVN8=GS2.1.s\${Math.floor(timestamp / 1000)}\$o1\$g0\$t\${Math.floor(timestamp / 1000)}\$j60\$l0\$h0; _ga=GA1.1.\${random1}.\${Math.floor(timestamp / 1000)}; HstCfa4980656=\${timestamp}; HstCla4980656=\${timestamp}; HstCmu4980656=\${timestamp}; HstPn4980656=1; HstPt4980656=1; HstCnv4980656=1; HstCns4980656=1; _gcl_au=1.1.\${random2}.\${Math.floor(timestamp / 1000)}; __dtsu=\${crypto.randomBytes(16).toString('hex')}; _pubcid=\${crypto.randomUUID()}; _cc_id=\${crypto.randomBytes(16).toString('hex')}\`;
  }

  async searchAnime(keyword) {
    const url = \`\${this.baseUrl}/?s=\${encodeURIComponent(keyword)}\`;
    
    const response = await axios.get(url, {
      headers: {
        ...this.headers,
        'Cookie': this.generateCookies()
      },
      timeout: 30000,
      family: 4
    });

    const \$ = cheerio.load(response.data);
    
    const results = [];

    \$('.listupd .bs').each((i, el) => {
      const link = \$(el).find('.bsx a').attr('href');
      const title = \$(el).find('.tt h2').text().trim();
      const image = \$(el).find('img').attr('src');
      const status = \$(el).find('.status').text().trim();
      const type = \$(el).find('.typez').text().trim();
      
      if (title && link) {
        results.push({
          title: title,
          link: link,
          image: image || null,
          status: status || null,
          type: type || null
        });
      }
    });

    return {
      keyword: keyword,
      totalResults: results.length,
      results: results
    };
  }

  async getEpisodeStream(episodeUrl) {
    const response = await axios.get(episodeUrl, {
      headers: {
        ...this.headers,
        'Cookie': this.generateCookies()
      },
      timeout: 30000,
      family: 4
    });

    const \$ = cheerio.load(response.data);
    
    const streamUrl = \$('#pembed iframe').attr('src');
    const mirrorStreams = [];
    
    \$('.mirrorstream ul li a').each((i, el) => {
      const provider = \$(el).text().trim();
      const dataContent = \$(el).attr('data-content');
      if (provider && dataContent) {
        mirrorStreams.push({
          provider: provider,
          dataContent: dataContent
        });
      }
    });
    
    return {
      streamUrl: streamUrl || null,
      mirrorStreams: mirrorStreams
    };
  }

  async getAnimeDetail(url, includeStream = true) {
    const response = await axios.get(url, {
      headers: {
        ...this.headers,
        'Cookie': this.generateCookies()
      },
      timeout: 30000,
      family: 4
    });

    const \$ = cheerio.load(response.data);
    
    const title = \$('h1.entry-title').text().trim();
    const image = \$('.thumbook .thumb img').attr('src');
    
    const info = {};
    \$('.info-content .spe span').each((i, el) => {
      const text = \$(el).text().trim();
      const colonIndex = text.indexOf(':');
      if (colonIndex > 0) {
        const key = text.substring(0, colonIndex).trim();
        let value = text.substring(colonIndex + 1).trim();
        info[key] = value;
      }
    });
    
    const genres = [];
    \$('.genxed a').each((i, el) => {
      genres.push(\$(el).text().trim());
    });
    
    const sinopsis = \$('.entry-content p').map((i, el) => \$(el).text().trim()).get().join(' ');
    
    const rating = \$('.rating strong').text().trim().replace('Rating', '').trim();
    const ratingValue = rating.match(/(\\d+\\.\\d+)/);
    const bookmarkCount = \$('.bmc').text().trim().replace('Diikuti', '').replace('orang', '').trim();
    
    const episodes = [];
    const episodeItems = \$('.eplister ul li');
    
    for (let i = 0; i < episodeItems.length; i++) {
      const el = episodeItems[i];
      const episodeLink = \$(el).find('a').attr('href');
      const episodeNum = \$(el).find('.epl-num').text().trim();
      const episodeTitle = \$(el).find('.epl-title').text().trim();
      const episodeDate = \$(el).find('.epl-date').text().trim();
      
      let streamData = null;
      if (includeStream && episodeLink) {
        streamData = await this.getEpisodeStream(episodeLink);
      }
      
      episodes.push({
        episode: episodeNum,
        title: episodeTitle,
        link: episodeLink,
        date: episodeDate,
        stream: streamData
      });
    }
    
    return {
      title: title,
      image: image,
      info: info,
      genres: genres,
      sinopsis: sinopsis,
      rating: ratingValue ? parseFloat(ratingValue[1]) : null,
      bookmarkCount: bookmarkCount ? parseInt(bookmarkCount) : null,
      totalEpisodes: episodes.length,
      episodes: episodes.reverse(),
      url: url
    };
  }

  async scrape(keyword, includeStream = true) {
    const searchResult = await this.searchAnime(keyword);
    
    if (searchResult.totalResults === 0) {
      return { search: searchResult, detail: null };
    }
    
    const firstResult = searchResult.results[0];
    const detailResult = await this.getAnimeDetail(firstResult.link, includeStream);
    
    return {
      search: searchResult,
      detail: detailResult
    };
  }
}

(async () => {
  const scraper = new Animekuindo();
  const result = await scraper.scrape('Solo leveling', true);
  console.log(JSON.stringify(result, null, 2));
})();