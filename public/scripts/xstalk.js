const axios = require("axios");

const BASE_URL = "https://www.twitter-viewer.com";

const HEADERS = {
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  "pragma": "no-cache",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "referer": BASE_URL + "/",
  "origin": BASE_URL,
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

async function xstalk(input, cursor = "") {
  const isTweetUrl = /status\/(\d+)/.test(input);

  if (isTweetUrl) {
    const match = input.match(/status\/(\d+)/);
    if (!match) throw new Error("Invalid tweet URL");

    const res = await axios.get(`${BASE_URL}/api/x/tweet`, {
      params: { tweetId: match[1] },
      headers: HEADERS,
    });

    if (!res.data?.success) throw new Error(res.data?.error || "Failed to fetch tweet");
    return { type: "tweet", data: res.data.data };
  }

  const username = input
    .replace(/^@/, "")
    .replace(/https?:\/\/(www\.)?(twitter|x)\.com\//, "")
    .split(/[/?]/)[0];

  const res = await axios.get(`${BASE_URL}/api/x/user-tweets`, {
    params: { username, cursor },
    headers: HEADERS,
  });

  if (!res.data?.success) throw new Error(res.data?.error || "Failed to fetch profile");

  const { user, tweets, pagination } = res.data.data;

  if (user?.protected) throw new Error("This account is protected");

  return {
    type: "profile",
    user,
    tweets,
    pagination,
    loadMore: pagination?.hasMore
      ? (nextCursor) => xstalk(input, nextCursor || pagination.nextCursor)
      : null,
  };
}
return xstalk("@elonmusk")