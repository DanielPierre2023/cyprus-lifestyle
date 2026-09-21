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
- [ ] **10 · Proactive + transactional concierge.** personalised nudges; book/arrange/hold
  with desk/partner routing; saved-items / trip plan.
- [ ] **11 · Programmatic SEO at scale.** category × district pages from the directory;
  CWV budget; CTA conversion instrumentation.
- [ ] **12 · GDPR/privacy register + data-sourcing statement.** lawful-basis, provenance,
  retention, subject-request flow; public sourcing statement.

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
  suites; all 86 migrations apply. Next: item 10 (proactive + transactional concierge).
