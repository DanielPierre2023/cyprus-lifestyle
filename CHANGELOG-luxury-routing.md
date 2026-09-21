# Cyprus Lifestyle — Private-Client Model + fixes (this batch)

**One deploy + one SQL migration.** Run the SQL first, then deploy the code.

## 1 · SQL — run these in the Supabase SQL editor FIRST (in order)
- `supabase/migrations/0073_concierge_request_tier.sql`
  Adds a `tier` column (premium | standard, default standard) + index to
  `concierge_requests`. **Required before deploy** — the request pipeline now
  writes `tier`, and the admin inbox reads it. Idempotent, tested on Postgres 16.
- `supabase/migrations/0074_directory_dedup_guard.sql`
  Makes directory de-duplication **durable** (CTO audit P1): an immutable identity
  key + a final idempotent collapse + a UNIQUE index, so future imports can't
  re-introduce duplicates. Preserves real chains (branches at different coordinates)
  and different businesses sharing a building. Idempotent, tested on Postgres 16.
- `supabase/migrations/0075_articles_doing_business.sql`
  5 flagship **doing-business articles** in all 7 languages (company setup; tax &
  VAT; regulated professions & licensing; social insurance & hiring; funding &
  grants), fact-checked against the government portal with the official source
  cited in each. Category 'business', branded placeholder covers (no image cost),
  idempotent (`on conflict (slug) do nothing`). Tested on a UTF-8 Postgres — all
  7 editions insert correctly. Searchable immediately via the generated index; the
  concierge will surface them as related articles.
- `supabase/migrations/0076_inbound_mail.sql` — the `inbound_emails` table + admin RLS
  (backend mailroom; also described below). Run it before 0077. Tested on Postgres 16.
- `supabase/migrations/0077_mail_assist.sql`
  Draft-on-arrival + opt-in auto-acknowledgement. Adds `suggested_reply`,
  `suggested_at` and `auto_sent` to `inbound_emails`, and `mail_autoack_enabled`
  (**default false — opt-in, off**) to `automation_settings`. Additive & idempotent;
  requires 0076 first. Tested on a UTF-8 Postgres 16 (idempotent re-run, correct
  types, both booleans NOT NULL default false).

## 2 · Code — then deploy once to Vercel
Files changed / added:

- `lib/concierge/brain.ts`
  - `classifyRequest(q)` — pure, multilingual: best-guess **category · district · tier**.
  - `matchForRequest(locale, q, tier)` — server-side specialist matching, luxury-first for premium.
  - `searchDirectory(..., { luxuryFirst })` — the tier can travel with the client, not just the words.
  - Real-estate luxury terms (penthouse/villa/mansion in all 7 languages), Russian luxury words, and a wider Limassol stem so inflected spellings match.
- `app/api/concierge/request/route.ts`
  - Classifies every request, auto-matches specialists when the guest submits "cold",
    stores tier/category/district, **routes the desk email by tier** (luxury vs standard),
    and elevates the guest acknowledgement for premium — in all 7 languages.
- `app/[locale]/admin/(panel)/requests/page.tsx`
  - `★ Premium` badge, a **premium** count, and a **premium** filter.
- `app/[locale]/(site)/advertise/page.tsx`
  - FAQ (SEO JSON-LD) corrected to the real rate card: Listed €490/yr, Featured €850/mo,
    Partner bespoke; adds a "paid placement is labelled" answer.
- `app/api/admin/backfill-translations/route.ts` **(new)**
  - Admin-gated, batched, idempotent backfill of de/pl/ru for legacy articles
    (GET = free diagnostic; POST = fill in bounded batches). Uses the existing
    translator + anti-AI humanizer.
- `app/[locale]/admin/(panel)/ai/page.tsx`
  - "Check de/pl/ru backlog" + "Backfill missing editions" buttons wired to the route.
- `lib/queries.ts` + `app/[locale]/(site)/directory/[type]/[slug]/page.tsx`
  - **Compare-with-similar fix:** `getPeers` now ranks by `category_group`/`subtype`/district,
    so a security company is compared with security companies — not architects or agents.
