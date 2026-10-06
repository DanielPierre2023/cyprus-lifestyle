// Public experiences pages: filter URLs, facets, pagination, honest place wording, JSON-LD, map / booking links,
// the north rule, tags, sitemap wiring, the concierge → page links and the channel link lines.
import { readFileSync } from 'node:fs';
import { LOCALES } from '@/lib/locales';
import { ACTIVITY_KINDS } from '@/lib/activities/classify';
import {
  parseFilterKey, filterKey, filterPath, durationBucket, priceLevel, applyFilters, facets, toggled, paginate, isIndexable,
  publicOrder, isActivitySlug, PAGE_SIZE, type PublicActivity, type Filters,
} from '@/lib/activities/browse';
import { NAV_LABEL, BOOK_LABEL, bookLabel } from '@/lib/activities/uiLabels';
import { ACTIVITIES_COPY, activitiesCopy, tagLabels, TAG_LABELS, DISTRICT_LABELS, fill, experiencesNavLabel } from '@/lib/activities/pageCopy';
import { placeText, mapHref, bookingHref, activityJsonLd, listJsonLd, isPubliclyVisible, MAP_ACTIVITY_PREFIX } from '@/lib/activities/pageData';
import { ACTIVITY_PREFIX } from '@/lib/map/explorer-taxonomy';
import { base, parseChange, tagsForChange, changesFromWebhook } from '@/lib/cache/tags';
import { activityHit, toCard } from '@/lib/concierge/sources';
import { buildChannelLines } from '@/lib/concierge/channelLinks';
import { eq, ok, report } from './_harness';

const A = (o: Partial<PublicActivity> & { slug: string }): PublicActivity => ({
  external_id: o.slug.replace(/\D+/g, '') || '1', title: o.slug, summary: 'About 4 h.', kind: 'boat', tags: [], district: 'paphos', town: 'Paphos', landmark: null,
  geo_precision: 'town', duration_min: 240, duration_label: '4 h', price_band: '€€', price_basis: 'person', group_max: null,
  booking_url: 'https://www.getyourguide.com/x-t1/', priority: 0, visits_north: false, north_site: null, ...o,
});

// ── filter keys ──────────────────────────────────────────────────────────────
eq('all parses', parseFilterKey('all'), { page: 1 });
eq('single facet', parseFilterKey('kind-boat'), { page: 1, kind: 'boat' });
eq('full key', parseFilterKey('kind-boat_district-paphos_dur-half_price-2_page-3'), { page: 3, kind: 'boat', district: 'paphos', dur: 'half', price: 2 });
for (const bad of ['kind-nope', 'district-mars', 'dur-weekly', 'price-5', 'price-0', 'page-1', 'page-0', 'page-2_kind-boat', 'district-paphos_kind-boat', 'kind-boat_kind-diving', 'kind-boat_', '', '../x', 'kind', 'Kind-boat', 'page-2_page-3'])
  eq(`non-canonical / invalid "${bad}" → null`, parseFilterKey(bad), null);
eq('key round trip', filterKey(parseFilterKey('kind-diving_price-3')!), 'kind-diving_price-3');
eq('empty filters → index path', filterPath({ page: 1 }), '/activities');
eq('page 1 of all is the index, page 2 is browse', filterPath({ page: 2 }), '/activities/browse/page-2');
eq('facet path', filterPath({ page: 1, kind: 'boat' }), '/activities/browse/kind-boat');
ok('every kind key is a valid filter', ACTIVITY_KINDS.every((k) => parseFilterKey(`kind-${k.key}`)?.kind === k.key));

// ── buckets ──────────────────────────────────────────────────────────────────
eq('90 min short', durationBucket(90), 'short'); eq('120 short', durationBucket(120), 'short'); eq('121 half', durationBucket(121), 'half');
eq('300 half', durationBucket(300), 'half'); eq('301 full', durationBucket(301), 'full'); eq('null none', durationBucket(null), null); eq('0 none', durationBucket(0), null);
eq('price level', ['€', '€€', '€€€', '€€€€', '', null].map((b) => priceLevel(b as string | null)), [1, 2, 3, 4, null, null]);

