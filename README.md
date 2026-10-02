# Stub enrichment — fix the ~2,066 hollow public descriptions

Detects hollow "stub" descriptions on **published** listings, generates real, **grounded**
replacements (only from the listing's own facts — no invented prices/claims), and — most
importantly straight away — **keeps stub pages out of the sitemap / noindex'd** until they
have real text, so they stop hurting SEO.

**Two destinations:**
1. **APP CODE** — commit these files → Vercel. The **SEO gate is live immediately** on deploy
   (hollow published listings drop out of the sitemap; the detail page noindexes them — that
   one-line page change ships in the **owner-editor** ZIP's detail page).
2. **SQL (optional)** — `supabase/migrations/20261001150000_stub_text_status.sql` adds a
   `text_status` tracking column. The gate and the job both work **without** it; it just adds
   richer tracking + a "needs review" hold-back.

Full diff in `CHANGES.diff`.

## What's in it
- `lib/directory/enrich.ts` — stub detection (`isStubText`/`isStub`), the SEO-gate predicate
  (`isPublishableListing`), grounded generation + a strict validator (rejects any currency,
  contact info, invented numbers, or unverifiable superlatives → marks the row "review"
  rather than publishing something doubtful).
- `app/api/admin/enrich-stubs/route.ts` — the runnable job (GET = dry-run census + cost;
  POST = fill a batch), admin-auth or `Bearer` secret, like your existing backfill routes.
- `scripts/enrich-stubs.ts` — a CLI that drives the route in a loop.
- `lib/seo/sitemap.ts` + `lib/seo.ts` — the SEO gate: stubs excluded from the sitemap; a
  `robotsForStub()` helper (page-level noindex is wired in the detail page via the
  owner-editor ZIP).

## Running the generation (you run it against your DB)
Set `CLAUDE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `ENRICH_STUBS_SECRET` (or reuse
`CRON_SECRET`). Then:
- **Dry-run (counts + cost, no writes):** `GET /api/admin/enrich-stubs` with the Bearer secret.
- **Real run (batched, resumable, idempotent):** `POST` with `{"limit":20,"concurrency":4}`,
  repeat until clear; add `"translate":true` to fill the other six languages too.

**Cost for ~2,066 rows:** ≈ **$3** English-only (Haiku); ≈ **$48** if you also translate all
seven editions. Grounded + validated; a doubtful row is held for review, not published.

## Verified
`npx tsc --noEmit` clean; `npm test` → all 34 suites pass (incl. a new `enrich.pure` suite,
42 assertions).

## Smoke tests
- Deploy → check your sitemap: hollow published listings no longer appear; a listing with a
  real description still does. Open a stub listing's page source → `noindex` (once the
  owner-editor ZIP's detail page is also deployed).
- `GET /api/admin/enrich-stubs` (dry-run) → returns the stub count + cost estimate.
- Run one POST batch → those rows get real, grounded descriptions and re-enter the sitemap
  automatically on the next revalidation.

*Note:* this fixes the stub **text + SEO**. The district×category **conversion** (getting
owners to claim) is the claim-to-own + owner-editor loop, deployed separately. Deploy order
for all the new ZIPs is in the owner-editor README.
