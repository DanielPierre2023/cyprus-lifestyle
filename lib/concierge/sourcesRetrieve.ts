// lib/concierge/sourcesRetrieve.ts
// ============================================================================
// Orchestrates retrieval over every NON-directory source, with all I/O injected (SourceDeps),
// so the whole decision flow — which legs run, what degrades, what is filtered — is unit-tested
// with in-memory fakes. The production wiring is lib/concierge/sourcesDeps.ts.
//
// Rules enforced here (each has a test):
//   • every leg is isolated: one failing source never removes the others (returns [] for it);
//   • only PUBLISHED / ACTIVE / REVIEWED rows are ever turned into hits (deps filter, we re-check);
//   • events are time-filtered in Cyprus time and never include past events;
//   • regulation notes only on a regulation-shaped question; webcams only on a conditions question;
//   • no embedding (qvec === null) → keyword/structured legs still work, semantic legs are skipped;
//   • listing picks are checked against the published set so the UI only links real pages.
// ============================================================================
import {
  type SourceHit, type SourceNotes, type TimeWindow, type WindowKey,
  eventHit, articleHit, activityHit, kbDocHit, regulationHit, webcamHit,
  eventsOverlapping, eventWindow, isEventsIntent, isRegulationIntent, isConditionsIntent, fuseSources,
  DEFAULT_FLOORS, type FuseOptions,
} from '@/lib/concierge/sources';

type Row = Record<string, unknown>;
export interface VectorHit { source: 'article' | 'event' | 'activity'; ref: string; similarity: number; }

export interface SourceDeps {
  now(): Date;
  vectorMatch(vec: number[], count: number): Promise<VectorHit[]>;                       // concierge_embeddings (live-status filtered in SQL)
  kbDocMatch(vec: number[], count: number): Promise<{ id: string; similarity: number }[]>; // match_kb_docs
  kbDocsByIds(ids: string[]): Promise<Row[]>;                                            // published = true
  articlesBySlugs(slugs: string[]): Promise<Row[]>;                                      // status = 'published'
  eventsBySlugs(slugs: string[]): Promise<Row[]>;                                        // status = 'published'
  eventsBetween(fromIso: string, toIso: string, limit: number): Promise<Row[]>;          // status = 'published'
  activitiesByRefs(refs: string[]): Promise<{ row: Row; bookUrl: string | null }[]>;     // status = 'active' + booking url
  regulationAlerts(limit: number): Promise<Row[]>;                                       // status = 'reviewed', severity minor|major
  webcams(): Promise<Row[]>;                                                             // status = 'published'
  publishedSlugs(slugs: string[]): Promise<Set<string>>;                                 // directory_listings.status = 'published'
}

export interface SourceInput { q: string; locale: string; qvec: number[] | null; district?: string | null; }
export interface SourceBundle {
  hits: SourceHit[]; notes: SourceNotes; window: TimeWindow | null;
  legs: { name: string; count: number; error?: boolean }[];
}

async function leg<T>(name: string, legs: SourceBundle['legs'], fn: () => Promise<T[]>): Promise<T[]> {
  try { const r = await fn(); legs.push({ name, count: r.length }); return r; }
  catch { legs.push({ name, count: 0, error: true }); return []; }
}

const floorFromEnv = (env: Record<string, string | undefined>): FuseOptions['floors'] => {
  const v = Number(env.CONCIERGE_SOURCE_FLOOR);
  if (!Number.isFinite(v) || v <= 0 || v >= 1) return undefined;
  return { article: v, activity: v, kb_doc: v, event: v };
};