// ── filtering, facets, pagination ───────────────────────────────────────────
const rows = [
  A({ slug: 'a-1', kind: 'boat', district: 'paphos', duration_min: 90, price_band: '€' }),
  A({ slug: 'b-2', kind: 'boat', district: 'limassol', duration_min: 240, price_band: '€€' }),
  A({ slug: 'c-3', kind: 'diving', district: 'paphos', duration_min: 400, price_band: '€€€' }),
  A({ slug: 'd-4', kind: 'diving', district: 'famagusta', duration_min: null, price_band: null }),
];
eq('filter kind', applyFilters(rows, { page: 1, kind: 'boat' }).map((r) => r.slug), ['a-1', 'b-2']);
eq('filter kind+district', applyFilters(rows, { page: 1, kind: 'diving', district: 'paphos' }).map((r) => r.slug), ['c-3']);
eq('filter duration', applyFilters(rows, { page: 1, dur: 'full' }).map((r) => r.slug), ['c-3']);
eq('unknown duration only under no duration filter', applyFilters(rows, { page: 1, dur: 'short' }).map((r) => r.slug), ['a-1']);
eq('filter price', applyFilters(rows, { page: 1, price: 2 }).map((r) => r.slug), ['b-2']);
const fx = facets(rows, { page: 1, kind: 'boat' });
eq('kind facet counts ignore the kind filter itself', fx.kind.map((x) => `${x.key}:${x.n}`), ['diving:2', 'boat:2']);
eq('district facet counts honour the kind filter', fx.district.map((x) => `${x.key}:${x.n}`), ['paphos:1', 'limassol:1']);
eq('toggle sets', toggled({ page: 3 }, 'kind', 'boat'), { page: 1, kind: 'boat' });
eq('toggle clears the active one', toggled({ page: 1, kind: 'boat', price: 2 }, 'kind', 'boat'), { page: 1, price: 2 });
const many = Array.from({ length: 50 }, (_, i) => A({ slug: `x-${i + 1}` }));
eq('page size', paginate(many, 1).items.length, PAGE_SIZE); eq('pages', paginate(many, 1).pages, 3); eq('last page', paginate(many, 3).items.length, 2);
eq('clamped page', paginate(many, 99).page, 3); eq('empty list has 1 page', paginate([], 1).pages, 1);
ok('index + one facet page 1 indexable', isIndexable({ page: 1 }) && isIndexable({ page: 1, kind: 'boat' }));
ok('combinations and later pages are noindex', !isIndexable({ page: 1, kind: 'boat', district: 'paphos' }) && !isIndexable({ page: 2 }));
eq('public order: priority, cheaper, shorter', publicOrder([A({ slug: 'p-1', price_band: '€€€' }), A({ slug: 'p-2', priority: 3, price_band: '€€€€' }), A({ slug: 'p-3', price_band: '€' })]).map((r) => r.slug), ['p-2', 'p-3', 'p-1']);

// ── slugs ────────────────────────────────────────────────────────────────────
ok('catalogue slug ok', isActivitySlug('clay-pigeon-shooting-1465691'));
ok('browse / words / traversal rejected', !isActivitySlug('browse') && !isActivitySlug('../etc-1') && !isActivitySlug('a') && !isActivitySlug('Upper-1') && !isActivitySlug('x-1/y'));
const csv = readFileSync('data/activities/cyprus-experiences.csv', 'utf8').split('\n').slice(1).filter(Boolean).map((l) => l.split(',')[0]);
ok('all 566 catalogue slugs are valid page slugs', csv.length === 566 && csv.every(isActivitySlug) && new Set(csv).size === 566);

// ── copy: seven editions, same placeholders ─────────────────────────────────
const EN = ACTIVITIES_COPY.en as unknown as Record<string, string>;
for (const l of LOCALES) {
  const c = ACTIVITIES_COPY[l] as unknown as Record<string, string>;
  ok(`${l}: every copy key present and non-empty`, Object.keys(EN).every((k) => typeof c[k] === 'string' && c[k].length > 0));
  ok(`${l}: placeholders match English`, Object.keys(EN).every((k) => (EN[k].match(/\{\w+\}/g) || []).sort().join() === (c[k].match(/\{\w+\}/g) || []).sort().join()));
  ok(`${l}: districts + tags localised`, Object.values(DISTRICT_LABELS).every((d) => !!d[l]) && Object.values(TAG_LABELS).every((d) => !!d[l]));
  ok(`${l}: approximate-area honesty always stated`, c.approxNote.length > 40);
}
eq('unknown locale falls back to English', activitiesCopy('xx').nav, 'Experiences'); ok('nav label per locale', LOCALES.every((l) => experiencesNavLabel(l).length > 2));
eq('fill', fill('{n} x {p}', { n: 3, p: 2 }), '3 x 2');
eq('tags: known localised, unknown skipped', tagLabels(['pickup', 'half-day', 'family'], 'de'), ['Abholung möglich', 'Familienfreundlich']);

