// Preload / HTML-weight gate (scripts/perf/preloads.mjs) + sanity of perf-budgets.json.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { preloadedFontHrefs, evaluatePage, chainKeys } from '../perf/preloads.mjs';
import { eq, ok, report } from './_harness';

const html = `<html><head>
<link rel="preload" href="/_next/static/media/a-s.p.woff2" as="font" crossorigin="" type="font/woff2"/>
<link rel="preload" as="font" href="/_next/static/media/b-s.p.woff2" crossorigin=""/>
<link rel="preload" href="/_next/static/media/a-s.p.woff2" as="font"/>
<link rel="preload" href="/_next/static/chunks/x.js" as="script"/>
<link rel="stylesheet" href="/_next/static/css/y.css"/>
</head></html>`;
eq('finds font preloads, de-duplicated, ignores scripts/styles', preloadedFontHrefs(html), ['/_next/static/media/a-s.p.woff2', '/_next/static/media/b-s.p.woff2']);
eq('no preloads', preloadedFontHrefs('<html></html>'), []);

const cfg = { fonts: { preloadKB: 200 }, html: { maxKB: 80 } };
const good = evaluatePage('/en', { fontKB: 150, htmlKB: 60 }, cfg);
ok('under both -> fine', !good.fontOver && !good.htmlOver);
const bad = evaluatePage('/en', { fontKB: 650, htmlKB: 90 }, cfg);
ok('fonts over', bad.fontOver);
ok('html over', bad.htmlOver);
ok('no config -> never over', !evaluatePage('/x', { fontKB: 9999, htmlKB: 9999 }, {}).fontOver);

// chainKeys - a page's initial JS = its ancestor layouts + itself (the layout is what budgets missed)
const keys = ['/[locale]/layout', '/[locale]/(site)/layout', '/[locale]/(site)/about/page', '/[locale]/admin/(panel)/layout', '/_not-found/page'];
eq('page under (site): both layouts then the page', chainKeys('/[locale]/(site)/about/page', keys), ['/[locale]/layout', '/[locale]/(site)/layout', '/[locale]/(site)/about/page']);
eq('page without layouts', chainKeys('/_not-found/page', keys), ['/_not-found/page']);
eq('unrelated layouts excluded', chainKeys('/[locale]/admin/(panel)/x/page', keys), ['/[locale]/layout', '/[locale]/admin/(panel)/layout', '/[locale]/admin/(panel)/x/page']);

// perf-budgets.json stays well-formed and keeps the ratchet below the pre-6.1 values
const b = JSON.parse(readFileSync(join(process.cwd(), 'perf-budgets.json'), 'utf8'));
ok('default is a number', typeof b.default === 'number');
ok('fonts.preloadKB set and below the pre-6.1 650 KB', typeof b.fonts?.preloadKB === 'number' && b.fonts.preloadKB < 650);
ok('html.maxKB set', typeof b.html?.maxKB === 'number' && b.html.maxKB > 0);
ok('public home ceiling below pre-6.1 470 KB', b.routes['/[locale]'] < 470);
ok('initial-JS gzip budget present', typeof b.initialJsGzKB?.default === 'number');

report('perf.preloads');
