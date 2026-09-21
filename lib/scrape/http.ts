// Shared HTTP + parsing primitives for the living-knowledge scrapers (all phases:
// developments, regulations, events). One implementation of polite fetching,
// robots.txt handling, HTML→text and hashing, so every scraper behaves the same.
import 'server-only';
import { createHash } from 'node:crypto';

export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
export const PAGE_HEADERS: Record<string, string> = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9,el;q=0.8',
};

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export const abs = (href: string, base: string): string | null => {
  try { return new URL(href, base).toString(); } catch { return null; }
};

export function stripHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;|&lsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

export async function fetchText(url: string, timeoutMs = 12000): Promise<{ ok: boolean; status: number; html: string }> {
  try {
    const res = await fetch(url, { headers: PAGE_HEADERS, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
    const html = res.ok ? await res.text() : '';
    return { ok: res.ok, status: res.status, html: html.slice(0, 400_000) };
  } catch { return { ok: false, status: 0, html: '' }; }
}

// Honour robots.txt Disallow for our UA or '*'. Best-effort and exported for tests.
export function robotsForbids(robotsTxt: string, path: string): boolean {
  if (!robotsTxt) return false;
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.replace(/#.*$/, '').trim());
  let active = false, applies = false; const disallows: string[] = [];
  for (const line of lines) {
    const m = line.match(/^(user-agent|disallow|allow)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === 'user-agent') { if (applies && disallows.length) break; active = val === '*' || /chrome|mozilla/i.test(val); if (active) applies = true; }
    else if (key === 'disallow' && active && val) disallows.push(val);
  }
  return disallows.some((d) => path.startsWith(d));
}

export async function robotsAllows(url: string, cache: Map<string, string>): Promise<boolean> {
  try {
    const u = new URL(url); const host = u.origin;
    if (!cache.has(host)) { const r = await fetchText(`${host}/robots.txt`, 6000); cache.set(host, r.ok ? r.html.slice(0, 40_000) : ''); }
    return !robotsForbids(cache.get(host) || '', u.pathname);
  } catch { return true; }
}
