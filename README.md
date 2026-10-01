# Plan 2 — Concierge Knowledge Layer (ingest + embed)

Loads the six scraped Cyprus sites into a `kb_docs` knowledge store the concierge
can search semantically. Rows arrive **published=false** for your review, get
embedded with the same `text-embedding-3-small` space as the directory, and go
live only when you publish them.

**Design note (why not directory_listings):** the scrape captured page *metadata*
(title, description, H1, og:image, phones), not clean geocoded place records or
full article bodies. That's ideal as a *knowledge* layer but would pollute your
curated `directory_listings` if forced in as places. So Plan 2 builds the KB
cleanly; turning the genuine business rows (fashion stores, developers, venues)
into reviewed directory entries is a separate, optional pass we can do later
(needs geocoding + category cleanup).

## Files
- `supabase/migrations/20261001090000_kb_docs.sql` — `kb_docs` table, `match_kb_docs`, `kb_docs_needing_embedding`
- `supabase/functions/kb-ingest/index.ts` — ingest (CSV→kb_docs) + embed + publish

## Deploy & run (Supabase Dashboard; no CLI)

**1. SQL** — SQL Editor → paste the migration → Run. (Idempotent.)

**2. Function** — Edge Functions → create `kb-ingest` → paste `index.ts` → Deploy, **Verify JWT OFF**.
`OPENAI_API_KEY` and the service key are already on the project.

**3. Ingest each source** — open `kb-ingest` → Invoke with `?key=<SERVICE_ROLE_KEY>` and this JSON body, once per source (CSV links valid ~24h — if expired, re-export each table from its cloud page, or ask me):

| source | body `csv_url` |
|---|---|
| mycypruslife (463) | the mycypruslife link below |
| cyprusbucketlist (93) | …bucketlist link |
| imin (132) | …imin link |
| cyprusfashion (85) | …fashion link |
| cyprusdevelopers (73) | …developers link |
| mycyprustravel (48) | …travel link |

Example body:
```json
{ "mode": "ingest", "source": "mycypruslife", "csv_url": "PASTE_LINK" }
```

**4. Embed** — Invoke with body `{ "mode": "embed", "limit": 50 }` repeatedly until `remaining_estimate` is 0 (each call embeds a batch within a 40s budget).

**5. Review, then publish** — browse `kb_docs` (published=false) in the Table editor, drop any junk rows, then make a source live:
```json
{ "mode": "publish", "source": "mycypruslife" }
```
(or `"source": "all"`). Only published rows are returned to visitors.

