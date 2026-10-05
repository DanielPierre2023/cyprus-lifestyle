// scripts/perf/preloads.mjs - pure logic for the preload / HTML-weight gate (Phase 6.1).
// A page's render-blocking-ish cost is not only its JS: next/font preloads every file of
// every listed subset, and <NextIntlClientProvider> inlines its messages into the HTML.
// Both were invisible to the first-load-JS budget; this measures them. No I/O here.

/** hrefs of every <link rel="preload" as="font"> in an HTML document (de-duplicated, in order). */
export function preloadedFontHrefs(html) {
  const out = [];
  for (const m of String(html).matchAll(/<link\b[^>]*>/g)) {
    const tag = m[0];
    if (!/\brel="preload"/.test(tag) || !/\bas="font"/.test(tag)) continue;
    const h = tag.match(/\bhref="([^"]+)"/);
    if (h && !out.includes(h[1])) out.push(h[1]);
  }
  return out;
}

/** Verdict for one page: preloaded font KB and HTML KB against the config. */
export function evaluatePage(page, { fontKB, htmlKB }, cfg) {
  // fonts.perPage lets one edition carry a higher ceiling (the /el edition preloads three extra Greek faces).
  const perPage = cfg && cfg.fonts && cfg.fonts.perPage && typeof cfg.fonts.perPage[page] === 'number' ? cfg.fonts.perPage[page] : null;
  const fontMax = perPage !== null ? perPage : cfg && cfg.fonts && typeof cfg.fonts.preloadKB === 'number' ? cfg.fonts.preloadKB : Infinity;
  const htmlMax = cfg && cfg.html && typeof cfg.html.maxKB === 'number' ? cfg.html.maxKB : Infinity;
  const r = (n) => Math.round(n * 10) / 10;
  return {
    page,
    fontKB: r(fontKB), fontMax, fontOver: fontKB > fontMax,
    htmlKB: r(htmlKB), htmlMax, htmlOver: htmlKB > htmlMax,
  };
}

/** Manifest keys whose chunks load with `pageKey`: its ancestor `.../layout` entries, then itself. */
export function chainKeys(pageKey, allKeys) {
  const segs = pageKey.replace(/\/page$/, '').split('/').filter(Boolean);
  const out = [];
  for (let i = 0; i <= segs.length; i++) {
    const k = '/' + segs.slice(0, i).join('/') + '/layout';
    const key = k.replace('//', '/');
    if (allKeys.includes(key)) out.push(key);
  }
  out.push(pageKey);
  return out;
}

