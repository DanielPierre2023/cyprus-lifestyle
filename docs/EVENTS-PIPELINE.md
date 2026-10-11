# Automated Agenda (increment 7.1)

The Agenda fills itself from free, public event feeds. Nothing here calls a paid API or an AI model.

## How it flows
`fetch -> parse -> normalise -> dedupe -> store`, one run per due source, from the job queue (`events_ingest`, drained by the 3-minute `cl-worker`).

| Step | Code | Notes |
|---|---|---|
| Registry | `lib/events/sources.ts` | feed URL, format, robots.txt + terms finding (dated), `enabled`, `autoPublish`, `factsOnly`. Excluded/undecided sources are recorded there too. |
| Fetch | `lib/events/pipeline.ts`, `run.ts` | robots.txt read first (cached per run, RFC 9309 matcher in `robots.ts`); identifying User-Agent; ETag revalidation; pause between requests; per-source minimum interval; 9 s request timeout. |
| Parse | `lib/events/parse.ts` | WordPress Events Calendar REST (JSON), iCal, schema.org Event JSON-LD, RSS/Atom item list, Nager.Date holidays. |
| Normalise | `lib/events/normalise.ts`, `time.ts` | Asia/Nicosia (DST-correct) -> UTC; all-day = Cyprus midnight..23:59:59; `date_confidence` confirmed/approximate; district + town pin from `lib/concierge/localities.ts`; occupied-north, past, cancelled, spam and >120-day "season" entries skipped. |
| Dedupe | `lib/events/dedupe.ts` | same key / same URL / title similarity + same Cyprus day (or within 4 h) / title + venue. Consecutive days are different dates of a series. Cross-source duplicates only fill empty fields of the kept row. |
| Store | `public.events` | `source`, `source_name`, `source_url` (original link), `ingest_key` (unique), `auto_published`, `last_seen_at` (a row an administrator edited afterwards is never overwritten). Titles go in `title_en` (original text); other editions stay empty and the site falls back to it, with a notice. |
| Publish rule | `lib/events/rules.ts` | published only if: source may auto-publish AND is official/municipal/public-data/venue AND date confirmed AND a place (or public holiday) AND plausible window. Everything else = draft in Admin -> Agenda. Per-source override in Admin -> Events sources. |
| Venue pin | job `geocode_event` | free cached geocoder (`lib/geo.ts`), accepted only within 25 km of the town pin; runs once per event (`geocoded_at`). |

Admin: **Events sources (auto)** (`/admin/events-sources`): sources, robots/terms notes, last run, found/added/duplicates/errors, per-source switch, publish mode, "Test" (dry run) and "Run now", recent runs, and the list of sources looked at and NOT used.

## Apply
1. Run `supabase/migrations/20261007120000_events_pipeline.sql` (SQL Editor). Master switch `automation_settings.events_pipeline_enabled` defaults ON.
2. Deploy. The daily Vercel job (`/api/cron/tick`) now also queues `events_ingest` once a day (fallback).
3. Add the 3-hourly Supabase job (the lead merges this into `supabase/pg_cron/install-jobs.sql`; needs no Vault secret because it only enqueues):

```sql
select ops.schedule_job('cl-events-ingest', '17 */3 * * *',
  $c$select public.job_enqueue('events_ingest', '{"trigger":"cron"}'::jsonb, now(), 1, 3, 'events:' || to_char(now() at time zone 'utc', 'YYYY-MM-DD-HH24'))$c$,
  array[]::text[]);
```
4. Admin -> System health shows `Events pipeline` and `Upcoming events` (and, once scheduled, the `cl-events-ingest` job).

## Freshness rules (System health)
* `events-pipeline`: red if no successful run for more than 36 h; warn if it never ran, if a source failed 3+ times in a row, or if no source is enabled; info when switched off.
* `events-fresh`: counts published real events (public holidays excluded) starting in the next 30 days or running now: red at 0, warn below 5.

## Optional one-off: publish the editors' own future drafts
The Agenda has future-dated drafts that editors entered by hand (mostly yearly events with approximate dates; shown on the site with a "Date to be confirmed" badge). To put the southern ones live in one go:
```sql
update public.events set status = 'published'
 where status = 'draft' and source is null and coalesce(district, '') <> 'kyrenia'
   and starts_at between now() and now() + interval '120 days';
```
(Review them first in Admin -> Agenda; two drafts are in the occupied north and must stay unpublished.)

## Visit Cyprus (off by default)
Its terms forbid copying site content without the Deputy Ministry of Tourism's written consent. The feed is built and tested (facts only: title, dates, venue, link). Ask the Ministry (visitcyprus.com contact) for consent, then switch it on in Admin -> Events sources.
