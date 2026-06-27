"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchUrlText = fetchUrlText;
const MAX_BYTES = 512_000;
function stripHtml(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
async function fetchUrlText(url) {
    const res = await fetch(url, {
        headers: { 'user-agent': 'BellasOS/0.1 (+https://github.com/Bobsleponge/BellasOS)' },
        signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok)
        throw new Error(`Fetch failed ${res.status}: ${url}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
        throw new Error(`Page too large: ${url}`);
    }
    const html = new TextDecoder('utf-8').decode(buf);
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || url;
    const body = stripHtml(html).slice(0, 12_000);
    return { title, body };
}
//# sourceMappingURL=url-fetch.js.map