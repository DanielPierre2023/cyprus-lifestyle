# Cyprus Lifestyle — Audit Roadmap (deploy notes)

Deliverables for the 12-item automation roadmap from the platform audit
(`cyprus-lifestyle-platform-audit.html`). The full plan and status live in
`EXECUTION-PLAN.md`. This file is the **per-item deploy note**: what SQL to run,
what code to deploy, and how each item was tested. Newest item first.

Everything here is additive and idempotent. **Batch the SQL** and **deploy the
code once** to keep Vercel deployments minimal (audit operating principle).

---

## Item 05 · Always-answer ladder + quality-eval harness  ✅ 2026-09-21

**Why (from the audit):** prove the concierge "answers everything" and never
dead-ends, and stop answer-quality regressions from shipping.

### Code — deploy once
- `lib/concierge/brain.ts` — the always-answer ladder is now explicit. It already
  grounded (directory + KB + neighbourhood) and fell back to a curated tier
  (`topRated` + guide pages) when matches were thin; the **"no matches" branch now
  instructs the full ladder** — answer what's genuinely known, give a real next step
  (category/guide), and ALWAYS offer the desk + capture a contact. It never simply
  says "I can't help." Also a **retrieval fix**: the bare word "seafront" was in the
  real-estate intent list, so "a seafront restaurant" routed to property; removed it
  (genuine property queries always carry a property noun), fixing dining/stays "by the
  sea" queries.

### Tests / CI (the deploy gate)
- `scripts/tests/concierge-gold.test.ts` **(new)** — 39 gold questions across all
  seven languages and every core intent (dining, stays, property, everyday services
  via probes, neighbourhood radius, luxury tier, legal), asserting the exact
  language/category/district/tier/probe signals the concierge grounds on. Runs
  offline in `npm test`, so CI blocks a merge that regresses intent routing — with an
  explicit regression guard for the seafront bug. `npm test` is now 89 assertions
  across 7 suites.

### Deferred (opt-in) — bounded cited web-search rung
The ladder's optional "bounded cited web-search" tier is **not** enabled: it adds a
model/search cost to every otherwise-unanswered turn and a fabrication risk that cuts
against the project's grounding discipline and cost mandate. It should be a deliberate
switch (e.g. `automation_settings.concierge_websearch_enabled`, Cyprus-scoped, capped
results, always cited) — recommended as a small follow-up once the desired budget is set.

---

## Item 01 · Lift the infra ceiling (durable job queue)  ✅ 2026-09-21

**Why (from the audit):** the Vercel Hobby plan runs one cron a day, which caps
every background workload (scraping, enriching, outreach, actualising). This adds a
proper job queue drained continuously — for free — so throughput is no longer gated
by a single daily tick. It is the foundation items 05–11 build on.

### 1 · SQL — run first
- `supabase/migrations/0086_job_queue.sql` — table `job_queue` + functions
  `job_enqueue`, `job_dequeue` (atomic **FOR UPDATE SKIP LOCKED** claim),
  `job_complete`, `job_fail` (capped exponential backoff → dead-letter),
  `job_reap_stuck`, `job_prune`, and the `job_queue_stats` view. Dedupe via a partial
  unique index on `dedupe_key` for live jobs. Admin RLS; the worker uses the service
  role. **Tested on Postgres 16:** idempotent; all semantics verified (dedupe,
  priority order, due-time gating, backoff, dead-letter after max attempts, stuck-job
  reaping); and a **real two-worker parallel claim test proved zero double-claim**
  (50 + 50 disjoint, full coverage).

### 2 · Code — deploy once
- `lib/jobs.ts` **(new)** — `enqueue(kind, payload, opts)` (dedupe/schedule/priority),
  a handler registry (`registerJob`), and `runWorker()` — a time-boxed drain loop that
  reaps stuck jobs, claims batches, runs handlers, and marks done / retries / dead-
  letters. Best-effort logged (item 03); the loop never crashes. Built-in safe
  handlers: `noop` (heartbeat) and `housekeeping` (prunes old jobs + error rows).
- `app/api/cron/worker/route.ts` **(new)** — the drain endpoint, authorised by
  `CRON_SECRET` like the other crons; safe to call concurrently.
- `lib/jobs.handlers.ts` **(new)** — the extension point where later items register
  real kinds (documented example inside). Empty today, so the queue is **inert until
  used** — safe to ship now.
- `app/[locale]/admin/(panel)/analytics/page.tsx` — a "Background jobs" panel
  (pending / running / done / dead counts + a dead-letter table).

### 3 · Enable the free drainer (run once, in Supabase)
- `supabase/pg_cron/schedule.sql` — enable `pg_cron` + `pg_net`, set `SITE_URL` and
  `CRON_SECRET` (Vault option provided), and Postgres will call `/api/cron/worker`
  **every 3 minutes**. That is the ceiling lift — no Vercel Pro. The existing daily
  Vercel cron (`/api/cron/tick`) stays as-is; you can optionally move it to pg_cron too.

