# Cyprus Lifestyle — Hybrid Vector Search (v2) + complete concierge stack

**This bundle is the complete, self-consistent concierge stack** (it includes the
build fix — `lib/concierge/memory.ts` and everything else). Commit all of it
(`git add -A`) and the build is green. It also adds **hybrid vector search**:
semantic recall on the knowledge base, blended with the existing keyword search.

## What hybrid search adds
The concierge already finds exact-term matches (keyword). Vector search adds
**semantic** recall — it understands oblique wording ("somewhere calm to propose
by the water" → the engagement-ring and romantic-dinner answers) even when the
words don't match. Keyword + semantic hits are merged, so precision is kept and
recall is sharpened. **It's additive and non-breaking:** until you activate it,
the concierge behaves exactly as now (keyword only).

## Commit (app code → Vercel) — makes the build green
```
lib/concierge/brain.ts   lib/concierge/memory.ts   lib/concierge/embed.ts
app/api/concierge/chat/route.ts   app/api/concierge/memory/route.ts   app/api/concierge/embed/route.ts
app/api/whatsapp/route.ts
components/ConciergeChat.tsx   app/[locale]/(site)/layout.tsx
messages/{en,el,ro,ar,de,pl,ru}.json
```
`git add -A`, confirm `git status` lists `lib/concierge/memory.ts` and
`lib/concierge/embed.ts`, then push.

## Database (Supabase SQL editor) — run any not yet applied (all safe to re-run)
```
supabase/migrations/0047_concierge_whatsapp.sql
supabase/migrations/0048_concierge_memory.sql
supabase/migrations/0049_concierge_kb_vectors.sql   ← new (pgvector + kb_embeddings + match_kb)
```

## Activate vector search (optional — do when ready; skipping changes nothing)
1. Ensure **`OPENAI_API_KEY`** is in the Vercel env (the app already uses OpenAI).
2. Run migration **0049** (above) — enables `pgvector`, the `kb_embeddings` table and `match_kb`.
3. Trigger the one-off embed of the 67 knowledge answers — open in a browser:
   ```
   https://<your-site>/api/concierge/embed?key=<ENRICH_SECRET>
   ```
   It returns `{ ok: true, embedded: 67 }`. Re-run it any time you edit the knowledge base.

That's it — the concierge then blends semantic + keyword recall. Model:
`text-embedding-3-small` (1536 dims, multilingual, ~$0.00002 per query — negligible).

## Safety
- No OpenAI key, or migration/embed not run yet → `match_kb` returns nothing and
  the concierge falls back to keyword search. Nothing breaks.
- The embed endpoint is gated by `ENRICH_SECRET`.

## Roadmap (v2 continues)
Shipped: memory ✓, voice ✓, hybrid vector search ✓. Next: a proactive concierge,
and the members' tier. (Directory-wide vector search is a later extension — the
directory keyword search already returns real listings well.)