// ── honest place wording ─────────────────────────────────────────────────────
const c = activitiesCopy('en');
eq('landmark precision', placeText({ geo_precision: 'landmark', landmark: 'Blue Lagoon (Akamas)', town: 'Latchi' }, c), 'Around Blue Lagoon (Akamas) (Latchi) — approximate area');
eq('town precision says approximate area', placeText({ geo_precision: 'town', landmark: null, town: 'Paphos' }, c), 'Departs from the Paphos area — approximate area');
eq('no pin → confirmed on booking', placeText({ geo_precision: null, landmark: null, town: null }, c), 'Location confirmed when you book');
for (const l of LOCALES) {
  const t = placeText({ geo_precision: 'town', landmark: null, town: 'Paphos' }, activitiesCopy(l));
  ok(`${l}: town-precision wording says approximate area and names the town`, t.includes('Paphos') && t.length > 20 && !/\bmeeting point\b/i.test(t));
}

// ── links ────────────────────────────────────────────────────────────────────
eq('map link filters by kind + district', mapHref({ kind: 'boat', district: 'paphos' }), '/map?cat=act:boat&district=paphos');
eq('map link without district', mapHref({ kind: 'diving', district: null }), '/map?cat=act:diving');
eq('map prefix mirrors the explorer', MAP_ACTIVITY_PREFIX, ACTIVITY_PREFIX);
eq('affiliate link applied', bookingHref(A({ slug: 'z-1', booking_url: 'https://www.getyourguide.com/x-t1/' }), 'YEP5D0C'), 'https://www.getyourguide.com/x-t1/?partner_id=YEP5D0C&utm_medium=online_publisher&cmp=cl-activity-page');
eq('no booking url → no link', bookingHref({ booking_url: null }, 'YEP5D0C'), null);

// ── north rule ───────────────────────────────────────────────────────────────
ok('north-visiting tour hidden by default, shown on the editorial switch', !isPubliclyVisible({ visits_north: true }, false) && isPubliclyVisible({ visits_north: true }, true) && isPubliclyVisible({ visits_north: false }, false));
ok('north note names the site, avoids "Northern Cyprus" marketing', fill(activitiesCopy('en').northNote, { site: 'Salamis' }).includes('Salamis') && /not under the control/.test(activitiesCopy('en').northNote));

// ── JSON-LD ──────────────────────────────────────────────────────────────────
const ld = activityJsonLd(A({ slug: 'blue-lagoon-123', title: 'Blue Lagoon cruise', landmark: 'Blue Lagoon (Akamas)', town: 'Latchi', geo_precision: 'landmark', price_band: '€€', summary: 'Sea cruise.' }), 'de');
const ldS = JSON.stringify(ld);
eq('type', ld['@type'], 'TouristTrip'); ok('canonical german url', String(ld.url).endsWith('/de/activities/blue-lagoon-123'));
ok('no ratings, prices, offers or coordinates', !/rating|review|offers?|price|geo|latitude|longitude|aggregate/i.test(ldS.replace('additionalType', '')));
eq('english text declared', ld.inLanguage, 'en');
const il = listJsonLd([{ slug: 'a-1', title: 'A' }], 'en') as { itemListElement: { url: string }[] };
ok('item list urls', il.itemListElement[0].url.endsWith('/activities/a-1'));

// ── cache tags ───────────────────────────────────────────────────────────────
eq('tag bases', [base.activities(), base.activity('x-1')], ['activities', 'activity:x-1']);
eq('parse change', parseChange({ kind: 'activity', slug: 'x-1' }), { kind: 'activity', slug: 'x-1' });
eq('unsafe slug rejected', parseChange({ kind: 'activity', slug: '../x' }), null);
eq('tags for a change: page + lists', tagsForChange({ kind: 'activity', slug: 'x-1' }), ['activity:x-1', 'activities']);
eq('per-locale change', tagsForChange({ kind: 'activity', slug: 'x-1', locales: ['de'] }), ['activity:x-1@de', 'activities@de']);
eq('db webhook for table activities', changesFromWebhook({ table: 'activities', record: { slug: 'x-1' }, old_record: { slug: 'x-1' } }), [{ kind: 'activity', slug: 'x-1' }, { kind: 'activity', slug: 'x-1' }]);

