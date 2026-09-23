# Cyprus Lifestyle — Execution Plan (source of truth)

> **Read this first, every session.** This is the committed plan derived from the
> platform audit (`cyprus-lifestyle-platform-audit.html`). Follow it in order.
> Update the checkboxes and the "Status log" as items ship. Do not skip the 30-day
> foundation — items 05–12 compound off items 01–04.

## Operating principles (from the audit)
- **Aim for 100% coverage, not 100% unattended.** Fully automate answering, drafting,
  ingestion, receipts, prospecting, capture. Keep a one-click, rare human gate for:
  substantive legal/tax advice, money out, publishing scraped data, cold-outreach volume,
  and anything the confidence score flags low.
- **Grounded + sourced always.** No invented facts; every record carries provenance.
- **Measure before claiming.** "Answers everything" and "sells gracefully" must be
  provable with the analytics in item 02 and the KPIs below.
- **Everything ships as:** migration(s) tested on UTF-8 Postgres → `tsc` clean → unit
  tests for pure logic → bundled into `cyprus-lifestyle-luxury-routing.zip` (app) or a
  dedicated tool zip → delivered with deploy notes. Opt-in switches default OFF.

## 30-day foundation (do first, in order)
- [x] **01 · Lift the infra ceiling.** `job_queue` + a `/api/cron/worker` drained
  frequently via Supabase `pg_cron`+`pg_net` (free) or Vercel Pro crons; retries; run
  dashboard. Everything downstream scales off this.
  *Shipped 2026-09-21: migration 0086 (`job_queue` + `job_enqueue`/`job_dequeue`/
  `job_complete`/`job_fail`/`job_reap_stuck`/`job_prune` + `job_queue_stats`),
  `lib/jobs.ts` (enqueue / registry / time-boxed worker), `/api/cron/worker`,
  `supabase/pg_cron/schedule.sql` (free every-3-min drainer), admin "Background jobs"
  panel. Atomic claim verified with a real 2-worker parallel test (zero double-claim).*
- [x] **02 · Concierge analytics + unanswered-questions log.** Log every turn (channel,
  locale, retrieval counts, coverage, deferral reason, recommended slugs); admin view of
  coverage rate + top unanswered topics = the auto-generated scrape/write backlog.
  *Shipped 2026-09-21: migration 0083 (`concierge_events` + `concierge_coverage_daily`),
  `lib/concierge/analytics.ts` (`classifyCoverage` + `logConciergeTurn`), web-chat + email
  turns logged, admin Analytics panel shows coverage cards + backlog table.*
- [x] **03 · Error monitoring + CI smoke tests.** `error_log` + optional Sentry; GitHub
  Actions: `tsc`, formalised brain/guardrail suites, migration test on every push.
  *Shipped 2026-09-21: migration 0084 (`error_log` + `error_log_grouped` + `prune_error_log`),
  `lib/monitor.server.ts` durable sink wired into cron/mailroom/concierge, admin "System
  errors" panel; formalised unit suites (`scripts/tests/`, `npm test`, 45 assertions) +
  `.github/workflows/ci.yml` (typecheck + unit + full-migration smoke test on PG16+pgvector).
  The migration gate immediately caught & fixed a real cross-version portability bug in 0017.*
- [x] **04 · Directory coverage dashboard + sprint.** Coverage by category × district,
  % with coords, median data age; drive the scraper/enricher across top categories.
  *Shipped 2026-09-21: migration 0085 (coverage views — overall / by group / by district /
  category×district matrix), admin "Coverage" tab with a gap map and ranked sprint targets.
  Pair with the item-02 concierge backlog to prioritise scrape/enrich.*

## 30–60 day (close the loops)
- [x] **05 · Always-answer ladder + quality-eval harness.** grounded → curated → bounded
  cited web-search → honest defer+capture; gold-question suite (per language/intent) gating deploys.
  *Shipped 2026-09-21: the ladder (grounded → `topRated`/guides curated fallback → honest
  defer+capture) is now explicit so the concierge never dead-ends; a 39-question multilingual
  gold suite (`scripts/tests/concierge-gold.test.ts`) gates deploys via CI; and it caught &
  fixed a real bug — "seafront restaurant" was routing to real estate. The bounded cited
  web-search tier is deliberately deferred as an opt-in (per-turn cost + fabrication risk;
  needs an explicit switch given the cost mandate) — noted in AUDIT-ROADMAP.md.*
- [x] **06 · Mailroom ticketing + expanded safe auto-send.** status/owner/SLA/thread;
  confirmations/FAQ auto-send behind guardrails; desk routing; escalation; resolved → KB.
  *Shipped 2026-09-21: migration 0087 (ticket columns desk/assignee/priority/SLA/thread on
  inbound_emails + mailroom_stats/mailroom_tickets views + kb_candidates), `lib/mail/tickets.ts`
  (thread/priority/desk/SLA + safe-auto-answer whitelist, 24 unit tests), inbound arrival now
  sets desk/priority/SLA/thread, first-response tracked, admin mail page shows desk + priority +
  SLA badges. Expanded safe auto-send behind a 2nd default-OFF switch + narrow FAQ whitelist +
  full guardrails + grounding. kb_candidates is the resolved→KB review queue (promotion UI = follow-up).*
- [x] **07 · Close the acquisition loop.** OSINT prospect enrichment from the scraper →
  reply handling in the mailroom → self-serve checkout + automated onboarding; consent/deliverability gates.
  *Shipped 2026-09-21: the open middle — inbound REPLIES never reached CRM — is closed by
  `lib/crm/inbound.ts` (matches sender → logs the reply, pauses the sequence, flags the deal,
  routes to partnerships), wired into the inbound webhook. Prospecting (OSM importer +
  crm_upsert_account), checkout→onboarding (advertise webhook: account, deal, provisioning,
  onboarding email) and consent/suppression gates already existed — so the loop is now closed
  end-to-end. Verified against CRM fixtures; code-only, no migration.*
- [x] **08 · Attribution + advertiser ROI report.** recommendation → click → lead →
  conversion; per-advertiser ROI; upsell/retention.
  *Shipped 2026-09-21: migration 0088 (attribution_clicks + listing_recommendations /
  listing_attribution / advertiser_roi views), `/api/track/rec-click` + a concierge pick-click
  beacon, admin "Attribution & ROI" tab (per-advertiser revenue/leads/€-per-lead, featured-listing
  exposure + CTR, and most-recommended-not-featured = upsell candidates). Impressions reuse item
  02's logged recommendations; funnel verified (CTR math) on Postgres 16.*

