import axios from 'axios';

const API_URL = 'https://www.gamersberg.com/api/v1/blox-fruits/stock';

async function getStock() {
    try {
        console.log('--- Menghubungi API Gamersberg (Bypass Mode)... ---');
        
        const response = await axios.get(API_URL, {
            headers: {
                'RSC': '1', 
                'Next-Router-State-Tree': '1',
                'Next-Router-Prefetch': '1',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.gamersberg.com/blox-fruits-stock/',
                'Accept': 'application/json'
            }
        });

        const rawData = response.data.data[0];
        
        console.log('\n🌟 BLOX FRUITS CURRENT STOCK 🌟');
        console.log('====================================');
        
        console.log('\n🛒 NORMAL STOCK:');
        console.table(rawData.normalStock.map(f => ({
            Name: f.name,
            Price: `$${f.price.toLocaleString()}`
        })));

        console.log('\n🏝️ MIRAGE STOCK:');
        console.table(rawData.mirageStock.map(f => ({
            Name: f.name,
            Price: `$${f.price.toLocaleString()}`
        })));

        const lastUpdate = new Date(rawData.timestamp * 1000).toLocaleString('id-ID');
        console.log(`\n🕒 Last Update: ${lastUpdate}`);
        console.log(`👤 Scanned by: ${rawData.playerName}`);

    } catch (error) {
        console.error('❌ Gagal Tembus:', error.response?.status || error.message);
        if (error.response?.status === 401) {
            console.log('Server minta token/cookie baru. Coba buka webnya dulu di browser.');
        }
    }
}

getStock(); asu