// ── sitemap + routes wiring (source level) ──────────────────────────────────
const idx = readFileSync('app/sitemap.xml/route.ts', 'utf8'); const seg = readFileSync('app/sitemaps/[segment]/route.ts', 'utf8');
ok('sitemap index lists the activities child', idx.includes("childSitemapUrl('activities')"));
ok('child route serves the activities segment', seg.includes("segment === 'activities'") && seg.includes('activitySitemapPaths'));
const detail = readFileSync('app/[locale]/(site)/activities/[slug]/page.tsx', 'utf8');
ok('detail page: ISR 3600, sponsored+nofollow+noopener booking, tag registration, canonical via pageMetadata', /revalidate = 3600/.test(detail) && detail.includes('rel="sponsored nofollow noopener"') && detail.includes('tagPage') && detail.includes('pageMetadata'));
ok('browse + index pages are ISR 3600', /revalidate = 3600/.test(readFileSync('app/[locale]/(site)/activities/page.tsx', 'utf8')) && /revalidate = 3600/.test(readFileSync('app/[locale]/(site)/activities/browse/[filter]/page.tsx', 'utf8')));
const pub = readFileSync('lib/activities/public.ts', 'utf8');
ok('public reads: active only, catalogue columns only, no extra columns', pub.includes(".eq('status', 'active')") && !/operator_|image|gallery|rating|text_|title_|summary_|slug_previous|slug_redirects|activity_embeddings|map_markers|match_activities/.test(pub));

// ── concierge cards / hits link to the page; booking stays secondary ────────
const hit = activityHit({ external_id: '1', slug: 'blue-lagoon-123', title: 'Blue Lagoon', summary: 's', kind: 'boat', district: 'paphos', town: 'Latchi', price_band: '€€', duration_label: '4 h' }, 'de', 'https://gyg.example/b');
eq('hit href is our page', [hit?.href, hit?.external, hit?.bookHref], ['/activities/blue-lagoon-123', false, 'https://gyg.example/b']);
eq('card carries the book link', toCard(hit!, 'de').bookHref, 'https://gyg.example/b');
const legacy = activityHit({ external_id: '1', title: 'T', summary: 's', kind: 'boat', district: null, town: null, price_band: null, duration_label: null }, 'en', 'https://gyg.example/b');
eq('no slug → old behaviour (partner link, external)', [legacy?.href, legacy?.external, legacy?.bookHref], ['https://gyg.example/b', true, undefined]);
eq('bad slug → old behaviour', activityHit({ external_id: '1', slug: '../x', title: 'T', summary: '', kind: 'boat', district: null, town: null, price_band: null, duration_label: null }, 'en', 'https://g/b')?.href, 'https://g/b');
const SITE = 'https://site.test';
const lines = buildChannelLines({ guides: [], picks: [], activities: [{ title: 'Blue Lagoon', url: 'https://gyg.example/b', slug: 'blue-lagoon-123' }, { title: 'Wine', url: 'https://gyg.example/w', slug: 'wine-tour-9' }] }, 'de', SITE);
eq('whatsapp/telegram: page lines first, booking link second (first only)', lines, [
  `Blue Lagoon: ${SITE}/de/activities/blue-lagoon-123`, `Buchen (GetYourGuide, Partnerlink): https://gyg.example/b`, `Wine: ${SITE}/de/activities/wine-tour-9`]);
eq('activity without page keeps the single partner line', buildChannelLines({ guides: [], picks: [], activities: [{ title: 'T', url: 'https://gyg.example/t' }] }, 'en', SITE), ['T (GetYourGuide, partner link): https://gyg.example/t']);
eq('english has no locale prefix', buildChannelLines({ guides: [], picks: [], activities: [{ title: 'T', url: null, slug: 'abc-12' }] }, 'en', SITE), [`T: ${SITE}/activities/abc-12`]);
const cards = readFileSync('components/ActivityCards.tsx', 'utf8');
ok('concierge card: page link main, partner link secondary + sponsored', cards.includes('a.pageHref') && cards.includes('rel="sponsored nofollow noopener"'));
ok('kinds exist for every kind label used by cards', ACTIVITY_KINDS.every((k) => k.label.en));

// client bundles must not pull the full page copy (perf): header, chat cards and sources use the tiny uiLabels module only
for (const f of ['components/Header.tsx', 'components/ConciergeSources.tsx', 'components/ActivityCards.tsx', 'lib/concierge/channelLinks.ts'])
  ok(`${f} does not import lib/activities/pageCopy`, !readFileSync(f, 'utf8').includes('activities/pageCopy'));
ok('nav + book labels in all seven editions, shared with pageCopy', LOCALES.every((l) => NAV_LABEL[l] === ACTIVITIES_COPY[l].nav && BOOK_LABEL[l] === ACTIVITIES_COPY[l].bookSmall && bookLabel(l).length > 2));

report('activities-pages');
