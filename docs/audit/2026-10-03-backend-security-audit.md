# Cyprus Lifestyle — Backend & Database Audit

**Date:** 2026-10-03
**Scope requested:** *Everything, deep* — edge functions, migrations, database/backend, website content.
**Project:** Supabase `htwaivnvabvpqkffllnc` (Postgres 17, eu-central-1) · site `cypruslifestyle.eu`
**Method:** Read against **live/deployed source only** (your rule). Every edge function was read from the Supabase dashboard deployment; every database finding was introspected and the fix SQL was **validated against the live DB inside a rolled-back transaction**. No claim here is from the GitHub repo.

> **One blocker:** the GitHub repo `DanielPierre2023/cyprus-lifestyle` is **not** attached to this session (every API call returns 403). The frontend, the Next API routes, and — critically — the **live concierge brain** (`lib/concierge/brain.ts`) could not be read. Section 8 lists exactly what remains blocked and why it matters. Everything else below is complete.

---

## 1. Executive summary

The backend is, on the whole, **well-engineered**: the edge functions are defensive, time-budgeted, fail-closed where it counts, and free of SQL injection. The problems are concentrated in **database-level exposure through PostgREST**, where Supabase's permissive defaults were never tightened.

**Headline findings:**

1. **CRITICAL — `fulfil_ad_order()` is callable by anyone.** An unauthenticated REST call can grant paid ad placements (featured/verified/partner listings, sponsor banners, sponsored posts) for free and bypass Stripe. *Fix ready.*
2. **HIGH — revenue, AI spend, CRM and support-ticket data are readable by anonymous users** through 22 `SECURITY DEFINER` views that were granted to `anon`. *Fix ready.*
3. **HIGH — `get_analytics_data()` exposes full site traffic analytics to anyone.** *Fix ready.*
4. **HIGH (correctness) — the semantic search returns *nothing* for a public caller.** The 17,747 directory vectors live in RLS-locked tables, and the match RPCs are `SECURITY INVOKER`, so they only work when called with the service-role key. If the live concierge brain uses the anon key, your entire Plan 1 semantic upgrade **and** Plan 2 KB are silently dead on the public path. *Fix ready + one repo check.*
5. **MEDIUM — three loader functions have fail-open auth gates** (`enrich-directory`, `events-ingest`, `import-osm-directory`): if their secret env var is ever empty, they are wide open. *Fix described.*

**Plans status:**
- **Plan 1 (Zya / hybrid retrieval): proven live at the database layer** — `match_directory_name('Zya Cafe')` returns the Zya listing at score **1.0, rank #1**. But the edge function that carries the code is now **deprecated/unused** (see §6), so the fix only reaches visitors if the same logic was ported into the repo brain — unverified.
- **Plan 2 (knowledge layer): deployed but dormant** — `kb_docs` has **0 rows**. The ingest/embed/publish steps were never run, and the Oct-1 CSV export links have since expired. Nothing culture/fashion/history is live in the concierge yet.

**Overall:** no evidence of a breach, but several doors are open that shouldn't be. The critical and high items are quick, low-risk SQL changes — all validated — in the companion file `supabase/migrations/20261003120000_security_hardening.sql`.

---

## 2. Findings, ranked

