const axios = require('axios');
const cheerio = require('cheerio');

class SeeGore {
    search = async function (query, page = 1) {
        try {
            if (!query) throw new Error('Query is required.');
            if (isNaN(page)) throw new Error('Page must be a number.');
            
            const { data } = await axios.get(`https://uncors.netlify.app/?destination=https://seegore.com/page/${page}/?s=${encodeURIComponent(query)}`);
            const $ = cheerio.load(data);
            const results = [];
            
            $('li.post-item').each((_, el) => {
                const articleClass = $(el).find('article').attr('class') || '';
                const post_id = articleClass.match(/\bpost-(\d+)\b/)?.[1] || null;
                
                const title = $(el).find('h2.entry-title a').text().trim();
                const url = $(el).find('h2.entry-title a').attr('href') || null;
                const cover = $(el).find('img.wp-post-image').attr('src') || $(el).find('img.wp-post-image').attr('data-src') || null;
                
                const categories = [];
                $(el).find('div.bb-cat-links a').each((_, cat) => categories.push($(cat).text().trim()));
                
                const comments = $(el).find('a.post-meta-item.post-comments span.count').text().trim() || '0';
                
                if (title && url) {
                    results.push({
                        id: post_id,
                        title,
                        categories,
                        comments,
                        cover,
                        url
                    });
                }
            });
            
            const lastPage = $('ul.pg-list li.pg-item a.page-numbers:not(.next):not(.prev)').last().text().trim();
            const total_pages = parseInt(lastPage) || 1;
            if (total_pages && parseInt(page) > total_pages) throw new Error(`Page ${page} exceeds total pages (${totalPages}).`);
            
            return {
                page: parseInt(page),
                total_pages,
                results
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    detail = async function (url) {
        try {
            if (!url.includes('seegore.com')) throw new Error('Invalid url.');
            
            const { data } = await axios.get(`https://uncors.netlify.app/?destination=${url}`);
            const $ = cheerio.load(data);
            
            const title = $('h1.entry-title.s-post-title').text().trim();
            const post_id = $('article').attr('data-post-id') || null;
            
            const categories = [];
            $('p.bb-cat-links a, p.s-post-cat-links a').each((_, el) => categories.push($(el).text().trim()));
            
            const tags = [];
            $('div.bb-tags a').each((_, el) => tags.push($(el).text().trim()));
            
            const description = $('div.s-post-content p').map((_, el) => $(el).text().trim()).get().filter(t => t && !t.includes('Article Rating')).join(' ').trim();
            const views = $('span.s-post-views span.count').text().trim() || $('span.post-views span.count').first().text().trim() || '0';
            const comments = $('a.post-comments span.count').first().text().trim() || '0';
            const points = $('span.bb-post-rating span.text[label="points"]').first().text().trim() || '0';
            const rating = $('span.wpdrv').text().trim() || null;
            const rating_votes = $('span.wpdrc').text().trim() || null;
            const cover = $('video').attr('poster') || $('img.wp-post-image').attr('src') || null;
            const video_url = $('video source').first().attr('src') || null;
            const published_at = $('time.entry-date.published').attr('datetime') || null;
            const updated_at = $('time.entry-date.updated').attr('datetime') || null;
            
            const author = {
                name: $('a.auth-url span[itemprop="name"]').text().trim() || null,
                url: $('a.auth-url').attr('href') || null,
                avatar: $('div.author-avatar img').attr('src') || null
            };
            
            const reactions = [];
            $('div.reaction-item').each((_, el) => {
                const name = $(el).find('a.reaction-vote-btn').text().trim();
                const count = parseInt($(el).find('div.reaction-stat-count').text().trim()) || 0;
                const style = $(el).find('div.reaction-stat').attr('style') || '';
                const percentage = parseInt(style.match(/height:(\d+)%/)?.[1]) || 0;
                
                if (name) reactions.push({ name, count, percentage });
            });
            
            const related = [];
            $('aside.bb-other-posts li.post-item').each((_, el) => {
                const t = $(el).find('h2.entry-title a').text().trim();
                const u = $(el).find('h2.entry-title a').attr('href') || null;
                const img = $(el).find('img.wp-post-image').attr('src') || $(el).find('img.wp-post-image').attr('data-src') || null;
                const articleClass = $(el).find('article').attr('class') || '';
                const rel_post_id = articleClass.match(/\bpost-(\d+)\b/)?.[1] || null;
                
                const rel_categories = [];
                $(el).find('div.bb-cat-links a').each((_, cat) => rel_categories.push($(cat).text().trim()));
                
                const rel_comments = $(el).find('a.post-comments span.count').text().trim() || '0';
                
                if (t && u) {
                    related.push({
                        id: rel_post_id,
                        title: t,
                        categories: rel_categories,
                        comments: rel_comments,
                        cover: img,
                        url: u
                    });
                }
            });
            
            return {
                id: post_id,
                title,
                description,
                author,
                views,
                comments,
                points,
                rating,
                rating_votes,
                categories,
                tags,
                reactions,
                cover,
                video_url,
                published_at,
                updated_at,
                related
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

// Usage:
const sg = new SeeGore();
sg.detail('https://seegore.com/gun-at-fist-fight/').then(res => console.log(JSON.stringify(res, null, 2)));