# Cyprus Lifestyle — Architecture

One Next.js app on **Vercel** + a **Supabase** Postgres database. The AI newsroom
runs as Next.js API routes driven by Vercel Cron (not Supabase Edge Functions),
so there is a single repo and a single deploy, and Supabase is used only as the
database (managed in the SQL Editor — no CLI). The pipeline, schema and admin are
a faithful port of Transilvania Times, extended to four languages.

## Data flow
```
rss_sources ──▶ [cron/scrape] ──▶ scraped_articles (status=scraped)
                                        │  de-duped, prose-cleaned
                                        ▼
                             [cron/process]  (per-article lock via rewrite_jobs)
                                        │  desk 1: draft EN  ─ Claude Sonnet
                                        │  desk 2b: translate → EL · RO · AR (structure-preserving)
                                        │  anti-AI humanizer + AI-tell score
                                        ▼
                    commit_scraper_blog_post(RPC) ──▶ blog_posts (draft, 4 languages)
                                        │                └▶ writeback to scraped_articles
                     human approves in /admin  ──▶ status=published
                                        ▼
      web (en/el/ro/ar, RTL for ar) · [cron/social] · [cron/newsletter-weekly]

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
