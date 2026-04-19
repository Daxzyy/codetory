const axios = require('axios');
const cheerio = require('cheerio');

class Xnxx {
    constructor(proxy = 'https://uncors.netlify.app/?destination=') {
        this.proxy = proxy;
    }
    
    search = async function (query, page = 1) {
        try {
            if (!query) throw new Error('Query is required.');
            if (isNaN(page)) throw new Error('Page must be a number.');
            
            const { data } = await axios.get(`${this.proxy}https://www.xnxx.com/search/${query}/${page}`);
            const $ = cheerio.load(data);
            
            const results = [];
            $('div[id*="video_"]').each((_, el) => {
                const id = $(el).attr('data-id');
                const eid = $(el).attr('data-eid');
                const isChannel = $(el).attr('data-is-channel') === '1';
                const title = $(el).find('.thumb-under p:first-of-type a').attr('title') || $(el).find('.thumb-under p:first-of-type a').text().trim();
                const url = $(el).find('.thumb-inside .thumb a').attr('href');
                const cover = $(el).find('.thumb-inside .thumb img').attr('data-src');
                const preview = $(el).find('.thumb-inside .thumb img').attr('data-pvv');
                const uploader = isChannel ? $(el).find('.uploader a .name').text().trim() : null;
                const uploaderUrl = isChannel ? $(el).find('.uploader a').attr('href') : null;
                
                const metaEl = $(el).find('.thumb-under p.metadata');
                const views = metaEl.find('span.right').contents().filter((_, n) => n.type === 'text').text().trim();
                const rating = metaEl.find('span.superfluous').first().text().trim();
                const duration = metaEl.contents().filter((_, n) => n.type === 'text').map((_, n) => $(n).text().trim()).get().filter(Boolean).join('').trim();
                const resolution = metaEl.find('span.video-hd').contents().filter((_, n) => n.type === 'text').map((_, n) => $(n).text().trim()).get().filter(Boolean).join('').trim();
                
                results.push({
                    id,
                    eid,
                    title,
                    channel: isChannel ? {
                        name: uploader,
                        url: uploaderUrl ? `https://www.xnxx.com${uploaderUrl}` : null,
                    } : null,
                    duration,
                    views,
                    rating,
                    resolution,
                    thumbnail: {
                        cover: cover || null,
                        preview: preview || null,
                    },
                    url: url ? `https://www.xnxx.com${url}` : null
                });
            });
            
            const totalResults = (() => {
                const txt = $('span.free-plate').attr('title') || '';
                const match = txt.match(/([\d,]+)/);
                return match ? parseInt(match[1].replace(/,/g, '')) : null;
            })();
            
            const lastPageEl = $('div.pagination ul li a.last-page').first();
            const totalPages = lastPageEl.length ? parseInt(lastPageEl.text().trim()) : null;
            if (totalPages && parseInt(page) > totalPages) throw new Error(`Page ${page} exceeds total pages (${totalPages}).`);
            
            return {
                page: parseInt(page),
                totalResults,
                totalPages,
                results,
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    detail = async function (url) {
        try {
            if (!url.includes('www.xnxx.com')) throw new Error('Invalid url.');
            
            const { data } = await axios.get(`${this.proxy}${url}`);
            const $ = cheerio.load(data);
            
            const scriptContent = $('#video-player-bg > script:nth-child(6)').html();
            const ex = (regex) => (scriptContent.match(regex) || [])[1] || null;
            
            const confMatch = data.match(/window\.xv\.conf\s*=\s*(\{.+?\});\s*<\/script>/s);
            const conf = confMatch ? JSON.parse(confMatch[1]) : {};
            const videoData = conf?.data || {};
            
            const metaEl = $('#video-content-metadata');
            
            const metaText = metaEl.find('.clear-infobar .metadata').text();
            const durationRaw = metaText.match(/(\d+(?:h\s*)?\d*\s*min(?:\s*\d+\s*sec)?|\d+\s*sec)/i)?.[1]?.trim() || null;
            const resolutionRaw = metaText.match(/(\d{3,4}p)/i)?.[1] || null;
            const viewsRaw = metaText.match(/(\d[\d,\.]+(?:[kMB])?)\s*(?:views)?$/i)?.[1]?.trim() || metaText.match(/([\d,]+(?:\.\d+)?[kMB]?)\s*$/)?.[1]?.trim() || null;
            
            const rating = metaEl.find('#video-votes .rating-box').text().trim() || null;
            const votesGood = metaEl.find('.vote-action-good .value').text().trim() || null;
            const votesBad = metaEl.find('.vote-action-bad .value').text().trim() || null;
            
            const description = metaEl.find('.video-description').text().trim() || null;
            
            const tags = [];
            metaEl.find('.video-tags a.is-keyword').each((_, el) => tags.push($(el).text().trim()));
            
            const uploaderName = videoData.uploader || ex(/html5player\.setUploaderName\('(.*?)'\);/) || null;
            const uploaderUrl = videoData.uploader_url ? `https://www.xnxx.com${videoData.uploader_url}` : null;
            
            const uploadDate = $('meta[property="og:duration"]').closest('head').find('script[type="application/ld+json"]').first().html();
            let uploadDateParsed = null;
            let durationISO = null;
            if (uploadDate) {
                try {
                    const ld = JSON.parse(uploadDate);
                    uploadDateParsed = ld.uploadDate || null;
                    durationISO = ld.duration || null;
                } catch (_) {}
            }
            
            return {
                id: String(videoData.id_video || ''),
                eid: videoData.encoded_id_video || null,
                title: ex(/html5player\.setVideoTitle\('(.*?)'\);/) || $('meta[property="og:title"]').attr('content') || null,
                uploader: {
                    name: uploaderName,
                    url: uploaderUrl,
                },
                description,
                duration: durationRaw || durationISO || null,
                views: viewsRaw || null,
                resolution: resolutionRaw || null,
                rating,
                votes: { good: votesGood, bad: votesBad },
                uploadDate: uploadDateParsed,
                tags,
                thumbnail: {
                    cover: ex(/html5player\.setThumbUrl\('(.*?)'\);/) || null,
                    cover169: ex(/html5player\.setThumbUrl169\('(.*?)'\);/) || null,
                    slide: ex(/html5player\.setThumbSlide\('(.*?)'\);/) || null,
                    slideBig: ex(/html5player\.setThumbSlideBig\('(.*?)'\);/) || null,
                },
                videos: (() => {
                    const low = ex(/html5player\.setVideoUrlLow\('(.*?)'\);/);
                    const high = ex(/html5player\.setVideoUrlHigh\('(.*?)'\);/);
                    const HLS = ex(/html5player\.setVideoHLS\('(.*?)'\);/);
                    const getRes = u => u?.match(/video_(\d+p)/)?.[1] || null;
                    return {
                        [`${getRes(low) || 'low'}`]: low || null,
                        [`${getRes(high) || 'high'}`]: high || null,
                        HLS: HLS || null,
                    };
                })()
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

// Usage:
const x = new Xnxx();
x.search('girl').then(console.log);
