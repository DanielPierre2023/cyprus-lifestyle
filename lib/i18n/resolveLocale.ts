// lib/i18n/resolveLocale.ts — pick a site locale for a request that carries no locale of its
// own (API routes, e-mail links, verify pages). Pure: takes plain strings, not a Request.
// Order: explicit value (body/query) > locale segment of the Referer path > Accept-Language > en.
import { isLocale, DEFAULT_LOCALE, type Locale } from '@/lib/locales';

/** First path segment of a URL/path when it is a site locale ('/el/directory' -> 'el'). */
export function localeFromPath(urlOrPath: string | null | undefined): Locale | null {
  if (!urlOrPath) return null;
  let path = String(urlOrPath);
  const m = path.match(/^[a-z][a-z0-9+.-]*:\/\/[^/]+(\/.*)?$/i);
  if (m) path = m[1] || '/';
  const seg = path.split(/[?#]/)[0].split('/')[1] || '';
  return isLocale(seg) ? seg : null;
}

/** Best supported locale from an Accept-Language header ('el-GR,el;q=0.9,en;q=0.5' -> 'el'). */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const ranked = String(header).split(',').map((part, i) => {
    const [tag, ...params] = part.trim().split(';');
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    return { tag: tag.trim().toLowerCase(), q: q ? Number(q.slice(2)) : 1, i };
  }).filter((x) => x.tag && x.tag !== '*' && Number.isFinite(x.q) && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const { tag } of ranked) {
    const base = tag.split('-')[0];
    if (isLocale(base)) return base;
  }
  return null;
}

export function resolveLocale(input: { explicit?: string | null; referer?: string | null; acceptLanguage?: string | null }): Locale {
  const e = String(input.explicit || '').trim().toLowerCase();
  if (isLocale(e)) return e;
  return localeFromPath(input.referer) ?? localeFromAcceptLanguage(input.acceptLanguage) ?? DEFAULT_LOCALE;
}

/** Convenience for route handlers: `localeOf(req, body.locale)`. Accepts any object with headers.get(). */
export function localeOf(req: { headers: { get(name: string): string | null } }, explicit?: unknown): Locale {
  return resolveLocale({
    explicit: typeof explicit === 'string' ? explicit : null,
    referer: req.headers.get('referer'),
    acceptLanguage: req.headers.get('accept-language'),
  });
}