| # | Sev | Finding | Fix location |
|---|-----|---------|--------------|
| 1 | 🔴 Critical | `fulfil_ad_order()` anon-executable → free paid placements / Stripe bypass | SQL §1 |
| 2 | 🟠 High | 22 `SECURITY DEFINER` views granted to `anon` → revenue, AI spend, CRM, tickets exposed | SQL §3 (+ §7a) |
| 3 | 🟠 High | `get_analytics_data()` anon-executable → full traffic analytics exposed | SQL §2 |
| 4 | 🟠 High | Semantic search dead for public callers (RLS-locked embeddings + INVOKER RPCs) | SQL §4 + repo check |
| 5 | 🟡 Medium | `crm_upsert_account()` anon-executable → CRM spam | SQL §2 |
| 6 | 🟡 Medium | Fail-open auth gates in `enrich-directory`, `events-ingest`, `import-osm-directory` | §5 (code) |
| 7 | 🟡 Medium | `directory_listings_coords_backup_20260928` RLS disabled → public read | SQL §5 (+ §7e) |
| 8 | 🟡 Medium | `update_view_geo()` anon-executable → analytics poisoning (confirm if client-called) | SQL §7c |
| 9 | 🔵 Low | Trigger/maintenance functions anon-executable (`handle_new_user`, `sync_subscriber_to_contacts`, `crm_sync_directory_account`, `sweep_stuck_rewrite_jobs`) | SQL §2 |
| 10 | 🔵 Low | 19 functions with mutable `search_path` | SQL §4, §6 |
| 11 | 🔵 Low | Leaked-password protection (HaveIBeenPwned) disabled in Auth | Dashboard toggle |
| 12 | 🔵 Info | 14 tables RLS-enabled-no-policy; 3 extensions in `public`; perf advisors | §4, §7 |

---

## 3. Security findings in detail

### 🔴 1 — `fulfil_ad_order(uuid)` can be called by anyone
**Evidence (live):** `prosecdef = true`, `search_path = public`, EXECUTE granted to `anon, authenticated, postgres, service_role`. The body has **no authentication check** — it reads `ad_orders`, and depending on `slot` it runs privileged writes:
- `UPDATE directory_listings SET featured=true, verified=true, commercial_tier='listed'|'featured'|'partner'`
- `INSERT INTO sponsor_banners (...)`
- `INSERT INTO blog_posts (... sponsored=true ...)`
- `INSERT INTO newsletter_sponsors (...)`, `fulfillment_tasks (...)`

**Impact:** a visitor who creates an ad order through the normal flow can then POST `{"p_order_id":"<their order id>"}` to `/rest/v1/rpc/fulfil_ad_order` and have it fulfilled **without paying** — the function is the exact work the Stripe webhook is supposed to do after payment. It is idempotent (one fulfilment per order), which limits it to one free fulfilment per order, not the severity.

**Fix:** revoke `anon`/`authenticated`, grant `service_role` only (SQL §1). The webhook already runs server-side with the service key, so nothing legitimate breaks.

### 🟠 2 — Internal views readable by anonymous users
**Evidence (live):** all 22 `SECURITY DEFINER` views are granted **ALL** privileges to `anon` *and* `authenticated`. Because they are `SECURITY DEFINER`, they bypass RLS and return their full contents to whoever can call them. The exposed set includes:
- `listing_revenue`, `advertiser_roi` — **revenue**
- `ai_spend_total`, `ai_spend_by_month`, `ai_spend_daily`, `ai_spend_by_function_daily` — **your AI cost data**
- `crm_prospect_scores`, `mailroom_tickets`, `mailroom_stats` — **CRM + inbound support tickets (may contain emails/PII)**
- `error_log_grouped`, `job_queue_stats` — internal diagnostics
- the `concierge_coverage_*`, `directory_coverage_*`, `editorial_*`, `listing_attribution`, `cta_by_listing`, `listing_recommendations` analytics views

**Impact:** an anonymous `GET /rest/v1/listing_revenue` (etc.) returns competitively sensitive business data.

**Fix (two stages):**
- **Now (safe, SQL §3):** revoke all privileges from **`anon`** on these views. `anon` is never a signed-in admin, so this cannot break the admin UI. `blog_comments_public` is left public intentionally.
- **After a repo check (SQL §7a/§7b):** members are `authenticated` too, so a logged-in non-admin can still read them. Either revoke `authenticated` as well (safe **if** the admin dashboard reads these via a server route using the service key) or convert the views to `security_invoker = on` (needs admin RLS policies on the base tables). This is the one decision that needs the repo.

