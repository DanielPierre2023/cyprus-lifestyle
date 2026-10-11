# Cyprus Lifestyle — Architecture

One Next.js app on **Vercel** + a **Supabase** Postgres database. The article desk
(`process-scraped-article`), the Editorial Studio (`ai-editorial`) and the cover-photo
brief (`search-cover-photos`) run as Supabase Edge Functions, because they need more
than the 60 seconds a Vercel route has; everything else is a Next.js API route driven
by Vercel Cron or pg_cron. All text is written by OpenAI (`gpt-6-luna`, routed by
`lib/journalism/models.ts`). The two journalism edge functions are GENERATED from
`scripts/edge/*.src.ts` and the shared modules in `lib/journalism` and `lib/voice`
(`node scripts/build-edge-journalism.mjs`; a test fails if they are out of date).

## Data flow
```
rss_sources ──▶ [cron/scrape] ──▶ scraped_articles (status=scraped)
                                        │  de-duped, prose-cleaned
                                        ▼
                             [cron/process] ─▶ edge function process-scraped-article
                                        │  fact core (one call) → relevance gate (Cyprus in the story)
                                        │  SEVEN native editions EN·EL·RO·AR·DE·PL·RU, each from the core
                                        │  originality gate → sub-editor driven by the voice engine's findings
                                        │    (the style check itself runs on the website: /api/desk/assess)
                                        │  short fields (title, excerpt, SEO) → fact check per language → repair
                                        ▼  publish bar: all seven pass, else saved as a draft with the reasons
                    commit_scraper_blog_post(RPC) ──▶ blog_posts (7 languages)
                                        │                └▶ writeback to scraped_articles
                     human approves in /admin  ──▶ status=published
                                        ▼
      web (en/el/ro/ar/de/pl/ru, RTL for ar) · [cron/social] · [cron/newsletter-weekly]

      every model call ─▶ ai_spend_log      every desk run ─▶ generation_logs
```

## Layers
- **Database** (`supabase/`) — 27 tables, 46 RLS policies, backbone functions
  (`has_role`, `commit_scraper_blog_post`, `get_analytics_data(_admin)`,
  `sweep_stuck_rewrite_jobs`, counters, `validate_editor_token`, …). Column-pair
  translations (`*_en/el/ro/ar`) + generated per-language search vectors.
- **Library** (`lib/`) — AI wrappers with spend logging, the 4-language anti-AI
  humanizer, the RSS scraper, the structure-preserving translator, and the
  editorial desk (`lib/desk/`): prompts · pipeline · queue · cover.
- **API** (`app/api/`) — `cron/*` (scrape, process, social, newsletter-weekly),
  `admin/*` (actions, gated by `has_role`), and public endpoints (newsletter,
  comments, contact, banner tracking).
- **Reader** (`app/[locale]/(site)/`) — home, article, category, info pages.
- **Admin** (`app/[locale]/admin/(panel)/`) — the 13 tabs, gated by Supabase auth.

## Principles (from the House Book)
AI assists, humans decide — nothing publishes without sign-off unless auto-publish
is on. Every model call is logged for cost and observability. Restraint reads as
expensive; specifics read as true.
