// Map explorer (lib/map/explorer-*.ts) — the pure data contract behind /map:
// every backend category is present and translated, the compact index encodes and
// decodes losslessly, ranking honours the paid tier, and the contact-data rules of
// the directory map (phone only for published, never email, no profile link for
// the bulk 'listed' set) still hold.
import { CANONICAL_CATEGORIES } from '@/lib/directory/taxonomy';
import {
  explorerCategories, explorerGroups, canonicalOf, groupLabel, GROUP_ORDER, EVENT_CAT, CATEGORY_GROUP, ACTIVITY_PREFIX,
} from '@/lib/map/explorer-taxonomy';
import { ACTIVITY_KINDS } from '@/lib/activities/classify';
import {
  buildIndex, decodeIndex, rankScore, listingDetail, eventDetail, activityDetail, safeUrl, cleanSearch, cyprusPoint, F,
  type IndexListingRow,
} from '@/lib/map/explorer-index';
import { eq, ok, report } from './_harness';

const LOCALES = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];

// ── Taxonomy: every backend category reaches the map, in every language ─────────────
{
  const cats = explorerCategories('en', {}, 'Events');
  eq('all canonical categories + events + activity kinds', cats.length, CANONICAL_CATEGORIES.length + 1 + ACTIVITY_KINDS.length);
  ok('every activity kind is a category', ACTIVITY_KINDS.every((k) => cats.some((c) => c.k === `${ACTIVITY_PREFIX}${k.key}` && c.group === 'activities')));
  ok('every canonical key present', CANONICAL_CATEGORIES.every((c) => cats.some((x) => x.k === c.key)));
  ok('events pseudo-category present', cats.some((x) => x.k === EVENT_CAT));
  ok('every category has an icon', cats.every((c) => c.icon.includes('<')));
  for (const l of LOCALES) {
    const lc = explorerCategories(l, {}, 'Events');
    ok(`${l}: every category labelled`, lc.every((c) => c.label.length > 1));
    const gs = explorerGroups(l, 'Events');
    ok(`${l}: every group labelled (not the raw key)`, gs.filter((g) => g.k !== 'events').every((g) => g.label !== g.k || l === 'en'));
    ok(`${l}: activities group first`, gs[0].k === 'activities' && gs[0].label.length > 3);
  }
  const groupsUsed = new Set(CANONICAL_CATEGORIES.map((c) => c.group));
  ok('GROUP_ORDER covers every canonical group', [...groupsUsed].every((g) => (GROUP_ORDER as readonly string[]).includes(g)));
  eq('group label en', groupLabel('home-services', 'en'), 'Home services & trades');
  eq('group label de', groupLabel('real-estate', 'de'), 'Immobilien');
  const counted = explorerCategories('en', { dentist: 5, restaurant: 9 }, 'Events');
  eq('sorted by count', counted.slice(0, 2).map((c) => c.k).join(','), 'restaurant,dentist');
  eq('canonical kept', canonicalOf('dentist', 'vendor'), 'dentist');
  eq('null canonical → type fallback', canonicalOf(null, 'hotel'), 'hotel');
  eq('development → property-developer', canonicalOf(null, 'development'), 'property-developer');
  eq('unknown → general-vendor', canonicalOf('spaceship', 'vendor'), 'general-vendor');
  ok('category→group map complete', CANONICAL_CATEGORIES.every((c) => CATEGORY_GROUP[c.key] === c.group));
}

// ── Coordinates ───────────────────────────────────────────────────────────────────
eq('in Cyprus kept', cyprusPoint(34.68, 33.04), { lat: 34.68, lng: 33.04 });
eq('swapped recovered', cyprusPoint(33.04, 34.68), { lat: 34.68, lng: 33.04 });
eq('off-island dropped', cyprusPoint(51.5, -0.12), null);
eq('null dropped', cyprusPoint(null, 33), null);