### 🟠 3 — `get_analytics_data(text)` exposes all traffic analytics
`SECURITY DEFINER`, anon-executable, no internal check. Returns views/visitors/top pages/countries/cities/referrers/devices for the whole site. You already have `get_analytics_data_admin(text)`, which **does** check `has_role(auth.uid(),'admin')` — so the unguarded twin is just an open door. **Fix:** revoke `anon`/`authenticated` (SQL §2).

### 🟠 4 — Semantic retrieval returns nothing for a public caller
**Evidence (live, as the `anon` role):**

| Object | Rows visible to `anon` |
|---|---|
| `directory_listings` | 3,076 (published only — correct) |
| `directory_embeddings` | **0** |
| `kb_embeddings` | **0** |
| `match_directory_name('Zya Cafe')` | 3 (works — reads listings) |

`directory_embeddings` and `kb_embeddings` have **RLS enabled with no policy** (deny-all to anon/authenticated), and `match_directory` / `match_kb_docs` are `SECURITY INVOKER`. So when called with the anon/publishable key they join against zero embedding rows and return **nothing**. Name search survives (it reads `directory_listings`); **semantic and KB search do not.**

The retired edge function sidestepped this by calling with the **service-role** key. Whether the live brain does is the key repo question (§8).

**Fix (SQL §4):** make the three `match_*` RPCs `SECURITY DEFINER` with a pinned `search_path`. The function owner can read the embeddings, so retrieval works for **any** caller; each RPC still filters to published rows, so nothing hidden leaks (validated: as `anon`, `match_directory_name` returns 3 hits after the change). This also clears the mutable-search_path warning for all three. If the brain already uses the service key, this is harmless and still worth doing for the search_path fix and future-proofing.

### 🟡 5 — `crm_upsert_account()` anon-executable
Lets anyone insert rows into `crm_orgs` (prospect/contact pollution). **Fix:** revoke anon/authenticated (SQL §2).

### 🟡 6 — Fail-open authentication gates (edge functions)
Three loaders gate on `if (SECRET && provided !== SECRET) → 401`. The bug is the pattern: **if the secret env var is empty/unset, the check is skipped and the function runs open.**

| Function | `verify_jwt` | Exposure if secret unset |
|---|---|---|
| `enrich-directory` | **false** | Open to the whole internet → spends Google Places/Unsplash credits, writes to `directory_listings`/`events`, writes Storage |
| `events-ingest` | **false** | Open to the whole internet → writes draft events, external fetches |
| `import-osm-directory` | **true** | Callable by anyone holding the public anon key → bulk-writes `directory_listings` (can pass `status=published`) |

`enrich-directory` and `events-ingest` are the more serious two (no JWT backstop). **Fix:** (a) confirm `ENRICH_SECRET` / `OSM_IMPORT_SECRET` are actually set on the project; (b) change each gate to **fail-closed**, e.g. `if (!SECRET || provided !== SECRET) return 401;` — exactly the pattern `kb-ingest` and `concierge` already use. I can deliver the three corrected function files on request (kept out of this round to avoid shipping full rewrites you may not need if the secrets are set).

### 🟡 7 — Public backup table
`directory_listings_coords_backup_20260928` has **RLS disabled** in the public schema → readable by anyone via REST. **Fix:** enable RLS now (SQL §5, non-destructive) or drop it once the coords migration is confirmed stable (SQL §7e).

### 🟡 8 — `update_view_geo()` anon-executable
Writes `country`/`city` onto recent `site_analytics` rows. If the **public site calls this client-side** after a pageview, it's by design — keep it. If geo is set server-side, revoke anon (SQL §7c). Needs a one-line confirmation.

