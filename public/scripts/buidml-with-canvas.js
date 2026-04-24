import axios from "axios"

const API = "https://api.theresav.biz.id/game/ml/build"
const CANVAS = "https://api.theresav.biz.id/canvas/ml/build"

const APIKEY = global.apikey //Apikey silakan daftar di api.theresav.biz.id/register

async function getBuild(hero) {
  const { data } = await axios.get(
    \`\${API}?apikey=\${APIKEY}&hero=\${encodeURIComponent(hero)}\`
  )

  if (!data?.status) throw new Error("Hero tidak ditemukan")

  return data
}

let handler = async (m, { conn, text, usedPrefix, command }) => {

  if (!text) {
    return m.reply(\`Contoh:\\n\${usedPrefix + command} marcel\`)
  }

  // user pilih build
  if (text.includes("|")) {

    const [hero, id] = text.split("|")

    const img = \`\${CANVAS}?hero=\${hero}&id=\${id}\`

    await conn.sendMessage(
      m.chat,
      {
        image: { url: img },
        caption: \`🎮 *Mobile Legends Build*\\nHero: *\${hero}*\`
      },
      { quoted: m }
    )

    return
  }

  await m.reply("🔎 Mencari build hero...")

  try {

    const res = await getBuild(text)

    const hero = res.hero.name
    const builds = res.builds

    const rows = builds.map((b, i) => ({
      header: \`Build \${i + 1}\`,
      title: b.title || "Build ML",
      description: \`Author: \${b.author.username}\`,
      id: \`\${usedPrefix + command} \${hero}|\${b.id}\`
    }))

    await conn.sendMessage(
      m.chat,
      {
        image: { url: res.hero.image_url },
        caption:
          \`🎮 *ML Build Finder*\\n\` +
          \`Hero: *\${hero}*\\n\` +
          \`Role: \${res.hero.roles.join(", ")}\\n\` +
          \`Total Build: \${res.total_builds}\`,
        footer: "Pilih build untuk melihat item",
        buttons: [
          {
            buttonId: "ml_build",
            buttonText: { displayText: "⚔️ Pilih Build" },
            type: 4,
            nativeFlowInfo: {
              name: "single_select",
              paramsJson: JSON.stringify({
                title: "Daftar Build",
                sections: [
                  {
                    title: "Build List",
                    rows
                  }
                ]
              })
            }
          }
        ],
        headerType: 1,
        viewOnce: true
      },
      { quoted: m }
    )

  } catch (e) {
    console.error("[MLBUILD ERROR]", e)
    m.reply("❌ Build hero tidak ditemukan")
  }
}

handler.help = ["mlbuild <hero>"]
handler.tags = ["game"]
handler.command = ["mlbuild", "ml"]

export default handler