// ── Index encode / decode ────────────────────────────────────────────────────────────
const row = (o: Partial<IndexListingRow>): IndexListingRow => ({
  slug: 'x', type: 'vendor', status: 'listed', canonical_category: null, canonical_subtype: null, district: 'limassol',
  lat: 34.7, lng: 33.0, featured: false, verified: false, luxury: false, rating: null, rating_count: null,
  commercial_rank: 0, price_band: null, price_from: null, image: null, ...o,
});
{
  const ix = buildIndex([
    row({ slug: 'a', status: 'published', canonical_category: 'dentist', featured: true, verified: true, image: 'https://x/a.jpg', rating: 4.7, rating_count: 120, commercial_rank: 2, price_band: '€€' }),
    row({ slug: 'b', canonical_category: null, type: 'hotel', lat: '33.05', lng: '34.62', district: 'Larnaca' }), // swapped, string coords
    row({ slug: 'c', lat: 48.1, lng: 11.5 }),     // off-island → dropped
    row({ slug: 'a' }),                            // duplicate slug → dropped
    row({ slug: 'd', canonical_category: 'property-developer', price_from: '250000', luxury: true }),
  ], [
    { slug: 'fest', district: 'paphos', lat: 34.77, lng: 32.42, starts_at: '2026-10-10T19:00:00+03:00', image: null },
    { slug: 'nodate', district: 'paphos', lat: 34.77, lng: 32.42, starts_at: null, image: null }, // dropped
  ], '2026-10-04T00:00:00Z', [
    { external_id: '649749', kind: 'boat', district: 'famagusta', landmark: 'Cape Greco', lat: 34.9563, lng: 34.0928, price_band: '€€', priority: 2 },
    { external_id: 'nowhere', kind: 'diving', district: null, landmark: null, lat: null, lng: null, price_band: '€' }, // no point → off the map
  ]);
  eq('rows kept', ix.n, 5);
  eq('dictionary-encoded categories', ix.cats.slice().sort().join(','), 'act:boat,dentist,event,hotel,property-developer');
  const pts = decodeIndex(ix);
  const a = pts.find((p) => p.id === 'a')!;
  ok('published flag', (a.flags & F.PUBLISHED) !== 0);
  ok('featured + verified + image flags', (a.flags & F.FEATURED) !== 0 && (a.flags & F.VERIFIED) !== 0 && (a.flags & F.IMAGE) !== 0);
  eq('rating round-trips', a.rating, 4.7);
  eq('rating count', a.ratingCount, 120);
  eq('commercial rank', a.rank, 2);
  eq('price band', a.price, '€€');
  const b = pts.find((p) => p.id === 'b')!;
  eq('null canonical → hotel', b.cat, 'hotel');
  eq('swapped coords fixed', [b.lat, b.lng], [34.62, 33.05]);
  eq('district lower-cased', b.district, 'larnaca');
  ok('listed is not published', (b.flags & F.PUBLISHED) === 0);
  const d = pts.find((p) => p.id === 'd')!;
  eq('price_from parsed', d.priceFrom, 250000);
  ok('luxury flag', (d.flags & F.LUXURY) !== 0);
  const ev = pts.find((p) => p.id === 'e:fest')!;
  eq('event category', ev.cat, EVENT_CAT);
  eq('event slug', ev.slug, 'fest');
  eq('event date round-trips (minute precision)', ev.date, '2026-10-10T16:00:00.000Z');
  ok('event flag', (ev.flags & F.EVENT) !== 0);
  const act = pts.find((p) => p.id === 'a:649749')!;
  eq('activity category', act.cat, 'act:boat');
  eq('activity slug', act.slug, '649749');
  eq('activity price band feeds the Price filter', [act.price, act.priceFrom], ['€€', null]);
  eq('no third-party rating in the index', [act.rating, act.ratingCount], [null, 0]);
  eq('editorial priority → rank', act.rank, 2);
  eq('activity landmark as interest', act.subtype, 'cape greco');
  ok('activity flag, no photo flag', (act.flags & F.ACTIVITY) !== 0 && (act.flags & F.IMAGE) === 0 && (act.flags & F.PUBLISHED) === 0);
  ok('index carries no names or contact data', !JSON.stringify(ix).match(/name|phone|email|address/i));
}