### 🔵 9 — Trigger / maintenance functions exposed as RPC
`handle_new_user`, `sync_subscriber_to_contacts`, `crm_sync_directory_account` are trigger functions (calling them directly as RPC errors on the missing `NEW` record, so low real risk) and `sweep_stuck_rewrite_jobs` is cron maintenance. All are anon-executable by default. Revoked for hygiene in SQL §2.

> **Deliberately left anon-executable** (they *should* be): `has_role` (used *inside* RLS policies — revoking it would break every policy that calls it), `increment_view_count`, `increment_banner_clicks`, `increment_banner_impressions`, `validate_editor_token`.

### 🔵 10 — Mutable `search_path` (19 functions)
WARN-level defense-in-depth. The 15 `SECURITY DEFINER` functions already pin `search_path` (good); the 19 flagged are `SECURITY INVOKER`. Fixed in SQL §4 (the 3 match RPCs) and §6 (the other 16, by name).

### 🔵 11 — Leaked-password protection disabled
Enable the HaveIBeenPwned check: **Dashboard → Authentication → password security**. One toggle.

### 🔵 12 — Informational
- **14 tables RLS-enabled-no-policy** (`directory_reviews`, `directory_claims`, `directory_leads`, `kb_docs`, `kb_embeddings`, the `concierge_*` thread tables, etc.). This is deny-all to anon/authenticated and is *safe* as long as those tables are only reached via service-role server routes. **Confirm** the public review-submission and listing-claim flows go through a server route — if the browser writes them directly as `anon`, they need explicit policies. (Repo question.)
- **Extensions in `public`** (`pg_net`, `pg_trgm`, `vector`) — WARN. **Do not move them**; relocating `pg_trgm`/`vector` would break the operators your indexes and RPCs depend on. Accept the warning.

---

## 4. Edge function review (all 9, read from deployed source)

| Function | v | `verify_jwt` | Auth gate | Verdict |
|---|---|---|---|---|
| `scrape-rss` | 16 | true | `requireAdmin` (service-role or admin), fail-closed | ✅ Solid |
| `process-scraped-article` | 32 | true | `requireAdmin` / service, fail-closed | ✅ Solid; no injection (uses `commit_scraper_blog_post` RPC) |
| `search-cover-photos` | 11 | true | `requireAdmin`, fail-closed | ✅ Solid |
| `ai-editorial` | 11 | true | `body.secret === service_key`, fail-closed | ✅ Solid |
| `import-osm-directory` | 18 | true | **fail-open** if `OSM_IMPORT_SECRET`/`CRON_SECRET` unset | 🟡 Finding 6 |
| `enrich-directory` | 18 | false | **fail-open** if `ENRICH_SECRET` unset | 🟡 Finding 6 |
| `events-ingest` | 12 | false | **fail-open** if `ENRICH_SECRET` unset | 🟡 Finding 6 |
| `concierge` | 12 | false | `body.secret === service_key`, fail-closed | ⚠️ **Deprecated/unused** (see §6) |
| `kb-ingest` | 1 | false | `if(!service_key \|\| key!==) 401`, fail-closed | ✅ Solid (Plan 2) |

**General quality:** consistent CORS handling, `AbortSignal` time-budgets on every external call, drain-forward batch patterns that survive worker kills (the enrich-directory "claim the row first" pattern is genuinely good), structured-output via tool-use with single retry, no plaintext secret leakage, PostgREST `in.()` lists correctly percent-encoded where values contain URL characters. These are above-average for a solo-built platform.

---

## 5. Performance (Supabase advisors — secondary to the security items)

| Advisor | Count | Note |
|---|---|---|
| `auth_rls_initplan` | 76 | **Biggest win.** Policies re-evaluate `auth.uid()`/`auth.role()` per row. Wrap as `(select auth.uid())` to evaluate once. Needs a careful per-policy rewrite — I can generate the exact statements once I can read the policies. |
| `unused_index` | 101 | Many unused — but includes the new trigram indexes from Plan 1 (not used *yet*), so this will have false positives. Review before dropping. |
| `unindexed_foreign_keys` | 21 | Add covering indexes to speed joins/cascades. |
| `multiple_permissive_policies` | 19 | Consolidate duplicate permissive policies per role/action. |
| `no_primary_key` | 3 | Add PKs where sensible. |
| `auth_db_connections` | 1 | Pooler config note. |

