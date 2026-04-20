export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, fileName, language, explanation, code, author, password } = req.body;

  if (password !== process.env.SUBMIT_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!name || !fileName || !code) {
    return res.status(400).json({ error: "name, fileName, and code are required" });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = "Daxzyy";
  const repo = "codetory";
  const branch = "main";

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
  };

  const today = new Date().toISOString().split("T")[0];

  try {
    const scriptsJsonRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/public/data/scripts.json?ref=${branch}`,
      { headers }
    );
    const scriptsJsonData = await scriptsJsonRes.json();
    const currentScripts = JSON.parse(Buffer.from(scriptsJsonData.content, "base64").toString("utf-8"));

    const newId = String(Math.max(...currentScripts.map((s) => parseInt(s.id) || 0)) + 1);
    const newScript = {
      id: newId,
      name,
      fileName,
      explanation: explanation || "",
      language,
      author: author || "Givy",
      date: today,
    };

    const updatedScripts = [...currentScripts, newScript];
    const updatedScriptsBase64 = Buffer.from(JSON.stringify(updatedScripts, null, 2)).toString("base64");

    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/public/data/scripts.json`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `add: ${fileName}`,
          content: updatedScriptsBase64,
          sha: scriptsJsonData.sha,
          branch,
        }),
      }
    );

    const scriptContentBase64 = Buffer.from(code).toString("base64");

    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/public/scripts/${fileName}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `add: ${fileName}`,
          content: scriptContentBase64,
          branch,
        }),
      }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
