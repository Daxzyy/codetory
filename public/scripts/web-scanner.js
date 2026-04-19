> const axios = require("axios");

async function cekweb(url) {
  const { wrapper } = await import("axios-cookiejar-support");
  const { CookieJar } = await import("tough-cookie");

  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar }));

  const baseHeaders = {
    authority: "cleantalk.org",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "upgrade-insecure-requests": "1",
    "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
  };

  const apiHeaders = {
    authority: "cleantalk.org",
    accept: "*/*",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "content-type": "application/x-www-form-urlencoded",
    origin: "https://cleantalk.org",
    referer: "https://cleantalk.org/website-malware-scanner",
    "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
  };

  const encoded = encodeURIComponent(url);

  await client.get(
    `https://cleantalk.org/website-malware-scanner?url=${encoded}&public_id=`,
    { headers: baseHeaders }
  );

  const initRes = await client.post(
    "https://cleantalk.org/website-malware-scanner?action=scanner-api",
    `url=${encoded}`,
    { headers: apiHeaders }
  );

  const hash = initRes.data?.data?.mws_task_hash;
  if (!hash) throw new Error("Gagal mendapatkan task hash");

  let urlEntry = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));

    const pollRes = await client.post(
      "https://cleantalk.org/website-malware-scanner?action=scanner-api",
      `url=${encoded}&mws_task_hash=${hash}`,
      { headers: { ...apiHeaders, referer: `https://cleantalk.org/website-malware-scanner?url=${encoded}&public_id=${hash}` } }
    );

    const data = pollRes.data?.data;
    if (!data) continue;

    if (data.processing_status === "DONE" && data.urls) {
      urlEntry = Object.values(data.urls)[0];
      break;
    }
  }

  if (!urlEntry) throw new Error("Scan timeout, coba lagi beberapa saat");

  const d = urlEntry.result_details;
  const pageInfo = d?.get_url_code?.result;
  const ssl = d?.ssl_check?.result;
  const cmsRaw = d?.cms_recognize?.result;
  const malwareScan = d?.malware_scan?.result;
  const publicLists = d?.public_safe_lists?.result;
  const repo = d?.repository_check?.result;
  const jsIframes = d?.js_iframes?.result;

  const CMS_LABELS = {
    l_unknown_cms: "Unknown CMS",
    wordpress: "WordPress",
    joomla: "Joomla",
    drupal: "Drupal",
    opencart: "OpenCart",
    bitrix: "Bitrix",
    magento: "Magento",
  };

  const stripHtml = (str) => (str || "").replace(/<[^>]+>/g, "").trim();

  return {
    url,
    status: urlEntry.scanning_status,
    scanningStep: urlEntry.scanning_step,
    pageInfo: {
      ip: pageInfo?.url_ip || "-",
      ipHostname: pageInfo?.ip_hostname || "-",
      server: pageInfo?.server || "-",
      responseCode: pageInfo?.response_code || "-",
      redirects: (pageInfo?.redirects || []).map((r) => ({ code: r.code, location: r.location })),
    },
    cms: CMS_LABELS[cmsRaw] || cmsRaw || "Unknown CMS",
    ssl: {
      hasSSL: ssl?.has_ssl ?? false,
      expired: ssl?.expired ?? false,
      validTo: ssl?.valid_to || "-",
      httpNote: (ssl?.http_ans || "").trim() || "-",
    },
    malware: {
      contentSize: malwareScan?.page?.content_size ?? 0,
      externalLinks: malwareScan?.links?.external_count ?? 0,
      internalLinks: malwareScan?.links?.internal_count ?? 0,
      issues: malwareScan?.result_list
        ? Object.entries(malwareScan.result_list).map(([type, arr]) => ({
            type,
            found: arr[0]?.found || "-",
            hasIssue: arr[0]?.issues ?? false,
          }))
        : [],
    },
    publicLists: publicLists
      ? Object.entries(publicLists).map(([key, v]) => ({
          key,
          name: stripHtml(v.name),
          blacklisted: v.blacklisted,
        }))
      : [],
    blacklisted: publicLists
      ? Object.values(publicLists).filter((v) => v.blacklisted).map((v) => stripHtml(v.name))
      : [],
    jsIframes: {
      scripts: jsIframes?.scripts || [],
      iframes: jsIframes?.iframes || [],
    },
    repository: {
      openGit: repo?.open_git ?? false,
      openSvn: repo?.open_svn ?? false,
      openGitConfig: repo?.open_git_config ?? false,
      openSvnEntries: repo?.open_svn_entries ?? false,
      openGitignore: repo?.open_gitignore ?? false,
    },
  };
}

return cekweb("sambungkata.web.id/")