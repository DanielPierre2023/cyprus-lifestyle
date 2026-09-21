# Cyprus Lifestyle — Audit Roadmap (deploy notes)

Deliverables for the 12-item automation roadmap from the platform audit
(`cyprus-lifestyle-platform-audit.html`). The full plan and status live in
`EXECUTION-PLAN.md`. This file is the **per-item deploy note**: what SQL to run,
what code to deploy, and how each item was tested. Newest item first.

Everything here is additive and idempotent. **Batch the SQL** and **deploy the
code once** to keep Vercel deployments minimal (audit operating principle).

---

## Item 11 · Programmatic SEO at scale + CTA instrumentation  ✅ 2026-09-21

**Why (from the audit):** category × district pages at scale, a CWV budget, and
measuring conversions on those pages. Two of the three were already in place.

### Already built (verified, no change)
- **Category × district pages:** `/best/[slug]` renders "best {type} in {district}"
  from directory facets; `/directory/g/[group]` are the 12-group hubs; `/guide/[slug]`
  and `/for/[market]` add practical and audience hubs. **All are enumerated in
  `app/sitemap.ts`** (with every article + listing), so they're discoverable at scale.
- **CWV:** Vercel Speed Insights is wired (consent-gated) in `ConsentAnalytics`.

### The gap this closes — CTA conversion instrumentation
- `supabase/migrations/0091_cta_instrumentation.sql` — a `label` column on
  `attribution_clicks` + the `cta_by_listing` view (clicks per listing per CTA, 90d).
- `components/TrackedCTA.tsx` **(new)** — a drop-in `<a>` that logs the click
  (source=directory, which CTA) before navigating.
- `app/[locale]/(site)/directory/[type]/[slug]/page.tsx` — the website, phone and
  directions buttons now use `TrackedCTA`.
- `app/api/track/rec-click/route.ts` — stores the CTA `label`.
- `app/[locale]/admin/(panel)/attribution/page.tsx` — a "CTA conversions" table.

### Verification summary
`tsc` clean · `npm test` 147 / 11 suites · all 88 migrations apply · CTA view verified.

---

## Item 10 · Proactive + transactional concierge  ✅ 2026-09-21

**Why (from the audit):** let guests keep a trip plan the concierge can act on, and
personalise nudges — turning the concierge from Q&A into something transactional.

### 1 · SQL — run first
- `supabase/migrations/0090_saved_items.sql` — `saved_items` (cid, slug, kind
  saved|trip, note), unique per (cid, slug, kind) so a repeated save is one row. Keyed
  by the anonymous cid, so a trip plan follows the guest across devices. Additive,
  idempotent (dedup verified on Postgres 16).

### 2 · Code — deploy once
- `lib/concierge/saved.ts` **(new, 14 unit tests)** — kind/slug/action validation and
  `savedBlock()`, the grounding text that tells the concierge what the guest saved.
- `app/api/concierge/saved/route.ts` **(new)** — GET the trip plan (hydrated with
  listing names), POST add/remove; cid-scoped, rate-limited.
- `components/ConciergeChat.tsx` — a "＋ Trip" button on every recommended pick.
- `app/api/concierge/chat/route.ts` — loads the guest's saved items and injects them
  into the concierge context, so it references them by name and offers to arrange or
  book them (routed to the desk via the existing request capture).

### What it reuses
The proactive opener (`/api/concierge/proactive`) and tier-aware request routing
(`concierge_requests` + `matchForRequest`) already existed — this adds the saved/trip
layer they can act on.

### Verification summary
`tsc` clean · `npm test` 147 / 11 suites (14 new) · all 87 migrations apply · saved
dedup verified on Postgres 16.

---

## Item 09 · Partner self-service portal  ✅ 2026-09-21

**Why (from the audit):** let business owners maintain their own listing without the
editorial team hand-editing every change — safely, behind moderation.

### 1 · SQL — run first
- `supabase/migrations/0089_partner_portal.sql` — `listing_claims` (ownership,
  token + expiry) and `listing_edit_requests` (moderation queue), plus
  `apply_listing_edit(request_id)` which writes **only a whitelist** (phone, email,
  url, partner_pitch, the seven `summary_*`) to the live listing. Verified on
  Postgres 16: an edit payload that also set `featured`/`status`/`rating` had those
  keys ignored; re-applying an approved request is a no-op.

### 2 · Code — deploy once
- `lib/partners/claims.ts` **(new, 16 unit tests)** — `sanitizeEdit` (whitelist +
  trim + cap), `emailMatchesListing` (anti-spoofing: same address / email domain /
  site domain), token helper.
- `app/api/partner/{claim,verify,edit}/route.ts` **(new)** — the token flow: request
  (generic response, no address enumeration) → verify link → submit edit to moderation.
- `app/api/admin/partner/moderate/route.ts` **(new)** — admin approve/reject; approve
  calls `apply_listing_edit`.
- `app/[locale]/(site)/partner/page.tsx` **(new)** — the public portal (claim → edit).
- `app/[locale]/admin/(panel)/partners/page.tsx` **(new)** + AdminNav — moderation.

### Design note
No new auth system: a partner proves control of the on-file email via a one-time
link, and every change is moderated before it goes live — so the portal can't be used
to hijack or vandalise a listing.

### Verification summary
`tsc` clean · `npm test` 133 / 10 suites (16 new) · all 86 migrations apply ·
apply-whitelist injection-safety verified on Postgres 16.

---

## Item 08 · Attribution + advertiser ROI report  ✅ 2026-09-21

**Why (from the audit):** advertisers should see what their placement earns them, and
we should see which listings deserve an upsell. This measures the funnel end-to-end.