## CSV export links (valid ~24h from 2026-10-01 09:13 UTC)
- **mycypruslife**: https://cloud-api.ultimatewebscraper.com/mcp/export/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0YWJsZUlkIjoiNjJlZmEwYWYtZTU5Ny00YWMwLWE4ODUtODYzYzExZjJiM2FmIiwid29ya3NwYWNlSWQiOiI1YTRhMzg0ZS02OTkwLTQ2OTUtYTY3OS1mMDY2NzM1OWUzODciLCJmb3JtYXQiOiJjc3YiLCJjb2x1bW5JZHMiOlsidXJsIiwiczBfanNvbl9sZF9fbmFtZSIsInMwX2pzb25fbGRfX2Rlc2NyaXB0aW9uIiwiczFfcGFnZV9tZXRhZGF0YV9fdGl0bGUiLCJzMV9wYWdlX21ldGFkYXRhX19kZXNjcmlwdGlvbiIsInMxX3BhZ2VfbWV0YWRhdGFfX2ltYWdlIiwiczFfcGFnZV9tZXRhZGF0YV9faDEiLCJzMV9wYWdlX21ldGFkYXRhX19wYWdlX3R5cGUiXSwiaWF0IjoxNzkwODYzNTg1LCJleHAiOjE3OTA5NDk5ODUsImF1ZCI6InV3cy1tY3AtZXhwb3J0In0.AkSHweFhjvzLsl7LPQ-6RI4eqiiaCeIHiD1kUvy8qfM
- **cyprusbucketlist**: https://cloud-api.ultimatewebscraper.com/mcp/export/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0YWJsZUlkIjoiYWJkNTEwYzUtODQxYi00Yjg3LWE5ZWQtMjA4ZGNhYjkzZTRkIiwid29ya3NwYWNlSWQiOiI1YTRhMzg0ZS02OTkwLTQ2OTUtYTY3OS1mMDY2NzM1OWUzODciLCJmb3JtYXQiOiJjc3YiLCJjb2x1bW5JZHMiOlsidXJsIiwiczBfanNvbl9sZF9fbmFtZSIsInMwX2pzb25fbGRfX2Rlc2NyaXB0aW9uIiwiczFfcGFnZV9tZXRhZGF0YV9fdGl0bGUiLCJzMV9wYWdlX21ldGFkYXRhX19kZXNjcmlwdGlvbiIsInMxX3BhZ2VfbWV0YWRhdGFfX2ltYWdlIiwiczFfcGFnZV9tZXRhZGF0YV9faDEiLCJzMV9wYWdlX21ldGFkYXRhX19wYWdlX3R5cGUiXSwiaWF0IjoxNzkwODYzNTg2LCJleHAiOjE3OTA5NDk5ODYsImF1ZCI6InV3cy1tY3AtZXhwb3J0In0.iuWyRxEve_l__2gKsVlflbYhzh159Ns-Um4tdS8fdMw
- **imin-cyprus**: https://cloud-api.ultimatewebscraper.com/mcp/export/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0YWJsZUlkIjoiZmViMzUzY2EtOTcyZC00OTkyLThkMGQtYmYzZDVhYTgwNjMyIiwid29ya3NwYWNlSWQiOiI1YTRhMzg0ZS02OTkwLTQ2OTUtYTY3OS1mMDY2NzM1OWUzODciLCJmb3JtYXQiOiJjc3YiLCJjb2x1bW5JZHMiOlsidXJsIiwiczBfanNvbl9sZF9fbmFtZSIsInMwX2pzb25fbGRfX2Rlc2NyaXB0aW9uIiwiczFfcGFnZV9tZXRhZGF0YV9fdGl0bGUiLCJzMV9wYWdlX21ldGFkYXRhX19kZXNjcmlwdGlvbiIsInMxX3BhZ2VfbWV0YWRhdGFfX2ltYWdlIiwiczFfcGFnZV9tZXRhZGF0YV9faDEiLCJzMV9wYWdlX21ldGFkYXRhX19wYWdlX3R5cGUiXSwiaWF0IjoxNzkwODYzNTg4LCJleHAiOjE3OTA5NDk5ODgsImF1ZCI6InV3cy1tY3AtZXhwb3J0In0.Eet-lffvGgG3Wg6ZUgV4mMI_Aevw1ehHOBKvLS3YaHo
- **cyprusfashion**: https://cloud-api.ultimatewebscraper.com/mcp/export/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0YWJsZUlkIjoiNmNjZDFlYjYtYzE2MC00NmQwLWE4MGEtNjYyZjU4MmZlNjgxIiwid29ya3NwYWNlSWQiOiI1YTRhMzg0ZS02OTkwLTQ2OTUtYTY3OS1mMDY2NzM1OWUzODciLCJmb3JtYXQiOiJjc3YiLCJjb2x1bW5JZHMiOlsidXJsIiwiczBfanNvbl9sZF9fbmFtZSIsInMwX2pzb25fbGRfX2Rlc2NyaXB0aW9uIiwiczFfcGFnZV9tZXRhZGF0YV9fdGl0bGUiLCJzMV9wYWdlX21ldGFkYXRhX19kZXNjcmlwdGlvbiIsInMxX3BhZ2VfbWV0YWRhdGFfX2ltYWdlIiwiczFfcGFnZV9tZXRhZGF0YV9faDEiLCJzMV9wYWdlX21ldGFkYXRhX19wYWdlX3R5cGUiXSwiaWF0IjoxNzkwODYzNTkwLCJleHAiOjE3OTA5NDk5OTAsImF1ZCI6InV3cy1tY3AtZXhwb3J0In0.7EdWxiQVYIUeTdkgvQF4hN97h_DzTWEP2O2cH0breMo
- **cyprusdevelopers**: https://cloud-api.ultimatewebscraper.com/mcp/export/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0YWJsZUlkIjoiOTNkNTY4YWEtNDZjOC00MGYxLWI0ZDMtN2ZlZTkzODM0OGNmIiwid29ya3NwYWNlSWQiOiI1YTRhMzg0ZS02OTkwLTQ2OTUtYTY3OS1mMDY2NzM1OWUzODciLCJmb3JtYXQiOiJjc3YiLCJjb2x1bW5JZHMiOlsidXJsIiwiczBfanNvbl9sZF9fbmFtZSIsInMwX2pzb25fbGRfX2Rlc2NyaXB0aW9uIiwiczFfcGFnZV9tZXRhZGF0YV9fdGl0bGUiLCJzMV9wYWdlX21ldGFkYXRhX19kZXNjcmlwdGlvbiIsInMxX3BhZ2VfbWV0YWRhdGFfX2ltYWdlIiwiczFfcGFnZV9tZXRhZGF0YV9faDEiLCJzMV9wYWdlX21ldGFkYXRhX19wYWdlX3R5cGUiXSwiaWF0IjoxNzkwODYzNTkyLCJleHAiOjE3OTA5NDk5OTIsImF1ZCI6InV3cy1tY3AtZXhwb3J0In0.YMRZPgUauknUYVlnHreyANhcP4y6OH8OFi6WisFyahQ
- **mycyprustravel**: https://cloud-api.ultimatewebscraper.com/mcp/export/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0YWJsZUlkIjoiMzUwNDcyZWItNmY3Yy00MDYwLTljMzMtZGI4ZWJiN2YxOWRlIiwid29ya3NwYWNlSWQiOiI1YTRhMzg0ZS02OTkwLTQ2OTUtYTY3OS1mMDY2NzM1OWUzODciLCJmb3JtYXQiOiJjc3YiLCJjb2x1bW5JZHMiOlsidXJsIiwiczBfanNvbl9sZF9fbmFtZSIsInMwX2pzb25fbGRfX2Rlc2NyaXB0aW9uIiwiczFfcGFnZV9tZXRhZGF0YV9fdGl0bGUiLCJzMV9wYWdlX21ldGFkYXRhX19kZXNjcmlwdGlvbiIsInMxX3BhZ2VfbWV0YWRhdGFfX2ltYWdlIiwiczFfcGFnZV9tZXRhZGF0YV9faDEiLCJzMV9wYWdlX21ldGFkYXRhX19wYWdlX3R5cGUiXSwiaWF0IjoxNzkwODYzNTk0LCJleHAiOjE3OTA5NDk5OTQsImF1ZCI6InV3cy1tY3AtZXhwb3J0In0.hK0G6rgOtygsfuNrO7aMBv6JF4mkQ-AE-U3KJXTPcxo

## Final step (I'll deliver next)
Once `kb_docs` is populated, embedded and published, I'll give you the concierge
update that calls `match_kb_docs` so answers actually draw on this knowledge with
"on our site" links — the Plan 1 concierge with the KB wiring added.
