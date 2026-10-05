// Increment 2.1 — orchestration with injected (fake) I/O: which legs run, what degrades, what is filtered.
import { retrieveSources, publishedSet, type SourceDeps } from '@/lib/concierge/sourcesRetrieve';
import { eq, ok, report } from './_harness';

const NOW = new Date('2026-10-07T09:00:00Z'); // Wed 12:00 Cyprus
const VEC = [0.1, 0.2];
type Row = Record<string, unknown>;

function fakeDeps(over: Partial<SourceDeps> = {}, calls: string[] = []): SourceDeps {
  const track = <T>(n: string, v: T) => { calls.push(n); return Promise.resolve(v); };
  return {
    now: () => NOW,
    vectorMatch: () => track('vectorMatch', [
      { source: 'article' as const, ref: 'troodos-guide', similarity: 0.62 },
      { source: 'article' as const, ref: 'weak-article', similarity: 0.1 },
      { source: 'activity' as const, ref: '777', similarity: 0.55 },
      { source: 'event' as const, ref: 'jazz', similarity: 0.5 },
    ]),
    kbDocMatch: () => track('kbDocMatch', [{ id: 'kb1', similarity: 0.6 }]),
    kbDocsByIds: () => track<Row[]>('kbDocsByIds', [{ id: 'kb1', source: 'mycypruslife', url: 'https://m.example/a', lang: 'en', title: 'Troodos villages', description: 'A guide' }]),
    articlesBySlugs: () => track<Row[]>('articlesBySlugs', [
      { slug: 'troodos-guide', title_en: 'Troodos villages', title_de: 'Troodos-Dörfer', excerpt_en: 'Walk and wine', published_at: '2026-09-01T00:00:00Z' },
      { slug: 'weak-article', title_en: 'Unrelated', excerpt_en: 'x' },
    ]),
    eventsBySlugs: () => track<Row[]>('eventsBySlugs', [{ slug: 'jazz', title_en: 'Jazz night', starts_at: '2026-10-20T17:00:00Z', date_confidence: 'confirmed' }]),
    eventsBetween: () => track<Row[]>('eventsBetween', [
      { slug: 'sat-market', title_en: 'Saturday market', title_el: 'Αγορά Σαββάτου', starts_at: '2026-10-10T07:00:00Z', ends_at: '2026-10-10T12:00:00Z', date_confidence: 'confirmed', venue: 'Square' },
      { slug: 'old', title_en: 'Old', starts_at: '2026-10-01T07:00:00Z', ends_at: '2026-10-01T08:00:00Z' },
    ]),
    activitiesByRefs: () => track('activitiesByRefs', [{ row: { external_id: '777', title: 'Troodos jeep safari', summary: 'Off-road', kind: 'safari', district: 'limassol', town: 'Platres', price_band: '€€', duration_label: '6h' }, bookUrl: 'https://gyg.example/777' }]),
    regulationAlerts: () => track<Row[]>('regulationAlerts', [{ id: 'r1', title: 'VAT on new builds', summary: 'Reduced rate conditions changed.', severity: 'major', url: 'https://www.businessincyprus.gov.cy/x', detected_at: '2026-09-20T00:00:00Z' }]),
    webcams: () => track<Row[]>('webcams', [
      { slug: 'protaras', name_en: 'Fig Tree Bay', district: 'famagusta' },
      { slug: 'limassol', name_en: 'Limassol Marina', district: 'limassol' },
    ]),
    publishedSlugs: (s) => track('publishedSlugs', new Set(s.filter((x) => x.startsWith('pub-')))),
    ...over,
  };
}

