const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

class Kusonime {
    constructor() {
        this.baseUrl = 'https://kusonime.com';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Sec-Ch-Ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Linux"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        };
        this.cookies = {};
    }

    generateGaCookie() {
        const clientId = Math.floor(Math.random() * 1000000000);
        const timestamp = Math.floor(Date.now() / 1000);
        return \`GA1.2.\${clientId}.\${timestamp}\`;
    }

    generateGid() {
        return \`GA1.2.\${Math.floor(Math.random() * 1000000000)}.\${Math.floor(Date.now() / 1000)}\`;
    }

    generateCfClearance() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
        return \`\${result}-\${Math.floor(Date.now() / 1000)}-1-2-1-\${crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}\`;
    }

    initCookies() {
        this.setCookie('_ga', this.generateGaCookie());
        this.setCookie('_gid', this.generateGid());
        this.setCookie('_ga_G21JFBZV4Z', \`GS2.1.s\${Math.floor(Date.now() / 1000)}\$o1\$g1\$t\${Math.floor(Date.now() / 1000)}\$j33\$l0\$h0\`);
        this.setCookie('cf_clearance', this.generateCfClearance());
    }

    setCookie(name, value) {
        this.cookies[name] = value;
    }

    getCookieString() {
        const cookieParts = [];
        for (const [name, value] of Object.entries(this.cookies)) {
            cookieParts.push(\`\${name}=\${value}\`);
        }
        return cookieParts.join('; ');
    }

    async searchAnime(keyword) {
        this.initCookies();
        
        const url = \`\${this.baseUrl}/?s=\${encodeURIComponent(keyword)}&post_type=post\`;
        
        const response = await axios.get(url, {
            headers: {
                ...this.headers,
                'Cookie': this.getCookieString(),
                'Referer': this.baseUrl
            }
        });
        
        const \$ = cheerio.load(response.data);
        
        const results = [];
        
        \$('.kover').each((index, element) => {
            const title = \$(element).find('.episodeye a').text().trim();
            const link = \$(element).find('.episodeye a').attr('href');
            const image = \$(element).find('.thumbz img').attr('src');
            const postedBy = \$(element).find('.content p:first-child').text().trim().replace('Posted by', '').trim();
            const released = \$(element).find('.content p:nth-child(2)').text().trim().replace('Released on', '').trim();
            
            const genres = [];
            \$(element).find('.content p:last-child a').each((i, el) => {
                genres.push(\$(el).text().trim());
            });
            
            if (title) {
                results.push({
                    title: title,
                    link: link,
                    image: image,
                    postedBy: postedBy,
                    released: released,
                    genres: genres
                });
            }
        });
        
        return {
            keyword: keyword,
            totalResults: results.length,
            results: results
        };
    }

    async getAnimeDetail(url) {
        this.initCookies();
        
        const response = await axios.get(url, {
            headers: {
                ...this.headers,
                'Cookie': this.getCookieString(),
                'Referer': this.baseUrl
            }
        });
        
        const \$ = cheerio.load(response.data);
        
        const title = \$('h1.jdlz').text().trim();
        const image = \$('.post-thumb img').attr('src');
        
        const info = {};
        \$('.info p').each((index, element) => {
            const text = \$(element).text().trim();
            const colonIndex = text.indexOf(':');
            if (colonIndex > 0) {
                const key = text.substring(0, colonIndex).trim();
                let value = text.substring(colonIndex + 1).trim();
                if (key === 'Genre') {
                    const genres = [];
                    \$(element).find('a').each((i, el) => {
                        genres.push(\$(el).text().trim());
                    });
                    value = genres;
                }
                info[key] = value;
            }
        });
        
        const sinopsis = [];
        \$('.lexot p').each((index, element) => {
            const text = \$(element).text().trim();
            if (text.length > 50 && !text.includes('Download') && !text.includes('Cerita Bokapnya')) {
                sinopsis.push(text);
            }
        });
        
        const downloadLinks = [];
        \$('.smokeddlrh').each((index, element) => {
            const batchTitle = \$(element).find('.smokettlrh').text().trim();
            const qualities = [];
            
            \$(element).find('.smokeurlrh').each((i, el) => {
                const quality = \$(el).find('strong').text().trim();
                const links = [];
                \$(el).find('a').each((j, a) => {
                    const provider = \$(a).text().trim();
                    const linkUrl = \$(a).attr('href');
                    if (provider && linkUrl && provider !== 'Hxfileco') {
                        links.push({
                            provider: provider,
                            url: linkUrl
                        });
                    }
                });
                if (quality && links.length > 0) {
                    qualities.push({
                        quality: quality,
                        links: links
                    });
                }
            });
            
            if (batchTitle && qualities.length > 0) {
                downloadLinks.push({
                    batchTitle: batchTitle,
                    qualities: qualities
                });
            }
        });
        
        return {
            title: title,
            image: image,
            info: info,
            sinopsis: sinopsis.join(' ').substring(0, 500),
            downloadLinks: downloadLinks,
            url: url
        };
    }
}

(async () => {
    const scraper = new Kusonime();
    const keyword = 'boruto';
    const searchResult = await scraper.searchAnime(keyword);
    
    if (searchResult.results.length > 0) {
        const firstUrl = searchResult.results[0].link;
        const detailResult = await scraper.getAnimeDetail(firstUrl);
        console.log(JSON.stringify(detailResult, null, 2));
    } else {
        console.log(JSON.stringify({ error: null, keyword: keyword }, null, 2));
    }
})();