### How later items use it
```ts
import { enqueue } from '@/lib/jobs';
await enqueue('enrich_listing', { slug }, { dedupeKey: `enrich:${slug}`, priority: 1 });
```
and register the handler in `lib/jobs.handlers.ts`. The worker then runs it within
minutes, with retries and a dead-letter if it keeps failing.

### Verification summary
`tsc` clean · `npm test` 50/50 green (incl. registry) · all 83 migrations apply in
order on fresh PG16+pgvector · queue semantics + concurrency proven on Postgres 16.

---

## Item 04 · Directory coverage dashboard + sprint  ✅ 2026-09-21

**Why (from the audit):** the directory is the concierge's and the map's raw
material, but "how complete is it?" had no answer. This makes coverage measurable
by category × district so the enrich/scrape sprint is driven by data — and pairs
with the item-02 concierge backlog (what people *ask* for vs what we *have*).

### 1 · SQL — run first
- `supabase/migrations/0085_directory_coverage.sql` — four views over **published**
  listings: `directory_coverage_overall`, `directory_coverage_by_group`,
  `directory_coverage_by_district`, `directory_coverage_cells` (the category×district
  matrix). Coverage dimensions: coordinates (map + neighbourhood radius), a contact
  channel, a real photo (placeholders are render-time, so a non-null `image` is real),
  verification, and median data age. **Views only — no data change; idempotent.**
  Verified on the real seed (599 rows): overall 21% coords / 98% contact, and the
  gap finder correctly surfaces thin cells (e.g. food×Larnaca = 1 listing).

### 2 · Code — deploy once
- `app/[locale]/admin/(panel)/coverage/page.tsx` **(new)** — a "Coverage" dashboard:
  headline cards (listings, % coords / contact / photo / verified), a by-category
  table with per-dimension % and median age, a tinted **category × district gap map**
  (count per cell, tint = coordinate coverage; empty cells stand out), a ranked
  **"thinnest cells — sprint targets"** list, and a by-district table.
- `components/admin/AdminNav.tsx` — adds the "Coverage" tab under *Listings*.

### How to run the sprint
Open Admin → Coverage. The gap map and "thinnest cells" show exactly which
category×district pockets are empty or lack coordinates/photos; the Analytics →
Concierge backlog shows what guests asked for and we couldn't answer. Work the two
lists together: filter the Directory tab to a thin cell, scrape/enrich, repeat.

### Verification summary
All 82 migrations apply in order on fresh PG16+pgvector · 0085 idempotent · views
verified against real seed data · `tsc` clean · `npm test` green.

---

## Item 03 · Error monitoring + CI smoke tests  ✅ 2026-09-21

**Why (from the audit):** two of the lowest scores were observability (3.2) and
testing (1.8). Failures in the daily cron, the mailroom or the concierge were only
visible in Vercel logs (if at all), and nothing stopped a bad migration or a
regression reaching production. This closes both.

### 1 · SQL — run first
- `supabase/migrations/0084_error_log.sql`
  - New table `error_log` (level, source, message, fingerprint, detail jsonb) +
    view `error_log_grouped` (distinct problems, most frequent first, 30 days) +
    `prune_error_log()` (keeps 90 days; called from the daily cron).
  - Admin-only RLS; the server writes with the service role.
  - **Tested on UTF-8 Postgres 16:** applies + idempotent, grouping ranks by
    frequency, prune returns a count.

### 2 · Code — deploy once
- `lib/monitor.server.ts` **(new)** — `logServerError(source, error, ctx?)`
  persists to `error_log` **and** still calls the existing `reportError` (console +
  optional Sentry). Kept `server-only` so `supabaseAdmin` never enters the client
  bundle that the error boundaries import. `fingerprint()` collapses uuids/numbers/
  quoted values so repeats group. Best-effort: logging never throws or blocks.
- Wired into the silent-failure points: `app/api/cron/tick/route.ts` (scrape +
  living-knowledge catches, plus a daily `prune_error_log`), `app/api/email/
  inbound/route.ts` (draft-on-arrival), `app/api/concierge/chat/route.ts` (stream).
- `app/[locale]/admin/(panel)/analytics/page.tsx` — a new **System errors** section
  (7-day count + grouped table: source, level, latest message, count, last seen).

### 3 · CI / tests (no deploy — repo tooling)
- `scripts/tests/` **(new)** — five pure-logic suites run by `npm test`
  (45 assertions): concierge coverage classification, retrieval helpers
  (locale/tier/district/location/category probes, incl. EL/DE/RU/AR), geo maths,
  the **auto-acknowledge safety guardrail**, and error fingerprinting. Runner
  bundles each suite with esbuild against test stubs for `server-only`/Supabase.
