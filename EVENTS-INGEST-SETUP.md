# Events ingestion pipeline — setup & run

This is the real fix for *"cyprusnow.app has a picture for every event and we don't."*
Those sites don't hand-enter events — they **ingest a feed**. Now we do too.

`events-ingest` pulls real Cyprus events **with their posters** from public listings,
reads the same `schema.org/Event` structured data Google reads, self-hosts the poster
in your Storage bucket, and files each one as a **draft** in Agenda for you to approve.
Nothing goes live on its own.

Verified before shipping: parser unit-tested (45 assertions) against the live Beonix
Festival page; link-extraction confirmed on the live Limassol listing (31 events found);
the `ON CONFLICT (source_url)` de-dupe proven in Postgres (re-runs never double-import
and never overwrite an edit you've made to a draft).

---

## Where each file goes (the 3 destinations — same as always)

| File | Destination | How |
|------|-------------|-----|
| `supabase/migrations/0042_events_ingest.sql` | **Supabase → SQL Editor** | paste, Run |
| `supabase/functions/events-ingest/index.ts` | **1) commit to GitHub** *and* **2) Supabase → Edge Functions** | commit the file **and** paste it into a new function named `events-ingest`. GitHub alone does **not** deploy edge functions. |

There is **no app-code change** in this drop, so nothing to redeploy on Vercel.

---

## Step 1 — Run the SQL (`0042`)

Paste `0042_events_ingest.sql` into the SQL Editor and Run. It is idempotent and does two things:

1. **Ingest support** — adds `events.source` and a unique index on `source_url` (the de-dupe key).
2. **7-language repair** — adds the missing `title_de/pl/ru` and `summary_de/pl/ru` columns.
   The Agenda admin form and the reader already expected these, but the table only had
   EN/EL/RO/AR. Until now, saving an event wrote to columns that didn't exist and the
   /agenda page was blank in German, Polish and Russian. This fixes both — and lets
   translate-on-approve fill all seven editions for ingested events.

The query prints a small before/after count (total / drafts / published / imported).

## Step 2 — Deploy the function

Supabase → **Edge Functions → Deploy a new function** → name it exactly `events-ingest`
→ paste `index.ts`. In its settings, turn **Verify JWT = OFF** (it's protected by the
`?key=` secret instead, exactly like `enrich-directory`).

**No new secrets and no new bucket.** It reuses what `enrich-directory` already uses:
`ENRICH_SECRET` (the key gate) and the public `listings` Storage bucket.

## Step 3 — Test it (dry run — writes nothing)

Paste this in a browser, replacing `SECRET` with your `ENRICH_SECRET`:

```
https://htwaivnvabvpqkffllnc.supabase.co/functions/v1/events-ingest?key=SECRET&dryRun=1&limit=10
```

You'll get JSON back listing the events it *would* import (`"status":"would-insert"`),
each with title, district and whether a poster was found. Nothing is written to the DB.

## Step 4 — Run it for real

```
https://htwaivnvabvpqkffllnc.supabase.co/functions/v1/events-ingest?key=SECRET&limit=30
```

It inserts up to 30 drafts, downloads each poster into `listings/events/…`, and returns
`{ inserted, drafts_waiting, results }`. Re-running is safe — anything already imported
is skipped (`"status":"duplicate"`).

### Query options

| Param | Default | Meaning |
|-------|---------|---------|
| `cities` | `limassol,nicosia,larnaca,paphos,ayia-napa` | comma list of allevents city slugs |
| `perCity` | `8` | detail pages fetched per city (1–20) |
| `limit` | `30` | total events processed this run (1–60) |
| `dryRun` | off | `1` = parse & report, write nothing |
| `redo` | off | `1` = re-process even if already imported |

Keep `limit` modest (≤40) per call so the function stays within its time budget; run it
again to drain more.

## Step 5 — Approve the drafts

Go to **Admin → Agenda**. Imported events appear greyed-out (status `draft`) with their
poster, venue, district, date and ticket link already filled. For each one you want live:

- click **Edit**, sanity-check the details, optionally auto-translate the title/summary
  into the other six editions, then set status **published** (or just click the
  **draft** pill in the list to flip it to published).

Only published, upcoming events show on `/agenda` and emit Event rich-result data.

## Step 6 — Automate it (weekly, optional)

Once you're happy with the quality, schedule it with `pg_cron` in the SQL Editor so new
events flow in on their own (they still land as drafts for approval):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'events-ingest-weekly',
  '0 6 * * 1',                       -- Mondays 06:00 UTC
  $$
  select net.http_get(
    url := 'https://htwaivnvabvpqkffllnc.supabase.co/functions/v1/events-ingest?key=YOUR_ENRICH_SECRET&limit=40'
  );
  $$
);
```

(To change or remove it later: `select cron.unschedule('events-ingest-weekly');`)

---

## What it maps, field by field

| Agenda field | From the event's structured data |
|--------------|----------------------------------|
| English title | `name` |
| Summary (EN) | `description` (HTML stripped, ~600 chars) |
| Starts / Ends | `startDate` / `endDate` (stored as UTC) |
| Venue | `location.name` |
| District | `location.address.addressLocality` → one of the 6 CY districts |
| Map pin | `location.geo.latitude` / `longitude` |
| Ticket URL | `offers.url` (falls back to the event page) |
| Price | `offers.price` → `Free` / `€75` / `€15–€40` |
| Poster | `image` → downloaded into `listings/events/<slug>.jpg` |
| Tags | inferred from the event type (festival / music / theatre / …) |

**Source:** allevents.in Cyprus city pages (phase 1). It's the broadest aggregator that
publishes posters + full JSON-LD. Adding a second source later (e.g. SoldOut/Ticketbox,
Visit Cyprus) is just another collector feeding the same draft table.
