import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://anichin.moe";

const createInstance = () => {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    timeout: 30000,
  });
};

export class AnichinCare {
  constructor() {
    this.client = createInstance();
  }

  async home() {
    const response = await this.client.get("/");
    const \$ = cheerio.load(response.data);
    const data = {
      slider: [],
      popular: [],
      latest: [],
    };

    \$("#slidertwo .swiper-slide.item").each((_, el) => {
      const title =
        \$(el).find("h2 a").attr("data-jtitle") ||
        \$(el).find("h2 a").text().trim();
      const link = \$(el).find("h2 a").attr("href") || "";
      const backdrop =
        \$(el)
          .find(".backdrop")
          .attr("style")
          ?.match(/url\\(['"]?([^'")]+)/)?.[1] || null;
      const description = \$(el).find("p").not(":empty").last().text().trim();

      if (title && link) {
        data.slider.push({
          title,
          slug: this.extractSlug(link),
          url: link.startsWith("http") ? link : \`\${BASE_URL}\${link}\`,
          backdrop,
          description,
        });
      }
    });

    \$(".hothome + .listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem(\$, el);
      if (item) data.popular.push(item);
    });

    \$(".latesthome + .listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem(\$, el);
      if (item) data.latest.push(item);
    });

    return data;
  }

  async slider() {
    const response = await this.client.get("/");
    const \$ = cheerio.load(response.data);
    const data = [];

    \$("#slidertwo .swiper-slide.item").each((_, el) => {
      const title =
        \$(el).find("h2 a").attr("data-jtitle") ||
        \$(el).find("h2 a").text().trim();
      const link = \$(el).find("h2 a").attr("href") || "";
      const backdrop =
        \$(el)
          .find(".backdrop")
          .attr("style")
          ?.match(/url\\(['"]?([^'")]+)/)?.[1] || null;
      const description = \$(el).find("p").not(":empty").last().text().trim();

      if (title && link) {
        data.push({
          title,
          slug: this.extractSlug(link),
          url: link.startsWith("http") ? link : \`\${BASE_URL}\${link}\`,
          backdrop,
          description,
        });
      }
    });

    return data;
  }

  async populer() {
    const response = await this.client.get("/");
    const \$ = cheerio.load(response.data);
    const data = [];

    \$(".hothome + .listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem(\$, el);
      if (item) data.push(item);
    });

    return data;
  }

  async terbaru(page = 1) {
    const response = await this.client.get(
      \`/anime/?status=&type=&order=update&page=\${page}\`,
    );
    const \$ = cheerio.load(response.data);
    const data = [];

    \$(".listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem(\$, el);
      if (item) data.push(item);
    });

    const pagination = this.parsePagination(\$);
    return {
      results: data,
      pagination,
    };
  }

  async completed(page = 1) {
    const response = await this.client.get(
      \`/anime/?status=completed&type=&order=update&page=\${page}\`,
    );
    const \$ = cheerio.load(response.data);
    const data = [];

    \$(".listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem(\$, el);
      if (item) data.push(item);
    });

    const pagination = this.parsePagination(\$);
    return {
      results: data,
      pagination,
    };
  }

  async ongoing(page = 1) {
    const response = await this.client.get(
      \`/anime/?status=ongoing&type=&order=update&page=\${page}\`,
    );
    const \$ = cheerio.load(response.data);
    const data = [];

    \$(".listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem(\$, el);
      if (item) data.push(item);
    });

    const pagination = this.parsePagination(\$);
    return {
      results: data,
      pagination,
    };
  }

  async movie(page = 1) {
    const response = await this.client.get(
      \`/anime/?status=&type=movie&order=update&page=\${page}\`,
    );
    const \$ = cheerio.load(response.data);
    const data = [];

    \$(".listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem(\$, el);
      if (item) data.push(item);
    });

    const pagination = this.parsePagination(\$);
    return {
      results: data,
      pagination,
    };
  }

  async search(query, page = 1) {
    const response = await this.client.get(
      \`/page/\${page}/?s=\${encodeURIComponent(query)}\`,
    );
    const \$ = cheerio.load(response.data);
    const data = [];

    \$(".listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem(\$, el);
      if (item) data.push(item);
    });

    const pagination = this.parsePagination(\$);
    return {
      query,
      results: data,
      pagination,
    };
  }

  async detail(slug) {
    const response = await this.client.get(\`/\${slug}/\`);
    const \$ = cheerio.load(response.data);
    const data = {
      title: "",
      japaneseTitle: "",
      synopsis: "",
      type: "",
      status: "",
      genres: [],
      episodes: [],
      cover: null,
    };

    const info = \$(".infox");
    data.title =
      info.find(".entry-title").text().trim() ||
      info.find("h1").first().text().trim();
    data.japaneseTitle = info.find(".jtitle").text().trim() || null;

    const synopsisText = \$(".entry-content").find("p").first().text().trim();
    data.synopsis = synopsisText || \$(".desc").text().trim() || null;

    info.find(".spe span").each((_, el) => {
      const label = \$(el).find(".btl").text().trim().toLowerCase();
      const value = \$(el).contents().not("span").text().trim();

      if (label.includes("type")) {
        data.type = value || null;
      } else if (label.includes("status")) {
        data.status = value || null;
      } else if (label.includes("genre")) {
        \$(el)
          .find("a")
          .each((_, a) => {
            const genre = \$(a).text().trim();
            if (genre) data.genres.push(genre);
          });
      }
    });

    const coverImg =
      \$(".thumb img").attr("src") || \$(".thumb img").attr("data-src");
    data.cover = coverImg || null;

    \$(".eplister ul li").each((_, el) => {
      const title = \$(el).find(".epl-title").text().trim();
      const link = \$(el).find("a").attr("href") || "";
      const date = \$(el).find(".epl-date").text().trim() || null;

      if (title && link) {
        data.episodes.push({
          title,
          slug: this.extractSlug(link),
          url: link.startsWith("http") ? link : \`\${BASE_URL}\${link}\`,
          date,
        });
      }
    });

    return data;
  }

  async episode(slug) {
    const response = await this.client.get(\`/\${slug}/\`);
    const \$ = cheerio.load(response.data);
    const data = {
      title: "",
      episodeNumber: "",
      releasedDate: "",
      author: "",
      series: null,
      cover: null,
      prevEpisode: null,
      nextEpisode: null,
      streams: [],
    };

    data.title =
      \$(".entry-title").text().trim() || \$("h1").first().text().trim();
    data.episodeNumber =
      \$('[itemprop="episodeNumber"]').attr("content") || null;
    data.releasedDate = \$(".updated").text().trim() || null;
    data.author = \$(".vcard a").text().trim() || null;

    const seriesLink = \$(".lm .year a").attr("href");
    if (seriesLink) {
      data.series = {
        name: \$(".lm .year a").text().trim(),
        slug: this.extractSlug(seriesLink),
        url: seriesLink.startsWith("http")
          ? seriesLink
          : \`\${BASE_URL}\${seriesLink}\`,
      };
    }

    const coverImg =
      \$('[itemprop="image"] img').attr("src") ||
      \$(".thumb img").attr("src") ||
      null;
    data.cover = coverImg;

    const prevLink =
      \$(".naveps .nvs:first-child a:not(.nolink)").attr("href") || null;
    const nextLink = \$(".naveps .nvs:last-child a").attr("href") || null;

    if (prevLink) {
      data.prevEpisode = {
        slug: this.extractSlug(prevLink),
        url: prevLink.startsWith("http") ? prevLink : \`\${BASE_URL}\${prevLink}\`,
      };
    }

    if (nextLink) {
      data.nextEpisode = {
        slug: this.extractSlug(nextLink),
        url: nextLink.startsWith("http") ? nextLink : \`\${BASE_URL}\${nextLink}\`,
      };
    }

    \$(".mirror option").each((_, el) => {
      const serverName = \$(el).text().trim();
      const value = \$(el).attr("value") || "";

      if (value && serverName !== "Select Video Server") {
        const decoded = Buffer.from(value, "base64").toString("utf-8");
        const iframeMatch = decoded.match(/<iframe[^>]*src=["']([^"']+)["']/i);

        if (iframeMatch && iframeMatch[1]) {
          data.streams.push({
            server: serverName,
            url: iframeMatch[1],
          });
        }
      }
    });

    return data;
  }

  async genre(genreName, page = 1) {
    const response = await this.client.get(\`/genre/\${genreName}?page=\${page}\`);
    const \$ = cheerio.load(response.data);
    const data = [];

    \$(".listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem(\$, el);
      if (item) data.push(item);
    });

    const pagination = this.parsePagination(\$);
    return {
      genre: genreName,
      results: data,
      pagination,
    };
  }

  async genres() {
    const response = await this.client.get(
      "/anime/?status=&type=&order=update",
    );
    const \$ = cheerio.load(response.data);
    const data = [];

    \$(".filter-ser .genx option").each((_, el) => {
      const value = \$(el).attr("value");
      const label = \$(el).text().trim();
      if (value && label) {
        data.push({
          name: label,
          slug: value,
          url: \`\${BASE_URL}/genre/\${value}\`,
        });
      }
    });

    return data;
  }

  parseAnimeItem(\$, el) {
    const \$el = \$(el);
    const link = \$el.find(".bsx a").attr("href") || "";
    const title =
      \$el.find(".tt").text().trim() || \$el.find("img").attr("title") || "";
    const episode = \$el.find(".epx").text().trim() || null;
    const type = \$el.find(".typez").text().trim() || null;
    const imgSrc =
      \$el.find("img").attr("src") || \$el.find("img").attr("data-src") || null;
    const isHot = \$el.find(".hotbadge").length > 0;

    if (!title || !link) return null;

    return {
      title,
      slug: this.extractSlug(link),
      url: link.startsWith("http") ? link : \`\${BASE_URL}\${link}\`,
      episode,
      type,
      thumbnail: imgSrc,
      isHot,
    };
  }

  parsePagination(\$) {
    const data = {
      currentPage: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };

    const currentPage = \$(".pagination .current").text().trim();
    const totalPages = \$(".pagination .pages")
      .text()
      .match(/(\\d+)\$/)?.[1];

    if (currentPage) data.currentPage = parseInt(currentPage, 10) || 1;
    if (totalPages) data.totalPages = parseInt(totalPages, 10) || 1;

    data.hasNext = \$(".nextpage").length > 0;
    data.hasPrev = \$(".prevpage").length > 0;

    return data;
  }

  extractSlug(url) {
    if (!url) return "";
    try {
      const pathname = new URL(url).pathname;
      return pathname.replace(/^\\/|\\/\$/g, "");
    } catch {
      return url.replace(/^\\/|\\/\$/g, "");
    }
  }

  async getStreamUrl(streamUrl) {
    const response = await this.client.get(streamUrl, {
      headers: {
        Referer: BASE_URL,
      },
    });
    const \$ = cheerio.load(response.data);

    const data = {
      url: streamUrl,
      metadata: {},
    };

    const videoModule = \$('[data-module="OKVideo"]').attr("data-options");
    const movieId = \$('[data-module="OKVideo"]').attr("data-movie-id");
    const movieOptions = \$('[data-module="OKVideo"]').attr(
      "data-movie-options",
    );

    if (movieId) {
      data.metadata.movieId = movieId;
    }

    if (movieOptions) {
      try {
        data.metadata.options = JSON.parse(movieOptions);
      } catch {
        data.metadata.optionsRaw = movieOptions;
      }
    }

    if (videoModule) {
      try {
        data.metadata.video = JSON.parse(videoModule);
        if (data.metadata.video?.flashvars?.metadata)
          data.metadata.video = JSON.parse(
            data.metadata.video.flashvars.metadata,
          );
      } catch {
        data.metadata.videoRaw = videoModule;
      }
    }

    return data;
  }
}

export default AnichinCare;

/*
Quick recap functions:
     - home() — Slider + Popular + Latest
     - slider() — Featured slider
     - populer() — Popular Today
     - terbaru(page) — Latest Release
     - completed(page) — Completed anime
     - ongoing(page) — Ongoing anime
     - movie(page) — Movie anime
     - search(query, page) — Search
     - detail(slug) — Detail anime + episodes
     - episode(slug) — Episode detail + streams
     - genre(genreName, page) — Filter by genre
     - genres() — List all genres
     - getStreamUrl(url) — Get stream metadata from embed URL
Good luck dengan project nya cuy 😹
*/

const api = new AnichinCare();

/*const home = await api.home()
console.log(home);

const completed = await api.completed(1)
console.log(completed);

const ongoing = await api.ongoing(1)
console.log(ongoing);

const movie = await api.movie(1)
console.log(movie);

const search = await api.search("Prefect");
console.log(search);

const detail = await api.detail("immortal-tomb");
console.log(detail);

const episode = await api.episode("immortal-tomb-episode-02-subtitle-indonesia");
console.log(episode);

const okruStream = episode.streams.find(s => s.server.includes('OK.ru'))
if (okruStream) {
  const streamData = await api.getStreamUrl(okruStream.url)
  console.log(JSON.stringify(streamData, null, 2))
}*/