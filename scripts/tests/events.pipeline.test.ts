// Automated Agenda (increment 7.1): time zone, parsers, normalisation, de-duplication, robots.txt, auto-publish rule and the
// whole pipeline — all with injected I/O and small fixtures of REAL payloads captured on 2026-10-05 (scripts/tests/fixtures/events).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nicosiaOffsetMin, nicosiaWallToUtcMs, nicosiaDayKey, parseEventDate } from '@/lib/events/time';
import { parseFeedItems, parseIcal, parseJsonLdEvents, parseTribe, htmlToText } from '@/lib/events/parse';
import { cyprusPublicHolidays, orthodoxEaster } from '@/lib/events/holidays';
import { cleanTitle, normaliseEvent, normalisePrice, districtOf } from '@/lib/events/normalise';
import { buildIndex, findDuplicate, titleSimilarity } from '@/lib/events/dedupe';
import { robotsAllows } from '@/lib/events/robots';
import { decidePublication } from '@/lib/events/rules';
import { runPipeline, editedByHuman, eventSlug, type EventRow, type Fetched, type PipelineDeps } from '@/lib/events/pipeline';
import { EVENT_SOURCES, EXCLUDED_SOURCES, sourceBySlug } from '@/lib/events/sources';
import { acceptVenuePoint, nearestDistrict, venueGeocodeQuery } from '@/lib/events/geocode';
import { AGENDA_COPY } from '@/lib/events/copy';
import { LOCALES } from '@/lib/locales';
import type { EventSource, ExistingEvent, SourceState, RawEvent } from '@/lib/events/types';
import { eq, ok, report } from './_harness';

const fx = (n: string) => readFileSync(join(process.cwd(), 'scripts/tests/fixtures/events', n), 'utf8');
const NOW = Date.parse('2026-10-05T15:00:00Z');                    // 18:00 in Nicosia (EEST)
const iso = (ms: number) => new Date(ms).toISOString();
const src = (slug: string) => sourceBySlug(slug)!;

// ── time zone ────────────────────────────────────────────────────────────────────────────────────────────
eq('July is UTC+3', nicosiaOffsetMin(Date.parse('2026-07-01T12:00:00Z')), 180);
eq('December is UTC+2', nicosiaOffsetMin(Date.parse('2026-12-01T12:00:00Z')), 120);
eq('DST ends 2026-10-25: before = +3', nicosiaOffsetMin(Date.parse('2026-10-24T22:00:00Z')), 180);
eq('DST ends 2026-10-25: after = +2', nicosiaOffsetMin(Date.parse('2026-10-25T02:00:00Z')), 120);
eq('DST starts 2026-03-29', nicosiaOffsetMin(Date.parse('2026-03-29T02:00:00Z')), 180);
eq('Ohi Day midnight (after DST ended) is 22:00Z the evening before', iso(nicosiaWallToUtcMs(2026, 10, 28)), '2026-10-27T22:00:00.000Z');
eq('summer midnight is 21:00Z the evening before', iso(nicosiaWallToUtcMs(2026, 10, 5)), '2026-10-04T21:00:00.000Z');
eq('winter midnight is 22:00Z', iso(nicosiaWallToUtcMs(2026, 12, 25)), '2026-12-24T22:00:00.000Z');
eq('day key uses the Cyprus calendar', nicosiaDayKey(Date.parse('2026-10-27T22:30:00Z')), '2026-10-28');
eq('EventON one-digit offset', iso(parseEventDate('2026-10-24T14:00+3:00')!.ms), '2026-10-24T11:00:00.000Z');
eq('ISO with colon offset', iso(parseEventDate('2026-10-05T00:00:00+03:00')!.ms), '2026-10-04T21:00:00.000Z');
eq('Z suffix', iso(parseEventDate('2026-10-05T10:00:00Z')!.ms), '2026-10-05T10:00:00.000Z');
eq('naive datetime is Nicosia wall time', iso(parseEventDate('2026-10-10 10:00:00')!.ms), '2026-10-10T07:00:00.000Z');
eq('iCal compact local', iso(parseEventDate('20261009T200000')!.ms), '2026-10-09T17:00:00.000Z');
eq('date only flagged', parseEventDate('2026-10-11')!.dateOnly, true);
eq('impossible date rejected', parseEventDate('2026-02-30'), null);
eq('garbage rejected', parseEventDate('next friday'), null);

// ── parsers on real payloads ─────────────────────────────────────────────────────────────────────────────
const tribe = parseTribe(fx('visitcyprus-tribe.json'));
eq('tribe: 3 events', tribe.length, 3);
const teu = tribe.find((e) => /TEU14/.test(e.title))!;
eq('tribe: HTML entity decoded in title', teu.title, 'TEU14 (Tennis Europe U14) – 5-11.10.2026');
eq('tribe: all-day start is a date', teu.start, '2026-10-05');
eq('tribe: venue city kept', teu.city, 'Limassol');
ok('tribe: original URL kept', /visitcyprus\.com\/event\/teu14/.test(teu.url || ''));
eq('tribe: free cost passes through', tribe.find((e) => /Kyperounta/.test(e.title))!.price, 'free');
eq('tribe: bad json is empty, not a crash', parseTribe('<html>').length, 0);

