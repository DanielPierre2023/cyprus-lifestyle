#!/usr/bin/env node
// Cyprus Lifestyle — read-only browser smoke test of the PUBLIC site.
//
//   npm run smoke                                   # against https://cypruslifestyle.eu
//   BASE_URL=http://localhost:3000 npm run smoke    # against a local server
//   LOCALES=en,ar npm run smoke                     # a subset of the seven locales
//
// What it does, per locale (en de el pl ro ru ar) and per page (home, a section page,
// directory, a directory type page, a listing page, agenda, map, membership, advertise,
// contact, privacy, plus the newsletter signup form on the home page):
//   - HTTP 200 on the document (redirects followed; the final status counts)
//   - no console errors / uncaught page errors
//   - no same-origin sub-request that failed or answered >= 400
//   - <html lang> matches the locale, and dir="rtl" for Arabic (ltr otherwise)
//   - a <main> landmark exists
//   - no horizontal overflow at 390 px and at 1280 px
//   - up to LINKS (15) same-origin internal links respond (404 or 5xx fails; 401/403/429 warn)
//   - every JSON-LD block parses
//
// SAFETY: GET only. No form is filled or submitted, nothing is clicked, no login. Pages are
// opened one at a time and every explicit navigation / link probe is spaced by DELAY_MS
// (default 500 ms = at most ~2 requests per second from this script). The browser also
// fetches each page's own assets, exactly as a visitor's browser would; they are cached
// across pages. Set SMOKE_LIGHT=1 to skip images, media and fonts.
//
// Browser: Playwright with an already-installed Chromium. It never runs `playwright install`.
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers (default if that folder exists), or CHROMIUM_PATH=<binary>.
//   `playwright` itself is resolved from node_modules or from the global npm root.
//   Behind a TLS-inspecting proxy whose CA Chromium does not know, set SMOKE_CA_FILE=<proxy CA .pem>:
//   only certificates chained to THAT CA are accepted (its public-key hash is passed to Chromium);
//   certificate checking stays on for everything else. Leave it unset for a normal run.
//
// Exit code: 0 = no failures (warnings allowed), 1 = at least one failure, 2 = could not run.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.env.BASE_URL || 'https://cypruslifestyle.eu').replace(/\/+$/, '');
const ALL_LOCALES = ['en', 'de', 'el', 'pl', 'ro', 'ru', 'ar'];
const LOCALES = (process.env.LOCALES || ALL_LOCALES.join(',')).split(',').map((s) => s.trim()).filter((l) => ALL_LOCALES.includes(l));
const DELAY = Math.max(0, Number(process.env.DELAY_MS ?? 500));
const MAX_LINKS = Math.max(0, Number(process.env.LINKS ?? 15));
const NAV_TIMEOUT = Number(process.env.NAV_TIMEOUT_MS ?? 45000);
const LIGHT = process.env.SMOKE_LIGHT === '1';
const JSON_OUT = process.env.SMOKE_JSON || '';
const IGNORE_CONSOLE = process.env.IGNORE_CONSOLE ? new RegExp(process.env.IGNORE_CONSOLE, 'i') : null;
const ORIGIN = new URL(BASE).origin;
const UA = 'CyprusLifestyle-smoke/1.0 (read-only; contact: site owner)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastHit = 0;
async function polite() { const wait = lastHit + DELAY - Date.now(); if (wait > 0) await sleep(wait); lastHit = Date.now(); }