## 60–90 day (the moat)
- [x] **09 · Partner self-service portal.** ownership claim + moderation; partners maintain
  their own services/projects/offers.
  *Shipped 2026-09-21: migration 0089 (listing_claims + listing_edit_requests + the SECURITY
  `apply_listing_edit` whitelist function), token-based claim flow (no new accounts:
  `emailMatchesListing` anti-spoofing → emailed one-time link), moderated edits (whitelisted
  fields only), `/partner` public portal, admin "Partners" moderation tab. Injection-safety of
  the apply function verified on Postgres 16; pure logic 16 unit tests.*
- [x] **10 · Proactive + transactional concierge.** personalised nudges; book/arrange/hold
  with desk/partner routing; saved-items / trip plan.
  *Shipped 2026-09-21: migration 0090 (saved_items, cid-keyed, cross-device), `/api/concierge/saved`
  (GET/POST add·remove), a "＋ Trip" button on every concierge pick, and the guest's trip plan now
  flows into the concierge context so it references saved places and offers to arrange them (via the
  existing request-capture → desk/partner routing). Proactive opener + request capture already
  existed. Dedup + 14 unit tests; all 87 migrations apply.*
- [x] **11 · Programmatic SEO at scale.** category × district pages from the directory;
  CWV budget; CTA conversion instrumentation.
  *Shipped 2026-09-21: category×district pages (`/best/[slug]`), group hubs, guides and market
  hubs already exist and are all in the sitemap (verified); CWV is monitored via Vercel Speed
  Insights (consent-gated). The new piece: CTA conversion instrumentation — migration 0091
  (`label` on attribution_clicks + `cta_by_listing` view), a `TrackedCTA` component wired into
  the listing website/phone/directions CTAs, and a CTA breakdown in the admin Attribution tab.*
- [x] **12 · GDPR/privacy register + data-sourcing statement.** lawful-basis, provenance,
  retention, subject-request flow; public sourcing statement.
  *Shipped 2026-09-21: migration 0092 (`dsar_requests` with the 1-month deadline +
  `data_processing_register` seeded with 7 real ROPA entries), `/api/privacy/request` +
  `PrivacyRequestForm`, a public 7-language data-sourcing statement at `/sourcing` (footer link +
  sitemap), and an admin "Privacy · GDPR" tab (DSAR queue + ROPA). Retention is recorded per
  activity in the ROPA and enforced by the prune functions from items 01/03.*

## KPIs to instrument (definition of "automated")
- Concierge **answer-coverage rate** + groundedness; **unanswered-question count** by topic (must fall).
- % inbound handled without a human send; median first-response time.
- Prospect → reply → checkout conversion; % onboarded hands-off.
- Recommendation → click → lead → paid; advertiser ROI & retention.
- Directory coverage by category × district; % listings with coords; median data age.
- Cron success rate; error rate; uptime; model spend per answer.

## Status log
- 2026-09-21 — Plan created from the audit. Item 02 in progress.
- 2026-09-21 — **Item 02 shipped.** `concierge_events` logs every turn (web + email) with a
  coverage verdict (full/partial/deferred) computed from retrieval counts + a multilingual
  defer-phrase heuristic. Admin → Analytics now shows the 30-day answer-coverage rate and the
  auto-generated "top unanswered questions" backlog (the scrape/write to-do list). Tested:
  migration applies + idempotent on UTF-8 Postgres, view math verified (80% on a 10-row
  fixture), backlog aggregation verified, `classifyCoverage` 8/8 unit tests (incl. EL/DE/AR
  defer detection), `tsc` clean.
- 2026-09-21 — **Item 03 shipped.** Durable `error_log` (+ grouped view + 90-day prune) gives
  in-app error visibility without paying for Sentry; `lib/monitor.server.ts` persists failures
  from the daily cron, the mailroom and the concierge stream, shown in a new admin "System
  errors" panel. Testing (the audit's lowest score, 1.8) is now real: `scripts/tests/` holds
  five pure-logic suites (coverage, retrieval, geo, mail auto-ack guardrail, error
  fingerprinting) run by `npm test` (45 assertions, all green), and `.github/workflows/ci.yml`
  runs typecheck + unit + a **full-migration smoke test** (all 81 migrations on a fresh
  PG16+pgvector via `supabase/ci/prelude.sql`) on every push. That gate immediately paid for
  itself: it caught a latent cross-version bug in 0017 (a generated column using the STABLE
  `array_to_string`, which fails on PG16+) — fixed with an IMMUTABLE text-array-join helper,
  behaviour identical, safe for the already-applied prod copy. Verified: `tsc` clean, `npm
  test` green, all 81 migrations apply in order locally.
- 2026-09-21 — **Item 04 shipped.** Directory coverage is now measurable: migration 0085 adds
  four views (overall, by category group, by district, and a category×district matrix), and a
  new admin "Coverage" tab renders headline coverage (coords / contact / photo / verified),
  a per-group table with median data age, a tinted gap map, and a ranked "thinnest cells"
  sprint list. This plus the item-02 concierge backlog turns "the directory feels thin" into a
  concrete, prioritised to-do list. Verified against the real 599-row seed: overall 21% coords
  / 98% contact, gap finder surfaces e.g. food×Larnaca (1). All 82 migrations apply in order;
  `tsc` clean; `npm test` green.
- 2026-09-21 — **Item 01 shipped — 30-day foundation COMPLETE (01–04).** A durable Postgres
  `job_queue` (migration 0086) lifts the single-daily-cron ceiling: atomic claim via FOR
  UPDATE SKIP LOCKED, exponential backoff, dead-lettering, dedupe, stuck-job reaping and
  retention. `lib/jobs.ts` gives `enqueue()`, a handler registry and a time-boxed `runWorker()`;
  `/api/cron/worker` drains it; `supabase/pg_cron/schedule.sql` has Postgres call the worker
  every 3 minutes via pg_net — **free, no Vercel Pro**. Admin → Analytics now shows queue
  health + dead-letters. The queue is additive and inert until something enqueues, so it ships
  safely; later items (05–11) enqueue onto it via the documented registry. Tested hard: 0086
  idempotent, all 8 semantic checks pass (dedupe, priority, backoff, dead-letter, reap), and a
  **real two-worker parallel claim test proved zero double-claim** (50/50 disjoint). `tsc`
  clean; `npm test` 50/50 green; all 83 migrations apply in order.