### 1 · SQL — run first
- `supabase/migrations/0088_attribution.sql` — `attribution_clicks` (click log) plus
  three views: `listing_recommendations` (impressions from the concierge turn log),
  `listing_attribution` (per-listing impressions → clicks → CTR, featured flagged), and
  `advertiser_roi` (per-account revenue, orders, CRM leads, revenue-per-lead). Additive,
  idempotent; funnel math verified on Postgres 16 (3 recs, 1 click → 33.3% CTR).

### 2 · Code — deploy once
- `app/api/track/rec-click/route.ts` **(new)** — a lightweight, rate-limited beacon that
  logs a click on a recommended listing.
- `components/ConciergeChat.tsx` — each concierge pick now fires that beacon (with the
  slug + anonymous cid) on click, using `keepalive` so it survives the navigation.
- `app/[locale]/admin/(panel)/attribution/page.tsx` **(new)** + AdminNav — an
  "Attribution & ROI" tab: advertiser ROI (revenue / orders / leads / €-per-lead),
  the exposure the concierge gave each **featured** listing (recs, clicks, CTR), and the
  most-recommended listings that are **not** featured — ready-made upsell candidates.

### What it reuses
Recommendation impressions need no new logging — they come from the `recommended`
slugs item 02 already writes on every concierge turn. Revenue/leads come from the
existing `ad_orders` / `concierge_requests`.

### Verification summary
`tsc` clean · `npm test` 117 / 9 suites · all 85 migrations apply · funnel + ROI views
verified against fixtures on Postgres 16.

---

## Item 07 · Close the acquisition loop  ✅ 2026-09-21

**Why (from the audit):** prospect → outreach → reply → checkout → onboarding should
run as one loop. Most of it already existed; one segment was open.

### What already existed (verified, no change)
- **Prospecting:** the OSM importer + `crm_upsert_account` bring businesses into CRM.
- **Consent/deliverability:** outreach already checks `crm_suppression`, `consent_status`
  and `opt_out`, and every send carries an unsubscribe token.
- **Checkout → onboarding:** the advertise Stripe webhook already, on payment, matches
  or creates the CRM account, logs the win, opens a won/live deal, auto-provisions the
  placement (`fulfil_ad_order`) and emails the onboarding intake.

### The gap this closes — code only, no migration
- `lib/crm/inbound.ts` **(new)** — when an inbound email's sender matches a CRM
  contact, it logs the reply on the deal timeline (`crm_activities`, `inbound_reply`),
  **pauses any active outreach sequence** for that account (a human takes over on a
  reply), and flags the deal (`next_action_at`) for follow-up. Wildcard-safe email
  match (an address with `_`/`%` can't match the wrong contact).
- `app/api/email/inbound/route.ts` — calls the linker after storing the mail and, on a
  match, routes the ticket to the **partnerships** desk and tags it `prospect-reply`.

### Verification summary
CRM operations verified against fixtures on Postgres 16 (reply logged, sequence
paused, deal flagged, case-insensitive match); `likeEscape` unit-tested. `tsc` clean;
`npm test` 117 assertions / 9 suites.

---

## Item 06 · Mailroom ticketing + expanded safe auto-send  ✅ 2026-09-21

**Why (from the audit):** inbound mail had a read-state but no ownership, priority,
SLA or routing, so things could sit unanswered; and only a receipt was ever
auto-sent. This adds ticketing and a *carefully* widened auto-send.

### 1 · SQL — run first
- `supabase/migrations/0087_mailroom_tickets.sql` — adds `desk`, `assignee`,
  `priority`, `sla_due`, `first_response_at`, `resolved_at`, `thread_key`, `tags` to
  `inbound_emails` (with a sensible backfill), the `mailroom_stats` and
  `mailroom_tickets` views, a second opt-in switch `mail_autoanswer_enabled`
  (**default OFF**), and the `kb_candidates` table (resolved Q/A → KB review queue).
  Tested on Postgres 16: idempotent; views compute open/breached/SLA correctly and
  order tickets worst-first.

### 2 · Code — deploy once
- `lib/mail/tickets.ts` **(new, pure, 24 unit tests)** — reply-prefix-stripping
  thread keys (7 languages), multilingual `computePriority` + `routeDesk`, SLA
  `slaDue`/`slaState`, and `isSafeAutoAnswer` (a deliberately narrow FAQ whitelist).
- `app/api/email/inbound/route.ts` — on arrival, every email is triaged: desk,
  priority, SLA deadline and thread key are set automatically.
- `lib/mail/assist.ts` — **expanded safe auto-send**, doubly gated: only when
  `mail_autoanswer_enabled` is on AND the strict first-contact guardrails pass AND the
  question is on the informational FAQ whitelist AND the drafted reply is grounded. It
  sends a real answer and records the first response; everything else (advice, prices,
  bookings, high/urgent) still waits for a human. The receipt-only auto-ack is unchanged.
- `app/api/admin/mail/reply/route.ts` — records the FIRST human response for the SLA.
- `app/[locale]/admin/(panel)/mail/page.tsx` — a Desk column plus priority and
  SLA-breach / due-soon badges on each ticket.

### Safety note
Auto-send stays conservative by design (the audit keeps a human gate for substantive
advice). `isSafeAutoAnswer` never returns true for prices, quotes, legal/tax/visa,
bookings, complaints or anything high/urgent — and it is off until you switch it on.

### Verification summary
`tsc` clean · `npm test` 113 assertions / 8 suites (24 new for ticketing) · all 84
migrations apply in order · ticket views verified on Postgres 16.

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