- `components/ConciergeChat.tsx` + `lib/concierge/brain.ts`
  - **Concierge related articles:** every answer now shows "On Cyprus Lifestyle" links
    connected to the request's topic, in the guest's language.
- `app/[locale]/(site)/article/[slug]/page.tsx`
  - Internal article links are localized to the reader's edition (no jump back to English).
- `components/LocaleSwitch.tsx` + `app/globals.css`
  - **Accessibility (CTO audit P2):** full keyboard model in the language menu —
    Arrow Up/Down (with wrap), Home/End, Escape returns focus to the trigger,
    open-from-trigger via Arrow/Enter/Space — plus visible focus states.
- `next.config.mjs`
  - **Image hosts narrowed (CTO audit P2):** `remotePatterns` is no longer a wildcard.
    It now allows only the three hosts next/image actually loads — `*.supabase.co`
    (the listings/ and blog-images/ storage buckets), `images.unsplash.com`, and
    `picsum.photos`. Advertiser banners and the map use plain `<img>`/CSS, so they're
    unaffected. Also serves AVIF/WebP and caches optimised variants 31 days (cost).
- `app/api/health/route.ts`
  - **Monitor-ready (CTO audit P2):** adds `?ping` (instant liveness), `?deep`
    (a real Supabase round-trip → 200 up / 503 down — the uptime target), a `HEAD`
    handler, and a 503 status when the core website integration is absent.

## Luxury email template — every message, every address
- `lib/email.ts` — `brandedEmail` redesigned to the house luxury look (obsidian/gold/
  ivory, serif wordmark masthead with gold hairline rules, gold rule under the heading,
  refined CTA, ownership line in the footer). Typographic masthead — **no remote logo
  image**, which is what showed as a broken box; it now renders identically in Gmail,
  Apple Mail and Outlook, and is RTL-aware for Arabic. One shared function, so it lifts
  EVERY email from EVERY address (concierge acks, lead alerts, admin replies, fulfilment,
  newsletter) at once. Added an opt-in `unsubscribe` param so 1:1 replies don't carry one.
- `lib/newsletter.ts` — the digest send passes `unsubscribe: true` (keeps the required
  unsubscribe on the broadcast; transactional mail no longer shows a stray one).
- **Logo in the masthead.** Email clients don't support SVG (Gmail/Outlook strip it),
  so the crest was rendered from `monogram.svg` to `public/brand/monogram-email.png`
  (gold "CL" on transparent) and placed above the wordmark, with the typographic
  wordmark kept as the fallback when a client blocks images. Ship the PNG in `public/brand/`.
- **Per-desk signatures — `lib/signatures.ts` (new).** Each address signs itself:
  hello@ → the reader desk, concierge@ → Concierge Services, private@ → Private Client
  Desk, privacy@ → Data Protection, advertise@/sales@ → Partnerships, newsroom@ →
  the Newsroom (plus aliases: gdpr→privacy, press→newsroom, vip→private, …). Rendered
  in the luxury style (serif name, gold role line, contact line). Wired into
  `app/api/admin/mail/reply/route.ts`, so a reply is signed automatically by whichever
  desk address it's sent from — no one has to remember.

## AI-drafted correspondence — the concierge writes the replies
- `app/api/admin/mail/draft/route.ts` **(new)** — AI drafts (or polishes) a reply to any
  inbound email using the SAME concierge brain as the chat: detects the guest's language,
  grounds on the real directory + knowledge base (prices/places/facts are true, never
  invented), writes in the Cyprus Lifestyle voice, and as the desk the mail was addressed
  to. `compose` writes a full reply from your notes; `polish` rewrites your rough text.
  Returns plain text to review — it never sends on its own.
- `app/[locale]/admin/(panel)/mail/page.tsx` — a notes field + "✦ Draft with AI" and
  "Polish" buttons above the reply box. You write rough notes (or nothing), the AI drafts,
  you review/edit, then Send (which formats + signs via the luxury template). Human-in-the-
  loop by design. Draft-on-arrival and opt-in auto-send (below) are now built on top of this.

