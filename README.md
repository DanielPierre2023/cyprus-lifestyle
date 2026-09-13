# Cyprus Lifestyle

A four-language luxury newspaper-magazine for Cyprus — **English · Ελληνικά · Română · العربية** (Arabic right-to-left) — with an AI newsroom, admin console and public reader site in one Next.js app. The AI pipeline, schema and admin surface are a faithful port of **Transilvania Times**, extended from EN/RO to four languages and re-anchored to Cyprus.

- **Frontend + backend:** Next.js 15 (App Router) → **Vercel** from GitHub
- **Database:** Supabase (Postgres) — managed entirely in the SQL Editor, no CLI
- **AI desk:** Anthropic Claude (+ optional OpenAI / Gemini), logged for cost
- **Email:** Resend · **Cover images:** Unsplash · **Social:** Meta, X, LinkedIn

---

## Deploy in four steps (no terminal needed)

**1 · Database.** In your Supabase project → SQL Editor, paste and run
`supabase/schema_all.sql`. It creates every table, function, policy and index and
seeds the six districts, the editorial desks, the rate card and 42 curated feeds.
(It is re-runnable.)

**2 · Repo.** Push this folder to a GitHub repository.

**3 · Vercel.** Import the repo at vercel.com → New Project. Add the environment
variables from `.env.example` (Supabase URL + keys, `CLAUDE_API_KEY`,
`RESEND_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`, optional social tokens).
Deploy. `vercel.json` registers the cron jobs automatically.

**4 · First admin.** Create a user in Supabase → Authentication → Users, then in
the SQL Editor: `insert into public.user_roles (user_id, role) values ('<that-user-id>','admin');`
Sign in at `/admin`.

> Vercel Cron requires the **Pro** plan to run more than once a day; Supabase can
> start on Free and move to **Pro** for a live site (no pausing). See the cost note
> you were given.

---

## What's in the box

### The four editions
Every article is stored in four languages as column pairs (`title_en/el/ro/ar`, …)
and rendered at `/` (English), `/el`, `/ro`, `/ar`. Arabic is served
right-to-left. UI strings live in `messages/{en,el,ro,ar}.json`.

### The AI newsroom (the pipeline)
1. **Scrape** — `/api/cron/scrape` (hourly) pulls new items from active `rss_sources`
   into `scraped_articles`, de-duped and cleaned of CSS/markup. Manual run from the
   Scraper tab.
2. **Write** — `/api/cron/process` (twice hourly) claims queued items under a
   per-article lock (`uq_rewrite_jobs_active_article`), drafts an original English
   article in the desk's voice, then translates to EL/RO/AR (structure-preserving),
   runs the deterministic anti-AI humanizer, and commits all four languages through
   the `commit_scraper_blog_post` RPC. Every run is logged to `generation_logs`.
   Publishes as a draft unless **auto-publish** is on.
3. **Distribute** — `/api/cron/social` auto-posts new articles; the weekly
   **Dispatch** goes out Mondays via `/api/cron/newsletter-weekly`.

Nothing publishes without editorial sign-off unless you switch on auto-publish.
The voice, desks and franchises are documented in `docs/EDITORIAL-CONCEPT.md`.

### The admin console (`/admin`) — 13 tabs
Dashboard · Editor · AI · Social · Articles (Articole) · Scraper RSS · Comments
(Comentarii) · Newsletter · Subscribers (Abonați) · Sponsors (Publicitate) · Inbox
· Settings (Setări) · Analytics (Observabilitate). Gated by Supabase auth +
`has_role`. The Editor writes in English and auto-translates to the other three.

---

## Project layout

```
app/
  [locale]/                 reader site (en/el/ro/ar) + /admin
    (site)/                 home · article · category · contact/about/advertise/privacy
    admin/(panel)/          the 13 admin tabs (gated)
    admin/login/            sign-in
  api/
    cron/                   scrape · process · social · newsletter-weekly (Vercel Cron)
    admin/                  scrape · generate · translate · proof · social · newsletter · inbox · sponsors · comment-reply
    newsletter/ comments/ contact/ banners/   public endpoints
lib/
  ai.ts                     Claude/OpenAI/Gemini wrappers + spend logging
  antiAi.ts                 4-language anti-AI humanizer + AI-tell scorer
  scraper.ts translate.ts   RSS ingest + structure-preserving translation
  desk/                     the editorial pipeline (prompts · pipeline · queue · cover)
  newsletter.ts email.ts social.ts   distribution
  queries.ts                public read helpers
  supabase/                 server · admin (service role) · browser clients
messages/                   UI strings (en·el·ro·ar)
supabase/
  schema_all.sql            paste-and-run schema (the Stage-1 database)
  migrations/               the same, as ordered files
docs/                       editorial concept · brand · architecture
brand/                      logo/monogram SVGs
```

## Local development
```bash
npm install
cp .env.example .env.local     # fill in your keys
npm run dev                    # http://localhost:3000
```
`npm run typecheck` and `npm run build` both pass clean.

## Notes
- The database is a faithful port of Transilvania Times, reconciled column-for-column
  against the live schema; see `supabase/README.md`.
- Studio/anchor video, flights and weather subsystems are intentionally excluded.
- AI-generated article HTML is our own content and rendered directly; third-party
  RSS is used only as source material for the desk to rewrite with attribution.