(async () => {
  // 1. plain semantic question: vector legs run, no event window / regulation / webcam legs
  {
    const calls: string[] = [];
    const b = await retrieveSources(fakeDeps({}, calls), { q: 'villages to visit in Troodos', locale: 'de', qvec: VEC });
    ok('vector legs ran', calls.includes('vectorMatch') && calls.includes('kbDocMatch'));
    ok('no events window leg without an events intent', !calls.includes('eventsBetween'));
    ok('no regulation leg without intent', !calls.includes('regulationAlerts'));
    ok('no webcam leg without intent', !calls.includes('webcams'));
    ok('article hit present, German title picked', b.hits.some((h) => h.kind === 'article' && h.id === 'troodos-guide' && h.title === 'Troodos-Dörfer'));
    ok('weak article (below floor) dropped', !b.hits.some((h) => h.id === 'weak-article'));
    ok('activity carries booking label + link', b.hits.some((h) => h.kind === 'activity' && h.label === 'booking_partner' && h.href === 'https://gyg.example/777'));
    ok('kb doc labelled third-party', b.hits.some((h) => h.kind === 'kb_doc' && h.label === 'third_party'));
    eq('events intent false', b.notes.eventsIntent, false);
  }
  // 2. events question: window leg runs, past event excluded, window reported
  {
    const calls: string[] = [];
    const b = await retrieveSources(fakeDeps({}, calls), { q: "What's on this weekend?", locale: 'el', qvec: VEC });
    ok('events window leg ran', calls.includes('eventsBetween'));
    eq('window is weekend', b.window?.key, 'weekend');
    const ids = b.hits.filter((h) => h.kind === 'event').map((h) => h.id);
    ok('weekend event present', ids.includes('sat-market'));
    ok('past event excluded even though the fake returned it', !ids.includes('old'));
    ok('semantic event outside the weekend window excluded', !ids.includes('jazz'));
    ok('Greek title chosen', b.hits.find((h) => h.id === 'sat-market')?.title === 'Αγορά Σαββάτου');
    eq('eventsFound counted', b.notes.eventsFound, 1);
  }
  // 3. events intent with nothing in the window → note drives the "do not invent" rule
  {
    const b = await retrieveSources(fakeDeps({ eventsBetween: async () => [], vectorMatch: async () => [] }), { q: 'concerts tomorrow', locale: 'en', qvec: VEC });
    eq('no events found', b.notes.eventsFound, 0);
    eq('events intent set', b.notes.eventsIntent, true);
  }
  // 4. no embedding: keyword/structured legs still work, semantic skipped
  {
    const calls: string[] = [];
    const b = await retrieveSources(fakeDeps({}, calls), { q: 'events this weekend', locale: 'en', qvec: null });
    ok('no vector calls without an embedding', !calls.includes('vectorMatch') && !calls.includes('kbDocMatch'));
    ok('structured event leg still answers', b.hits.some((h) => h.id === 'sat-market'));
  }
  // 5. regulation + conditions only on intent
  {
    const b = await retrieveSources(fakeDeps(), { q: 'what is the VAT on a new villa', locale: 'en', qvec: null });
    ok('regulation hit labelled official', b.hits.some((h) => h.kind === 'regulation' && h.label === 'official'));
    eq('regulation found counted', b.notes.regulationFound, 1);
    const c = await retrieveSources(fakeDeps(), { q: 'can I swim today? any webcam in limassol', locale: 'en', qvec: null, district: 'limassol' });
    const cams = c.hits.filter((h) => h.kind === 'webcam');
    eq('district webcam preferred', cams.map((h) => h.id), ['limassol']);
    ok('webcam links to the live page', cams[0].href === '/live');
  }
  // 6. isolation: a failing source never removes the others
  {
    const b = await retrieveSources(fakeDeps({ articlesBySlugs: async () => { throw new Error('db down'); } }), { q: 'villages in Troodos', locale: 'en', qvec: VEC });
    ok('failed leg recorded', b.legs.some((l) => l.name === 'articles' && l.error));
    ok('other sources survive', b.hits.some((h) => h.kind === 'activity') && b.hits.some((h) => h.kind === 'kb_doc'));
    const all = await retrieveSources(fakeDeps({ vectorMatch: async () => { throw new Error('rpc missing'); }, kbDocMatch: async () => { throw new Error('x'); } }), { q: 'hello', locale: 'en', qvec: VEC });
    eq('everything failing → empty, no throw', all.hits.length, 0);
  }
  // 7. env floor override
  {
    const loose = await retrieveSources(fakeDeps(), { q: 'villages in Troodos', locale: 'en', qvec: VEC });
    const strict = await retrieveSources(fakeDeps(), { q: 'villages in Troodos', locale: 'en', qvec: VEC }, { CONCIERGE_SOURCE_FLOOR: '0.58' });
    ok('stricter floor yields fewer hits', strict.hits.length < loose.hits.length);
    const junk = await retrieveSources(fakeDeps(), { q: 'villages in Troodos', locale: 'en', qvec: VEC }, { CONCIERGE_SOURCE_FLOOR: 'abc' });
    eq('invalid env ignored', junk.hits.length, loose.hits.length);
  }
  // 8. published-only link gate
  {
    const set = await publishedSet(fakeDeps(), ['pub-1', 'listed-2', 'pub-1', '']);
    eq('only published slugs survive', Array.from(set), ['pub-1']);
    eq('empty input → empty set, no call', (await publishedSet(fakeDeps(), [])).size, 0);
    eq('failure → link nothing', (await publishedSet(fakeDeps({ publishedSlugs: async () => { throw new Error('x'); } }), ['pub-1'])).size, 0);
  }
  report('concierge-sources-retrieve');
})().catch((e) => { console.error(e); process.exit(1); });
