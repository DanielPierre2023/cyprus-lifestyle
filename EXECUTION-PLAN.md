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
- [ ] **06 · Mailroom ticketing + expanded safe auto-send.** status/owner/SLA/thread;
  confirmations/FAQ auto-send behind guardrails; desk routing; escalation; resolved → KB.
- [ ] **07 · Close the acquisition loop.** OSINT prospect enrichment from the scraper →
  reply handling in the mailroom → self-serve checkout + automated onboarding; consent/deliverability gates.
- [ ] **08 · Attribution + advertiser ROI report.** recommendation → click → lead →
  conversion; per-advertiser ROI; upsell/retention.

## 60–90 day (the moat)
- [ ] **09 · Partner self-service portal.** ownership claim + moderation; partners maintain
  their own services/projects/offers.
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
  Next: item 06 (mailroom ticketing + expanded safe auto-send).