## Draft-on-arrival + opt-in auto-acknowledgement (requires 0077)
The inbox becomes a glance and a click, and — only if you switch it on — genuine
first-contact enquiries get an instant, polite branded receipt in the sender's language.
The substantive reply is **always** a human decision.
- `lib/mail/assist.ts` **(new)** — the mailroom intelligence, shared by the whole system.
  - `composeReply()` — the single grounded drafting function (language detection, real
    directory + KB grounding, Cyprus Lifestyle voice, per-desk). `/api/admin/mail/draft`
    now calls this too, so the reply that's waiting and the one the button writes are
    produced by identical logic.
  - `runInboundAssist(row)` — runs the moment mail lands: (1) **always** drafts a
    suggested reply and stores it on the row; (2) auto-acknowledge only if the opt-in
    switch is on **and** strict guardrails pass.
  - `autoAckEligible(row)` — the guardrails. Auto-send fires only for a real
    first-contact enquiry: it blocks no-reply/mailer-daemon/postmaster/notifications/
    newsletter and other role/automated senders, our own domain (loop guard), any reply
    within a thread (`In-Reply-To` set), auto-reply/out-of-office/bounce subjects, empty
    or trivially short bodies, and malformed senders. **16/16 unit cases pass.**
  - The auto-message is a **receipt only** ("we have your message, a person will reply"),
    localized to all 7 editions, sent from the desk it was addressed to and signed — so
    even a misclassification can only ever send a polite holding note, never a wrong fact
    or commitment. The thread stays **open**; a human still owes the real reply.
- `app/api/email/inbound/route.ts` — on a genuinely new insert (duplicate Message-ID
  re-deliveries are skipped), schedules `runInboundAssist` via `after()` so the webhook
  still returns its fast 200; `maxDuration = 60`.
- `app/[locale]/admin/(panel)/mail/page.tsx` — opening a message **pre-fills the reply box
  with the AI's suggestion** (review, edit, send — it never sends itself); "✦ Draft ready"
  and "Auto-acked" badges in the list.
- `app/[locale]/admin/(panel)/ai/page.tsx` — a new **"Auto-acknowledge email"** switch
  (off by default). Draft-on-arrival needs no switch; it's always on and always safe.
- **After deploy:** run 0077. Draft-on-arrival works immediately. To turn on auto-receipts,
  Admin → AI newsroom → enable **Auto-acknowledge email**.

## Mailroom fixes — the concierge actually drafts, with real contacts (code only)
Diagnosed from a live test where the reply box stayed empty and "AI: no draft produced"
showed. `/api/health` confirmed `CLAUDE_API_KEY` **is** present (so not a key problem);
the cause was that the mail path called the model with a hardcoded id while the working
website chat uses the `SONNET_MODEL` override — and the drafting error was being swallowed.
- `lib/mail/assist.ts` — `composeReply` now uses **`CONCIERGE_MODEL`** (the exact model the
  live chat uses, honouring `SONNET_MODEL`) with a **Haiku fallback**, and **returns the real
  error** instead of null. So the draft is produced even through a model-id or transient
  hiccup, and if anything still fails the actual reason surfaces (in the UI and in the
  function logs) rather than a generic message.
- `app/api/admin/mail/draft/route.ts` — surfaces `composeReply`'s real error.
- `lib/mail/assist.ts` — the mail draft now includes the matched listings' **published
  contact details** (phone / email / website / address), pulled from the directory, and is
  instructed to recommend a considered few specialists **by name and pass on those details**
  so the guest can reach them directly (still strictly grounded — only what's listed, never
  invented). For property/relocation/residency/tax it weaves in the KB guidance and is
  explicit about **EU vs non-EU (local vs foreign) differences** — e.g. non-EU buyers needing
  Council of Ministers permission — and always advises an independent lawyer + clean title deeds.
