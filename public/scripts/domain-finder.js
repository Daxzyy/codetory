const BASE_URL = 'https://hub.givy.my.id/search/domain';

async function searchDomain(keyword) {
  if (!keyword) {
    console.error('❌ Please provide a keyword! Example: node domain.js arya');
    process.exit(1);
  }

  console.log(`🔍 Searching domains for keyword: "${keyword}"...\n`);

  try {
    const url = `${BASE_URL}?q=${encodeURIComponent(keyword)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.status || !data.result) {
      console.log('⚠️ No results found or invalid response.');
      return;
    }

    console.log(`✅ Found ${data.total} domains for "${data.query}":\n`);
    
    data.result.forEach((domain, index) => {
      console.log(`${String(index + 1).padStart(2, '0')}. ${domain}`);
    });

    console.log(`\nTotal: ${data.total} domains`);

  } catch (error) {
    console.error('❌ An error occurred while fetching data:');
    console.error(error.message);
  }
}

const keyword = process.argv[2];

searchDomain(keyword);
