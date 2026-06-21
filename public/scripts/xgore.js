const axios = require('axios');
const cheerio = require('cheerio');

async function search(query) {
    try {
        const url = query ? `https://xgore.net/?s=${encodeURIComponent(query)}` : 'https://xgore.net';
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const html = response.data;
        const $ = cheerio.load(html);
        
        const posts = [];
        const seenLinks = new Set();
        
        $('.search-result-item').each((index, element) => {
            const title = $(element).find('.entry-title a').text().trim();
            const link = $(element).find('.entry-title a').attr('href');
            const thumbnail = $(element).find('.search-thumb').attr('src');
            const date = $(element).find('.posted-on').text().trim();
            const categories = [];
            
            $(element).find('.categories a').each((i, cat) => {
                categories.push($(cat).text().trim());
            });
            
            if (title && link && !seenLinks.has(link)) {
                seenLinks.add(link);
                posts.push({
                    title: title,
                    link: link,
                    thumbnail: thumbnail || null,
                    date: date || null,
                    categories: categories.length > 0 ? categories : null
                });
            }
        });
        
        return posts;
    } catch (error) {
        throw new Error(`Failed to fetch or parse: ${error.message}`);
    }
}

async function detail(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const html = response.data;
        const $ = cheerio.load(html);
        
        const title = $('.entry-title').text().trim();
        const date = $('.posted-on').text().trim();
        const categories = [];
        $('.cat-links a').each((i, cat) => {
            categories.push($(cat).text().trim());
        });
        
        const tags = [];
        $('.tags-links a').each((i, tag) => {
            tags.push($(tag).text().trim());
        });
        
        const content = [];
        $('.entry-content p').each((i, p) => {
            const text = $(p).text().trim();
            if (text) {
                content.push(text);
            }
        });
        
        const images = [];
        $('.entry-content img').each((i, img) => {
            const src = $(img).attr('src');
            if (src) {
                images.push(src);
            }
        });
        
        const video = [];
        $('.entry-content video source').each((i, source) => {
            const src = $(source).attr('src');
            if (src) {
                video.push(src);
            }
        });
        
        return {
            title: title || null,
            date: date || null,
            categories: categories.length > 0 ? categories : null,
            tags: tags.length > 0 ? tags : null,
            content: content.length > 0 ? content : null,
            images: images.length > 0 ? images : null,
            video: video.length > 0 ? video : null
        };
    } catch (error) {
        throw new Error(`Failed to fetch or parse detail: ${error.message}`);
    }
}

return detail("https://xgore.net/the-man-was-cut-in-half-by-a-train")