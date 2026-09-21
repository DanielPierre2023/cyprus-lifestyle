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
