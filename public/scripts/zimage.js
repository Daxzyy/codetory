> const axios = require("axios");

async function zimage(prompt) {
  const base = "https://mrfakename-z-image-turbo.hf.space";

  const startRes = await axios.post(base + "/gradio_api/call/generate_image", {
    data: [prompt, 1024, 1024, 9, true, 0]
  }, {
    headers: { "Content-Type": "application/json" },
    timeout: 30000
  });

  const eventId = startRes.data.event_id;

  const resultRes = await axios.get(base + "/gradio_api/call/generate_image/" + eventId, {
    responseType: "text",
    timeout: 120000
  });

  const lines = resultRes.data.split("\n");
  let dataLine = null;
  for (const line of lines) {
    if (line.startsWith("data:")) {
      dataLine = line.slice(5).trim();
    }
  }

  if (!dataLine) {
    throw new Error("No data received from Space");
  }

  const parsed = JSON.parse(dataLine);
  const imageInfo = parsed[0];
  const imageUrl = imageInfo.url || (base + "/gradio_api/file=" + imageInfo.path);

  return imageUrl;
}

return zimage("girl eyes blue")