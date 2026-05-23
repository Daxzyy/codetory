export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, fileName, language, explanation, code, author, password, run, defaultInput } = req.body;

  if (password !== process.env.SUBMIT_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!fileName || !code) {
    return res.status(400).json({ error: "fileName and code are required" });
  }

  if (!/^[\w\-]+\.(js|ts|py|json)$/.test(fileName)) {
    return res.status(400).json({ error: "Invalid fileName" });
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

  try {
    const scriptsJsonRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/public/data/scripts.json?ref=${branch}`,
      { headers }
    );
    const scriptsJsonData = await scriptsJsonRes.json();
    const currentScripts = JSON.parse(
      Buffer.from(scriptsJsonData.content, "base64").toString("utf-8")
    );

    const updatedScripts = currentScripts.map((s) => {
      if (s.fileName !== fileName) return s;
      const updated = {
        ...s,
        ...(name && { name }),
        ...(language && { language }),
        ...(explanation !== undefined && { explanation }),
        ...(author && { author }),
      };
      if (run === true || run === "true") {
        updated.run = true;
      } else {
        delete updated.run;
      }
      if (defaultInput) {
        updated.defaultInput = defaultInput;
      } else {
        delete updated.defaultInput;
      }
      return updated;
    });

    const updatedScriptsBase64 = Buffer.from(
      JSON.stringify(updatedScripts, null, 2)
    ).toString("base64");

    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/public/data/scripts.json`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `edit: ${fileName}`,
          content: updatedScriptsBase64,
          sha: scriptsJsonData.sha,
          branch,
        }),
      }
    );

    const scriptFileRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/public/scripts/${fileName}?ref=${branch}`,
      { headers }
    );
    const scriptFileData = await scriptFileRes.json();

    if (!scriptFileData.sha) {
      return res.status(404).json({ error: "Script file not found in repo" });
    }

    const scriptContentBase64 = Buffer.from(code).toString("base64");

    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/public/scripts/${fileName}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `edit: ${fileName}`,
          content: scriptContentBase64,
          sha: scriptFileData.sha,
          branch,
        }),
      }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
