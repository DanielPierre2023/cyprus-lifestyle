// Map explorer (lib/map/explorer-*.ts) — the pure data contract behind /map:
// every backend category is present and translated, the compact index encodes and
// decodes losslessly, ranking honours the paid tier, events without coordinates are
// still placed (venue → town → district, flagged approximate), and the popup gets
// everything we hold for a business (photos, phone, email, website, socials, hours).
import { CANONICAL_CATEGORIES } from '@/lib/directory/taxonomy';
import {
  explorerCategories, explorerGroups, canonicalOf, groupLabel, GROUP_ORDER, EVENT_CAT, CATEGORY_GROUP, ACTIVITY_PREFIX,
} from '@/lib/map/explorer-taxonomy';
import { ACTIVITY_KINDS } from '@/lib/activities/classify';
import {
  buildIndex, decodeIndex, rankScore, listingDetail, eventDetail, activityDetail, safeUrl, cleanSearch, cyprusPoint, F,
  placeEvent, venueLookup, photoList, cleanPhone, cleanEmail, ownRatings, DISTRICT_CENTRE,
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

// ── Details: everything we hold for a business, safely ───────────────────────────────
{
  const listed = listingDetail({ slug: 'acme-ac', type: 'vendor', status: 'listed', name_en: 'Acme AC', phone: '+357 99 000000', email: 'Info@Acme.cy ', url: 'https://acme.cy', summary_en: 'Air-con repairs.',
    gallery: ['https://acme.cy/a.jpg', { url: 'https://acme.cy/b.jpg' }, 'javascript:x'], socials: { instagram: 'https://instagram.com/acme', twitter: 'https://x.com/acme', bad: 'https://x.y' },
    hours: { mon: '09:00–18:00', sun: '', xyz: '1' }, amenities: ['Parking', ' ', 'Card payments'] }, 'en', '');
  eq('listed: phone shown', listed.phone, '+357 99 000000');
  eq('listed: email shown, normalised', listed.email, 'info@acme.cy');
  eq('listed: no profile link (no page exists)', listed.href, null);
  eq('listed: claim link', listed.claimHref, '/partner?listing=acme-ac');
  eq('listed: website kept', listed.url, 'https://acme.cy');
  eq('listed: summary shown', listed.summary, 'Air-con repairs.');
  eq('photos from gallery (strings + objects, http only)', listed.photos, ['https://acme.cy/a.jpg', 'https://acme.cy/b.jpg']);
  eq('first photo is the card image', listed.image, 'https://acme.cy/a.jpg');
  eq('socials allow-listed, twitter → x', listed.socials, { instagram: 'https://instagram.com/acme', x: 'https://x.com/acme' });
  eq('hours: known days only', listed.hours, { mon: '09:00–18:00' });
  eq('amenities trimmed', listed.amenities, ['Parking', 'Card payments']);
  const pub = listingDetail({ slug: 'meze-bar', type: 'restaurant', status: 'published', name_en: 'Meze Bar', name_el: 'Μεζέ Μπαρ', phone: '+357 25 000000', url: 'javascript:alert(1)', provenance: 'owner-verified', image: 'https://cdn/x.jpg' }, 'el', '/el');
  eq('published: phone kept', pub.phone, '+357 25 000000');
  eq('published: locale-prefixed profile link', pub.href, '/el/directory/restaurant/meze-bar');
  eq('published: localised name', pub.name, 'Μεζέ Μπαρ');
  eq('unsafe url dropped', pub.url, null);
  eq('owner-verified: no claim link', [pub.claimed, pub.claimHref], [true, null]);
  eq('no email on file → null', pub.email, null);
  const ev = eventDetail({ slug: 'fest', title_en: 'Fest', venue: 'Old Port', price: 'Free', starts_at: '2026-10-10T19:00:00Z' }, 'en', '');
  eq('event id', ev.id, 'e:fest');
  eq('event link', ev.href, '/agenda/fest');
  eq('event price', ev.eventPrice, 'Free');
  ok('event without coordinates is approximate', ev.approx === true);
  eq('event start', ev.startDate, '2026-10-10T19:00:00Z');
  eq('phone cleaning', [cleanPhone('+357 25 123456; +357 99 1'), cleanPhone('call us'), cleanPhone('12'), cleanPhone('(25) 123-456')], ['+357 25 123456', null, null, '(25) 123-456']);
  eq('email cleaning', [cleanEmail('mailto:A@B.cy'), cleanEmail('a@b'), cleanEmail('x@y.com, z@w.com')], ['a@b.cy', null, 'x@y.com']);
  eq('photoList parses JSON text + dedupes', photoList('https://a/1.jpg', '["https://a/1.jpg","https://a/2.jpg"]'), ['https://a/1.jpg', 'https://a/2.jpg']);
  const own = ownRatings([{ listing_slug: 'a', rating: 5 }, { listing_slug: 'a', rating: 4 }, { listing_slug: 'a', rating: 9 }, { listing_slug: 'b', rating: 3 }]);
  eq('own ratings: raw mean + count, invalid ignored', [own.get('a'), own.get('b')], [{ avg: 4.5, count: 2 }, { avg: 3, count: 1 }]);
}

// ── Events: running events stay, events without coordinates are still placed ─────────
{
  const venues = venueLookup([
    { name_en: 'Pattihio Theatre', lat: 34.6772, lng: 33.0433 },
    { name_en: 'The Old Port', lat: 34.6721, lng: 33.0436 },
    { name_en: 'Old Port', lat: 34.9, lng: 33.6 },             // same name far away → ambiguous
    { name_en: 'Bar', lat: 34.9, lng: 33.6 },                  // too short to match on
  ]);
  const at = placeEvent({ slug: 'a', district: 'limassol', lat: null, lng: null, starts_at: 'x', image: null, venue: 'Pattihio Theatre, Limassol' }, venues)!;
  eq('venue match (first segment) → exact point', [at.lat, at.lng, at.approx], [34.6772, 33.0433, false]);
  const amb = placeEvent({ slug: 'b', district: 'limassol', lat: null, lng: null, starts_at: 'x', image: null, venue: 'Old Port, Limassol' }, venues)!;
  ok('ambiguous venue → town (approximate)', amb.approx && Math.abs(amb.lat - 34.68) < 0.01);
  const town = placeEvent({ slug: 'c', district: 'paphos', lat: null, lng: null, starts_at: 'x', image: null, venue: null, title_en: 'Wine festival in Kathikas' })!;
  eq('town from the title', [town.lat, town.approx], [34.9175, true]);
  const wrongDistrict = placeEvent({ slug: 'd', district: 'larnaca', lat: null, lng: null, starts_at: 'x', image: null, venue: 'Limassol Marina' })!;
  eq('a town in another district is not trusted → district centre', [wrongDistrict.lat, wrongDistrict.lng], [DISTRICT_CENTRE.larnaca.lat, DISTRICT_CENTRE.larnaca.lng]);
  eq('no district, no place → not on the map', placeEvent({ slug: 'e', district: null, lat: null, lng: null, starts_at: 'x', image: null }), null);
  const own = placeEvent({ slug: 'f', district: 'paphos', lat: 34.77, lng: 32.42, starts_at: 'x', image: null, coords_precision: 'town' })!;
  ok('own coords at town precision are approximate', own.approx);
  const ix = buildIndex([], [
    { slug: 'running', district: 'nicosia', lat: null, lng: null, starts_at: '2026-09-01T09:00:00Z', ends_at: '2026-11-30T18:00:00Z', image: null, venue: 'Nicosia Municipal Arts Centre' },
    { slug: 'pinned', district: 'paphos', lat: 34.77, lng: 32.42, starts_at: '2026-10-10T19:00:00Z', ends_at: null, image: null },
  ], '2026-10-04T00:00:00Z', [], venues);
  const pts = decodeIndex(ix);
  const run = pts.find((p) => p.id === 'e:running')!;
  ok('event without coordinates is on the map, approximate', !!run && (run.flags & F.APPROX) !== 0);
  eq('end date round-trips', run.end, '2026-11-30T18:00:00.000Z');
  const pin = pts.find((p) => p.id === 'e:pinned')!;
  ok('exact event not approximate', (pin.flags & F.APPROX) === 0 && pin.end === null);
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