- `supabase/ci/prelude.sql` **(new)** — minimal Supabase-compatible bootstrap
  (roles, `auth`/`storage` schemas, `auth.uid()`, stub tables) so the migration set
  can be applied on a vanilla Postgres.
- `.github/workflows/ci.yml` **(new)** — on every push/PR: `tsc` + `npm test` +
  **apply all migrations in order** on a fresh `pgvector/pgvector:pg16` service.

### Portability fix caught by the new gate
- `supabase/migrations/0017_search.sql` — the `search_document` generated column
  used `array_to_string(tags_en,' ')`, which Postgres marks **STABLE**; PG16 rejects
  it ("generation expression is not immutable"). Replaced with an `IMMUTABLE`
  `public.text_array_join()` helper — **identical search behaviour** (tag words
  still indexed), portable across PG15/16/17. **Safe for existing deployments:** the
  `add column if not exists` skips where the column already exists, so this only
  affects fresh applies / CI. No action needed on the live database.

### Verification summary
`tsc` clean · `npm test` 45/45 green · all 81 migrations apply in order on a fresh
PG16+pgvector with the prelude · 0084 idempotent + grouping/prune verified.

### Optional
Set `NEXT_PUBLIC_SENTRY_DSN` to also stream errors to Sentry; without it, the DB
log + admin panel are fully self-sufficient (no third-party cost).

---

## Item 02 · Concierge analytics + unanswered-questions log  ✅ 2026-09-21

**Why (from the audit):** we could not *prove* the concierge answers everything,
and we had no systematic list of what it fails to answer. This makes both
measurable: every turn is logged with a coverage verdict, and the questions it
can't fully answer become an auto-generated scrape/write backlog.

### 1 · SQL — run first (Supabase SQL editor)
- `supabase/migrations/0083_concierge_analytics.sql`
  - New table `concierge_events` — one row per concierge turn: `channel`
    (web | whatsapp | email | request), `locale`, `question`, `answer_chars`,
    `picks`, `kb`, `near`, `coverage` (full | partial | deferred), `reason`
    (ok | thin | no_data), `recommended` (listing slugs surfaced — feeds item 08
    attribution), `latency_ms`, `meta`. Anonymous (`cid` only), no sensitive data.
  - View `concierge_coverage_daily` — per-day totals + `coverage_rate`.
  - Admin-only RLS; the concierge writes with the service role (bypasses RLS).
  - **Tested on UTF-8 Postgres 16:** applies cleanly, idempotent on re-run, view
    math verified (80.0% on a 10-row fixture: 6 full / 2 partial / 2 deferred),
    backlog aggregation verified (repeated question grouped, n=2). Column names
    avoid the reserved word `full` (`full_ct`/`partial_ct`/`deferred_ct`) so
    nothing downstream needs to quote them.

### 2 · Code — deploy once
- `lib/concierge/analytics.ts` **(new)** — `classifyCoverage(picks, kb, answer)`
  returns the coverage verdict with **no extra model call** (pure heuristic:
  no grounding → deferred/no_data; a multilingual "I'll check / I don't have"
  defer phrase, or thin grounding, or a very short answer → partial/thin;
  otherwise full/ok). `logConciergeTurn(t)` writes the row best-effort — it is
  wrapped so analytics can **never** block or break a reply.
  - **Unit-tested 8/8**, including defer-phrase detection in EN, EL, DE and the
    kb-only grounding path.
- `lib/concierge/brain.ts` — the `meta` stream event now also carries `kb`
  (knowledge-base hits) and `near` (a neighbourhood point was resolved), so the
  chat route can log retrieval facts. Additive; the existing client
  (`ConciergeChat.tsx`) ignores the new fields — no client change needed.
- `app/api/concierge/chat/route.ts` — after each web reply, logs the turn
  (channel `web`) via `after()`; still updates guest memory as before. The log
  captures question, answer length, retrieval counts, and recommended slugs.
- `lib/mail/assist.ts` — inbound **email** replies (compose mode only, not human
  "polish") log the same way (channel `email`), so mailroom questions feed the
  same coverage rate and backlog as the web chat.
- `app/[locale]/admin/(panel)/analytics/page.tsx` — Analytics tab now shows a
  **Concierge coverage · 30d** block: three stat cards (answer-coverage %,
  questions in 30d, deferred gaps) and a **Top unanswered questions** table —
  the concrete scrape/write backlog, grouped and ranked by how often each was
  asked, with language and last-seen date.

### Verification summary
`npx tsc --noEmit` → exit 0 · migration applied + idempotent on Postgres 16 ·
view + backlog math verified on a fixture · `classifyCoverage` 8/8 unit tests.

### After deploy
Coverage starts logging immediately. Give it a few days of real traffic, then
read Admin → Analytics → *Concierge coverage*: the backlog table is your
prioritised list of what to scrape, write, or enrich next (feeds items 04 & 05).

---
