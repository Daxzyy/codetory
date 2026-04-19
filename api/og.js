export default async function handler(req, res) {
  const { fileName } = req.query;

  const baseUrl = `https://${req.headers.host}`;

  let script = null;
  try {
    const data = await fetch(`${baseUrl}/data/scripts.json`).then(r => r.json());
    script = data.find(s => s.fileName === fileName);
  } catch {
    script = null;
  }

  if (!script) {
    return res.status(404).send('Not found');
  }

  const title = `${script.name} — Scraptory`;
  const description = script.explanation;
  const url = `${baseUrl}/view/${fileName}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:site_name" content="Scraptory" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta http-equiv="refresh" content="0; url=${url}" />
</head>
<body>
  <p>Redirecting to <a href="${url}">${title}</a>...</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.status(200).send(html);
}
