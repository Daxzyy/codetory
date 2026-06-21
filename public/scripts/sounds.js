const axios = require('axios');

async function search(query) {
  const url = `https://soundbuttonsworld.com/api/memes/search?page=0&pageSize=10&q=${encodeURIComponent(query)}`;
  const res = await axios.get(url);
  return res.data.data;
}

function getSlug(button) {
  return button.url;
}

async function getButtonBySlug(slug) {
  const url = `https://soundbuttonsworld.com/api/memes/button?url=${encodeURIComponent(slug)}`;
  const res = await axios.get(url);
  return res.data;
}

async function download(button) {
  return `https://soundbuttonsworld.com/api/upload/download?id=${button.fileName}`;
}

async function main() {
  const results = await search('prabowo');
  const slug = getSlug(results[0]);
  const button = await getButtonBySlug(slug);
  const mp3Url = await download(button);
  return mp3Url;
}
return main()