- 2026-09-21 — **Item 05 shipped.** The always-answer ladder is now explicit: grounded →
  curated fallback (`topRated` + guide pages, already in `assembleContext`) → honest defer that
  ALWAYS gives a next step and captures a contact — the "no matches" grounding branch now
  instructs exactly that, so the concierge never dead-ends. The deploy gate the audit asked for
  is live: `scripts/tests/concierge-gold.test.ts` — 39 gold questions across all 7 languages
  and every core intent (dining, stays, property, everyday services, neighbourhood, luxury,
  legal), run by `npm test` in CI. Writing it caught a real retrieval bug: the bare token
  "seafront" sat in the real-estate intent list, so "a seafront restaurant" resolved to
  property; removed it (property queries always carry a property noun), with a gold regression
  guard. `tsc` clean; `npm test` now 89/89 across 7 suites. The bounded cited web-search rung
  is deliberately deferred (opt-in; per-turn cost + fabrication risk vs the cost mandate).
- 2026-09-21 — **Item 06 shipped.** The mailroom is now a ticketing system: migration 0087 adds
  desk, assignee, priority, first-response SLA, thread key and tags to inbound_emails, with
  `mailroom_stats` (open / breached / due-soon / median first-response) and `mailroom_tickets`
  (worst-first) views. `lib/mail/tickets.ts` holds the pure logic — reply-prefix-stripping thread
  keys, multilingual priority + desk routing, SLA computation, and a deliberately narrow
  safe-auto-answer whitelist — with 24 unit tests. Inbound mail is now auto-triaged on arrival
  (desk/priority/SLA/thread), first human response is timestamped for SLA, and the admin mail
  page shows desk, priority and SLA-breach badges. Expanded safe auto-send is live but doubly
  gated: a second default-OFF switch (`mail_autoanswer_enabled`) + the strict first-contact
  guardrails + a purely-informational FAQ whitelist + a grounding requirement — so only things
  like "how do I unsubscribe/subscribe" ever auto-answer; advice, prices, bookings and anything
  high/urgent always wait for a human. `kb_candidates` is the resolved→KB review queue. `tsc`
  clean; `npm test` 113/113 across 8 suites; all 84 migrations apply.
- 2026-09-21 — **Item 07 shipped.** The acquisition loop is now closed end-to-end. The two ends
  already existed — prospecting (OSM importer + `crm_upsert_account`) and checkout→onboarding
  (the advertise Stripe webhook already creates the CRM account, opens a won/live deal,
  auto-provisions the placement via `fulfil_ad_order`, and sends an onboarding email), plus
  consent/suppression gates on outreach. The missing middle was reply handling: a prospect's
  reply landed in the mailroom but never touched CRM. `lib/crm/inbound.ts` (wired into the
  inbound webhook) matches the sender to a contact, logs the reply on the deal timeline, PAUSES
  the automated sequence so a human takes over, flags the deal for follow-up, and routes the
  ticket to partnerships. Verified against CRM fixtures on Postgres 16 (reply logged, sequence
  paused, deal flagged, case-insensitive email match); wildcard-escape unit-tested. Code-only,
  no migration. `tsc` clean; `npm test` 117/117 across 9 suites.
- 2026-09-21 — **Item 08 shipped.** Attribution funnel + advertiser ROI. Migration 0088 stitches
  recommendation impressions (reusing item-02's logged `recommended` slugs) → clicks (new
  `attribution_clicks`, fed by `/api/track/rec-click` + a beacon on each concierge pick) →
  leads/revenue (CRM `concierge_requests` + `ad_orders`, by advertiser). Three views:
  `listing_recommendations`, `listing_attribution` (per-listing impressions/clicks/CTR, featured
  flagged), `advertiser_roi` (per-account revenue, orders, leads, €/lead). New admin
  "Attribution & ROI" tab shows advertiser ROI, what exposure the concierge gave each featured
  listing, and — nicely — the most-recommended listings that are NOT featured as concrete upsell
  candidates. Funnel math verified on Postgres 16 (3 recs, 1 click → 33.3% CTR). `tsc` clean;
  `npm test` 117/117; all 85 migrations apply. Also added a "CI only — do not run on Supabase"
  banner to `supabase/ci/prelude.sql`.