const ical = parseIcal(fx('visitcyprus.ics'));
eq('ical: 4 events', ical.length, 4);
const aida = ical.find((e) => /Aida/.test(e.title))!;
eq('ical: DTSTART kept as local compact', aida.start, '20261009T200000');
eq('ical: location', aida.venue, 'Curium Ancient Theatre');
ok('ical: escaped commas unescaped', !/\\,/.test(aida.description || ''));
ok('ical: URL kept', /aida-garifullina/.test(aida.url || ''));
ok('ical: image from ATTACH', /^https:\/\/.*\.jpe?g$/.test(aida.image || ''));

const feed = parseFeedItems(fx('limassol-tourism-feed.xml'));
eq('rss: 3 items', feed.length, 3);
ok('rss: links are event pages', feed.every((f) => /limassoltourism\.com\/events\//.test(f.link)));
eq('rss: title entity-decoded', feed[0].title, 'THE PARADOX PUMPKIN WORKSHOPS ARE BACK… WITH A TWIST!');
const ld = parseJsonLdEvents(fx('limassol-tourism-event.html'), 'https://www.limassoltourism.com/events/x/');
eq('json-ld: one Event', ld.length, 1);
eq('json-ld: start', ld[0].start, '2026-10-24T14:00+3:00');
ok('json-ld: description is plain text', !/</.test(ld[0].description || '') && /Paradox/i.test(ld[0].description || ''));
eq('json-ld: no Event in a page without one', parseJsonLdEvents('<html><script type="application/ld+json">{"@type":"Organization"}</script></html>').length, 0);
eq('json-ld: tolerates broken blocks', parseJsonLdEvents('<script type="application/ld+json">{oops</script>').length, 0);
{
  const html = `<script type="application/ld+json">{"@graph":[{"@type":"MusicEvent","name":"Night Jazz","startDate":"2026-11-02T20:30:00+02:00","location":{"@type":"Place","name":"Rialto","address":{"@type":"PostalAddress","addressLocality":"Limassol"},"geo":{"latitude":34.68,"longitude":33.04}},"offers":{"price":"15","priceCurrency":"EUR"}},{"@type":"Event","name":"Webinar","startDate":"2026-11-03","eventAttendanceMode":"https://schema.org/OnlineEventAttendanceMode"}]}</script>`;
  const r = parseJsonLdEvents(html, 'https://x.cy/e');
  eq('json-ld: @graph + subtype, online event dropped', r.length, 1);
  eq('json-ld: geo + price', [r[0].lat, r[0].lng, r[0].price], [34.68, 33.04, '€15']);
}
const hol = cyprusPublicHolidays(2026);
eq('holidays: 15 per year', hol.length, 15);
ok('holidays: Greek title carried', hol.every((h) => /αργία/.test(h.titleEl || '')));
ok('holidays: unique original-page URL per holiday', new Set(hol.map((h) => h.url)).size === 15);
// the computation must equal Nager.Date's open data (captured fixtures) for the days that are public holidays
for (const y of [2026, 2027]) {
  const nager = (JSON.parse(fx(`nager-cy-${y}.json`)) as { date: string; name: string; types: string[] }[]).filter((h) => h.types.includes('Public') && h.name !== 'Pentecost').map((h) => h.date).sort();
  eq(`holidays ${y}: identical to Nager.Date (Easter-based days included)`, cyprusPublicHolidays(y).map((h) => h.start).sort(), nager);
}
eq('Orthodox Easter 2026', orthodoxEaster(2026), [4, 12]);
eq('Orthodox Easter 2027', orthodoxEaster(2027), [5, 2]);
eq('Orthodox Easter 2025', orthodoxEaster(2025), [4, 20]);
eq('Orthodox Easter 2028', orthodoxEaster(2028), [4, 16]);
eq('htmlToText: double-escaped markup', htmlToText('&lt;p&gt;Hello&nbsp;&amp;amp; welcome&lt;/p&gt;'), 'Hello & welcome');

// ── robots.txt (real files) ──────────────────────────────────────────────────────────────────────────────
ok('visitcyprus: REST API allowed', robotsAllows(fx('robots-www.visitcyprus.com.txt'), '/wp-json/tribe/events/v1/events?per_page=50'));
ok('visitcyprus: import-export folder disallowed', !robotsAllows(fx('robots-www.visitcyprus.com.txt'), '/wp-content/uploads/wp-import-export-lite/x.csv'));
ok('eventbrite: /events/rss/ disallowed', !robotsAllows(fx('robots-www.eventbrite.com.txt'), '/events/rss/'));
ok('eventbrite: /directory/ disallowed', !robotsAllows(fx('robots-www.eventbrite.com.txt'), '/directory/cyprus/'));
ok('eventbrite: query wildcard rule (*?calendar*) disallowed', !robotsAllows(fx('robots-www.eventbrite.com.txt'), '/d/cyprus/events/?calendar=1'));
ok('eventbrite: an ordinary page is allowed', robotsAllows(fx('robots-www.eventbrite.com.txt'), '/e/some-event-tickets-123'));
ok('culture.gov.cy: whole site disallowed for everyone but Googlebot', !robotsAllows(fx('robots-www.culture.gov.cy.txt'), '/en/events'));
ok('allevents: event page allowed', robotsAllows(fx('robots-allevents.in.txt'), '/larnaca/some-event/123'));
ok('missing robots.txt = allowed', robotsAllows(null, '/anything'));
ok('longest rule wins, Allow wins ties', robotsAllows('User-agent: *\nDisallow: /a/\nAllow: /a/public/', '/a/public/x') && !robotsAllows('User-agent: *\nDisallow: /a/\nAllow: /a/public/', '/a/private'));
ok('our own group beats *', !robotsAllows('User-agent: CyprusLifestyleBot\nDisallow: /\n\nUser-agent: *\nAllow: /', '/x'));

// ── normalisation ────────────────────────────────────────────────────────────────────────────────────────
eq('cleanTitle strips the date suffix', cleanTitle('22nd Kyperounta Apple Festival &#8211; 10-11.10.2026'), '22nd Kyperounta Apple Festival');
eq('cleanTitle strips a colon-separated date suffix', cleanTitle('Open Sports Festival 2026 – Chess Tournament: 17.10.2026'), 'Open Sports Festival 2026 – Chess Tournament');
eq('cleanTitle strips a long date suffix', cleanTitle('Limassol Carnival - 12-22.2.2026'), 'Limassol Carnival');
eq('cleanTitle keeps a real number', cleanTitle('Mozart Requiem 2026 Gala'), 'Mozart Requiem 2026 Gala');
eq('price: 0 is Free', normalisePrice('0'), 'Free');
eq('price: bare number is euro', normalisePrice('12.5'), '€12.5');
eq('price: text is kept', normalisePrice('€15–€40'), '€15–€40');
eq('district: Limassol town', districtOf(['Limassol']).district, 'limassol');
eq('place taken from a pin line in the description', (normaliseEvent({ uid: 'z', title: 'Pumpkin Workshop', start: '2026-10-24T14:00+3:00', description: 'Fun for all.\n📍 Paradox Museum Limassol\nBook now' }, src('limassol-tourism'), NOW) as { event: { venue: string } }).event.venue, 'Paradox Museum Limassol');
eq('district: Greek spelling in venue', districtOf([null, 'Πάφος, Κάτω Πάφος']).district, 'paphos');

const vc = src('visitcyprus');
const n1 = normaliseEvent(teu, vc, NOW);
ok('normalise: TEU14 accepted', n1.ok);
if (n1.ok) {
  const e = n1.event;
  eq('all-day start = Cyprus midnight', e.startsAt, '2026-10-04T21:00:00.000Z');
  eq('all-day end = end of the last Cyprus day', e.endsAt, '2026-10-11T20:59:59.000Z');
  eq('title cleaned', e.title, 'TEU14 (Tennis Europe U14)');
  eq('facts-only source: no description copied', e.summary, null);
  eq('no image from a source that does not allow it', e.image, null);
  eq('district from city', e.district, 'limassol');
  eq('town-level pin from the locality table', e.coordsPrecision, 'town');
  eq('confirmed date', e.dateConfidence, 'confirmed');
  eq('ingest key prefixed with the source', e.ingestKey.startsWith('visitcyprus:'), true);
}
const lim = normaliseEvent(ld[0], src('limassol-tourism'), NOW);
ok('normalise: Limassol Tourism event accepted', lim.ok);
if (lim.ok) {
  eq('+3:00 offset honoured', lim.event.startsAt, '2026-10-24T11:00:00.000Z');
  ok('short excerpt kept for a source that allows it', (lim.event.summary || '').length > 20 && (lim.event.summary || '').length <= 330);
  eq('no hot-linked image', lim.event.image, null);
}
const umbrella = ical.find((e) => /Larnaka Spring/.test(e.title))!;
eq('a 9-month umbrella listing is not an event', (normaliseEvent(umbrella, vc, NOW) as { reason?: string }).reason, 'too-long');
eq('past event skipped', (normaliseEvent({ uid: 'p', title: 'Old Concert', start: '2026-09-20T20:00:00+03:00', venue: 'Rialto', city: 'Limassol' }, vc, NOW) as { reason?: string }).reason, 'past');
const base: RawEvent = { uid: 'u', title: 'Test Concert', start: '2026-11-10T20:00:00+02:00', venue: 'Pattihio Theatre', city: 'Limassol' };
eq('cancelled skipped', (normaliseEvent({ ...base, cancelled: true }, vc, NOW) as { reason?: string }).reason, 'cancelled');
eq('occupied north skipped', (normaliseEvent({ ...base, venue: 'Bellapais Abbey', city: 'Kyrenia' }, vc, NOW) as { reason?: string }).reason, 'north');
eq('spam title skipped', (normaliseEvent({ ...base, title: 'WIN BIG www.casino.example' }, vc, NOW) as { reason?: string }).reason, 'spam');
eq('too far ahead skipped', (normaliseEvent({ ...base, start: '2029-01-01T20:00:00+02:00' }, vc, NOW) as { reason?: string }).reason, 'too-far');
eq('bad date skipped', (normaliseEvent({ ...base, start: 'soon' }, vc, NOW) as { reason?: string }).reason, 'bad-date');
eq('ongoing multi-week festival is kept', normaliseEvent({ ...base, start: '2026-09-12T10:00:00+03:00', end: '2026-11-01T22:00:00+02:00' }, vc, NOW).ok, true);
eq('absurd span skipped', (normaliseEvent({ ...base, start: '2026-10-06', end: '2028-12-31' }, vc, NOW) as { reason?: string }).reason, 'too-long');
{
  const a = normaliseEvent({ ...base, title: 'Wine Festival (date TBC)' }, vc, NOW);
  eq('"TBC" in the title makes the date approximate', a.ok && a.event.dateConfidence, 'approximate');
  const b = normaliseEvent({ ...base, lat: 34.7, lng: 33.0 }, vc, NOW);
  eq('source coordinates inside Cyprus are exact', b.ok && b.event.coordsPrecision, 'exact');
  const c = normaliseEvent({ ...base, lat: 48.8, lng: 2.3 }, vc, NOW);
  eq('coordinates outside Cyprus are ignored (town pin instead)', c.ok && c.event.coordsPrecision, 'town');
}
const holEv = normaliseEvent(hol.find((h) => h.start === '2026-10-28')!, src('cy-public-holidays'), NOW);
ok('Ohi Day accepted', holEv.ok);
if (holEv.ok) { eq('holiday tagged', holEv.event.tags.includes('public-holiday'), true); eq('holiday recurs yearly', holEv.event.recurrence, 'annual'); eq('Greek title kept', /αργία/.test(holEv.event.titleEl || ''), true); eq('holiday has no district', holEv.event.district, null); }
eq('holidays already over are skipped', (normaliseEvent(hol.find((h) => h.start === '2026-10-01')!, src('cy-public-holidays'), NOW) as { reason?: string }).reason, 'past');

// ── de-duplication ───────────────────────────────────────────────────────────────────────────────────────
const ex = (o: Partial<ExistingEvent> & { id: string; title_en: string; starts_at: string }): ExistingEvent => ({ slug: o.id, ends_at: null, venue: null, district: null, source: 's', source_url: null, ingest_key: null, status: 'published', image: null, price: null, lat: null, updated_at: null, last_seen_at: null, ...o });
{
  const ix = buildIndex([
    ex({ id: 'a', title_en: 'Aida Garifullina | Cyprus Symphony Orchestra', starts_at: '2026-10-09T17:00:00Z', venue: 'Curium Ancient Theatre', district: 'limassol', source_url: 'https://www.visitcyprus.com/event/aida/' }),
    ex({ id: 'b', title_en: 'Wine Festival', starts_at: '2026-09-26T12:00:00Z', ends_at: '2026-09-28T20:00:00Z', venue: 'Limassol Municipal Gardens', district: 'limassol' }),
  ]);
  const cand = (o: Partial<Parameters<typeof findDuplicate>[0]>) => ({ ingestKey: 'x:1', url: null, title: 't', startsAt: '2026-10-09T17:00:00Z', endsAt: null, venue: null, district: null, ...o });
  eq('same title+day in another source', findDuplicate(cand({ title: 'Aida Garifullina with the Cyprus Symphony Orchestra' }), ix)?.id, 'a');
  eq('title + date suffix variant', findDuplicate(cand({ title: 'Aida Garifullina | Cyprus Symphony Orchestra – 9-10.10.2026' }), ix)?.id, 'a');
  eq('a late start that falls on the next UTC day is still the same event (within 4 h)', findDuplicate(cand({ title: 'Aida Garifullina Cyprus Symphony Orchestra', startsAt: '2026-10-09T20:30:00Z' }), ix)?.id, 'a');
  eq('the next day is a different date of a series, not a duplicate', findDuplicate(cand({ title: 'Aida Garifullina | Cyprus Symphony Orchestra', startsAt: '2026-10-10T17:00:00Z' }), ix), null);
  eq('same url wins whatever the title', findDuplicate(cand({ title: 'Totally different', url: 'https://visitcyprus.com/event/aida', startsAt: '2027-01-01T00:00:00Z' }), ix)?.reason, 'same-url');
  eq('same title a week later is a different event', findDuplicate(cand({ title: 'Aida Garifullina | Cyprus Symphony Orchestra', startsAt: '2026-10-16T17:00:00Z' }), ix), null);
  eq('different event same day', findDuplicate(cand({ title: 'Kyperounta Apple Festival' }), ix), null);
  eq('similar title + same venue + overlapping range', findDuplicate(cand({ title: 'Limassol Wine Festival 2026', startsAt: '2026-09-27T10:00:00Z', venue: 'Municipal Gardens, Limassol' }), ix)?.id, 'b');
  eq('same key is reported first', findDuplicate(cand({ ingestKey: 'k:1', title: 'zzz' }), buildIndex([ex({ id: 'c', title_en: 'Other', starts_at: '2027-02-02T10:00:00Z', ingest_key: 'k:1' })]))?.reason, 'same-key');
}
ok('similarity is high for the same title with a stop word', titleSimilarity('The Limassol Carnival', 'Limassol Carnival') >= 0.9);
ok('similarity is low for different events', titleSimilarity('Wine Festival', 'Marathon') < 0.4);

// ── auto-publish rule ────────────────────────────────────────────────────────────────────────────────────
{
  const mk = (o = {}, hint = true) => { const r = normaliseEvent({ ...base, ...o }, hint ? src('limassol-tourism') : { ...src('limassol-tourism'), districtHint: undefined }, NOW); if (!r.ok) throw new Error('fixture'); return r.event; };
  eq('official + confirmed + place → published', decidePublication(mk(), src('limassol-tourism'), NOW).status, 'published');
  eq('approximate date → draft', decidePublication(mk({ title: 'Fair (date TBC)' }), src('limassol-tourism'), NOW).status, 'draft');
  eq('no place and no district hint → draft', decidePublication(mk({ venue: null, city: null }, false), src('limassol-tourism'), NOW).status, 'draft');
  eq('single-town source: the town is assumed → published', decidePublication(mk({ venue: null, city: null }), src('limassol-tourism'), NOW).status, 'published');
  eq('admin set the source to draft-only', decidePublication(mk(), src('limassol-tourism'), NOW, 'draft').status, 'draft');
  const media: EventSource = { ...src('limassol-tourism'), kind: 'media' };
  eq('media sources never auto-publish', decidePublication(mk(), media, NOW).status, 'draft');
  const manual: EventSource = { ...src('limassol-tourism'), autoPublish: false };
  eq('autoPublish=false → draft', decidePublication(mk(), manual, NOW).status, 'draft');
  eq('…unless the admin forces auto', decidePublication(mk(), manual, NOW, 'auto').status, 'published');
  if (holEv.ok) eq('public holiday without district still publishes', decidePublication(holEv.event, src('cy-public-holidays'), NOW).status, 'published');
}

// ── registry sanity ──────────────────────────────────────────────────────────────────────────────────────
ok('every source documents robots + terms + check date', EVENT_SOURCES.every((s) => s.robots.length > 20 && s.terms.length > 20 && /^2026-/.test(s.checkedOn)));
ok('unique slugs', new Set(EVENT_SOURCES.map((s) => s.slug)).size === EVENT_SOURCES.length);
ok('only https feeds (or built-in, no network)', EVENT_SOURCES.every((s) => s.feedUrl.startsWith('https://') || s.feedUrl.startsWith('builtin:')));
ok('no source needs a key or costs money (no {key}/apikey in URLs)', EVENT_SOURCES.every((s) => !/key=|apikey|token=/i.test(s.feedUrl)));
ok('Visit Cyprus is off until written consent (its terms forbid copying without it)', sourceBySlug('visitcyprus')!.enabled === false && sourceBySlug('visitcyprus')!.factsOnly);
ok('Eventbrite and the scraping-forbidden aggregator are recorded as excluded', ['Eventbrite', 'CyprusNow.app (aggregator)'].every((n) => EXCLUDED_SOURCES.some((x) => x.name === n && x.verdict === 'excluded')));
ok('at least one source is on by default', EVENT_SOURCES.some((s) => s.enabled));

// ── the whole pipeline with fake I/O ─────────────────────────────────────────────────────────────────────
function world(over: { routes?: Record<string, Fetched | ((url: string) => Fetched)>; states?: Record<string, Partial<SourceState> & { publish_mode?: 'auto' | 'draft' | null }>; existing?: ExistingEvent[] } = {}) {
  let clock = NOW;
  const fetched: string[] = [];
  const rows: (EventRow & { id: string })[] = [];
  const saved: Record<string, Partial<SourceState>> = {};
  const runs: unknown[] = [];
  const day = (n: number) => new Date(Date.UTC(2026, 9, 24 + n)).toISOString().slice(0, 10);          // workshops on three different weekends
  const page = (u: string, idx: number) => fx('limassol-tourism-event.html').replace(/https:\/\/www\.limassoltourism\.com\/events\/[^"]+/g, u).replace(/2026-10-24T14:00\+3:00/, `${day(idx * 7)}T14:00+3:00`).replace(/2026-10-25T18:00\+3:00/, `${day(idx * 7 + 1)}T18:00+3:00`);
  const routes: Record<string, Fetched | ((url: string) => Fetched)> = {
    'https://www.limassoltourism.com/robots.txt': { ok: true, status: 200, text: 'User-agent: *\nDisallow: /wp-admin/\n' },
    'https://www.limassoltourism.com/events/feed/': { ok: true, status: 200, text: fx('limassol-tourism-feed.xml') },
    'https://www.visitcyprus.com/robots.txt': { ok: true, status: 200, text: fx('robots-www.visitcyprus.com.txt') },
    'https://www.visitcyprus.com/wp-json/tribe/events/v1/events?per_page=50&start_date=2026-10-05': { ok: true, status: 200, text: fx('visitcyprus-tribe.json'), etag: '"abc"' },
    ...over.routes,
  };
  const deps: PipelineDeps = {
    now: () => clock,
    sleep: async (ms) => { clock += ms; },
    fetch: async (url) => {
      fetched.push(url);
      clock += 120;                                                      // every request costs 120 ms of fake time
      const r = routes[url];
      if (r) return typeof r === 'function' ? r(url) : r;
      if (/limassoltourism\.com\/events\/the-paradox/.test(url)) { const idx = Number(/twist-?(\d)?\/$/.exec(url)?.[1] ?? 0) % 10; return { ok: true, status: 200, text: page(url, idx) }; }
      return { ok: false, status: 404, text: '' };
    },
    loadExisting: async () => [...(over.existing || []), ...rows.map((r) => ({ id: r.id, slug: r.slug, title_en: r.title_en, starts_at: r.starts_at, ends_at: r.ends_at, venue: r.venue, district: r.district, source: r.source, source_url: r.source_url, ingest_key: r.ingest_key, status: r.status, image: r.image, price: r.price, lat: r.lat, updated_at: null, last_seen_at: r.last_seen_at }))],
    loadStates: async () => Object.fromEntries([...new Set([...Object.keys(over.states || {}), ...Object.keys(saved)])].map((k) => [k, { slug: k, enabled: null, last_run_at: null, last_success_at: null, last_status: null, last_found: 0, last_added: 0, last_duplicates: 0, last_errors: 0, last_error: null, consecutive_failures: 0, etag: null, cursor: null, ...saved[k], ...(over.states || {})[k] }])) as never,
    saveState: async (slug, patch) => { saved[slug] = { ...saved[slug], ...patch }; },
    insertEvent: async (row) => {
      if (rows.some((r) => r.ingest_key === row.ingest_key || r.source_url === row.source_url || r.slug === row.slug)) return 'conflict';
      const id = `id${rows.length + 1}`; rows.push({ ...row, id }); return { id, slug: row.slug };
    },
    updateEvent: async (id, patch) => { const r = rows.find((x) => x.id === id); if (r) Object.assign(r, patch); },
    recordRun: async (s) => { runs.push(s); },
  };
  return { deps, rows, saved, fetched, runs, advance: (ms: number) => { clock += ms; }, setNow: (ms: number) => { clock = ms; } };
}

(async () => {
  // 1) first run: Limassol Tourism (3 event pages) + holidays; Visit Cyprus is off.
  const w = world();
  const s1 = await runPipeline(w.deps, { politeDelayMs: 0 });
  const bySrc = Object.fromEntries(s1.sources.map((r) => [r.slug, r]));
  eq('only enabled sources ran', s1.sources.map((r) => r.slug).sort(), ['cy-public-holidays', 'limassol-tourism']);
  eq('limassol: 3 event pages fetched and added', [bySrc['limassol-tourism'].found, bySrc['limassol-tourism'].added], [3, 3]);
  ok('limassol events are published (official, confirmed date, place)', w.rows.filter((r) => r.source === 'limassol-tourism').every((r) => r.status === 'published' && r.auto_published));
  ok('holidays: only the ones still to come were added (Ohi Day, Christmas, all of 2027)', bySrc['cy-public-holidays'].added === 4 + 15 && w.rows.some((r) => r.source === 'cy-public-holidays' && r.title_en.startsWith('Ohi Day')));
  ok('holidays carry tags + a unique source link', w.rows.filter((r) => r.source === 'cy-public-holidays').every((r) => r.tags.includes('public-holiday') && r.source_url.startsWith('https://cypruslifestyle.eu/en/agenda#public-holiday-')));
  ok('holidays need no network at all', !w.fetched.some((u) => /nager|holiday/i.test(u)));
  ok('every stored event has source, attribution, original link, ingest key', w.rows.every((r) => r.source && r.source_name && r.source_url && r.ingest_key.startsWith(`${r.source}:`)));
  ok('English fallback: title_en always set, other editions left empty', w.rows.every((r) => r.title_en && r.source_lang === 'en'));
  ok('holiday Greek title stored in title_el', w.rows.some((r) => r.source === 'cy-public-holidays' && /αργία/.test(r.title_el || '')));
  ok('slugs are url-safe and unique', new Set(w.rows.map((r) => r.slug)).size === w.rows.length && w.rows.every((r) => /^[a-z0-9-]+$/.test(r.slug)));
  ok('robots.txt was read before the first request to each host', w.fetched.indexOf('https://www.limassoltourism.com/robots.txt') < w.fetched.indexOf('https://www.limassoltourism.com/events/feed/'));
  eq('robots.txt fetched once per host per run (computed holidays touch no host)', w.fetched.filter((u) => u.endsWith('/robots.txt')).length, 1);
  eq('state saved per source', ['limassol-tourism', 'cy-public-holidays'].every((k) => w.saved[k]?.last_status === 'ok' && w.saved[k]?.last_success_at), true);
  eq('run recorded', w.runs.length, 1);

  // 2) idempotent: a second run (forced) adds nothing; everything is "seen again".
  const before = w.rows.length;
  w.advance(3 * 3_600_000);
  const s2 = await runPipeline(w.deps, { politeDelayMs: 0, force: true });
  eq('second run adds nothing', [s2.added, w.rows.length], [0, before]);
  ok('second run refetches no event pages (already stored)', w.fetched.filter((u) => /twist/.test(u)).length === 3);
  eq('minimum interval respected without force', (await runPipeline(w.deps, { politeDelayMs: 0 })).sources.length, 0);

  // 3) cross-source duplicates: the iCal copy of the same Visit Cyprus events adds no second row
  const icalSrc: EventSource = { ...src('visitcyprus'), slug: 'visitcyprus-ical', format: 'ical', feedUrl: 'https://www.visitcyprus.com/events/?ical=1', enabled: true };
  const w2 = world({ routes: { 'https://www.visitcyprus.com/events/?ical=1': { ok: true, status: 200, text: fx('visitcyprus.ics') } } });
  const sA = await runPipeline(w2.deps, { politeDelayMs: 0, sources: [{ ...src('visitcyprus'), enabled: true }] });
  eq('visitcyprus tribe: 3 events, 3 added (facts only)', [sA.found, sA.added], [3, 3]);
  ok('facts only: no summary text or image stored', w2.rows.every((r) => r.summary_en === null && r.image === null));
  const sB = await runPipeline(w2.deps, { politeDelayMs: 0, sources: [icalSrc] });
  eq('ical copy: 4 listed, Aida + Kyperounta recognised as duplicates, the umbrella listing skipped, only IDO is new', [sB.found, sB.duplicates, sB.added, sB.sources[0].skipped], [4, 2, 1, 1]);
  eq('4 rows (3 + IDO)', w2.rows.length, 4);
  eq('ETag stored for conditional requests', w2.saved['visitcyprus']?.etag, '"abc"');

  // 4) 304 Not Modified
  const w3 = world({ routes: { 'https://www.visitcyprus.com/wp-json/tribe/events/v1/events?per_page=50&start_date=2026-10-05': { ok: true, status: 304, text: '', notModified: true } }, states: { visitcyprus: { etag: '"abc"' } } });
  const s3 = await runPipeline(w3.deps, { politeDelayMs: 0, sources: [{ ...src('visitcyprus'), enabled: true }] });
  eq('304 counts as a successful, empty run', [s3.sources[0].status, w3.saved['visitcyprus']?.consecutive_failures], ['not-modified', 0]);

  // 5) robots.txt forbids → nothing fetched beyond robots, reported as blocked
  const w4 = world({ routes: { 'https://www.limassoltourism.com/robots.txt': { ok: true, status: 200, text: 'User-agent: *\nDisallow: /events/\n' } } });
  const s4 = await runPipeline(w4.deps, { politeDelayMs: 0, only: 'limassol-tourism' });
  eq('robots-blocked source is reported, not fetched', [s4.sources[0].status, w4.fetched.includes('https://www.limassoltourism.com/events/feed/'), w4.rows.length], ['blocked', false, 0]);
  ok('…and recorded as a failure for System health', (w4.saved['limassol-tourism']?.consecutive_failures ?? 0) === 1);

  // 6) one failing source does not stop the others
  const w5 = world({ routes: { 'https://www.limassoltourism.com/events/feed/': { ok: false, status: 503, text: '' } } });
  const s5 = await runPipeline(w5.deps, { politeDelayMs: 0 });
  const b5 = Object.fromEntries(s5.sources.map((r) => [r.slug, r]));
  eq('failing source flagged, holidays still added', [b5['limassol-tourism'].status, b5['cy-public-holidays'].added > 0], ['error', true]);
  ok('error text is readable', /HTTP 503/.test(b5['limassol-tourism'].error || ''));
  eq('consecutive failure counted, last_success untouched', [w5.saved['limassol-tourism']?.consecutive_failures, w5.saved['limassol-tourism']?.last_success_at ?? null], [1, null]);

  // 7) resumable: only 1 event page per run → the feed is worked off over several runs
  const slow: EventSource = { ...src('limassol-tourism'), maxDetailPerRun: 1 };
  const w6 = world();
  const got: number[] = [];
  for (let i = 0; i < 4; i++) { const r = await runPipeline(w6.deps, { politeDelayMs: 0, force: true, sources: [slow] }); got.push(r.added); }
  eq('one new page per run until the feed is exhausted', got, [1, 1, 1, 0]);

  // 8) time box: a tiny deadline stops before starting a request it cannot finish
  const w7 = world();
  const s7 = await runPipeline(w7.deps, { politeDelayMs: 0, deadlineMs: 6_000 });
  eq('deadline too short for any request: stopped early, nothing half-written', [s7.stoppedEarly, w7.rows.length], [true, 0]);
  const w8 = world();
  const s8 = await runPipeline(w8.deps, { politeDelayMs: 600, deadlineMs: 9_000 });
  ok('time box ends the run inside the budget (no request started in the last 7 s)', s8.ms <= 9_000);

  // 9) dry run writes nothing but reports what would happen
  const w9 = world();
  const s9 = await runPipeline(w9.deps, { politeDelayMs: 0, dryRun: true, only: 'cy-public-holidays' });
  eq('dry run: reports additions, stores none, saves no state, records no run', [s9.added > 0, w9.rows.length, Object.keys(w9.saved).length, w9.runs.length], [true, 0, 0, 0]);

  // 10) a human edit is never overwritten by a refresh
  const edited = ex({ id: 'e1', title_en: 'Ohi Day (public holiday in Cyprus)', starts_at: '2026-10-27T21:00:00Z', source: 'cy-public-holidays', ingest_key: 'cy-public-holidays:2026-10-28|Ohi Day', price: 'Free', updated_at: '2026-10-06T09:00:00Z', last_seen_at: '2026-10-05T10:00:00Z' });
  ok('editedByHuman: updated long after the pipeline touched it', editedByHuman(edited));
  ok('editedByHuman: untouched since the pipeline wrote it', !editedByHuman({ updated_at: '2026-10-05T10:00:20Z', last_seen_at: '2026-10-05T10:00:00Z' }));
  const w10 = world({ existing: [{ ...edited, title_en: 'Ohi Day — national holiday (edited by the editor)', ends_at: null }] });
  await runPipeline(w10.deps, { politeDelayMs: 0, only: 'cy-public-holidays' });
  const patchedRow = w10.rows.find((r) => r.ingest_key === edited.ingest_key);
  eq('edited row not re-inserted', patchedRow, undefined);

  // 11) admin "draft only" override
  const w11 = world({ states: { 'limassol-tourism': { publish_mode: 'draft' } } });
  await runPipeline(w11.deps, { politeDelayMs: 0, only: 'limassol-tourism' });
  ok('draft-only override files everything as a draft', w11.rows.length === 3 && w11.rows.every((r) => r.status === 'draft' && !r.auto_published));

  // 12) admin switched a default-on source OFF
  const w12 = await runPipeline(world({ states: { 'cy-public-holidays': { enabled: false }, 'limassol-tourism': { enabled: false } } }).deps, { politeDelayMs: 0 });
  eq('nothing runs when every source is switched off', w12.sources.length, 0);

  // helpers
  ok('event slug is stable for the same event', eventSlug({ ...(holEv.ok ? holEv.event : ({} as never)) }) === eventSlug({ ...(holEv.ok ? holEv.event : ({} as never)) }));
  eq('venue geocode query includes district + country', venueGeocodeQuery({ venue: 'Curium Ancient Theatre', district: 'limassol' }), 'Curium Ancient Theatre, Limassol, Cyprus');
  eq('too-short venue is not geocoded', venueGeocodeQuery({ venue: 'A', district: 'limassol' }), '');
  eq('district from the nearest known locality', nearestDistrict(34.664, 32.885)?.district, 'limassol');
eq('no district for a point far from every known locality', nearestDistrict(35.9, 31.0), null);
ok('venue pin near the town accepted', acceptVenuePoint({ lat: 34.68, lng: 33.04 }, { lat: 34.66, lng: 32.89 }));
  ok('venue pin 100 km away rejected', !acceptVenuePoint({ lat: 34.68, lng: 33.04 }, { lat: 35.17, lng: 33.36 }));
  ok('any pin accepted when no town pin exists', acceptVenuePoint({ lat: null, lng: null }, { lat: 35.17, lng: 33.36 }));
  ok('every edition has every Agenda word', LOCALES.every((l) => Object.values(AGENDA_COPY[l]).every((v) => typeof v === 'string' && v.length > 0)) && Object.keys(AGENDA_COPY).length === 7);

  report('events.pipeline');
})().catch((e) => { console.error(e); process.exit(1); });
