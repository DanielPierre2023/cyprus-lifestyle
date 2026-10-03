# Plan 2 — Activation run sheet (2026-10-03)

Goal: load the six scraped sites into `kb_docs`, embed them, and publish them so
the concierge can use them. `kb_docs` is currently **empty (0 rows)**.

Everything here is invoked from **Supabase Dashboard → Edge Functions → `kb-ingest` → Invoke**
(Verify JWT is already OFF). Every call needs your service-role key in the URL:
`.../functions/v1/kb-ingest?key=<SERVICE_ROLE_KEY>`. I don't have that key, so these
three (recommended) calls are yours to run — then I verify the result.

> The CSV links below are **fresh**, valid ~24h (until ~2026-10-04 11:40 UTC). If they
> expire before you run them, ping me and I'll re-export in seconds.

---

## Recommended path — deploy `kb-ingest` v2, then 3 calls

v2 (in `supabase/functions/kb-ingest/index.ts`) is the deployed v1 with two changes:
multi-source ingest in one call, and **batched** embeddings (one `embed` call does the
whole backlog instead of ~10). Deploy it the usual way (paste over `kb-ingest`, Deploy),
then:

### 1. Ingest all six (one call) — body:
```json
{
  "mode": "ingest",
  "sources": [
    { "source": "mycypruslife",     "csv_url": "https://cloud-api.ultimatewebscraper.com/mcp/export/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0YWJsZUlkIjoiNjJlZmEwYWYtZTU5Ny00YWMwLWE4ODUtODYzYzExZjJiM2FmIiwid29ya3NwYWNlSWQiOiI1YTRhMzg0ZS02OTkwLTQ2OTUtYTY3OS1mMDY2NzM1OWUzODciLCJmb3JtYXQiOiJjc3YiLCJjb2x1bW5JZHMiOlsidXJsIiwiczBfanNvbl9sZF9fbmFtZSIsInMwX2pzb25fbGRfX2Rlc2NyaXB0aW9uIiwiczFfcGFnZV9tZXRhZGF0YV9fdGl0bGUiLCJzMV9wYWdlX21ldGFkYXRhX19kZXNjcmlwdGlvbiIsInMxX3BhZ2VfbWV0YWRhdGFfX2ltYWdlIiwiczFfcGFnZV9tZXRhZGF0YV9faDEiLCJzMV9wYWdlX21ldGFkYXRhX19wYWdlX3R5cGUiXSwiaWF0IjoxNzkxMDI4NDE0LCJleHAiOjE3OTExMTQ4MTQsImF1ZCI6InV3cy1tY3AtZXhwb3J0In0.c22v0suEaqJ341_4z-K-ir6eKek8z1HLQHh_4CKsaV0" },
    { "source": "cyprusbucketlist", "csv_url": "https://cloud-api.ultimatewebscraper.com/mcp/export/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0YWJsZUlkIjoiYWJkNTEwYzUtODQxYi00Yjg3LWE5ZWQtMjA4ZGNhYjkzZTRkIiwid29ya3NwYWNlSWQiOiI1YTRhMzg0ZS02OTkwLTQ2OTUtYTY3OS1mMDY2NzM1OWUzODciLCJmb3JtYXQiOiJjc3YiLCJjb2x1bW5JZHMiOlsidXJsIiwiczBfanNvbl9sZF9fbmFtZSIsInMwX2pzb25fbGRfX2Rlc2NyaXB0aW9uIiwiczFfcGFnZV9tZXRhZGF0YV9fdGl0bGUiLCJzMV9wYWdlX21ldGFkYXRhX19kZXNjcmlwdGlvbiIsInMxX3BhZ2VfbWV0YWRhdGFfX2ltYWdlIiwiczFfcGFnZV9tZXRhZGF0YV9faDEiLCJzMV9wYWdlX21ldGFkYXRhX19wYWdlX3R5cGUiXSwiaWF0IjoxNzkxMDI4NDE2LCJleHAiOjE3OTExMTQ4MTYsImF1ZCI6InV3cy1tY3AtZXhwb3J0In0.pjaxnaHs4xUHluVidO6MIuuFjQJD9ZHMA0cyNVs-lPA" },
    { "source": "imin",            "csv_url": "https://cloud-api.ultimatewebscraper.com/mcp/export/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0YWJsZUlkIjoiZmViMzUzY2EtOTcyZC00OTkyLThkMGQtYmYzZDVhYTgwNjMyIiwid29ya3NwYWNlSWQiOiI1YTRhMzg0ZS02OTkwLTQ2OTUtYTY3OS1mMDY2NzM1OWUzODciLCJmb3JtYXQiOiJjc3YiLCJjb2x1bW5JZHMiOlsidXJsIiwiczBfanNvbl9sZF9fbmFtZSIsInMwX2pzb25fbGRfX2Rlc2NyaXB0aW9uIiwiczFfcGFnZV9tZXRhZGF0YV9fdGl0bGUiLCJzMV9wYWdlX21ldGFkYXRhX19kZXNjcmlwdGlvbiIsInMxX3BhZ2VfbWV0YWRhdGFfX2ltYWdlIiwiczFfcGFnZV9tZXRhZGF0YV9faDEiLCJzMV9wYWdlX21ldGFkYXRhX19wYWdlX3R5cGUiXSwiaWF0IjoxNzkxMDI4NDE4LCJleHAiOjE3OTExMTQ4MTgsImF1ZCI6InV3cy1tY3AtZXhwb3J0In0.iHka3B_d6dWD-iZPC7zyyIduQXe8xAz7ts05o3eoeVY" },
    { "source": "cyprusfashion",   "csv_url": "https://cloud-api.ultimatewebscraper.com/mcp/export/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0YWJsZUlkIjoiNmNjZDFlYjYtYzE2MC00NmQwLWE4MGEtNjYyZjU4MmZlNjgxIiwid29ya3NwYWNlSWQiOiI1YTRhMzg0ZS02OTkwLTQ2OTUtYTY3OS1mMDY2NzM1OWUzODciLCJmb3JtYXQiOiJjc3YiLCJjb2x1bW5JZHMiOlsidXJsIiwiczBfanNvbl9sZF9fbmFtZSIsInMwX2pzb25fbGRfX2Rlc2NyaXB0aW9uIiwiczFfcGFnZV9tZXRhZGF0YV9fdGl0bGUiLCJzMV9wYWdlX21ldGFkYXRhX19kZXNjcmlwdGlvbiIsInMxX3BhZ2VfbWV0YWRhdGFfX2ltYWdlIiwiczFfcGFnZV9tZXRhZGF0YV9faDEiLCJzMV9wYWdlX21ldGFkYXRhX19wYWdlX3R5cGUiXSwiaWF0IjoxNzkxMDI4NDIwLCJleHAiOjE3OTExMTQ4MjAsImF1ZCI6InV3cy1tY3AtZXhwb3J0In0.5YkGc0kQHtZVz-hVDRbyGOJ7M2nyNKWZPFQxWp62n64" },
    { "source": "cyprusdevelopers","csv_url": "https://cloud-api.ultimatewebscraper.com/mcp/export/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0YWJsZUlkIjoiOTNkNTY4YWEtNDZjOC00MGYxLWI0ZDMtN2ZlZTkzODM0OGNmIiwid29ya3NwYWNlSWQiOiI1YTRhMzg0ZS02OTkwLTQ2OTUtYTY3OS1mMDY2NzM1OWUzODciLCJmb3JtYXQiOiJjc3YiLCJjb2x1bW5JZHMiOlsidXJsIiwiczBfanNvbl9sZF9fbmFtZSIsInMwX2pzb25fbGRfX2Rlc2NyaXB0aW9uIiwiczFfcGFnZV9tZXRhZGF0YV9fdGl0bGUiLCJzMV9wYWdlX21ldGFkYXRhX19kZXNjcmlwdGlvbiIsInMxX3BhZ2VfbWV0YWRhdGFfX2ltYWdlIiwiczFfcGFnZV9tZXRhZGF0YV9faDEiLCJzMV9wYWdlX21ldGFkYXRhX19wYWdlX3R5cGUiXSwiaWF0IjoxNzkxMDI4NDIyLCJleHAiOjE3OTExMTQ4MjIsImF1ZCI6InV3cy1tY3AtZXhwb3J0In0.RisVBUVXh6YwWky6WNBKXY2FvWNRukPPbh1WsjJ80S4" },
    { "source": "mycyprustravel",  "csv_url": "https://cloud-api.ultimatewebscraper.com/mcp/export/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0YWJsZUlkIjoiMzUwNDcyZWItNmY3Yy00MDYwLTljMzMtZGI4ZWJiN2YxOWRlIiwid29ya3NwYWNlSWQiOiI1YTRhMzg0ZS02OTkwLTQ2OTUtYTY3OS1mMDY2NzM1OWUzODciLCJmb3JtYXQiOiJjc3YiLCJjb2x1bW5JZHMiOlsidXJsIiwiczBfanNvbl9sZF9fbmFtZSIsInMwX2pzb25fbGRfX2Rlc2NyaXB0aW9uIiwiczFfcGFnZV9tZXRhZGF0YV9fdGl0bGUiLCJzMV9wYWdlX21ldGFkYXRhX19kZXNjcmlwdGlvbiIsInMxX3BhZ2VfbWV0YWRhdGFfX2ltYWdlIiwiczFfcGFnZV9tZXRhZGF0YV9faDEiLCJzMV9wYWdlX21ldGFkYXRhX19wYWdlX3R5cGUiXSwiaWF0IjoxNzkxMDI4NDI0LCJleHAiOjE3OTExMTQ4MjQsImF1ZCI6InV3cy1tY3AtZXhwb3J0In0.7DjtQayFF0V7biyF70MmF_ViINWjyl7qoBogbjZAZwU" }
  ]
}
```
Expect ~**894** rows across the six (minus a handful of empty/index pages).

