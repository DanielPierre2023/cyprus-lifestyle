# Plan 1 — Concierge Hybrid Retrieval

Fixes the class of failure where the concierge can't find a named place (e.g. "Zya Cafe"),
and wires in the semantic search that already exists but was unused.

## Files
- `supabase/migrations/20260930120000_concierge_hybrid_retrieval.sql`
- `supabase/functions/concierge/index.ts` (complete replacement)

## Deploy (all via the Supabase Dashboard + GitHub web UI — no CLI)

1. **Run the SQL** — Dashboard → SQL Editor → paste the migration file → Run.
   It adds trigram indexes, the `match_directory_name` RPC, and corrects the
   "Zya Caffee" → "Zya Cafe" name. Idempotent; safe to re-run.

2. **Confirm the secret** — Dashboard → Edge Functions → Secrets. `OPENAI_API_KEY`
   is already set. Optional: add `EMBEDDING_MODEL` only if your directory vectors
   were NOT built with `text-embedding-3-small` (default). Both directory_embeddings
   and kb_embeddings are vector(1536).

3. **Deploy the function** — Dashboard → Edge Functions → `concierge` → paste
   `index.ts` → Deploy. Keep **Verify JWT = OFF** (the site's /api/concierge route
   gates it). No other function changes.

4. **Commit** — commit both files to the repo at the paths above (one commit).

## How retrieval now works
Three signals, merged and ranked (name > semantic > structured):
1. **Name** — `match_directory_name` (pg_trgm word similarity): exact, partial,
   and misspelled names; not rating-truncated.
2. **Semantic** — `match_directory` (pgvector cosine over `directory_embeddings`),
   query embedded with the same model.
3. **Structured** — type × district top-rated, as a supporting signal.
Only `published` rows are handed to the model, which still picks strictly from
the candidates (no invention). If embeddings are ever unavailable, semantic is
skipped and name + structured still work — no regression.

## Smoke tests after deploy
- "Zya Cafe" / "zya" → returns the Zya Cafe listing.
- "quiet beachfront dinner in Paphos" → sensible semantic picks.
- "who builds new apartments in Limassol" → development listings.
- A pure how-to ("how do I get residency") → answers from KNOWLEDGE, few/no picks.