- 2026-09-21 — **Item 09 shipped.** Partner self-service, token-based (no new account system).
  Migration 0089 adds `listing_claims`, `listing_edit_requests`, and the security-critical
  `apply_listing_edit()` — which writes ONLY a whitelist of fields (contact + 7-language
  descriptions + the partner's own pitch), so a crafted payload can't touch status, featured,
  ratings or coordinates (verified against fixtures: an injected `featured/status/rating` was
  ignored). Flow: a business owner enters their listing + the email on file → `emailMatchesListing`
  (same address / email domain / site domain) gates it → a one-time link is emailed → they edit
  the whitelisted fields → the change lands in a MODERATION queue → an admin approves → it
  publishes. `/partner` is the public portal; a new admin "Partners" tab moderates claims and
  edits. Pure logic (sanitize + anti-spoofing) has 16 unit tests. Per the owner's request, this
  bundle contains ONLY the files changed for item 09. `tsc` clean; `npm test` 133/133 across 10
  suites; all 86 migrations apply.
- 2026-09-21 — **Item 10 shipped.** Saved items / trip plan, server-persisted by the anonymous
  cid so it survives across devices (unlike the localStorage "recently viewed"). Migration 0090
  adds `saved_items`; `/api/concierge/saved` reads/writes it (dedup upsert); every concierge pick
  now has a "＋ Trip" button; and the guest's trip plan is injected into the concierge context so
  it can reference the saved places by name and warmly offer to arrange or book them — routed to
  the desk through the request capture that already exists. The proactive opener and tier-aware
  request routing were already in place. `tsc` clean; `npm test` 147/147 across 11 suites; all 87
  migrations apply.
- 2026-09-21 — **Item 11 shipped.** Most of "programmatic SEO at scale" was already built and
  verified: category×district landing pages (`/best/[slug]` via facets), the 12-group hubs
  (`/directory/g/[group]`), KB guides and per-market hubs (`/for/[id]`) — all enumerated in
  `app/sitemap.ts` alongside every article and listing. Core Web Vitals are already monitored by
  Vercel Speed Insights (consent-gated in `ConsentAnalytics`). The genuine gap was measuring what
  visitors DO on those pages, so this adds CTA conversion instrumentation: migration 0091 (`label`
  on `attribution_clicks` + the `cta_by_listing` view), a reusable `TrackedCTA` client component
  now on the listing website/phone/directions buttons (logs source=directory + which CTA), the
  beacon endpoint stores the label, and the admin Attribution tab shows a CTA-clicks breakdown.
  `tsc` clean; `npm test` 147/147 across 11 suites; all 88 migrations apply.
- 2026-09-21 — **Item 12 shipped — THE 12-ITEM ROADMAP IS COMPLETE.** GDPR compliance:
  migration 0092 adds `dsar_requests` (data-subject requests, each with the GDPR 1-month
  response deadline) and `data_processing_register` (the ROPA, seeded with the platform's seven
  real processing activities — directory, concierge, mailroom, outreach, newsletter,
  membership/payments, analytics — each with purpose, lawful basis, data categories, recipients,
  retention). A public **data-sourcing statement** at `/sourcing` explains, in all seven
  languages, where the directory data comes from, how it's kept accurate (with a link to the
  item-09 partner portal), and privacy rights — with an inline data-request form. `/api/privacy/
  request` files the request and notifies the privacy desk; a new admin "Privacy · GDPR" tab
  runs the DSAR queue (overdue flagged) and shows the ROPA. Footer + sitemap updated; 7 message
  files extended. `tsc` clean; `npm test` 147/147 across 11 suites; all 89 migrations apply.
  ── **All of items 01–12 are now shipped, each tested and delivered as its own minimal bundle.**

## Next tier (items 13–18, from the re-audit)
- 2026-09-22 — **13 · All background work moved onto the queue.** The daily tick no longer runs
  scraping/developments/regulations/events/outreach inline; it now ENQUEUES them (one per
  subsystem per day, deduped, only for enabled switches) plus the coordinate backfill, then
  drains a 45s batch. Each subsystem is a self-guarding queue handler (re-checks its switch), so
  with Supabase pg_cron the worker drains continuously and throughput is no longer capped by the
  60s daily window. `lib/jobs.handlers.ts` + `app/api/cron/tick/route.ts`; no migration. `tsc`
  clean; `npm test` 155/155.
