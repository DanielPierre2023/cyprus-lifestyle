# Cyprus Lifestyle — Database (Stage 1)

A faithful port of the **Transilvania Times** Supabase schema, adapted for a
four‑language luxury title: **English · Greek (Ελληνικά) · Romanian · Arabic
(العربية, right‑to‑left)**.

This is **Stage 1 — the database**. Stages 2–5 (edge functions, admin, and the
reader front‑end) sit on top of exactly these tables and functions.

> Verified: the whole schema applies cleanly to a fresh Postgres, is **safe to
> re‑run** (idempotent), and passes a functional test — a 4‑language article
> round‑trips through `commit_scraper_blog_post`, per‑language search vectors
> populate, the writeback + triggers fire, and `get_analytics_data` returns.

---

## How to deploy (no terminal needed)

**Option A — one file (recommended).**
Open **Supabase Dashboard → SQL Editor → New query**, paste the whole of
`supabase/schema_all.sql`, and click **RUN**. That's it. You can run it again
later without errors.

**Option B — migration files.**
Run `supabase/migrations/0001…0009` in order (same SQL Editor, one at a time),
or `supabase db push` if you use the CLI.

Deploy into the **new Supabase project** you're creating for Cyprus Lifestyle —
it does not touch Transilvania Times.

---

## The four‑language model

Transilvania Times stores each translatable field as a **column pair**
(`title_en` / `title_ro`). Cyprus keeps that exact pattern and **adds two
languages**:

```
TT:      title_en   title_ro
Cyprus:  title_en   title_el   title_ro   title_ar
```

This is deliberate: your `commit_scraper_blog_post` and every edge function
write column pairs, so keeping the pattern means the functions port as
**near‑exact copies** (add `_el` / `_ar` next to `_en` / `_ro`) instead of being
rewritten. Arabic **right‑to‑left** is handled at render time (`dir="rtl"` when
the active language is `ar`), not stored per row.

Full‑text search is a **generated `tsvector` per language**:
`en → english`, `ro → romanian` (both ship with Postgres), `el` / `ar → simple`
(no stemmer ships for Greek or Arabic; `simple` still gives tokenised search).

---

## What maps to each Admin tab

| Admin tab | Tables & functions it runs on |
|---|---|
| **Dashboard** | `get_analytics_data_admin`, `ai_spend_today`, `blog_posts`, `scraped_articles`, `automation_settings` |
| **Editor** | `blog_posts`, `authors`, `editor_drafts`, `editor_tokens`, `validate_editor_token` |
| **AI** | `scraped_articles`, `rewrite_jobs`, `column_jobs`, `generation_logs`, `automation_settings`, `commit_scraper_blog_post` |
| **Social** | `social_posts`, `blog_posts` |
| **Articole** (Articles) | `blog_posts`, `comments`, `increment_view_count` |
| **Scraper RSS** | `rss_sources`, `scraped_articles`, `county_quotas`, `sweep_stuck_rewrite_jobs` |
| **Comentarii** (Comments) | `comments`, `blog_comments` |
| **Newsletter** | `newsletter_campaigns`, `newsletter_subscribers` |
| **Abonați** (Subscribers) | `newsletter_subscribers`, `contacts`, `sync_subscriber_to_contacts` |
| **Publicitate** (Sponsors) | `sponsor_banners`, `ad_pricing`, `ad_inquiries`, `increment_banner_impressions/clicks` |
| **Inbox** | `contact_messages` |
| **Setări** (Settings) | `site_settings`, `automation_settings`, `authors`, `user_roles` |
| **Observabilitate** (Analytics) | `site_analytics`, `section_views`, `get_analytics_data`, `ai_spend_log` (+ daily views), `generation_logs` |

**27 tables · 46 RLS policies · all backbone functions** (`has_role`,
`commit_scraper_blog_post`, `get_analytics_data(_admin)`, `handle_new_user`,
`sync_subscriber_to_contacts`, `mark_scraped_article_processed`,
`sweep_stuck_rewrite_jobs`, `increment_*`, `validate_editor_token`,
`update_view_geo`, `ai_spend_today`, `automation_settings_singleton`,
`update_updated_at`).

