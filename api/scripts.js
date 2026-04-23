export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const KEY_STR = process.env.CRYPTO_KEY;
  const { fileName } = req.query;

  async function getKey() {
    const enc = new TextEncoder();
    const km = await crypto.subtle.importKey(
      "raw", enc.encode(KEY_STR), "PBKDF2", false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: enc.encode("codetory"), iterations: 100000, hash: "SHA-256" },
      km, { name: "AES-GCM", length: 256 }, false, ["encrypt"]
    );
  }

  async function encrypt(data) {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(data))
    );
    const combined = new Uint8Array(12 + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), 12);
    return Buffer.from(combined).toString("base64");
  }

  try {
    if (fileName) {
      const codeRes = await fetch(
        `https://raw.githubusercontent.com/Daxzyy/codetory/main/public/scripts/${fileName}?t=${Date.now()}`
      );
      if (!codeRes.ok) return res.status(404).json({ error: "Not found" });
      const code = await codeRes.text();
      const encrypted = await encrypt({ code, fileName });
      return res.status(200).json({ d: encrypted });
    } else {
      const listRes = await fetch(
        `https://raw.githubusercontent.com/Daxzyy/codetory/main/public/data/scripts.json?t=${Date.now()}`
      );
      const scripts = await listRes.json();
      const encrypted = await encrypt(scripts);
      return res.status(200).json({ d: encrypted });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
