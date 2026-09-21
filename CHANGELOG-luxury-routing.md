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
