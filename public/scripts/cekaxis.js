import axios from "axios"

const nomorhp = process.argv[2]?.replace(/\D/g, "")

if (!nomorhp) {
  console.log("❌ Usage:")
  console.log("node cekaxis.js 62831xxxxxxxx")
  process.exit(1)
}

async function cekKuota() {
  try {
    console.log("🔍 Mengecek kuota...")

    const { data } = await axios.get("https://bendith.my.id/end.php", {
      params: {
        check: "package",
        number: nomorhp,
        version: "2 201"
      }
    })

    if (!data || !data.success || !data.data) {
      console.log("❌ Gagal mengambil data. Pastikan nomor Axis/XL valid.")
      return
    }

    const info = data.data.subs_info
    const pkgs = data.data.package_info.packages

    let hasil = `\n📊 INFORMASI KARTU ${info.operator}\n`
    hasil += `━━━━━━━━━━━━━━━━━━━━\n`
    hasil += `📱 Nomor        : ${info.msisdn}\n`
    hasil += `⏳ Masa Aktif   : ${info.exp_date}\n`
    hasil += `🛡️ Masa Tenggang: ${info.grace_until}\n`
    hasil += `📅 Umur Kartu   : ${info.tenure}\n`
    hasil += `📶 Jaringan     : ${info.net_type}\n`
    hasil += `━━━━━━━━━━━━━━━━━━━━\n\n`

    if (pkgs && pkgs.length > 0) {
      hasil += `📦 DAFTAR KUOTA:\n`
      pkgs.forEach((pkg, i) => {
        hasil += `\n${i + 1}. ${pkg.name}\n`
        hasil += `   Exp: ${pkg.expiry}\n`
        pkg.quotas.forEach(q => {
          hasil += `   - ${q.name}: ${q.remaining} / ${q.total}\n`
        })
      })
    } else {
      hasil += `❌ Tidak ada paket aktif.\n`
    }

    console.log(hasil)
  } catch (err) {
    console.log("❌ Error:", err.message)
  }
}

cekKuota()