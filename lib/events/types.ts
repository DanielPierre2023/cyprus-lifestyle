// lib/events/types.ts — shared types of the automated events pipeline (fetch -> parse -> normalise -> dedupe -> store).
export type SourceFormat =
  | 'tribe'        // WordPress "The Events Calendar" REST API (JSON): /wp-json/tribe/events/v1/events
  | 'ical'         // iCalendar feed (.ics / ?ical=1)
  | 'rss-jsonld'   // RSS/Atom feed of event pages; each event page carries schema.org Event JSON-LD
  | 'jsonld-page'  // one HTML page carrying schema.org Event JSON-LD (one or many)
  | 'computed';    // generated locally, no network (statutory public holidays)

export type SourceKind = 'official' | 'municipal' | 'venue' | 'media' | 'ticketing' | 'public-data';

export interface EventSource {
  slug: string;
  name: string;
  kind: SourceKind;
  homepage: string;
  /** Feed URL. `{today}` -> YYYY-MM-DD, `{year}` / `{year+1}` -> calendar years (Nicosia). */
  feedUrl: string;
  format: SourceFormat;
  /** Default on/off. Admin -> Events sources can override (table events_sources.enabled). */
  enabled: boolean;
  /** May an event from this source go live without a human? (still subject to rules.ts) */
  autoPublish: boolean;
  /** Keep only titles/dates/venue/price + link back; no description text, no image hot-linking. */
  factsOnly: boolean;
  /** Take the image URL the source publishes (only where reuse is clearly intended). */
  images: boolean;
  minIntervalMin: number;
  /** For rss-jsonld: max event pages fetched per run (politeness + time box). */
  maxDetailPerRun: number;
  /** Language the source text is written in (shown as-is where no translation exists). */
  lang: 'en' | 'el';
  /** For a single-town source (e.g. Limassol Tourism): the district to assume when an event page names none. */
  districtHint?: string;
  tags?: string[];
  /** What we found when we checked robots.txt / terms (dated). */
  robots: string;
  terms: string;
  checkedOn: string;
  attribution: string;
}

export interface ExcludedSource {
  name: string;
  url: string;
  verdict: 'excluded' | 'needs-decision' | 'inactive' | 'not-structured';
  reason: string;
  cost?: string;
}

/** What a parser yields before normalisation: loose strings straight from the source. */
export interface RawEvent {
  uid: string;                    // stable id within the source (url, UID, date+name)
  title: string;
  titleEl?: string | null;        // Greek title when the source supplies one (public holidays)
  description?: string | null;
  start: string;                  // any format parseEventDate understands
  end?: string | null;
  allDay?: boolean;
  url?: string | null;            // the original event page (attribution link)
  image?: string | null;
  venue?: string | null;
  address?: string | null;        // street / locality text
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  price?: string | null;          // free text; '0' / 'free' accepted
  organizer?: string | null;
  categories?: string[];
  cancelled?: boolean;
  dateApprox?: boolean;           // the source itself says the date is provisional
}

export interface NormEvent {
  sourceSlug: string;
  uid: string;
  ingestKey: string;              // `${sourceSlug}:${uid}` (unique per event)
  title: string;
  titleEl: string | null;
  summary: string | null;
  startsAt: string;               // ISO UTC
  endsAt: string | null;
  allDay: boolean;
  venue: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  coordsPrecision: 'exact' | 'town' | null;
  price: string | null;
  url: string | null;             // original event page
  image: string | null;
  organizer: string | null;
  tags: string[];
  dateConfidence: 'confirmed' | 'approximate';
  recurrence: 'one-off' | 'annual';
  lang: 'en' | 'el';
}

export type SkipReason = 'past' | 'too-far' | 'no-title' | 'bad-date' | 'north' | 'cancelled' | 'too-long' | 'spam';

/** A row of public.events as the pipeline needs it for de-duplication. */
export interface ExistingEvent {
  id: string;
  slug: string;
  title_en: string | null;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  district: string | null;
  source: string | null;
  source_url: string | null;
  ingest_key: string | null;
  status: string;
  image: string | null;
  price: string | null;
  lat: number | null;
  updated_at: string | null;
  last_seen_at: string | null;
}

export interface SourceState {
  slug: string;
  enabled: boolean | null;        // null = registry default
  last_run_at: string | null;
  last_success_at: string | null;
  last_status: string | null;
  last_found: number; last_added: number; last_duplicates: number; last_errors: number;
  last_error: string | null;
  consecutive_failures: number;
  etag: string | null;
  cursor: { bad?: Record<string, number> } | null;
}

export interface SourceResult {
  slug: string;
  status: 'ok' | 'not-modified' | 'error' | 'blocked' | 'skipped';
  found: number; added: number; updated: number; duplicates: number; skipped: number; errors: number;
  published: number; drafted: number;
  error?: string;
  note?: string;
  ms: number;
  etag?: string | null;           // carried to saveState (not part of the public summary)
  cursor?: SourceState['cursor'];
}

export interface RunSummary {
  startedAt: string;
  ms: number;
  sources: SourceResult[];
  found: number; added: number; updated: number; duplicates: number; errors: number; published: number; drafted: number;
  stoppedEarly: boolean;          // the time box ended before every due source was processed (resumes next run)
}