export async function retrieveSources(deps: SourceDeps, input: SourceInput, env: Record<string, string | undefined> = {}): Promise<SourceBundle> {
  const { q, locale, qvec } = input;
  const now = deps.now();
  const legs: SourceBundle['legs'] = [];
  const eventsIntent = isEventsIntent(q);
  const regulationIntent = isRegulationIntent(q);
  const conditionsIntent = isConditionsIntent(q);
  const win = eventsIntent ? eventWindow(q, now) : null;

  const vecHits = qvec ? await leg('vector(sources)', legs, () => deps.vectorMatch(qvec, 24)) : [];
  const kbMatches = qvec ? await leg('vector(kb_docs)', legs, () => deps.kbDocMatch(qvec, 8)) : [];
  const simOf = (source: VectorHit['source'], ref: string) => vecHits.find((v) => v.source === source && v.ref === ref)?.similarity ?? 0;
  const refs = (source: VectorHit['source']) => vecHits.filter((v) => v.source === source).map((v) => v.ref);

  const [articleRows, eventSemRows, actRows, kbRows, eventWinRows, regRows, camRows] = await Promise.all([
    refs('article').length ? leg('articles', legs, () => deps.articlesBySlugs(refs('article'))) : Promise.resolve([] as Row[]),
    refs('event').length ? leg('events(semantic)', legs, () => deps.eventsBySlugs(refs('event'))) : Promise.resolve([] as Row[]),
    refs('activity').length ? leg('activities', legs, () => deps.activitiesByRefs(refs('activity'))) : Promise.resolve([] as { row: Row; bookUrl: string | null }[]),
    kbMatches.length ? leg('kb_docs', legs, () => deps.kbDocsByIds(kbMatches.map((k) => k.id))) : Promise.resolve([] as Row[]),
    win ? leg('events(window)', legs, () => deps.eventsBetween(win.from, win.to, 40)) : Promise.resolve([] as Row[]),
    regulationIntent ? leg('regulation', legs, () => deps.regulationAlerts(20)) : Promise.resolve([] as Row[]),
    conditionsIntent ? leg('webcams', legs, () => deps.webcams()) : Promise.resolve([] as Row[]),
  ]);

  // Semantic events must still be upcoming (the SQL already filters; re-check, never trust one layer).
  const upcomingFrom = now.toISOString();
  const eventsFarFuture = new Date(now.getTime() + 400 * 86400_000).toISOString();
  const semEvents = eventsOverlapping(eventSemRows, { from: win?.from ?? upcomingFrom, to: win?.to ?? eventsFarFuture });
  const winEvents = win ? eventsOverlapping(eventWinRows, win) : [];

  const legsOut: SourceHit[][] = [
    // structured, exact-by-date events lead: score 1 marks "not a similarity, bypass the floor"
    winEvents.map((r, i) => eventHit(r, locale, 1 - i * 0.001)).filter((h): h is SourceHit => !!h),
    semEvents.map((r) => eventHit(r, locale, simOf('event', String(r.slug)))).filter((h): h is SourceHit => !!h),
    articleRows.map((r) => articleHit(r, locale, simOf('article', String(r.slug)))).filter((h): h is SourceHit => !!h),
    actRows.map((a) => activityHit(a.row as never, locale, a.bookUrl, simOf('activity', String((a.row as Row).external_id)))).filter((h): h is SourceHit => !!h),
    kbRows.map((r) => kbDocHit(r, locale, kbMatches.find((k) => k.id === String(r.id))?.similarity ?? 0)).filter((h): h is SourceHit => !!h),
    // keyword/structured legs: included only for matching intent, newest first, score 1 (no floor)
    regRows.map((r) => regulationHit(r, now, 1)).filter((h): h is SourceHit => !!h),
    pickCams(camRows, input).map((r) => webcamHit(r, locale, 1)).filter((h): h is SourceHit => !!h),
  ];
  const opts: FuseOptions = { floors: { ...DEFAULT_FLOORS, ...(floorFromEnv(env) || {}) }, max: 12 };
  const hits = fuseSources(legsOut, opts);
  const notes: SourceNotes = {
    eventsIntent, eventWindowKey: (win?.key ?? null) as WindowKey | null, eventsFound: hits.filter((h) => h.kind === 'event').length,
    regulationIntent, regulationFound: hits.filter((h) => h.kind === 'regulation').length, conditionsIntent,
  };
  return { hits, notes, window: win, legs };
}

/** Prefer cams in the asked district; otherwise a few island-wide. */
function pickCams(rows: Row[], input: SourceInput): Row[] {
  if (!rows.length) return [];
  const d = (input.district || '').toLowerCase();
  const inD = d ? rows.filter((r) => String(r.district || '').toLowerCase() === d) : [];
  return (inD.length ? inD : rows).slice(0, 3);
}

/** Published-only link gate for the directory picks the brain already built. */
export async function publishedSet(deps: Pick<SourceDeps, 'publishedSlugs'>, slugs: string[]): Promise<Set<string>> {
  const uniq = Array.from(new Set(slugs.filter(Boolean)));
  if (!uniq.length) return new Set();
  try { return await deps.publishedSlugs(uniq); } catch { return new Set(); } // on failure: link nothing rather than risk a 404
}
