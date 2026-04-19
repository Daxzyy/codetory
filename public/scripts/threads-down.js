> const axios = require("axios");
const cheerio = require("cheerio");

const formatUrl = (url) => {
    let clean = url.split("?")[0];
    if (clean.endsWith("/")) clean = clean.slice(0, -1);
    return `${clean}/embed/`;
};

const getMedia = ($) => {
    const mediaList = [];

    const vid = $(".SingleInnerMediaContainerVideo source").attr("src");
    if (vid) return [vid.replace(/&amp;/g, "&")];

    const img = $(".SingleInnerMediaContainer img").attr("src");
    if (img) return [img.replace(/&amp;/g, "&")];

    $(".MediaScrollImageContainer img").each((i, el) => {
        mediaList.push($(el).attr("src").replace(/&amp;/g, "&"));
    });

    return mediaList;
};

async function threads(url) {
    try {
        const $ = cheerio.load(
            await axios.get(formatUrl(url)).then((res) => res.data),
        );

        return {
            media: getMedia($),
            caption: $(".BodyTextContainer").text().trim() || null,
        };
    } catch (err) {
        throw new Error("Error:", err.message);
    }
}
return threads("https://www.threads.net/@sejarahbali/post/DF8uAHDTMnw?xmt=AQGzdtjTFSH4pQSg8AXu4vFLP-w1HJ_OyTfGAknvxJSoCw")