'use strict';

const https  = require('https');
const crypto = require('crypto');

const BASE_HOST   = 'chat.chatex.ai';
const BASE_ORIGIN = 'https://chat.chatex.ai';
const RELEASE     = '9a4a53f75b15b69a537a88aa2a105e61aeaf6ef1';

const MODELS = {
    'gpt5':     'openai/gpt-5.4',
    'gpt4o':    'openai/gpt-4o',
    'gpt4':     'openai/gpt-4',
    'claude':   'anthropic/claude-sonnet-4-5',
    'gemini':   'google/gemini-2.5-flash-preview-05-20',
    'mistral':  'mistralai/mistral-medium-3',
    'llama':    'meta-llama/llama-4-maverick',
    'default':  'openai/gpt-5.4',
};

class CookieJar {
    constructor() { this._s = new Map(); }
    ingest(raw) {
        const arr = Array.isArray(raw) ? raw : [raw];
        for (const r of arr) {
            if (!r) continue;
            const [nv, ...attrs] = r.split(';').map(s => s.trim());
            const eq = nv.indexOf('=');
            if (eq === -1) continue;
            const name = nv.slice(0, eq).trim(), value = nv.slice(eq + 1).trim();
            const meta = { value, path: '/', domain: BASE_HOST };
            for (const a of attrs) {
                const l = a.toLowerCase();
                if (l.startsWith('expires=')) meta.expires = new Date(a.slice(8));
                if (l.startsWith('max-age='))  meta.maxAge  = parseInt(a.slice(8), 10);
            }
            this._s.set(name, meta);
        }
    }
    serialize() {
        const now = new Date();
        return [...this._s.entries()]
            .filter(([, m]) => !m.expires || m.expires > now)
            .map(([n, m]) => \`\${n}=\${m.value}\`)
            .join('; ');
    }
}

function sentryHeaders(traceId) {
    return {
        'sentry-trace': \`\${traceId}-\${crypto.randomBytes(8).toString('hex')}-0\`,
        baggage: \`sentry-environment=production,sentry-release=\${RELEASE},sentry-trace_id=\${traceId},sentry-sampled=false\`,
    };
}

function commonHeaders(jar, traceId, extra = {}) {
    return {
        'User-Agent':      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
        'Accept':          'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer':         BASE_ORIGIN + '/en',
        'Origin':          BASE_ORIGIN,
        'Cookie':          jar.serialize(),
        ...sentryHeaders(traceId),
        ...extra,
    };
}

function req(opts, body) {
    return new Promise((res, rej) => {
        const r = https.request(opts, resp => {
            const c = [];
            resp.on('data', d => c.push(d));
            resp.on('end', () => res({ s: resp.statusCode, h: resp.headers, raw: Buffer.concat(c).toString('utf8') }));
            resp.on('error', rej);
        });
        r.on('error', rej);
        r.setTimeout(30000, () => r.destroy(new Error('timeout')));
        if (body) r.write(body);
        r.end();
    });
}

function sseReq(opts, body) {
    return new Promise((res, rej) => {
        const events = [];
        const r = https.request(opts, resp => {
            let buf = '';
            resp.on('data', chunk => {
                buf += chunk.toString('utf8');
                const lines = buf.split('\\n');
                buf = lines.pop() || '';
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const p = line.slice(6).trim();
                    if (p === '[DONE]') continue;
                    try { events.push(JSON.parse(p)); } catch {}
                }
            });
            resp.on('end',  () => res({ s: resp.statusCode, h: resp.headers, events }));
            resp.on('error', rej);
        });
        r.on('error', rej);
        r.setTimeout(60000, () => r.destroy(new Error('SSE timeout')));
        if (body) r.write(body);
        r.end();
    });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function chatex(message, model = MODELS.default) {
    const jar      = new CookieJar();
    const traceId  = crypto.randomBytes(16).toString('hex');
    const chatId   = crypto.randomUUID();
    const msgId    = crypto.randomUUID();

    const s1 = await req({ hostname: BASE_HOST, path: '/en', method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html,*/*' } }, null);
    if (s1.h['set-cookie']) jar.ingest(s1.h['set-cookie']);
    await sleep(200);

    const s2 = await req({ hostname: BASE_HOST, path: '/api/auth/get-session', method: 'GET', headers: commonHeaders(jar, traceId) }, null);
    if (s2.h['set-cookie']) jar.ingest(s2.h['set-cookie']);

    await req({ hostname: BASE_HOST, path: '/api/geo/currency', method: 'GET', headers: commonHeaders(jar, traceId, { Accept: 'application/json' }) }, null);

    await sleep(300);

    const fp  = crypto.createHash('md5').update(crypto.randomBytes(32)).digest('hex');
    const fpB = JSON.stringify({ fpid: fp, confidence: 0.4, version: '5.0.1' });
    const s4  = await req({ hostname: BASE_HOST, path: '/api/v/fingerprint', method: 'POST', headers: { ...commonHeaders(jar, traceId), 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(fpB) } }, fpB);
    if (s4.h['set-cookie']) jar.ingest(s4.h['set-cookie']);
    await sleep(400);

    const chatBody = JSON.stringify({
        id: chatId,
        message: { role: 'user', parts: [{ type: 'text', text: message }], id: msgId },
        selectedChatModel:      model,
        selectedVisibilityType: 'private',
        webSearchEnabled:       false,
        imageGenerationEnabled: false,
        isExistingChat:         false,
    });

    const s5 = await sseReq({
        hostname: BASE_HOST, path: '/api/chat', method: 'POST',
        headers: {
            ...commonHeaders(jar, traceId),
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(chatBody),
            'Accept':         'text/event-stream',
            'Cache-Control':  'no-cache',
        },
    }, chatBody);
    if (s5.h['set-cookie']) jar.ingest(s5.h['set-cookie']);

    let text = '';
    for (const ev of s5.events) {
        if (ev.type === 'text-delta') text += ev.delta || '';
    }

    return text.trim();
}

const MODEL_LIST = Object.entries(MODELS)
    .filter(([k]) => k !== 'default')
    .map(([k, v]) => \`  ▸ \\\`\${k}\\\` — \${v.split('/')[1]}\`)
    .join('\\n');

const handler = async (m, { manzxy, args, text, command, reply }) => {
    if (command === 'chatexmodel' || command === 'chatexmodels') {
        return reply(
            \`🤖 *Chatex — Daftar Model*\\n\` +
            \`\${'─'.repeat(30)}\\n\\n\` +
            \`\${MODEL_LIST}\\n\\n\` +
            \`*Cara pakai:*\\n\` +
            \`_.chatex <model> <pertanyaan>_\\n\\n\` +
            \`*Contoh:*\\n\` +
            \`_.chatex gpt4o siapa einstein?_\\n\` +
            \`_.chatex claude jelaskan quantum_\`
        );
    }

    if (!text) return reply(
        \`🤖 *Chatex AI*\\n\` +
        \`\${'─'.repeat(30)}\\n\\n\` +
        \`Akses GPT-5, Claude, Gemini & model lain secara gratis!\\n\\n\` +
        \`*Format:*\\n\` +
        \`_.chatex <pertanyaan>_\\n\` +
        \`_.chatex <model> <pertanyaan>_\\n\\n\` +
        \`*Contoh:*\\n\` +
        \`_.chatex siapa presiden indonesia?_\\n\` +
        \`_.chatex claude ceritakan sejarah romawi_\\n\` +
        \`_.chatex gemini hitung integral x^2_\\n\\n\` +
        \`Daftar model: _.chatexmodel_\`
    );

    const firstArg   = (args[0] || '').toLowerCase();
    const modelKey   = MODELS[firstArg] ? firstArg : 'default';
    const model      = MODELS[modelKey];
    const prompt     = modelKey !== 'default' ? args.slice(1).join(' ').trim() : text;

    if (!prompt) return reply(
        \`❌ Pertanyaannya kosong!\\n\\n\` +
        \`Contoh: _.chatex \${firstArg} siapa newton?_\`
    );

    const modelLabel = model.split('/')[1] || model;
    const sent = await manzxy.sendMessage(m.chat, {
        text: \`🤖 _\${modelLabel} sedang berpikir..._\`
    }, { quoted: m });
    const edit = txt => manzxy.sendMessage(m.chat, { text: txt, edit: sent.key });

    try {
        const answer = await chatex(prompt, model);

        if (!answer) return edit('❌ Tidak ada jawaban dari server.');

        const formatted = answer
            .replace(/\\*\\*(.+?)\\*\\*/g, '*\$1*')
            .replace(/#{1,3}\\s+(.+)/g, '*\$1*')
            .replace(/\\n{3,}/g, '\\n\\n')
            .trim();

        const txt =
            \`🤖 *Chatex — \${modelLabel}*\\n\` +
            \`\${'─'.repeat(28)}\\n\\n\` +
            \`\${formatted}\`;

        await edit(txt);

    } catch (e) {
        console.error('[chatex]', e.message);
        await edit('❌ Gagal: ' + e.message);
    }
};

handler.command = ['chatex', 'cx', 'chatexmodel', 'chatexmodels'];
handler.tags    = ['ai'];
handler.limit   = true;
handler.fitur   = {
    chatex:       'Chatex AI — GPT-5, Claude, Gemini dll | .chatex [model] <teks>',
    cx:           'Alias chatex',
    chatexmodel:  'Lihat daftar model Chatex',
    chatexmodels: 'Alias chatexmodel',
};

module.exports = handler;