// ── Ranking: paid tier first ("map priority"), then featured, then rating × volume ─
{
  const base = { flags: 0, rating: null as number | null, ratingCount: 0, rank: 0 };
  const partner = rankScore({ ...base, rank: 3 });
  const listedTier = rankScore({ ...base, rank: 1 });
  const featured = rankScore({ ...base, flags: F.FEATURED, rating: 5, ratingCount: 9999 });
  const popular = rankScore({ ...base, rating: 4.9, ratingCount: 2000 });
  const fewReviews = rankScore({ ...base, rating: 4.9, ratingCount: 3 });
  ok('partner > listed tier', partner > listedTier);
  ok('any paid tier > featured', listedTier > featured);
  ok('featured > top-rated', featured > popular);
  ok('volume matters', popular > fewReviews);
}

// ── Details: the directory map's contact-data rules ──────────────────────────────────
{
  const listed = listingDetail({ slug: 'acme-ac', type: 'vendor', status: 'listed', name_en: 'Acme AC', phone: '+357 99 000000', email: 'a@b.c', url: 'https://acme.cy', summary_en: 'x' }, 'en', '');
  eq('listed: no phone', listed.phone, null);
  eq('listed: no profile link (no page exists)', listed.href, null);
  eq('listed: website kept', listed.url, 'https://acme.cy');
  ok('never an email field', !('email' in listed));
  const pub = listingDetail({ slug: 'meze-bar', type: 'restaurant', status: 'published', name_en: 'Meze Bar', name_el: 'Μεζέ Μπαρ', phone: '+357 25 000000', url: 'javascript:alert(1)' }, 'el', '/el');
  eq('published: phone kept', pub.phone, '+357 25 000000');
  eq('published: locale-prefixed profile link', pub.href, '/el/directory/restaurant/meze-bar');
  eq('published: localised name', pub.name, 'Μεζέ Μπαρ');
  eq('unsafe url dropped', pub.url, null);
  const ev = eventDetail({ slug: 'fest', title_en: 'Fest', venue: 'Old Port', price: 'Free' }, 'en', '');
  eq('event id', ev.id, 'e:fest');
  eq('event link', ev.href, '/agenda/fest');
  eq('event price', ev.eventPrice, 'Free');
}

// ── Search hygiene (PostgREST or() filter must not be breakable) ─────────────────────
eq('strips filter syntax', cleanSearch('dent,ist).or(name.eq.x'), 'dent ist or name eq x');
eq('keeps Greek', cleanSearch('Οδοντίατρος'), 'Οδοντίατρος');
eq('caps length', cleanSearch('a'.repeat(200)).length, 60);
eq('safeUrl http only', [safeUrl('https://a.b'), safeUrl('ftp://a'), safeUrl(' javascript:x')], ['https://a.b', null, null]);

// ── Experience details: our catalogue wording, link-out booking with partner id ───────────
{
  const d = activityDetail({ external_id: '649749', title: 'Pirate-ship cruise along the Ayia Napa coast with lunch', summary: 'About 4 h, from Ayia Napa.',
    booking_url: 'https://www.getyourguide.com/x-t649749/', landmark: 'Cape Greco', town: 'Ayia Napa', duration_label: '4 h',
    price_basis: 'group', group_max: 6, tags: ['pickup', 'meal'] }, 'de', 'ABC123');
  eq('activity detail id', d.id, 'a:649749');
  eq('our own title', d.name, 'Pirate-ship cruise along the Ayia Napa coast with lunch');
  ok('booking link carries partner id', !!d.book && d.book.includes('partner_id=ABC123') && d.book.includes('cmp=cl-map'));
  eq('no phone, no profile', [d.phone, d.href], [null, null]);
  eq('price basis translated', d.basis, 'pro Gruppe bis 6');
  eq('no third-party photo', d.image, null);
  eq('area', d.address, 'Cape Greco · Ayia Napa');
  eq('our summary + tags', [d.summary, d.tags], ['About 4 h, from Ayia Napa.', ['pickup', 'meal']]);
  ok('approximate flag', d.approx === true);
}

report('map-explorer');