- `lib/concierge/brain.ts` — natural buyer wording now maps to real estate in all 7 languages
  ("buy a house / a home / house for sale / townhouse", plus German *Hauskauf*, Polish
  *kupić dom*, Russian *купить дом*, Greek *σπίτι*, Romanian *casă*, Arabic *شراء منزل*, …),
  so "I want to buy a house near the sea in Larnaca" surfaces the Larnaca estate agents and
  developments instead of nothing. Guesthouse/hospital/restaurant queries are unaffected
  (phrase forms avoid false matches). **10/10 classifier cases pass; 16/16 guardrail cases still pass.**
- **After deploy:** no SQL. New mail auto-drafts on arrival; for the message already in the
  box, open it and press **✦ Draft with AI** once (it will now produce the full reply).

## Backend mailroom — send AND receive @cypruslifestyle.eu from the admin panel
Email is now administered from the backend, both directions, through Resend. No Zoho.
- `supabase/migrations/0076_inbound_mail.sql` **(new)** — `inbound_emails` table +
  admin RLS + a unique index on Message-ID (idempotent delivery). Tested on Postgres 16.
- `app/api/email/inbound/route.ts` **(new)** — Resend inbound webhook (`email.received`).
  Svix-signature verified (matches Svix's published test vector), replay-guarded. Because
  Resend's webhook is metadata-only, it then calls Resend's Retrieve Received Email API
  (`GET /emails/receiving/{id}`) with `RESEND_API_KEY` to pull the full body/headers,
  ignores non-`email.received` events, and inserts idempotently. Secure by default
  (refuses without `RESEND_INBOUND_SECRET`).
- `app/[locale]/admin/(panel)/mail/page.tsx` **(new)** — Admin → Mail: read every
  received message and reply inline; reply sends via Resend from your own address.
- `app/api/admin/mail/reply/route.ts` **(new)** — admin-gated reply (Resend), marks replied.
- `components/admin/AdminNav.tsx` — adds the "Mail (Email)" tab.
- `app/api/health/route.ts` — adds an inbound-email readiness line.
- **Setup (after deploy):** run 0076; in Resend enable Receiving on the domain and add
  the MX it shows at NameSilo (root); add a Resend webhook to
  `https://cypruslifestyle.eu/api/email/inbound`; put its signing secret in
  `RESEND_INBOUND_SECRET` (Vercel) and redeploy. Then mail to hello@ etc. lands in Admin → Mail.

## Domain switch → cypruslifestyle.eu (code + env)
Every reference now points to the real domain. The env var is the live lever; the
code fallbacks were updated to match so nothing defaults to the old placeholder.
- Code fallbacks updated (`.com` / `vercel.app` → `cypruslifestyle.eu`): `lib/seo.ts`,
  `lib/email.ts` (incl. the `newsroom@` sender), `lib/social.ts`, `lib/newsletter.ts`,
  `lib/outreach.ts`, `app/api/whatsapp/route.ts`, `app/api/concierge/request/route.ts`,
  `app/api/health/route.ts`, and the two edge-function user-agents.
- `messages/{en,el,ro,ar,de,pl,ru}.json` — the legal-page contact addresses
  (hello@, newsroom@, advertise@, privacy@) are now `@cypruslifestyle.eu`.
- **Action:** set `NEXT_PUBLIC_SITE_URL=https://cypruslifestyle.eu` in Vercel and
  **redeploy** (it bakes at build time). Full DNS/email steps in the go-live runbook.

## Government knowledge base — concierge grounding + fact-checker (code only)
Extracted the official Republic of Cyprus business portal (businessincyprus.gov.cy,
Point of Single Contact) into the concierge knowledge base. No scraping of anyone —
public government guidance, each entry carrying its exact source URL.

- `lib/knowledge/doing-business.ts` **(new)**
  - `REGULATED_ACTIVITIES` — a 166-item register of regulated activities (sector,
    category, competent authority where published, official URL) + `lookupRegulatedActivity()`.
  - Two new KB domains: **Doing Business & Compliance** (15 entries — company setup,
    income tax & VAT with exact thresholds, permits, social insurance, funding, exit)
    and **Licences & Regulated Professions** (12 entries — real estate agent, lawyer,
    accountant/auditor, doctor, pharmacy, hotel, travel agency, restaurant, engineer,
    contractor, electrician, tax consultant), each with a `source` URL.
- `lib/knowledge/qa.ts` — adds optional `source` to `QAItem`, composes the new
  domains into `QA_DOMAINS`, and carries `source` through `compactForConcierge`.
- `lib/concierge/brain.ts` — the grounding block now cites the official source for
  regulatory/financial answers.
- `app/[locale]/(site)/guide/[slug]/page.tsx` — shows a localized "Official source"
  citation on government-sourced pages. (All 27 entries also auto-generate localized
  `/guide/…` pages and appear on the guide index.)
- **After deploy:** re-run `…/api/concierge/embed?key=<ENRICH_SECRET>` so semantic
  recall covers the new knowledge (keyword retrieval works immediately regardless).

## Directory gap analysis (diagnostic, read-only)
- `supabase/diagnostics/directory-gap-analysis.sql` — run in the SQL editor to see
  where the directory is thin (by category group, subtype, district) versus what
  exists, as a target list for a **verified** enrich-directory pass (Places + the
  Registrar). No scraping; nothing is modified.

## Uptime monitor — 3-minute setup (free, no token cost)
Point any uptime service at the deep endpoint and alert on non-200:

- **URL:** `https://cyprus-lifestyle.vercel.app/api/health?deep=1`
- **UptimeRobot (free):** New monitor → type **HTTP(s)** → paste the URL →
  interval **5 min** → add your email (and Slack/SMS if you like) as alert contacts.
  It alerts whenever the endpoint returns anything other than 200 (the route returns
  **503** if the database or site is down).
- **Optional 2nd monitor:** `…/api/health?ping` at 1 min for pure "is the app up"
  liveness (no DB hit).
- **Better Stack / Pingdom:** same URL, "expect HTTP 200", 1–5 min.
- Swap the host for your custom domain once it's live.

## 3 · Optional environment variables (recommended)
- `CONCIERGE_INBOX` — the standard concierge desk email.
- `CONCIERGE_INBOX_LUXURY` — the private-client (premium) desk email.
  Until these are set, both tiers route to the existing inbox (this is why requests
  currently arrive at your everphone address). The admin panel separates the tiers
  regardless of email.
- `BACKFILL_SECRET` — optional; lets the backfill run headless via
  `Authorization: Bearer <secret>` instead of an admin session.

## 4 · After deploy
1. Admin → AI newsroom → **Check de/pl/ru backlog**, then **Backfill missing editions**.
2. Admin → Concierge Requests → use the **premium** filter to work the private-client lane.

See `cyprus-lifestyle-luxury-model.html` for the full model and roadmap.

## Living knowledge — Phase 1: developer projects (requires 0078)
A continuously-refreshed, fully-sourced concierge: real developer projects scraped
from developers' own sites into the directory, each row stamped with its `source_url`
and `fetched_at`. Nothing invented — the model may only record what the page states —
and the concierge now quotes the real figure ("from €280k, 1–3 bed, under construction,
ready Q4 2026") with the developer's contact. One shared engine; regulation watch
(Phase 2) and events actualiser (Phase 3) reuse the same `scrape_sources` registry.
- `supabase/migrations/0078_living_knowledge.sql` **(new)** — `scrape_sources` registry
  (category, url, cadence, `content_hash`, `last_fetched_at`, per-source status); structured
  fields + provenance on `directory_listings` (`price_from/price_to/dev_status/bedrooms/
  completion/developer_slug/source_url/fetched_at`); `automation_settings.developments_enabled`
  + `developments_autopublish` (both **off by default**). Additive, idempotent, tested on UTF-8 PG.
- `lib/scrape/developments.ts` **(new)** — the engine: seeds sources from your own
  directory (real-estate/agent listings that have a website — no manual list needed),
  respects `robots.txt`, discovers project pages, and extracts projects with a strict,
  grounded, JSON-mode model call. **Change-detection** (`content_hash`) skips the AI when a
  site hasn't changed, so a daily rotation stays cheap. Projects are stored as
  `directory_listings` of `type='development'`, so they inherit the whole existing stack
  (concierge grounding, contacts, directory pages, map, dedup guard 0074). Summaries are
  localised to all seven editions in one batched call. **26/26 unit cases pass.**
- `app/api/cron/tick/route.ts` — the daily cron now drains a small, time-boxed batch of due
  sources (2 per run, 12s budget) on a rotation, guarded by `developments_enabled` — within
  the 60s Hobby cap, so every source refreshes over a few days at no new cost.
- `app/api/admin/scrape/developments/route.ts` **(new)** — admin: GET status (sources,
  projects, drafts, recent runs); POST `seed` (register developer sites) and `run`
  (scrape now, optional `force`). Publishing follows the autopublish switch.
- `app/[locale]/admin/(panel)/ai/page.tsx` — a **Developer projects** panel: the two
  switches, **Seed sources from directory**, **Scrape developer projects now**, **Force
  re-scrape**, live counts and recent-run table.
- `lib/concierge/brain.ts` — the grounding now carries the structured development facts
  (`price_from/to`, status, bedrooms, completion), so both the chat and the email concierge
  quote the real number and delivery date. (`10/10` classifier + `16/16` mail-guardrail cases still pass.)
- **After deploy:** run **0078**. Then Admin → AI newsroom → **Seed sources from directory**,
  then **Scrape developer projects now** — review the drafts in Directory and, when happy,
  turn on **Developer-projects scraper** (daily rotation) and optionally **Publish scraped
  projects live**. Next: Phase 2 regulation watch, Phase 3 events actualiser + article links.

## Living knowledge — Phase 2: regulation watch (requires 0079)
Keeps the concierge's tax / residency / buyer / employment advice honest: the official
Cyprus pages that govern it are checked on the same daily rotation, and when one
**materially changes** you get a reviewable alert with an AI "what changed" summary —
so a human folds the change into the knowledge base. Legal/financial answers are never
silently rewritten by a scrape; the watch's job is to make sure you're told the moment
the law moves. Same `scrape_sources` registry as Phase 1.
- `lib/scrape/http.ts` **(new)** — the shared fetch / robots.txt / HTML→text / hash
  primitives, now used by every phase (Phase 1 refactored onto it; 26/26 dev tests still pass).
- `supabase/migrations/0079_regulation_watch.sql` **(new)** — `regulation_snapshots` (one
  text snapshot per source, to diff against), `regulation_alerts` (the reviewable change
  feed: title, summary, severity info/minor/major, status new/reviewed/dismissed),
  `automation_settings.regulation_watch_enabled` (**off by default**). Additive, idempotent,
  tested on UTF-8 PG (FK + snapshot upsert + alert insert verified).
- `lib/scrape/regulations.ts` **(new)** — the watch. Seeds **only validated official URLs
  already cited in our knowledge base** (company setup, tax & VAT, premises, planning,
  building, running/growing, funding, exit — never an invented URL). First check per page
  is a silent **baseline**; after that, a real content change triggers a strict old-vs-new
  AI diff → an alert with severity. Respects robots.txt; content-hash change-detection keeps
  it cheap. **6/6 seed-list guard tests pass.**
- `app/api/cron/tick/route.ts` — the daily cron now also drains a small batch of due
  regulation pages (2/run, 10s budget), guarded by `regulation_watch_enabled`.
- `app/api/admin/scrape/regulations/route.ts` **(new)** — admin: GET status + recent alerts;
  POST `seed`, `run` (baseline/check now, optional `force`), and `review`/`dismiss` an alert.
- `app/[locale]/admin/(panel)/ai/page.tsx` — a **Regulation watch** panel: the toggle,
  **Seed official pages**, **Check for changes now**, **Force re-check**, open-alert count,
  and a change feed with a link to the source and Reviewed/Dismiss actions.
- **After deploy:** run **0079**. Then Admin → AI newsroom → **Seed official pages** →
  **Check for changes now** (this baselines them; no alerts on the first pass). Turn on
  **Regulation watch** for the daily rotation. From then on, when an official page changes
  you'll see an alert to fold into the knowledge base. Next: Phase 3 — events actualiser
  + article↔agenda links with the concierge embedded.