### 2. Embed everything (one call) — body:
```json
{ "mode": "embed", "limit": 1000 }
```
Expect `remaining_estimate: 0`. If it comes back > 0 (hit the ~40s budget), just run
the same call again until it's 0.

### 3. Publish — body:
```json
{ "mode": "publish", "source": "all" }
```
(Or review `kb_docs` in the Table editor first and publish per-source. Only `published=true`
rows reach the concierge.)

Then tell me and **I'll verify**: row counts per source, that all are embedded, that
`match_kb_docs` returns results for a public (anon) caller, and a couple of live concierge
queries ("what's the wine festival scene in Cyprus", "boutiques in Limassol").

---

## Fallback — run the deployed v1 as-is (no redeploy)

If you'd rather not redeploy, v1 works — it's just more calls:
- **Ingest** once per source (6 calls): `{ "mode":"ingest", "source":"<name>", "csv_url":"<link above>" }`
- **Embed**: `{ "mode":"embed", "limit":50 }` — repeat until `remaining_estimate` is 0 (~10 calls).
- **Publish**: `{ "mode":"publish", "source":"all" }`

---

## Note on content
The scrape captured page **metadata** (title, description, H1, og:image) — great as a
*knowledge* layer for the concierge, not clean place records. Rows land `published=false`
so you can drop any thin/index pages before publishing. Turning the genuine business rows
(fashion boutiques, developers) into curated `directory_listings` is a separate pass we can
do later (needs geocoding + category cleanup).
