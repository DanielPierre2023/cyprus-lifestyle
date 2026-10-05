# Performance & scale (Phase 6.1) - Vercel Hobby + Supabase Free, no paid plan

Everything below works on the free tiers. Nothing here needs Vercel Pro, Supabase Pro, a new
vendor or a paid API. `vercel.json` (region `fra1`, daily cron) is unchanged.

## 1. Images (no Vercel optimiser, no `/_next/image`)

Why: Hobby includes **5,000 image transformations / month**; beyond that new images return
HTTP 402 (verified in Vercel's Image Optimization limits page). Supabase's image-transform
endpoint is Pro-only. So the optimiser stays off and `next/image` uses a **custom loader**
(`lib/imageLoader.ts`, wired in `next.config.mjs`):

| Source | What the loader does | Cost |
|---|---|---|
| Supabase Storage original | maps to a pre-resized WebP variant `_v/<path>-{480,960,1440}.webp` made once with `sharp` | free (Storage 1 GB / 5 GB egress) |
| images.unsplash.com | adds `w`/`q`/`auto=format` (Unsplash's own imgix CDN) | free |
| picsum.photos placeholder | shrinks `/seed/x/W/H` | free |
| anything else (hot-links, SVG, relative) | untouched, `unoptimized` per image | free |

**Safe by default**: until you opt in, Supabase images load exactly as before. To opt in:

1. Create the variants (idempotent, original files are never touched or deleted):
   - local: `NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/images/backfill-variants.ts` (dry run) then `... --apply`
   - or signed in as admin: `POST /api/admin/images/variants {"limit":6}` repeatedly until `"done": true`
2. Set `NEXT_PUBLIC_IMAGE_VARIANTS=1` in Vercel (Production) and redeploy.
3. If a variant is missing the browser gets a 404 and `CoverImage` retries the original once
   before falling back - so a partial backfill never breaks a cover.

Storage budget: ~350 KB of variants per image (three WebPs). Check `select count(*) from storage.objects where bucket_id='blog-images'` x 0.35 MB against the 1 GB free quota before running `--apply`.

New uploads now create their variants themselves (Increment 6.2): the AI cover (`lib/editorial/cover.ts`, after the Storage upload, time-boxed to 20 s) and the editor's "Upload from computer" (the picker calls `POST /api/admin/images/variants {"path": "covers/..."}`). Both are best-effort: if it fails, the original is served and the backfill picks it up later.

## 2. Tag-based revalidation (7 locales x ~3k pages)

Reads in `lib/queries.cached.ts` carry tags `<item>` and `<item>@<locale>`:
`article:<slug>`, `cat:<category>`, `home`, `listing:<slug>`, `dir:<type>`, `dir:all`, `event:<slug>`, `events`.
`POST /api/revalidate/tags` (header `x-revalidate-secret: $REVALIDATE_SECRET`, or admin session):

```json
{ "kind": "article", "slug": "x", "category": "property" }            // all locales
{ "kind": "article", "slug": "x", "category": "property", "locales": ["de"] }  // one translation
{ "kind": "listing", "slug": "x", "type": "winery" }
{ "kind": "event",   "slug": "x" }
```

It also accepts a Supabase **Database Webhook** payload directly (Dashboard -> Database -> Webhooks,
HTTP POST, header `x-revalidate-secret`) on `blog_posts`, `directory_listings`, `events`
(INSERT/UPDATE/DELETE). A category change refreshes both the old and the new category.
The pages' time-based `revalidate` is now **3600 s (1 hour)** and is only the safety net (Increment 6.2, section 2b).

## 3. Budgets (after `next build`)

```
node scripts/perf/check-budgets.mjs      # page-entry JS (existing)
node scripts/perf/initial-js.mjs --enforce   # page + ALL layout chunks, gzip (new)
node scripts/perf/check-preloads.mjs     # preloaded font KB + locale-home HTML KB (new)
```
Ceilings live in `perf-budgets.json`.


## 2b. Pages refresh on change (Increment 6.2) - database triggers, 1 hour safety net

Instead of Dashboard webhooks, one migration installs triggers that call the tag route for you.

**Owner steps (once, about 5 minutes)**

1. Supabase -> SQL Editor, run (choose your own long random string; keep it, you need it in step 3):
   ```sql
   -- skip the first line if the scheduled jobs setup already created cl_site_url
   select vault.create_secret('https://cypruslifestyle.eu', 'cl_site_url');
   select vault.create_secret('<long random string>',       'cl_revalidate_secret');
   ```
2. Run `supabase/migrations/20261007130000_revalidate_webhooks.sql` (safe to run again).
3. Vercel -> Project -> Settings -> Environment Variables: **`REVALIDATE_SECRET` must equal `cl_revalidate_secret`** exactly (Production and Preview), then Redeploy. (`/api/revalidate/tags` reads `REVALIDATE_SECRET` and compares it with the `x-revalidate-secret` header the trigger sends.)
4. Test: edit any published event in the SQL editor, e.g.
   `update public.events set summary_en = coalesce(summary_en,'') || ' ' where id = (select id from public.events where status='published' limit 1);`
   then `select id, status_code, left(content::text,80) from net._http_response order by id desc limit 3;` -> `200` and `{"ok":true,"tags":[...]}`. A `401` means the two secrets differ.

**What it does and does not do**

- Triggers `zz_cl_revalidate` on `blog_posts`, `directory_listings`, `events` (INSERT/UPDATE/DELETE). Drafts and unpublished rows are ignored; a published row that becomes a draft is announced (so the page disappears).
- Housekeeping-only updates (page-view counters, enrichment stamps, `updated_at`) send nothing, so traffic and background enrichment never flood the site.
- A failing webhook never blocks or rolls back a save (errors are caught and logged as a warning). No Vault secret = silently off.
- Switch off: `alter table public.blog_posts disable trigger zz_cl_revalidate;` (same for the other two tables).
- Pages on the 1 h window (they read tagged data): home, category, article, directory type, directory listing, agenda, agenda event. Pages that read untagged data keep 300 s: best, luxury, advertise, map, directory index, directory group, author. Banner / section-sponsor edits are not covered by the triggers: they show within the hour (or press Publish on any article, which refreshes the home).
- The editor's **Publish** button and the Articles list also call `/api/admin/revalidate`, which now refreshes the same tags (article, home, category in all 7 languages) in addition to the paths it always refreshed.
- The restore drill (`npm run db:drill`, step 14) applies the migration twice and checks payloads, silent no-ops and that a broken webhook never blocks a write.

## 4. Analytics scripts and Greek fonts (Increment 6.2)

- **Analytics, Speed Insights and the GetYourGuide loader** (`components/ConsentScripts.tsx`) are a separate chunk fetched only after the reader accepted cookies and the browser is idle (`ConsentAnalytics`). Readers who decline never download them.
- **Greek text had no webfont** (Jost, Lora, Bodoni Moda have no Greek). The `/el` edition now uses Noto Serif Display (headings), Noto Serif (body) and Manrope (kickers/nav): free, SIL OFL, self-hosted in `public/fonts/el/` (unmodified Greek subsets, 5 files, 133 KB total, 67 KB preloaded). Latin letters and digits still use Bodoni/Lora/Jost. Only `/el` receives the `@font-face` rules and the 3 preload hints (`lib/fontsGreek.ts`, `app/[locale]/layout.tsx`), the other six editions get byte-identical HTML/CSS. `next/font/google` was tried first and rejected: it preloads per layout (all 7 editions) and adds 12.7 KB of CSS everywhere. To replace a font file give it a new name and update `lib/fontsGreek.ts` (served `immutable`, one year).
- `perf-budgets.json`: `fonts.perPage["/el"] = 235` KB (157.3 base + 66.8 Greek); every other edition keeps 175.
