import axios from "axios";

const imageUrl = process.argv[2];

if (!imageUrl) {
  console.log("❌ Usage: node kalori.js <image_url>");
  process.exit(1);
}

async function analyzeImage(url) {
  try {
    const imgRes = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const base64Image = Buffer.from(imgRes.data).toString("base64");

    const res = await axios.post(
      "https://zentix.app/api/analyze",
      { image: base64Image },
      { headers: { "Content-Type": "application/json" } }
    );

    const { calories, description, isFood, isLocalAnalysis } = res.data;

    console.log("\n🍽️  IMAGE FOOD ANALYSIS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━");

    console.log(`🥗 Is Food        : ${isFood ? "YES" : "NO"}`);
    console.log(`🔥 Calories       : ${calories} kcal`);
    console.log(`🧠 Local Analysis : ${isLocalAnalysis ? "YES" : "NO"}`);

    console.log("\n📖 Description:");
    console.log(description);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━\n");

  } catch (err) {
    if (err.response) {
      console.error("❌ API Error:", err.response.status);
      console.error(err.response.data);
    } else {
      console.error("❌ Error:", err.message);
    }
  }
}

analyzeImage(imageUrl);
