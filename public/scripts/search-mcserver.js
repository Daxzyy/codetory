const axios = require('axios');
const cheerio = require('cheerio');

async function srvrmcSearch(query) {
    try {
        const url = \`https://minecraft.buzz/search/\${encodeURIComponent(query)}\`;
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const \$ = cheerio.load(res.data);
        const servers = [];
        
        \$('tr.server-row').each((index, element) => {
            const \$row = \$(element);
            
            const server = {
                rank: parseInt(\$row.find('td:first-child span.fw-bold').text().trim()) || 0,
                name: \$row.find('h3.fs-6').text().trim(),
                image: \$row.find('img[width="64"][height="64"]').attr('src'),
                banner: \$row.find('img.img-fluid.rounded-top').attr('src'),
                ip: \$row.find('data.ip-block').attr('value') || \$row.find('data.ip-block').text().trim(),
                version: \$row.find('span.badge:contains("Version")').text().replace('Version', '').trim(),
                gamemode: \$row.find('a[href^="category/"] span.badge').text().trim(),
                type: \$row.find('span.badge:contains("Cross Platform")').text().trim(),
                players: \$row.find('td:eq(5)').text().trim(),
                status: \$row.find('data[value="Online"]').text().trim() || 'Offline',
                description: \$row.find('td.text-black-50 p').text().trim()
            };
            
            servers.push(server);
        });
        
        return servers;
    } catch (e) {
        throw new Error(\`\${e.message}\`);
    }
}

module.exports = srvrmcSearch;