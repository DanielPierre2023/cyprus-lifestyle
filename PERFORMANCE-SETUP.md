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

New uploads (`lib/editorial/cover.ts`) do not create variants yet - see "proposed small corrections".

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
The pages' `revalidate = 300` stays as the safety net.

## 3. Budgets (after `next build`)

```
node scripts/perf/check-budgets.mjs      # page-entry JS (existing)
node scripts/perf/initial-js.mjs --enforce   # page + ALL layout chunks, gzip (new)
node scripts/perf/check-preloads.mjs     # preloaded font KB + locale-home HTML KB (new)
```
Ceilings live in `perf-budgets.json`.
