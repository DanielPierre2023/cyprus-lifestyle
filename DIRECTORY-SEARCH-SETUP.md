# Directory-wide semantic search

This bundle upgrades the concierge's recall: it can now find a business by **what
it is**, across the *whole* directory — not just by matching a name, tag or
summary word.

Before: "romantic dinner for our anniversary" only surfaced listings whose text
literally contained those words. Now the concierge understands the *intent* and
brings back the fine-dining restaurants with the right feel, the sea-view
tavernas, the cand-lit wineries — even when none of them say "romantic" or
"anniversary" anywhere. The same holds in all seven languages.

It mirrors the knowledge-base vector search you already shipped (migration
`0049`), so the design and the safety guarantees are identical.

---

## How it works

1. Each **published** listing is embedded once into `directory_embeddings`
   (pgvector) from a rich multilingual document — its name, type, sub-type,
   district, price band, luxury flag, tags and every available language summary.
2. On each concierge turn the guest's message is embedded **once** and that one
   vector feeds *both* semantic layers — the knowledge base **and** the whole
   directory (`match_kb` + `match_directory`). No extra per-turn embedding cost:
   the query was already being embedded for KB recall; it's now reused.
3. Candidates are merged **keyword-first, semantic-second, deduped**: the precise
   name/type/district matches lead, then the semantic discoveries fill in, then
   (only if still thin) the best-rated listings. The concierge still names *only*
   real, published listings — grounding is unchanged.

**Fully graceful.** Until you run the backfill (or if `OPENAI_API_KEY` is unset),
`match_directory` returns nothing and the concierge uses its existing
keyword/intent search exactly as before. Nothing breaks; it only gets sharper.

---

## Setup — two steps

### a) Run the migration

In the Supabase SQL editor:

```
supabase/migrations/0051_concierge_dir_vectors.sql
```

It creates `public.directory_embeddings` (slug PK, FK to `directory_listings`
with `on delete cascade`, RLS on — **service-role only**), an HNSW cosine index,
and the `match_directory(query_embedding, match_count, filter_type)` function.
Idempotent — safe to re-run.

### b) Backfill the embeddings

Call the re-runnable job once after deploy (needs `OPENAI_API_KEY`, gated by
`ENRICH_SECRET`):

```
curl -X POST "https://<your-domain>/api/concierge/embed-directory?key=$ENRICH_SECRET"
```

It returns e.g. `{ ok:true, total:214, changed:214, embedded:214, skipped:0,
remaining:0, note:"Directory fully embedded." }`.

- **Re-runnable & incremental.** Each listing's text is hashed; a re-run only
  re-embeds what actually changed. Re-run it after you add or edit listings.
- **Large directories.** If it can't finish within the 60 s function limit it
  reports `remaining > 0` — just call it again; it resumes where it stopped.
- **Rebuild everything** with `&force=1`.

> **Note / correction:** both embed jobs are gated the same way — by
> `?key=<ENRICH_SECRET>`. (An earlier members'-tier note mislabelled the KB job's
> gate as an `x-embed-key` header; the correct call for **both** is
> `/api/concierge/embed?key=$ENRICH_SECRET` for the knowledge base and
> `/api/concierge/embed-directory?key=$ENRICH_SECRET` for the directory.)

---

## Environment

No new variables. Reuses what the KB vector search already needs:

| Variable | Purpose | If absent |
|---|---|---|
| `OPENAI_API_KEY` | Query + listing embeddings | semantic search off; keyword search only |
| `ENRICH_SECRET` | Gates the backfill jobs | backfill returns `unauthorized` |

---

## What changed in the code

```
lib/concierge/brain.ts                         (edited)
    • one query embedding per turn, reused for KB + directory
    • vectorDirectory() + hydrateSlugs() — semantic directory recall
    • mergeDirHits() — keyword-first, semantic-second, deduped
    • rowToPick()/dirCols() extracted; top-rated fallback kept last
app/api/concierge/embed-directory/route.ts     (new — backfill job)
supabase/migrations/0051_concierge_dir_vectors.sql  (new)
```

Everything else in the bundle is the complete, unchanged concierge stack, shipped
together so the set stays self-consistent (no missing-module surprises on Vercel).

Verified before packaging: `npx tsc --noEmit` → clean; `npx next build` →
*Compiled successfully*, lint + types pass (the only stop is the pre-existing
`/cyprus` prerender, which needs Supabase env and builds fine on Vercel).