None are urgent. The RLS-initplan pass is worth doing but should be done with the policy definitions in hand, not blind — flagged for a follow-up.

---

## 6. Architecture & operational findings

- **The `concierge` edge function is deprecated.** Its own header (dated 2026-10-01) states it is "no longer called by the app" — the live concierge was moved into the Next.js repo (`app/api/concierge/route.ts` → `lib/concierge/brain.ts`), shared with the streaming chat, Telegram and WhatsApp. **Your Plan 1 hybrid-retrieval code is present in this (dead) function.** The Zya fix therefore only reaches real visitors if that same logic was ported into `brain.ts`. This is the most important thing to verify once the repo is available.
- **No tracked migration history.** `list_migrations` returns empty — the schema is managed by hand in the SQL editor (consistent with your workflow). Consequence: the repo's `supabase/migrations/*.sql` files are *documentation*, not a guaranteed match for the live schema. **Live introspection is the only reliable source of truth** (which is what this audit used). Recommend keeping a dated, ordered SQL changelog and re-running the advisors after each change as a drift check.
- **Plan 1 proven at the DB layer.** `directory_listings` row `zya-caffee` is `name_en='Zya Cafe'`, `status='published'`; `match_directory_name('Zya Cafe')` → `zya-caffee` score 1.0 rank #1. The name typo and the token/rating-truncation failure class are fixed in the database.
- **Plan 2 is deployed but dormant.** `kb_docs` = 0 rows; `kb_embeddings` = 94 (these are the pre-existing practical-guides KB, not Plan 2's). The ingest → embed → publish steps were never run and the Oct-1 export links have expired. The scraped tables still exist in Ultimate Web Scraper, so I can re-export fresh CSVs and run the ingest whenever you want to turn it on.
- **Directory substrate is strong:** 17,827 listings (3,076 published / 14,671 concierge-only "listed"), 17,747 embeddings.

---

## 7. Apply order

1. **Read this report**, then open `supabase/migrations/20261003120000_security_hardening.sql`.
2. **Run Sections 1–6** in the SQL editor (all validated live, idempotent, safe — they only remove access that was never intended and fix the semantic-search visibility). Start with Section 1 (the critical one) if you want to stage it.
3. **Enable** leaked-password protection (Auth settings).
4. **Confirm the edge-function secrets** (`ENRICH_SECRET`, `OSM_IMPORT_SECRET`) are set; ask me for the fail-closed function files if you want them hardened regardless.
5. **Hold Section 7** until the repo check tells us how the admin dashboard and public client read data.
6. **Re-run the security advisor** and confirm the anon/SECURITY-DEFINER and RLS-disabled findings clear.

---

## 8. What still needs the repo (`DanielPierre2023/cyprus-lifestyle`)

Attach the repo to the session (or send the files) so I can finish the parts that aren't in Supabase:

1. **`lib/concierge/brain.ts` + `app/api/concierge/route.ts`** — confirm the brain (a) uses the **service-role** key for `match_directory`/`match_kb_docs` (or apply SQL §4), (b) actually calls `match_directory_name` so the **Zya fix reaches visitors**, (c) calls `match_kb_docs` so Plan 2 will work once populated.
2. **How the admin dashboard reads the analytics/revenue views** — decides Section 7a vs 7b.
3. **Whether the public review/claim/analytics writes go through a server route** — decides whether the RLS-no-policy tables (Finding 12) need policies.
4. **The frontend, remaining API routes, and `supabase/migrations/*` files** — the last un-reviewed surface.

Until then, the backend and database are fully covered by this report.
