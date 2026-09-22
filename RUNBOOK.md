# Cyprus Lifestyle — Operator Runbook

How to run everything shipped in the audit roadmap (items 01–12) plus the queue
activation. Keep this next to `EXECUTION-PLAN.md` (the what/why) and `AUDIT-ROADMAP.md`
(per-item deploy notes). This file is the **how to operate**; for backups, the restore
drill, secret rotation, load testing and the performance-budget gate, see
`DR-RUNBOOK.md` (**how to recover**).

---

## 1 · Go-live checklist (once)

1. **Migrations** — run in Supabase, in order, once each: `0083` → `0092`. (`0017` was
   edited for portability but is already applied on your DB; the `add column if not
   exists` skips, so no re-run.) Each prints a small report; the expected counts are in
   `AUDIT-ROADMAP.md`.
2. **Environment variables** — see §4. The core set is required; the rest unlock optional
   features and degrade gracefully when absent.
3. **Deploy the code** to Vercel.
4. **(Optional, free) Continuous background processing** — enable `pg_cron` + `pg_net` in
   Supabase (Database → Extensions), then run `supabase/pg_cron/schedule.sql` with your
   `SITE_URL` + `CRON_SECRET`. Without this the daily Vercel cron still enqueues **and**
   drains a batch each run; with it, the worker drains every 3 minutes.
5. **Switches** — everything that sends or spends ships **OFF**. Turn them on when ready
   (see §3). Nothing auto-sends until you do.
6. **Smoke test** — open `/admin/analytics`, `/admin/coverage`, `/admin/attribution`,
   `/admin/mail`, `/admin/partners`, `/admin/privacy`; confirm each renders.

---

## 2 · What each feature is, and where to watch it

| Feature (item) | Where | What to look for |
|---|---|---|
| Concierge coverage + backlog (02) | Admin → Analytics | Answer-coverage %; the "top unanswered questions" list = your scrape/write to-do |
| Error log (03) | Admin → Analytics → System errors | Any recurring source; investigate high-count rows |
| Directory coverage (04) | Admin → Coverage | % with coords/contact/photo; the gap map + thinnest-cells sprint list |
| CI / gold suite (03, 05) | GitHub Actions | Every push runs typecheck + `npm test` + a full-migration smoke test |
| Mailroom tickets (06) | Admin → Mail | Desk, priority, SLA-breach badges; work oldest/breached first |
| Acquisition loop (07) | Admin → CRM | Prospect replies auto-log to the deal and pause the sequence |
| Attribution & ROI (08, 11) | Admin → Attribution & ROI | Advertiser ROI; featured-listing exposure; CTA clicks; upsell candidates |
| Partner portal (09) | `/partner` (public), Admin → Partners | Claims + edit requests to approve |
| Saved / trip plan (10) | In the concierge | Guests save picks; the concierge can arrange them |
| GDPR (12) | `/sourcing` (public), Admin → Privacy · GDPR | DSAR queue (overdue flagged red); the ROPA |
| Background jobs (01, A) | Admin → Analytics → Background jobs | Pending/running/done/dead; investigate dead-letters |

---

## 3 · Switches (table `automation_settings`, row `id = 1`; outreach is in `crm_settings`)

All default **false**. Set to `true` in the Supabase table editor when ready.

| Switch | What it does | Turn on when |
|---|---|---|
| `scraper_enabled` | RSS article scraping in the daily tick | Feeds are configured and you want auto-drafts |
| `developments_enabled` (+ `developments_autopublish`) | Scrape developer projects (autopublish optional) | Sources are trusted; leave autopublish off first |
| `regulation_watch_enabled` | Watch government/regulatory pages | You want change alerts |
| `events_watch_enabled` | Mine events into the agenda | You want the agenda kept fresh |
| `mail_autoack_enabled` | Auto-send a branded **receipt** (never a real answer) to genuine first-contact mail | You're happy to confirm receipt automatically |
| `mail_autoanswer_enabled` | Auto-send a **real** reply — ONLY to whitelisted informational FAQs (unsubscribe/how-to-subscribe…), grounded, never advice/prices/bookings | You've watched the drafts and trust the whitelist |
| `crm_settings.sending_enabled` | Actually send outreach emails (otherwise the cadence is a dry run) | Consent/deliverability are in order |

Recommended first week: leave all off, watch the drafts and dashboards, then enable
`mail_autoack_enabled`, then the scrapers, and only later `mail_autoanswer_enabled`.

---

## 4 · Environment variables — by feature (add only what you want to work)

**Two separate stores.** The website + all the features in this runbook run in the
**Next.js app on Vercel**, so they read **Vercel** env vars. The **Supabase → Edge
Function secrets** store is only seen by the Deno edge functions (the scraper/enricher/
translator functions). A key in one store is invisible to the other — if a feature runs
on Vercel, its key must be in Vercel, even if you also have it in Supabase.

Rule of thumb: **if the feature in the right-hand column matters to you, add the key.**
Everything marked *optional* has a working fallback, so nothing crashes without it.

### Required — the platform's core (add all of these to Vercel)

| Variable | Powers | If missing |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | The entire app ↔ database | App does not run |
| `CLAUDE_API_KEY` | The concierge + all AI drafting | Concierge & AI dead |
| `CRON_SECRET` | Daily cron + queue worker: coordinate backfill, scraping, outreach, error/job pruning | Nothing scheduled runs (returns 401) |
| `RESEND_API_KEY` | **All outbound email:** mail replies, auto-acknowledgements, checkout onboarding, the newsletter, outreach, DSAR notifications | No email is ever sent |
| `EMAIL_FROM` | The From address on all mail | Falls back to a default address |
| `NEXT_PUBLIC_SITE_URL` | Absolute links in emails, the sitemap, OG images | Falls back to `https://cypruslifestyle.eu` |