// ── resolve playwright + chromium without installing anything ────────────────────────────
async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* fall through to the global root */ }
  try {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const req = createRequire(join(root, 'noop.js'));
    return req('playwright');
  } catch { /* none */ }
  console.error('Cannot load "playwright". Install it somewhere npm can see it (npm i -g playwright) — do NOT run "playwright install" if Chromium is already provided.');
  process.exit(2);
}
function findChromium() {
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) return process.env.CHROMIUM_PATH;
  const bases = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean);
  for (const b of bases) {
    if (!existsSync(b)) continue;
    const dirs = readdirSync(b).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()
      .concat(readdirSync(b).filter((d) => /^chromium_headless_shell-\d+$/.test(d)).sort().reverse());
    for (const d of dirs) {
      for (const rel of ['chrome-linux/chrome', 'chrome-linux/headless_shell', 'chrome-linux64/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
        const p = join(b, d, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  return undefined; // let Playwright use its own default location
}

// ── helpers ───────────────────────────────────────────────────────────────────────────────
const prefix = (loc) => (loc === 'en' ? '' : `/${loc}`);
const urlOf = (loc, path) => `${BASE}${prefix(loc)}${path === '/' ? (loc === 'en' ? '/' : '') : path}`;
const results = []; // { locale, page, url, checks:[{name,status,detail}] }
function add(rec, name, status, detail = '') { rec.checks.push({ name, status, detail }); }

// Same-origin link classification from the home / directory pages (no hard-coded slugs).
function classify(links, loc) {
  const p = prefix(loc);
  const rel = links.map((h) => { try { const u = new URL(h, BASE); return u.origin === ORIGIN ? u.pathname : null; } catch { return null; } }).filter(Boolean);
  const strip = (x) => (p && x.startsWith(p + '/') ? x.slice(p.length) : x === p ? '/' : x);
  const paths = [...new Set(rel.map(strip))];
  const RESERVED = new Set([...ALL_LOCALES, 'agenda', 'map', 'membership', 'advertise', 'contact', 'privacy', 'directory', 'about', 'account', 'article', 'author', 'search', 'ask', 'best', 'booking', 'for', 'guide', 'live', 'luxury', 'partner', 'sourcing', 'standards', 'when-to-visit', 'admin', 'api']);
  const seg = (x) => x.split('/').filter(Boolean);
  return {
    article: paths.find((x) => /^\/article\/[^/]+$/.test(x)),
    section: paths.find((x) => seg(x).length === 1 && !RESERVED.has(seg(x)[0]) && /^[a-z-]+$/.test(seg(x)[0])),
    dirType: paths.find((x) => /^\/directory\/[^/]+$/.test(x) && !/^\/directory\/(g|manage)$/.test(x)),
    listing: paths.find((x) => /^\/directory\/[^/]+\/[^/]+$/.test(x) && !/^\/directory\/g\//.test(x)),
  };
}

async function visit(ctx, loc, label, path, opts = {}) {
  const url = path.startsWith('http') ? path : urlOf(loc, path);
  const rec = { locale: loc, page: label, url, checks: [] };
  const page = await ctx.newPage();
  const consoleErrors = [], failedReq = [], pageErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') { const t = m.text(); if (!IGNORE_CONSOLE || !IGNORE_CONSOLE.test(t)) consoleErrors.push(t.slice(0, 200)); } });
  page.on('pageerror', (e) => pageErrors.push(String(e.message || e).slice(0, 200)));
  page.on('response', (r) => { try { if (new URL(r.url()).origin === ORIGIN && r.status() >= 400) failedReq.push(`${r.status()} ${new URL(r.url()).pathname}`); } catch { /* ignore */ } });
  page.on('requestfailed', (r) => { try { if (new URL(r.url()).origin === ORIGIN && !/ERR_ABORTED/.test(r.failure()?.errorText || '')) failedReq.push(`FAILED ${new URL(r.url()).pathname} ${r.failure()?.errorText || ''}`); } catch { /* ignore */ } });
  if (LIGHT) await page.route('**/*', (route) => (['image', 'media', 'font'].includes(route.request().resourceType()) ? route.abort() : route.continue()));

  let status = 0, finalUrl = url;
  try {
    await polite();
    await page.setViewportSize({ width: 1280, height: 900 });
    const resp = await page.goto(url, { waitUntil: 'load', timeout: NAV_TIMEOUT });
    status = resp ? resp.status() : 0;
    finalUrl = page.url();
    await page.waitForTimeout(1200); // let hydration / lazy console errors surface
  } catch (e) {
    add(rec, 'HTTP 200', 'fail', `navigation error: ${String(e.message || e).split('\n')[0]}`);
    await page.close();
    return { rec, links: [], page: null };
  }
  add(rec, 'HTTP 200', status === 200 ? 'pass' : 'fail', status === 200 ? (finalUrl !== url ? `redirected to ${new URL(finalUrl).pathname}` : '') : `status ${status}`);
  if (status !== 200) { await page.close(); return { rec, links: [], page: null }; }

  const info = await page.evaluate(() => ({
    lang: document.documentElement.getAttribute('lang') || '',
    dir: document.documentElement.getAttribute('dir') || '',
    main: document.querySelectorAll('main, [role="main"]').length,
    title: document.title || '',
    ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent || ''),
    hrefs: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || ''),
    emailForm: !!document.querySelector('form input[type="email"], form input[name*="email" i]'),
    ovDesktop: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));

  add(rec, '<html lang>', info.lang.toLowerCase().startsWith(loc) ? 'pass' : 'fail', info.lang.toLowerCase().startsWith(loc) ? info.lang : `lang="${info.lang}" expected "${loc}"`);
  const wantDir = loc === 'ar' ? 'rtl' : 'ltr';
  const gotDir = (info.dir || 'ltr').toLowerCase();
  add(rec, '<html dir>', gotDir === wantDir ? 'pass' : 'fail', gotDir === wantDir ? gotDir : `dir="${info.dir}" expected "${wantDir}"`);
  add(rec, 'main landmark', info.main >= 1 ? 'pass' : 'fail', info.main >= 1 ? '' : 'no <main>');
  add(rec, 'overflow 1280px', info.ovDesktop <= 1 ? 'pass' : 'fail', info.ovDesktop <= 1 ? '' : `page is ${info.ovDesktop}px wider than the viewport`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const ovMobile = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  add(rec, 'overflow 390px', ovMobile <= 1 ? 'pass' : 'fail', ovMobile <= 1 ? '' : `page is ${ovMobile}px wider than the viewport`);

  // JSON-LD
  let bad = 0; const types = [];
  for (const raw of info.ld) { try { const j = JSON.parse(raw); (Array.isArray(j) ? j : [j]).forEach((x) => x && x['@type'] && types.push(Array.isArray(x['@type']) ? x['@type'][0] : x['@type'])); } catch { bad++; } }
  if (bad) add(rec, 'JSON-LD parses', 'fail', `${bad} of ${info.ld.length} blocks are not valid JSON`);
  else add(rec, 'JSON-LD parses', 'pass', info.ld.length ? `${info.ld.length} block(s): ${[...new Set(types)].slice(0, 5).join(', ')}` : 'no JSON-LD on this page');
  if (opts.expectLd && info.ld.length === 0) add(rec, 'JSON-LD present', 'warn', 'none found on a page that normally carries it');

  if (opts.newsletter) add(rec, 'newsletter signup form', info.emailForm ? 'pass' : 'warn', info.emailForm ? 'email form present (not submitted)' : 'no email form found on this page');

  add(rec, 'console errors', consoleErrors.length + pageErrors.length === 0 ? 'pass' : 'fail', [...consoleErrors, ...pageErrors].slice(0, 3).join(' | '));
  add(rec, 'same-origin requests', failedReq.length === 0 ? 'pass' : 'fail', [...new Set(failedReq)].slice(0, 4).join(' | '));
  if (!info.title.trim()) add(rec, 'document title', 'warn', 'empty <title>');

  await page.close();
  return { rec, links: info.hrefs };
}

const linkCache = new Map(); // url -> {status}
async function checkLinks(ctx, rec, hrefs, loc) {
  if (MAX_LINKS === 0) return;
  const cands = [...new Set(hrefs.map((h) => h.trim()).filter((h) => h && !/^(mailto:|tel:|javascript:|#|sms:|whatsapp:)/i.test(h)))]
    .map((h) => { try { return new URL(h, rec.url); } catch { return null; } })
    .filter((u) => u && u.origin === ORIGIN && !/^\/(api|admin)(\/|$)/.test(u.pathname) && !/\/admin(\/|$)/.test(u.pathname) && !/(logout|signout|unsubscribe|checkout|\.pdf$|\.zip$)/i.test(u.pathname))
    .map((u) => { u.hash = ''; return u.toString(); });
  const uniq = [...new Set(cands)];
  // deterministic spread across the page rather than just the header links
  const picked = uniq.length <= MAX_LINKS ? uniq : Array.from({ length: MAX_LINKS }, (_, i) => uniq[Math.floor((i * uniq.length) / MAX_LINKS)]);
  const bad = [], warn = []; let checked = 0, fromCache = 0;
  for (const u of picked) {
    let st = linkCache.get(u);
    if (st === undefined) {
      // One polite retry for network errors and gateway errors, so a transient proxy or edge hiccup
      // is not reported as a broken link.
      for (let attempt = 0; attempt < 2; attempt++) {
        await polite();
        try { const r = await ctx.request.get(u, { timeout: 20000, maxRedirects: 5, headers: { 'user-agent': UA } }); st = r.status(); } catch (e) { st = `ERR ${String(e.message || e).split('\n')[0].slice(0, 60)}`; }
        if (!(typeof st === 'string' || st === 502 || st === 503 || st === 504)) break;
        await sleep(2000);
      }
      linkCache.set(u, st);
    } else fromCache++;
    checked++;
    const path = new URL(u).pathname + new URL(u).search;
    if (typeof st === 'string') warn.push(`inconclusive (${st}) ${path}`);
    else if (st === 404 || st >= 500) bad.push(`${st} ${path}`);
    else if (st >= 400) warn.push(`${st} ${path}`);
  }
  add(rec, `internal links (${checked} of ${uniq.length} sampled)`, bad.length ? 'fail' : warn.length ? 'warn' : 'pass', [...bad, ...warn].slice(0, 6).join(' | ') + (fromCache ? ` (${fromCache} already checked on another page)` : ''));
}

// ── main ──────────────────────────────────────────────────────────────────────────────────
const t0 = Date.now();
const pw = await loadPlaywright();
const executablePath = findChromium();
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
function caArgs() {
  const f = process.env.SMOKE_CA_FILE;
  if (!f) return [];
  try {
    const hash = execSync(`openssl x509 -in "${f}" -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64`, { encoding: 'utf8', shell: '/bin/bash' }).trim();
    return hash ? [`--ignore-certificate-errors-spki-list=${hash}`] : [];
  } catch { console.error('SMOKE_CA_FILE could not be read; continuing without it.'); return []; }
}
const launchOpts = { headless: true, args: caArgs(), ...(executablePath ? { executablePath } : {}), ...(proxy && !/localhost|127\.0\.0\.1/.test(BASE) ? { proxy: { server: proxy } } : {}) };
console.log(`Cyprus Lifestyle smoke test, read-only\n  base: ${BASE}\n  locales: ${LOCALES.join(' ')}\n  chromium: ${executablePath || '(playwright default)'}\n  pacing: ${DELAY} ms between explicit requests, ${MAX_LINKS} links per page${LIGHT ? ', light mode' : ''}\n`);
let browser;
try { browser = await pw.chromium.launch(launchOpts); } catch (e) { console.error('Could not start Chromium:', String(e.message || e).split('\n')[0]); process.exit(2); }

for (const loc of LOCALES) {
  const ctx = await browser.newContext({ userAgent: UA, locale: loc === 'ar' ? 'ar' : loc, ignoreHTTPSErrors: false });
  const found = { article: null, section: null, dirType: null, listing: null };
  const FLAKY = ['HTTP 200', 'console errors', 'same-origin requests'];
  const run = async (label, path, opts = {}) => {
    let { rec, links } = await visit(ctx, loc, label, path, opts);
    const bad = rec.checks.filter((c) => c.status === 'fail' && FLAKY.includes(c.name));
    if (bad.length) {
      // A single failed sub-request (often a gateway blip) should not condemn a page: load it once more.
      const again = await visit(ctx, loc, label, path, opts);
      for (const c of bad) {
        const c2 = again.rec.checks.find((x) => x.name === c.name);
        if (c2 && c2.status === 'pass') { c.status = 'warn'; c.detail = `transient, not seen on a second load: ${c.detail}`; }
        else c.detail += ' (reproduced on a second load)';
      }
      if (!links.length && again.links.length) { rec = { ...again.rec, checks: [...bad.map((c) => c), ...again.rec.checks.filter((x) => !bad.some((c) => c.name === x.name))] }; links = again.links; }
    }
    results.push(rec);
    if (links.length) await checkLinks(ctx, rec, links, loc);
    return { rec, links };
  };
  const skip = (label, why) => { const rec = { locale: loc, page: label, url: '-', checks: [] }; add(rec, 'discovered from the site', 'warn', why); results.push(rec); };

  const home = await run('home', '/', { expectLd: true, newsletter: true });
  Object.assign(found, classify(home.links, loc));
  if (found.article) await run('article', found.article, { expectLd: true }); else skip('article', 'no /article/ link on the home page');
  if (found.section) await run('section (article list)', found.section); else skip('section (article list)', 'no section link on the home page');
  const dir = await run('directory', '/directory', { expectLd: true });
  const dc = classify(dir.links, loc);
  found.dirType = found.dirType || dc.dirType;
  found.listing = found.listing || dc.listing;
  if (found.dirType) {
    const typePage = await run('directory type', found.dirType);
    found.listing = found.listing || classify(typePage.links, loc).listing;
  } else skip('directory type', 'no /directory/<type> link found');
  if (found.listing) await run('listing', found.listing, { expectLd: true }); else skip('listing', 'no listing link found on directory pages');
  for (const [label, path] of [['agenda', '/agenda'], ['map', '/map'], ['membership', '/membership'], ['advertise', '/advertise'], ['contact', '/contact'], ['privacy', '/privacy']]) await run(label, path);
  await ctx.close();
}
await browser.close();

// ── report ────────────────────────────────────────────────────────────────────────────────
let fails = 0, warns = 0, passes = 0;
const mark = { pass: 'ok  ', warn: 'WARN', fail: 'FAIL' };
for (const loc of LOCALES) {
  console.log(`\n== ${loc.toUpperCase()} ${'='.repeat(60)}`);
  for (const rec of results.filter((r) => r.locale === loc)) {
    const f = rec.checks.filter((c) => c.status === 'fail').length, w = rec.checks.filter((c) => c.status === 'warn').length;
    console.log(`${f ? 'FAIL' : w ? 'WARN' : 'ok  '}  ${rec.page.padEnd(24)} ${rec.url === '-' ? '' : rec.url.replace(BASE, '') || '/'}`);
    for (const c of rec.checks) {
      if (c.status === 'pass') passes++; else if (c.status === 'warn') warns++; else fails++;
      if (c.status !== 'pass') console.log(`        ${mark[c.status]} ${c.name}${c.detail ? ': ' + c.detail : ''}`);
    }
  }
}
const secs = Math.round((Date.now() - t0) / 1000);
console.log(`\n${'-'.repeat(70)}\n${results.length} page visits, ${linkCache.size} distinct links probed, ${secs}s\n${passes} checks passed, ${warns} warnings, ${fails} failures`);
if (JSON_OUT) { writeFileSync(JSON_OUT, JSON.stringify({ base: BASE, when: new Date().toISOString(), locales: LOCALES, results }, null, 2)); console.log(`JSON report: ${JSON_OUT}`); }
process.exit(fails ? 1 : 0);
