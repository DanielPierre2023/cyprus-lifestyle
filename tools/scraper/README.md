# Cyprus Lifestyle — generic scraper

One Scrapling-based worker that scrapes **any** site from a small YAML **profile**
and writes the results as **drafts** (with provenance) into your Supabase, ready
to review in the admin. Add a new source by adding a profile — no code changes.

Where a site is tidy, the profile's CSS selectors + schema.org JSON-LD do the
work; where it isn't, an optional AI pass (`ai_fallback: true` + `CLAUDE_API_KEY`)
fills the gaps. A field the page doesn't show is left null — never invented.

## Destinations (`target:` in a profile)
| target         | lands in                                   | for                                   |
|----------------|--------------------------------------------|---------------------------------------|
| `directory`    | `directory_listings`                       | business directories (e.g. cyprusatlas) |
| `developments` | `directory_listings` (type=development)    | a developer's own project pages       |
| `events`       | `events`                                   | what's-on / venue sites → the Agenda  |
| `news`         | `scraped_articles`                         | news sources → the AI newsroom queue  |

Everything is `status='draft'` (news is `status='scraped'` for the AI processor).
Dedupe is automatic per destination (directory: slug; events: ingest_key; news:
original_url) and re-runs skip finished pages (`.state_<site>.json`).

## Install
```bash
cd tools/scraper
python -m venv .venv && source .venv/bin/activate     # optional
pip install -r requirements.txt
scrapling install       # only if a profile uses fetcher: browser
cp .env.example .env     # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

## Run
```bash
python scrape.py --list                                        # available profiles
python scrape.py --site cyprusatlas --query restaurants --dry-run
python scrape.py --site cyprusatlas --query restaurants,hotels --limit 200
python scrape.py --site my-developer --limit 50
```
Flags: `--query` (fills a listing `{q}` placeholder), `--url` (one page), `--limit`,
`--delay`, `--dry-run`.

## Add a site (2 minutes)
1. Copy a template from `profiles/` — `_developer.example.yaml`, `_events.example.yaml`
   or `_news.example.yaml` (for a directory, copy `cyprusatlas.yaml`).
2. Set `base_url`, `target`, and the `discovery` (a listing URL + a
   `detail_link_selector`, **or** a `sitemap`, **or** explicit `seeds`).
3. Optionally pin `extract:` selectors; otherwise turn on `ai_fallback: true`.
4. `python scrape.py --site <name> --dry-run` → check the rows → drop `--dry-run`.

Profiles starting with `_` are templates and are hidden from `--list`.

## After a run
Review and publish in the admin: **Directory** (directory / developments),
**Agenda** (events), or **AI newsroom** (news). Approved rows flow into the
concierge, directory pages, map and articles like anything else.

## Scheduled runs (optional)
`ci-example.yml` runs a chosen site on a schedule / on demand via GitHub Actions —
copy it to `.github/workflows/`, set repo secrets `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` (and `CLAUDE_API_KEY` if a profile uses AI).