---

## What was adjusted vs Transilvania Times

* **Languages** — every `*_en` / `*_ro` pair gains `*_el` / `*_ar` (articles,
  scraped items, authors, sponsors, rate card, drafts). `commit_scraper_blog_post`
  writes all four.
* **Timezone** — `Europe/Bucharest` → **`Europe/Nicosia`** (`ai_spend_today`,
  the spend views).
* **Geography** — the `county` column is kept (so functions port unchanged) but
  now holds a **Cyprus district**: Nicosia, Limassol, Larnaca, Famagusta,
  Paphos, Kyrenia (seeded in `county_quotas`).
* **Currency** — EUR (TT already used `*_eur` columns).
* **Analytics** — internal‑referrer match → `cypruslifestyle` domains; Romanian
  display labels → English (Internal / Other / unknown).
* **Sponsors** — banner colour defaults set to the Cyprus palette (obsidian
  ground `#0B0E11`, gold accent `#C9A24C`).
* **Feeds** — `rss_sources` gains `region` and `tier` for Cyprus routing, and is
  seeded with 42 curated sources (luxury lifestyle + Cyprus EN/EL + Greece +
  international + Gulf/Arabic).

## Excluded (out of scope for Cyprus Lifestyle)

The video **Studio / anchor** subsystem (`studio_*`, `anchors`, `anchor_plates`,
`newsroom_*`, `rundown_items`, `pronunciation_lexicon`), **airport/flights**
(`airport_flights`, `flight_disruptions`) and **weather alerts**
(`weather_alerts_sent`) are intentionally not ported.

## Reconciled against the full live schema — no guesswork

Every ported table was diffed, column by column, against your live exports
(**columns · constraints · indexes · RLS policies · enums · function
definitions**). Result: **all 27 ported tables match live exactly** — no missing
columns, no type mismatches. The only differences are the deliberate additions:

* the `_el` / `_ar` language columns (and the `el_`/`ar_` telemetry columns in
  `generation_logs`, mirroring TT's `ro_` ones),
* `region` / `tier` on `rss_sources` for Cyprus feed routing.

Tables that were reconciled to their exact live shape from the CSV include
`editor_drafts` (single‑language + `translate` flag — **not** column pairs),
`generation_logs` (all 39 live columns + EL/AR), `ai_spend_log` (bigint id,
`units` / `caller` / `meta`), `editor_tokens` (`label`), `county_quotas`
(`daily_limit` / `priority` / `active`), `column_jobs` (`phase` integer), and
`ad_inquiries` (`slots_offered` scalar text).

The index set is the **live index set**, including three that are behavioural,
not just performance:

* `uq_rewrite_jobs_active_article` — the "one active rewrite per article" lock the
  stuck‑job sweeper relies on,
* `scraped_articles_original_url_uniq` — de‑dupes re‑scraped URLs,
* `uq_blog_posts_scraped_article_id` — one published post per scraped item.

---

## Files

```
supabase/
├── schema_all.sql              ← paste-and-run everything (idempotent)
└── migrations/
    ├── 0001_extensions_enums.sql
    ├── 0002_identity_roles.sql
    ├── 0003_content.sql          authors · blog_posts (4-lang) · comments · editor_*
    ├── 0004_scraper_ai.sql       rss_sources · scraped_articles · jobs · commit_scraper_blog_post
    ├── 0005_engagement.sql       contacts · subscribers · campaigns · inbox · social
    ├── 0006_advertising.sql      sponsor_banners · ad_pricing · ad_inquiries
    ├── 0007_analytics_settings.sql  site_analytics · get_analytics_data · settings
    ├── 0008_indexes.sql
    └── 0009_seed_cyprus.sql      districts · desks · rate card · settings · 42 feeds
```

Next: **Stage 2** — the scraper + translation edge functions (draft all four
languages, Arabic RTL), deployed against this schema.
