#!/usr/bin/env node
"use strict";

const puppeteer = require('puppeteer-extra');
puppeteer.use(require('puppeteer-extra-plugin-stealth')());
const fs   = require('fs');
const path = require('path');

const FALLBACK_UA = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
];

const HTML_TEMPLATE = \`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Turnstile Solver</title>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async></script>
<style>
body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f0f0f0;font-family:Arial}
.container{background:white;padding:30px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.1);text-align:center}
.turnstile-container{margin-top:20px}
#status{margin-top:20px;background:#f8f8f8;padding:10px;border-radius:6px}
</style>
<script>
function updateStatus(t){document.getElementById("status").innerText=t}
function checkToken(){const el=document.querySelector("[name='cf-turnstile-response']");if(el&&el.value)updateStatus("Token received ("+el.value.length+" chars)")}
window.onload=function(){setInterval(checkToken,500);updateStatus("Turnstile loading...")}
</script>
</head>
<body>
<div class="container">
<h2>Cloudflare Turnstile Test</h2>
<div class="turnstile-container"><!-- TURNSTILE_WIDGET --></div>
<div id="status">Initializing...</div>
</div>
</body>
</html>\`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rand  = (arr) => arr[Math.floor(Math.random() * arr.length)];

function getRandomUA() {
  try {
    const p = path.join("data", "useragents.txt");
    if (fs.existsSync(p)) {
      const uas = fs.readFileSync(p, "utf8").split("\\n").map(l => l.trim()).filter(Boolean);
      if (uas.length) return rand(uas);
    }
  } catch {}
  return rand(FALLBACK_UA);
}

function getRandomProxy() {
  try {
    const p = path.join("data", "proxies.txt");
    if (fs.existsSync(p)) {
      const proxies = fs.readFileSync(p, "utf8").split("\\n").map(l => l.trim()).filter(Boolean);
      if (proxies.length) return rand(proxies);
    }
  } catch {}
  return null;
}

class TurnstileSolver {
  constructor({ headless = true, threads = 1, useProxy = false, useragent = null } = {}) {
    this.headless  = headless;
    this.threads   = threads;
    this.useProxy  = useProxy;
    this.useragent = useragent || getRandomUA();
    this.pool      = []; // array of browser instances
  }

  async initialize() {
    for (let i = 0; i < this.threads; i++) {
      this.pool.push(await this._createBrowser());
    }
  }

  async _createBrowser() {
    const args = [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--disable-web-security",
      \`--user-agent=\${this.useragent}\`,
    ];
    return puppeteer.launch({ headless: this.headless, args });
  }

  async _acquireBrowser() {
    // Simple pool: wait until one is available
    while (this.pool.length === 0) await sleep(100);
    return this.pool.pop();
  }

  _releaseBrowser(browser) {
    this.pool.push(browser);
  }

  async solve(url, sitekey, action = null) {
    const t0      = Date.now();
    const browser = await this._acquireBrowser();
    try {
      const result = await this._solvePage(browser, url, sitekey, action, t0);
      this._releaseBrowser(browser);
      return result;
    } catch (err) {
      this._releaseBrowser(browser);
      return { success: false, error: err.message, time: ((Date.now() - t0) / 1000).toFixed(3) };
    }
  }

  async _solvePage(browser, url, sitekey, action, t0) {
    const contextOpts = {};
    if (this.useProxy) {
      const proxy = getRandomProxy();
      if (proxy) contextOpts.proxyServer = proxy;
    }

    const ctx  = await browser.createBrowserContext();
    const page = await ctx.newPage();

    // Build widget HTML
    let widget = \`<div class="cf-turnstile" data-sitekey="\${sitekey}"\`;
    if (action) widget += \` data-action="\${action}"\`;
    widget += "></div>";
    const html = HTML_TEMPLATE.replace("<!-- TURNSTILE_WIDGET -->", widget);

    const urlFixed = url.endsWith("/") ? url : url + "/";

    // Intercept the target URL and serve our HTML
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.url() === urlFixed && req.resourceType() === 'document') {
        req.respond({ status: 200, contentType: 'text/html', body: html });
      } else {
        req.continue();
      }
    });

    await page.goto(urlFixed, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.cf-turnstile', { timeout: 10000 });
    await sleep(2000);

    // Try clicking the widget/iframe
    try {
      const iframe = await page.\$('iframe[title*="cloudflare"]');
      if (iframe) await iframe.click();
      else        await page.click('.cf-turnstile');
    } catch {
      await page.evaluate(() => document.querySelector('.cf-turnstile')?.click());
    }

    // Poll for token up to 30s
    for (let i = 0; i < 30; i++) {
      const token = await page.evaluate(() => {
        const el = document.querySelector("[name='cf-turnstile-response']");
        return el?.value || null;
      });
      if (token) {
        await ctx.close();
        return { success: true, creator: "XAi Community", token, time: +((Date.now() - t0) / 1000).toFixed(3) }; // Jangan hapus creator! | Don't remove creator!
      }
      await sleep(1000);
    }

    await ctx.close();
    throw new Error("Token not received");
  }

  async cleanup() {
    for (const browser of this.pool) {
      try { await browser.close(); } catch {}
    }
    this.pool = [];
  }
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get  = (flag, def = null) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] ?? def : def;
  };
  const has = (flag) => args.includes(flag);
  return {
    url:      get("--url"),
    sitekey:  get("--sitekey"),
    action:   get("--action"),
    threads:  parseInt(get("--threads", "1"), 10),
    headless: has("--headless"),
    proxy:    has("--proxy"),
  };
}

async function main() {
  const args = parseArgs();
  if (!args.url || !args.sitekey) {
    console.error("Usage: node turnstile-solver.js --url <url> --sitekey <key> [--action <a>] [--threads N] [--headless] [--proxy]");
    process.exit(1);
  }

  const solver = new TurnstileSolver({
    headless: args.headless,
    threads:  args.threads,
    useProxy: args.proxy,
  });

  await solver.initialize();
  try {
    const result = await solver.solve(args.url, args.sitekey, args.action);
    console.log(JSON.stringify(result));
  } finally {
    await solver.cleanup();
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });

/** Install:
 * npm install puppeteer-extra puppeteer-extra-plugin-stealth
 */