- 2026-09-22 — **14 · Live-model concierge quality evals.** The gold suite (item 05) proves
  retrieval + routing offline; this scores the concierge's *actual prose* from the live model. A
  curated eval set (`EVAL_SET` — 24 synthetic, PII-free questions across the intents that matter,
  in all seven languages) is answered by the real concierge (same grounding it serves guests),
  then a cheap Haiku judge — given the SAME context — rates each answer 1–5 on **grounded**
  (invents no business/price not in context), **language** (written fully & naturally in the
  guest's tongue) and **helpful**. Verdict: a hallucination (grounded ≤ 2) or wrong language
  (language ≤ 2) is a hard **fail**; a mediocre average (< 3.5) is **weak**; else **pass**.
  Results land in `concierge_evals` (migration 0097) with a per-run `concierge_eval_summary` view.
  **On-demand / opt-in only** — every run costs model calls, so it is NEVER auto-scheduled: the
  admin Analytics tab has *Run quick sample* (4 items, synchronous, instant scores) and *Queue
  full eval* (the whole set, chunked across worker cycles by the new `eval_concierge` queue job
  which re-enqueues its next chunk). New: `lib/concierge/eval.ts`, `app/api/admin/concierge/eval/
  run/route.ts`, `analytics/EvalRunner.tsx`, section in `analytics/page.tsx`; `eval_concierge`
  handler in `lib/jobs.handlers.ts`. Migration 0097 applies on the full-migration gate (idempotent;
  summary view verified). Pure verdict/scoring/sampler logic has 33 unit tests; `tsc` clean;
  `npm test` 188/188 across 13 suites.
- 2026-09-22 — **15 · Executable DSAR erasure.** Item 12 gave us the DSAR intake + the ROPA; this
  makes an erasure request actually *erasable* in one audited call instead of a manual hunt across
  a dozen tables. New SQL function `erase_personal_data(email, actor, request_id)` (migration 0098):
  it purges the subject's personal data everywhere it lives — `contacts`, `newsletter_subscribers`,
  `contact_messages`, `blog_comments`, `crm_contacts`, `ad_leads`, `directory_leads`,
  `concierge_requests`, `concierge_members`, `inbound_emails` and the KB rows derived from their
  mail — and cascades to the anonymous concierge tables (`concierge_events`, `saved_items`,
  `concierge_memory`) via the cid recorded on their membership. It does the two things the law
  requires us to KEEP: it **anonymises** (does not delete) the `ad_orders` accounting rows we must
  retain for tax, and it **reinforces the opt-out** by ensuring an `crm_suppression` record so an
  erasure can never re-open contact. Every run writes a `dsar_erasure_log` row proving what was
  erased, for whom (a SHA-256 hash + a masked address, never plaintext), by which admin, with
  per-table counts. Wrapped by `lib/privacy/erase.ts` and `app/api/admin/privacy/erase` (admin
  session AND an explicit `confirm:true`); the admin Privacy tab gets a per-request **Erase data**
  button and a standalone erase-by-email box, both behind a typed confirm. Proven end-to-end on
  Postgres: a full 16-table seed → erase → every subject row gone, the decoy kept, the order row
  retained but de-identified, suppression added, audit hashed; idempotent and input-guarded. Pure
  validators have 13 unit tests; `tsc` clean; `npm test` 201/201 across 14 suites; all migrations
  apply (0098 idempotent).
- 2026-09-22 — **17 · Per-listing revenue attribution.** Item 08 measured revenue per advertiser
  ORG and engagement per LISTING, but nothing tied the money to the listing — so we could see who
  spends and which listings get clicked, but not *which listings earn*. New `listing_revenue` view
  (migration 0099) closes that: it joins each published listing to its advertiser account
  (`crm_orgs.directory_listing_id`, kept in sync by the CRM-unify trigger) and brings together, per
  listing, booked revenue (paid/active `ad_orders`, same definition as `advertiser_roi`), won and
  open-pipeline deal value (`crm_deals` by stage), live placements (`sponsor_banners`), and 90-day
  concierge engagement (recommendations + tracked opens), with € and € / click. The admin
  Attribution tab gets a **Revenue by listing** table (booked/pipeline totals, earning count). A
  read-only view over existing tables — no new writes. Arithmetic verified on Postgres (seeded
  listing → €1,340 booked from 2 paid/active orders with a pending one correctly excluded, €5,000
  won, €2,000 pipeline, 1 placement, 2 recs, 3 clicks, €446.67/click); `tsc` clean; `npm test`
  201/201; all 96 migrations apply (0099 idempotent).
- 2026-09-22 — **18 · Resilience hardening.** Turned "it should recover" into something
  written down and testable. New `DR-RUNBOOK.md`: RPO/RTO targets, where state actually lives
  (Postgres = the only durable store; Vercel stateless; the rest re-derivable), backups (Supabase
  PITR/daily + a weekly `pg_dump` that works on Free), a **quarterly restore drill** that reuses
  the CI prelude + migration gate to prove a dump is good, recovery playbooks (bad deploy →
  instant Vercel rollback, Supabase outage, data corruption, leaked key, bad automation), a
  **secret-rotation table** (every key → where → blast radius → cadence) and a restore-drill log.
  A real **CWV/first-load-JS budget gate**: `scripts/perf/check-budgets.mjs` reads the App Router
  build manifest, sums the JS each *navigable* page ships (route handlers and layout/loading/error
  fragments skipped), and fails if a route is over `perf-budgets.json` (budgets calibrated from a
  measured build with headroom, so it's green now and trips on a real regression); the pure logic
  is unit-tested. A zero-dependency **load-test** probe (`scripts/perf/loadtest.mjs`,
  p50/p90/p95/p99 per route). Wired as `npm run perf:budgets` / `perf:loadtest` and a **manual**
  `.github/workflows/perf.yml` (kept off the fast push CI). Gate proven end-to-end on a real build
  (98 routes measured, OVER/OK detection, correct exit codes) and on fabricated manifests
  (exclusions confirmed). `tsc` clean; `npm test` 218/218 across 15 suites; no migration.
  the tier's code/infra work.
- 2026-09-22 — **16 · Bulk multilingual content sprint (batch 1).** The one non-code tier item:
  real editorial, all seven languages, no English fallback (a null `content_{locale}` falls back to
  English in `getArticle`, so every locale must be populated). Shipped a prioritised, evidence-based
  worklist (`EDITORIAL-BACKLOG.md`) derived from the 78 concierge KB intents (item 02) + directory
  verticals + monetisation (item 17), tiered P0–P2 with per-article briefs. And **batch 1**: two
  flagship evergreen articles — "Buying property in Cyprus as a foreigner" and "The best time to
  visit Cyprus" — each **web-researched and cited** (VAT 5%/19%, the non-EU permit + ~4,014 m²
  limit, transfer-fee reduction, stamp-duty abolition from 1 Jan 2026, seasonal + sea temperatures;
  sources recorded per article, "as of 2026" caveats per the grounding rules), written in **all
  seven languages**. Authored as structured data (`scripts/seed/articles.data.mjs`) and compiled by
  a generator (`gen-articles-sql.mjs` + pure `sql-util.mjs`) into an idempotent UPSERT migration
  (`0100_seed_articles.sql`), so re-runs update in place and never duplicate. Verified on Postgres:
  97 migrations apply, both articles present with all seven `content_{locale}` non-null, idempotent
  re-apply. Generator escaping + data completeness have 16 unit tests; `tsc` clean; `npm test`
  234/234 across 16 suites. **Next-tier items 13–18 all complete.** Next content batches: P0 #3–#5
  from the backlog (tax residency, relocation checklist, company formation).

- 2026-09-22 — **16 · Content batch 2 + perf-budget recalibration.** Three more P0 articles —
  *Cyprus tax residency: the 60-day rule & non-dom*, *Moving to Cyprus: a relocation checklist*,
  *Setting up a company in Cyprus* — web-researched and written in all seven languages, completing
  the P0 tier. Research caught two figures that would have been wrong from memory: corporate tax
  **rose to 15%** on 1 Jan 2026 (OECD Pillar Two, from 12.5%) and dividend **SDC is 5% from 2026**;
  both are stated with the effective date and an "as of 2026, take professional advice" caveat. The
  generator now tags each article with a `batch` and writes each batch to its own migration, so an
  already-applied batch is never rewritten — batch 2 is `0101_seed_articles_batch2.sql` and `0100`
  is byte-for-byte unchanged (verified). Full gate: 98 migrations apply, 0101 idempotent, all three
  articles have every `content_{locale}` non-null. Also **recalibrated `perf-budgets.json`** from a
  real production compile of this repo (measured per-route first-load 395–426 KB public, 598–619 KB
  admin — the earlier "loose" read had confused this with Next's ~102 KB *shared* figure): budgets
  tightened to a ~10% ratchet (470 public / 680 admin), gate verified green. `tsc` clean; `npm test`
  234/234 across 16 suites.
- 2026-09-22 — **Deploy unblocked.** Every deploy for ~20h had failed: `app/[locale]/admin/(panel)/
  mail/page.tsx` and `app/api/email/inbound/route.ts` imported `@/lib/mail/tickets` and
  `@/lib/crm/inbound` (items 06/07), but those two files had never reached the GitHub repo, so
  webpack aborted the build and nothing — including items 13–18/16 — deployed. Verified the cause
  from the build log (webpack lists all unresolved modules; only these two) and a local scan (all
  213 files' `@/` imports resolve). Re-delivered the two files; build then went green and shipped
  the whole backlog in one deploy.

- 2026-09-22 — **16 · Content batch 3.** Three P1 articles — *The cost of living in Cyprus (2026)*,
  *Renting a home in Cyprus*, *Healthcare in Cyprus: GESY & private* — web-researched (2026 figures:
  monthly budgets and rents by city, one-to-two-month deposits and tenant rights, GESY 2.65%
  contribution and the €6 specialist co-pay) and written in all seven languages. Migration
  `0102_seed_articles_batch3.sql`; 0100 and 0101 verified byte-unchanged. Full gate: 99 migrations
  apply, 0102 idempotent, all three articles have every `content_{locale}` non-null. `tsc` clean;
  `npm test` 234/234 across 16 suites. Backlog now: P1 #9–#14.

- 2026-09-22 — **Bulk directory import (cyprusatlas → concierge).** Turned a 17.7k-row scrape of
  cyprusatlas.com into ~15,500 real businesses for the concierge to ground on ("what's near me — a
  cleaner, an AC repairer, a lawyer"). Cleaner (`scripts/import/clean_atlas.py`) keeps real
  businesses with an address or phone, maps the category (from the Additional Type URL) to our
  taxonomy, parses district from the address, normalises phones, drops scraped descriptions/images
  (IP — factual fields only), and de-dupes within the file. Imported as **`status='listed'`** — a
  new state the **concierge reads but the public website does not** (`brain.ts` now filters
  `status IN ('published','listed')` in all 10 directory queries; the site still shows only
  `published`). The merge (`atlas-1-staging.sql` + `atlas-2-merge.sql`) is anti-joined on the
  directory de-dup key + phone + slug, so it never duplicates the existing ~3,000, and it backfills
  outreach email onto the CRM accounts the sync trigger creates (~3,700 emailed prospects). Fixing
  this surfaced a real latent bug: the 0074 de-dup key stripped `[^a-z0-9]`, collapsing every
  Greek-named business to one key — fixed unicode-aware in `0103_directory_dedup_unicode.sql` (finer
  key, index rebuilt, idempotent). Proven end-to-end on Postgres: 100 migrations apply, full 15,535
  file merges to 15,240 listed (295 dedup-skipped), seeded duplicates stayed single rows, 3,719 CRM
  prospects with email, concierge sees `listed`/website sees only `published`. `tsc` clean; `npm
  test` 234/234; 0103 idempotent.

- 2026-09-22 — **Import monitor (admin).** Added an "Imported directory · concierge listings"
  section at the top of the admin Coverage tab: cards for listed total, geocoded %, awaiting
  geocode, with-email (outreach), and published; a geocoding progress bar + queued-jobs count; and
  a per-district table so you can watch the import land and the coordinates fill in. Queried
  directly against `directory_listings`/`job_queue` (the coverage views are published-only), so no
  migration. Verified against the 15,240-row test import (district split correct; % advances as
  rows geocode). `tsc` clean.

- 2026-09-22 — **Concierge retrieval for the imported directory.** After the bulk import, a live
  test ("reparator aer condiționat în Pila") returned nothing — two gaps, not model failure: the
  category matcher had no **air-conditioning** entry (so it never searched the 39 `air-conditioning`
  + 14 `auto-airconditions` + … subtypes), and **village names didn't map to districts** (Pyla/Pila
  → Larnaca was absent). Fixed in `brain.ts`: added multilingual `CATEGORY_PROBES` for the home
  trades that dominate the import (air-conditioning, electrician, plumber, appliance repair,
  locksmith, heating, painter, carpenter — EN/EL/RO/DE/PL/RU/AR), and a curated, collision-checked
  village→district alias set for all five districts (Nicosia, Limassol, Larnaca, Paphos, Famagusta).
  Verified against the imported data: the concierge's own query now returns real AC businesses by
  district (46 Nicosia, 12 Limassol, 9 Paphos, 5 Famagusta, 3 Larnaca). Pure-logic tests +10
  (`brain.pure` 34); `tsc` clean; `npm test` 244/244 across 16 suites. (Precise radius still
  sharpens as geocoding fills coordinates; district+category works now.)

## Post-roadmap follow-through
- 2026-09-22 — **A · Job queue activated.** Item 01's queue was live but inert; now it does real
  work. New handlers registered (`lib/jobs.handlers.ts`): `geocode_listing` (coordinate backfill,
  one listing per job, cached + Cyprus-bounded — lifts directory coord-coverage from item 04 over
  time) plus `developments`/`regulations`/`events_mine`/`outreach` as enqueueable jobs. The daily
  tick now tops up the geocode backlog (`enqueueGeocodeBacklog`, deduped per slug) and drains a
  time-boxed batch, so it progresses with OR without pg_cron; pg_cron drains continuously between
  ticks. Pure helpers unit-tested (`jobs.geocode`); `tsc` clean; `npm test` 155/155 across 12
  suites. No migration. Next: B (operator runbook).
- 2026-09-22 — **B · Operator runbook shipped** (`RUNBOOK.md`): go-live checklist, where-to-watch
  table for all 12 features, the switches table (all default OFF), env vars, testing, a weekly
  review and troubleshooting.
- 2026-09-22 — **C · Content & quality backlog.** Fixed "compare with similar" (`getPeers` in
  lib/queries.ts): it filtered by the broad category_group, so a law firm could be compared with
  banks. Now it fetches narrowest-first (same subtype → type → group, topping up only if thin) so
  comparisons are genuinely the same kind of business, with same-district as a minor re-rank.
  Verified: the Advertise FAQ is already in step with the live rate card (€490/yr, €850/mo), and
  the de/pl/ru legacy-article backfill shipped earlier — so those needed no change. Bulk NEW
  multilingual article writing remains a large, separate content effort (available on request).
  `tsc` clean; `npm test` 155/155. No migration. Next: D (fresh deep audit).
- 2026-09-22 — **Outreach · Polish + Russian added → all seven editions.** Migration 0096 seeds
  the four cadence emails in PL and RU (concierge voice), completing the set (28 templates across
  7 locales). Both added to the Sponsors enrol-language dropdown and the template-editor tabs. No
  engine change needed (it already resolves any locale with EN fallback). `tsc` clean; `npm test`
  155/155; all 93 migrations apply.
- 2026-09-22 — **Outreach · multilingual (EN/EL/RO/AR/DE).** Migration 0095 adds `locale` to
  crm_templates + `outreach_locale` to crm_orgs, drops the old one-per-step unique index (now
  unique on locale+step), and seeds all four cadence emails in five languages (20 templates,
  concierge voice, RTL Arabic). The engine (`lib/outreach.ts`) now picks each business's language
  with an EN fallback and renders RTL for Arabic. `enroll_prospects_bulk` gained a `p_locale` arg
  that stamps the batch's language; the Sponsors "Enrol all in filter" control has a language
  dropdown, and the template editor has EN/EL/RO/AR/DE tabs (RTL-aware). Verified on Postgres 16
  (20 templates, locale stamp + enrol); `tsc` clean; `npm test` 155/155; all 92 migrations apply.
- 2026-09-22 — **Outreach · templates v2.** Migration 0094 rewrites the four cadence emails in
  the Cyprus Lifestyle editor-in-chief / private-concierge voice, leading with the platform's
  current, unique position: independent seven-language guide, verified/merit-based directory, and
  a concierge that recommends businesses BY NAME to high-intent readers (warm introductions, not
  advertising). Steps: 1 invitation, 2 founding-partner value, 3 gentle nudge, 4 gracious close.
  Placeholders preserved; editable in Admin → Sponsors → Email templates. Idempotent; all 91
  migrations apply.
- 2026-09-22 — **Outreach · one-click bulk enrol.** Migration 0093 (`enroll_prospects_bulk`)
  + `/api/admin/outreach/enroll-bulk` + a "＋ Enrol all in filter" button on the Sponsors tab.
  Enrols every eligible account in the current vertical/tier/stage/search filter into the
  first-contact sequence in one click; the DB skips no-email / opted-out / suppressed /
  already-enrolled accounts, and it only QUEUES (sending stays gated by the on-switch + daily
  cap). Eligibility verified on Postgres 16; `tsc` clean; all 90 migrations apply.
- 2026-09-22 — **D · Fresh re-audit delivered** (`cyprus-lifestyle-reaudit-2026-09.html`).
  Re-scored every dimension against the first audit: Infrastructure 4.8→8.2, Observability
  3.2→8.5, Testing 1.8→8.0, Concierge 8.0→9.0, Commercial 6.5→8.0, Compliance 5.0→8.2 (data
  coverage 6→7 and security 6→6.5 remain the yellows). Verified all 12 items + the queue
  activation are live, and set the next tier (items 13–18): move all background work onto the
  queue, live-model quality evals, executable DSAR erasure, a bulk multilingual content sprint,
  per-listing revenue attribution, and resilience hardening. ── **Post-roadmap A–D all shipped.**

---

## Concierge Intelligence Programme (2026-09 →) — "make him as smart as possible"

**North star (Daniel):** an adviser who knows Cyprus like a brilliant local friend —
investing & law, fine *and* casual dining, museums, theatre, archaeology, weather,
the sea (diving, boats, yachts), jewellery, fashion, nightlife & the party miles,
prices, culture, and an honest, warm read on how the island feels now — with the
taste and timing to make you smile and still give the right advice.

**Three pillars:** (1) *Retrieval intelligence* — light all three legs (semantic +
proximity + keyword), hybrid-rank, LLM query understanding; (2) *Knowledge breadth* —
grow the KB (priced, cited), enrich the directory with the missing categories, editorial
for taste, a refreshable "State of Cyprus"; (3) *Taste & personality* — warmth, wit,
timing, never at grounding's expense. **Measured against the vision the whole way.**

**Diagnosis (from the code):** the brain has three retrieval legs but two are dark for
the 14,671 bulk imports — `match_directory` (0051) still filters `status='published'`,
the imports have no embeddings, and they have no coordinates. So semantic + radius
silently skip them and only brittle keyword ILIKE carries the load. Fix in the order
below, measuring before and after.

- [x] **CI-1 · Baseline instrument (breadth coverage probe).** *Shipped 2026-09-23:*
  `lib/concierge/coverage.ts` — a retrieval-only probe (directory + KB + articles, **no
  answer/judge model, so free**) across 28 vision topics in all 7 languages, graded
  blind/thin/ok/strong with pure, unit-tested scoring; migration `0104_concierge_coverage`
  (table + `concierge_coverage_summary` / `concierge_coverage_topics` views, SQL score
  identical to the TS); admin route `POST /api/admin/concierge/coverage/run` returns an
  overall score + per-topic/per-locale breakdown + the gap worklist; `EVAL_SET` (live
  quality eval) widened to the same breadth. `tsc` clean; `npm test` 17 suites (coverage.pure
  30); all 101 migrations apply. **This is the baseline every later CI-item must beat.**
  *Baseline run 2026-09-23 (prod): overall **68.8/100**, n=55, 1 blind / 24 thin / 30 ok-strong.
  Directory healthy (casual dining, cafés, beaches, diving, boat-trips, yachts, jewellery, stays,
  health, relocation, car-rental, tax, company all 100). Gaps are the two adviser layers:
  editorial/articles empty (fine-dining, museums, theatre, archaeology, fashion, nightlife,
  wineries capped at 34) and KB thin (investing, culture, state-of-cyprus, prices, weather, law).
  Locale EN 76 / RO 87 / AR 84 vs EL 47 / PL 51 / RU 34 (partly topic-mix — matched set at CI-5).*
- [x] **CI-2 · Light the dark legs.** *Shipped 2026-09-23:* migration `0105` redefines
  `match_directory` to return `status in ('published','listed')` (semantic search now sees the
  imports); the embed backfill (`/api/concierge/embed-directory`) and `enqueueGeocodeBacklog`
  both extended to `'listed'`; new `lib/concierge/localities.ts` (~90 towns → district, pure
  `findLocality`) + `/api/concierge/geocode-directory` — a coordinate FAST PASS that geocodes each
  distinct town once (cached) and stamps town-level coordinates on every business in it, so radius
  search ("nearest in Pyla") works in minutes; the per-address `geocode_listing` job then refines.
  `tsc` clean; `npm test` 18 suites (localities.pure 28); all 102 migrations apply, `match_directory`
  verified to include `'listed'`. Deploy order: apply 0105 → run `embed-directory` (repeat until
  remaining=0) → run `geocode-directory` (repeat until remaining=0).
  - **CI-2.1 (2026-09-23):** `geocode-directory` now ships built-in town centroids for ~90 Cyprus
    localities (no Nominatim dependency, no rate-limit), so one call stamps thousands and the whole
    backlog clears in 1–2 calls instead of ~30. First live run stamped 460/500 with the old geocoder
    path (96% of the page resolved); the per-address `geocode_listing` job still refines to street
    level. `localities.pure` grew coord-bounds + spot-check tests (32 assertions).
- [x] **CI-3 · Smarter retrieval (query understanding).** *Shipped 2026-09-23:* new
  `lib/concierge/understand.ts` — a cheap Haiku pass that reads a message in ANY language and
  returns `{district, subtype, keywords[], luxury}` in English, folded into the query so the
  proven keyword engine (readIntent/categoryProbes/district filter) matches it — killing the
  whack-a-mole and directly lifting the weak languages (EL/PL/RU) without touching dictionaries.
  Integrated into `assembleContext` as an additive, high-precision lead pass (parallelized;
  degrades to null on error). Opt-in via `CONCIERGE_LLM_UNDERSTAND=1` (a Haiku call per turn,
  ~fraction of a cent, 3.5s timeout); `callClaude` gained a `timeoutMs`. `tsc` clean; `npm test`
  19 suites (understand.pure 21). *Deferred as a later tune: reciprocal-rank fusion and
  category-taxonomy embeddings — the query-understanding pass covers most of their benefit.*
- [~] **CI-4 · Knowledge breadth sprint.** Fill the worst gaps the baseline shows — KB entries
  and verified directory categories (diving, yachts, jewellery, fashion, nightlife, museums,
  theatre, archaeology, casual dining) — worst topic first.
  - [x] **CI-4a · KB facts for the blind topics.** *Shipped 2026-09-23:* added three QAItems to
    `lib/knowledge/qa.ts` — `investing-in-cyprus` (sectors, the four foreign-investment routes,
    15% corporate tax / non-dom / IP box, with the golden-passport caveat), `cypriot-culture`
    (Orthodox core, philoxenia, coffee, meze, name days, panigyria/Kataklysmos, crafts) and
    `state-of-cyprus` (EU/eurozone, safety, ~3× EU-average growth, ~4% unemployment, A-/A ratings,
    kept neutral + refreshable). Each web-researched and carries a citable `source`. New
    `kb.content` test proves all three are retrievable, not just present. `tsc` clean; `npm test`
    20 suites. *After deploy, run the KB embed backfill so the multilingual (vector) path also
    covers them.* NB: KB keyword retrieval is English-token-based, so non-English coverage of
    these rides the embedded path — another reason CI-3 (query understanding) + KB embeddings matter.
  - [x] **CI-4b · Editorial taste (as KB).** *Shipped 2026-09-23:* six taste-laden KB entries in
    `qa.ts` — `fine-dining`, `nightlife`, `museums`, `archaeological-sites` (3 UNESCO + Kourion),
    `fashion-shopping` (Stasikratous), `theatre-arts` (Rialto, Paphos Aphrodite Festival, Kourion) —
    naming public landmarks/areas, never directory businesses, each cited (visitcyprus / UNESCO).
    KB is fed to the concierge IN FULL (unlike article titles), so it advises with real taste now.
    `coverage.ts` updated so these taste topics count as covered by listings + knowledge; standalone
    web articles remain a future site enhancement. `kb.content` 14 assertions; `tsc` + tests green.
    Also **CI-2.2**: embed backfill batch raised 96→512 so it finishes in ~2 calls.
  - [ ] **CI-4b-articles · (optional) full editorial articles** for SEO/reader depth on the same topics.
  - [ ] **CI-4c · Weak-language parity** (EL/PL/RU) once CI-3 is enabled and measured.
- [x] **CI-6 · Enterprise retrieval (semantic-first, district-scoped).** *Shipped 2026-09-23,
  from live evidence:* the import stored each business's subtype as the raw source slug
  (`clean_atlas.py`), so gyms are 'health-clubs'/'sports-clubs', solar is 'solar-energy', etc. —
  a keyword probe can never catch them all, in any language (proven live: "sala de gimnastica in
  6021" returned hotels; "panouri solare" returned nothing; only 1 Larnaca gym found while many
  showed in Limassol/Nicosia). Fix: migration `0106` gives `match_directory` a **district filter**;
  `brain.ts` retrieval is rebuilt **semantic-first** — the query embedding drives a **district-scoped
  vector search** (K=15) as the primary leg, fused most-precise-first (exact keyword → category+
  district by meaning → raw keyword → global meaning); the postcode/neighbourhood path now filters
  category from the LLM-normalised query too. Language- and slug-agnostic by construction: "sala de
  gimnastică", "gym", "γυμναστήριο" all land on the same Larnaca gyms without a hand-coded word.
  New **/api/admin/concierge/retrieval-trace** shows every leg's hits (observability — no more
  guessing). `tsc` clean; `npm test` 20 suites; 103 migrations apply, `match_directory` verified as
  a single 4-arg overload. Proof step: after deploy + apply 0106, run the trace on the failing
  queries and watch the semantic(district) leg surface what keyword missed.
- [x] **CI-7 · Rerank + commercial tier (precision + revenue).** *Shipped 2026-09-23:* new
  `lib/concierge/rerank.ts` — a cheap Haiku pass scores each top-K candidate's relevance (0–3) to
  the request, then fuses `relevance*10 + tier*2 + rating` so (a) wrong-category noise drops (the
  taxi that outranked a locksmith scores 0 and leaves), and (b) among genuinely relevant results
  paying subscribers lead in tier order (featured > verified > basic) — **honest by design, since
  relevance dominates and a partner can never beat a clearly better match.** Wired into
  `assembleContext` before picks; the retrieval-trace gains a `final(reranked)` leg so the ordering
  is inspectable. Opt-in via `CONCIERGE_RERANK=1`. Commercial tier currently reads the existing
  `featured`/`verified` signals; the full CRM subscription tier gets mirrored onto listings in
  Phase 1. `tsc` clean; `npm test` 21 suites (rerank.pure 15); no migration. This is the Phase-2
  precision+revenue layer from CONCIERGE-STRATEGY.md.
- [ ] **CI-5 · Taste & personality + re-measure.** Persona tuning (warmth/wit/timing) with a
  delight axis added to the eval; re-run coverage + live evals to prove the gains.
