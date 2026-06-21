> const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://v6.kiryuu.to/',
};

const API_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Referer': 'https://v6.kiryuu.to/',
};

const AJAX_HEADERS = {
    ...HEADERS,
    'X-Requested-With': 'XMLHttpRequest',
};

async function search(query) {
    const { data } = await axios.get('https://v6.kiryuu.to/wp-json/wp/v2/manga', {
        headers: API_HEADERS,
        params: { search: query, per_page: 20 }
    });

    if (!Array.isArray(data)) throw new Error('Response bukan array: ' + JSON.stringify(data).slice(0, 200));

    return data.map(item => ({
        title: item.title?.rendered || item.slug || '',
        link: item.link || '',
        image: item.metadata?.meta?.thumbnail || null,
        rating: item.metadata?.meta?.score || null,
        chapters: []
    }));
}

async function detail(url) {
    const slug = url.replace(/\/$/, '').split('/').pop();

    const [pageRes, apiRes] = await Promise.all([
        axios.get(url, { headers: HEADERS }),
        axios.get('https://v6.kiryuu.to/wp-json/wp/v2/manga', {
            headers: API_HEADERS,
            params: { slug, _fields: 'id,metadata' }
        })
    ]);

    const $ = cheerio.load(pageRes.data);
    const mangaId = apiRes.data[0]?.id;

    const title = $('h1[itemprop="name"]').text().trim();
    const image = apiRes.data[0]?.metadata?.meta?.thumbnail || $('img.wp-post-image').first().attr('src') || null;
    const rating = apiRes.data[0]?.metadata?.meta?.score || null;
    const synopsis = $('[itemprop="description"][data-show="false"] p').text().trim();

    const genres = [];
    $('a[itemprop="genre"]').each((_, el) => genres.push($(el).text().trim()));

    const chapters = await fetchChapters(mangaId);

    return { title, image, synopsis, rating, genres, chapters, link: url };
}

async function fetchChapters(mangaId, page = 1) {
    const { data } = await axios.get('https://v6.kiryuu.to/wp-admin/admin-ajax.php', {
        headers: AJAX_HEADERS,
        params: { manga_id: mangaId, page, action: 'chapter_list' }
    });

    const $ = cheerio.load(data);
    const chapters = [];
    $('a[href*="/chapter-"]').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href && text) chapters.push({ title: text, link: href });
    });
    return chapters;
}

async function chapter(url) {
    const { data } = await axios.get(url, { headers: HEADERS });
    const $ = cheerio.load(data);

    const title = $('h1.font-semibold').first().text().trim();

    const images = [];
    $('section[data-image-data] img').each((_, el) => {
        const src = $(el).attr('src');
        if (src) images.push(src);
    });

    const prevLink = $('a[aria-label="Prev"]:not(.pointer-events-none)').attr('href') || null;
    const nextLink = $('a[aria-label="Next"]').attr('href') || null;

    return { title, images, prevLink, nextLink };
}

async function latest(page = 1) {
    const url = page > 1
        ? `https://v6.kiryuu.to/latest/?the_page=${page}`
        : 'https://v6.kiryuu.to/latest/';

    const { data } = await axios.get(url, { headers: HEADERS });
    const $ = cheerio.load(data);

    const results = [];

    $('#search-results > div').each((_, card) => {
        const $card = $(card);

        const title = $card.find('h1').first().text().trim();
        const link = $card.find('a[href*="/manga/"]').first().attr('href') || null;
        const image = $card.find('img.wp-post-image').attr('src') || null;
        const rating = $card.find('.numscore').first().text().trim() || null;

        const chapters = [];
        $card.find('a.link-self').each((_, ch) => {
            const chLink = $(ch).attr('href');
            const chTitle = $(ch).find('p').text().trim();
            const chDate = $(ch).find('time').text().trim();
            if (chLink && chTitle) chapters.push({ title: chTitle, link: chLink, date: chDate });
        });

        if (title && link) results.push({ title, link, image, rating, chapters });
    });

    const totalPages = $('.flex.items-center.gap-2 a[href*="the_page"]').length + 1;

    return { page, results, totalPages };
}

return latest(1);