### Required only for the feature named (add if you use that feature)

| Variable | Powers | If missing |
|---|---|---|
| `RESEND_INBOUND_SECRET` (or `RESEND_WEBHOOK_SECRET`) | **Receiving** email into the mailroom (webhook signature check) | Inbound mail is refused; you can still send |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | Membership + advertising checkout and auto-provisioning | No payments / no onboarding |
| `MEMBERSHIP_PRICE_EUR` | Membership price | Defaults to €19 |
| `MEMBERSHIP_INTERVAL` | Membership billing period | Defaults to `month` (set `year` for annual) |

### Optional — nice, with a graceful fallback (skip until you want it)

| Variable | Powers | If missing (the fallback) |
|---|---|---|
| `GOOGLE_GEOCODING_KEY` (or `GOOGLE_MAPS_KEY` / `PLACES_KEY`) | **Faster** coordinate backfill (item A) | Free **Nominatim** — works, just slower/rate-limited |
| `OPENAI_API_KEY` | Concierge **voice** (text-to-speech) + **semantic** search recall | Text concierge still works; no voice, keyword-only recall |
| `OPENAI_EMBED_MODEL`, `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE` | Override the voice/embedding models | Built-in defaults |
| `SONNET_MODEL` | Override the concierge model id | Built-in default |
| `UNSPLASH_ACCESS_KEY` | Auto cover-image picker in the editor | Paste image URLs / branded placeholders |
| `NEXT_PUBLIC_CARTO_KEY` | Prettier map tiles | Plain OpenStreetMap tiles |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Rate limiting shared across server instances | In-memory per-instance limiting (fine at low/medium traffic) |
| `NEXT_PUBLIC_SENTRY_DSN` | Streams errors to Sentry | The DB error log + Admin → Analytics cover it |
| `CONCIERGE_INBOX`, `CONCIERGE_INBOX_LUXURY`, `DIRECTORY_INBOX`, `ADVERTISE_INBOX`, `LUXURY_DESK` | Route each desk's alerts to a specific inbox | Falls back to your `EMAIL_FROM` domain |
| `NEIGHBOURHOOD_RADIUS_M` | Neighbourhood search radius | Built-in default |
| `META_*`, `X_*`, `LINKEDIN_*`, `WHATSAPP_*` | Auto-posting to social / WhatsApp replies | Those channels off; the rest works |
| `GEMINI_API_KEY` | An alternate AI provider (edge functions) | Claude/OpenAI cover it |
| `ENRICH_SECRET`, `BACKFILL_SECRET`, `REVALIDATE_SECRET` | Protect specific internal admin utility routes | Only those routes are affected |

### Getting the Google geocoding key (optional)
You don't need a new key — reuse your existing Google Cloud key (the one behind
`GOOGLE_PLACES_API_KEY`): (1) Google Cloud Console → APIs & Services → Library → enable
**Geocoding API** on that project; (2) Credentials → your key → if "API restrictions" is
on, add Geocoding API; (3) in **Vercel** add `GOOGLE_GEOCODING_KEY` = that key's value.
Note: it must be in **Vercel** — the app can't read Supabase's `GOOGLE_PLACES_API_KEY`.

### Your current status (as of setup)
Present & working: Supabase trio, `CLAUDE_API_KEY`, `CRON_SECRET`, `RESEND_API_KEY` +
inbound secret (email tested), Stripe pair, `MEMBERSHIP_PRICE_EUR`, `OPENAI_API_KEY`,
`SONNET_MODEL`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CARTO_KEY`,
`CONCIERGE_INBOX(_LUXURY)`. Only genuinely useful thing still open: `GOOGLE_GEOCODING_KEY`
(optional — speeds up coordinate backfill; Nominatim works without it).

---

## 5 · Running tests

- Locally: `npm run typecheck` and `npm test` (the pure-logic suites — coverage, retrieval,
  geo, mail guardrails, tickets, CRM, partners, saved, jobs, error fingerprinting).
- CI: `.github/workflows/ci.yml` runs typecheck + tests + applies every migration on a
  fresh Postgres 16 + pgvector on each push/PR. Keep it green before deploying.
- `supabase/ci/prelude.sql` is **CI/local only — never run it on Supabase.**

---

## 6 · Weekly 10-minute review

1. **Analytics** — is answer-coverage holding? Take the top 3 unanswered questions and
   scrape/write them.
2. **Coverage** — pick the worst category×district cell and fill it (the queue is already
   backfilling coordinates automatically).
3. **Mail** — any SLA-breached (red) tickets? Any dead background jobs?
4. **Attribution** — any high-recommendation listing that isn't featured? That's an upsell
   call. Check advertiser ROI for anyone to retain.
5. **Privacy** — any DSAR nearing its one-month due date (red)?
6. **Partners** — approve pending claims/edits.

---

## 7 · Troubleshooting

- **"permission denied for schema auth"** — you ran `supabase/ci/prelude.sql` on Supabase.
  Don't; it's CI-only and harmless (it rolled back).
- **A migration errors on a fresh DB** — check it applies in the CI job; the prelude must
  run first there. On Supabase, run only the numbered migrations.
- **Concierge says "no draft"/errors** — check `CLAUDE_API_KEY` and Admin → Analytics →
  System errors for the real message.
- **Background jobs not progressing** — without pg_cron they only advance on the daily
  tick; enable pg_cron (§1.4) for continuous draining. Check the Background jobs panel for
  dead-letters.
- **Geocoding slow** — you're on Nominatim; add a Google key for speed/volume.
