# Cyprus Lifestyle — Repo review (addendum to the 2026-10-03 backend audit)

**Date:** 2026-10-03 · **Input:** full repo zip (`cyprus-lifestyle-main`, 107 migrations, Next.js app).
This closes the one part the earlier report couldn't cover without the code. It also
**corrects one earlier concern** now that the live caller is known.

---

## 1. Concierge — is the work actually wired into the live path?

The live concierge is `lib/concierge/brain.ts` (the shared brain for web Ask-box, streaming
chat, Telegram, WhatsApp). `app/api/concierge/route.ts` calls `runConcierge` from it. Verdict:

| Retrieval leg | RPC | Wired into the brain? |
|---|---|---|
| **Name / "Zya" fix** | `match_directory_name` | ✅ **Yes** — `brain.ts` `searchByName()` (line 521), fused first, highest precision |
| **Semantic directory** | `match_directory` | ✅ **Yes** — `vectorDirectory()` (line 549) |
| **Plan 2 scraped knowledge** | `match_kb_docs` | ❌ **No** — see §3 |
| Existing practical-guides KB | `match_kb` | ✅ Yes — `vectorKbIds()` (line 534) |

**So the Zya fix and the semantic upgrade are genuinely live for every channel.** The brain
calls all retrieval through `supabaseAdmin()` — the **service-role** client (`lib/supabase/admin.ts`).

### Correction to the earlier report (Finding 4)
The main report flagged that semantic search returns nothing for an `anon` caller (RLS-locked
embeddings + INVOKER RPCs). That is true in isolation, **but the brain uses the service-role
client, so it was never affected** — semantic has been working on the live path. Your §4 change
(making the match RPCs `SECURITY DEFINER`) remains worthwhile: it fixes the search_path warning
and protects any *other* caller that might use the anon key, but it was not required for the brain.
Net: no regression ever reached visitors. I'm flagging the correction because accuracy matters more
than my earlier worst-case read.

---

## 2. Repo security — hygiene is strong

Checked and clean:

- **Service-role key never reaches the client.** No `'use client'` component imports the admin
  client or references `SUPABASE_SERVICE_ROLE_KEY`. It's `server-only` (`lib/supabase/admin.ts`).
- **No secrets in `NEXT_PUBLIC_`** — only the anon key / site URL, as expected.
- **Stripe webhook verifies its signature** (`app/api/advertise/webhook/route.ts` → `verifyWebhook`
  against `STRIPE_WEBHOOK_SECRET`, rejects bad signatures) **and then calls `fulfil_ad_order`
  server-side** with the service client. This confirms the critical fix is correct: locking
  `fulfil_ad_order` to `service_role` (which you did) does **not** break the paid flow — the webhook
  is the only legitimate caller.
- **API routes are gated**: admin routes use `isAdmin()`; cron routes use `CRON_SECRET`
  (`isCronAuthorized`); Telegram validates `x-telegram-bot-api-secret-token`; WhatsApp verifies.
  The `concierge/embed-directory` and `publish-directory` routes gate on `ENRICH_SECRET` and are
  fail-closed when the secret is unset (unlike the edge-function version — see main report Finding 6).
- **XSS surface is controlled.** Comments (`CommentSection.tsx`) and the concierge answer render as
  **text**, not HTML — so neither user input nor model output can inject markup. The ~31
  `dangerouslySetInnerHTML` uses are JSON-LD (escaped correctly by `ld()` → `JSON.stringify(...).replace(/</g,'\\u003c')`, `lib/seo.ts:339`), internal SVG icons, and AI-pipeline article HTML.

**Minor note:** article bodies render raw via `dangerouslySetInnerHTML={{__html: localizeHtml(a.content)}}`.
That content is produced by your editorial pipeline (trusted), and there's no HTML sanitizer
(DOMPurify/sanitize-html) in the tree. It's fine as long as the pipeline stays the only writer of
`content`; if any externally-influenced HTML could ever land there, add a sanitizer on render.

### 🟡 One real exposure found in the repo (MEDIUM): internal views read as `authenticated`
The admin dashboard reads the internal views **as the logged-in user's role**, not via the service
client:
- `attribution/page.tsx` → `listing_revenue`, `advertiser_roi` (server component, user session)
- `analytics/page.tsx` → `error_log_grouped` · `coverage/page.tsx` → `directory_coverage_overall` (same)
- `crm/page.tsx` → `crm_prospect_scores` **from a `'use client'` component** (the browser queries it directly)

The page is gated by `isAdmin()`, but **the underlying PostgREST endpoint is not** — so any
**logged-in member** (`authenticated`) can `GET /rest/v1/listing_revenue` (or `crm_prospect_scores`, etc.)
directly with their own token and read revenue / CRM / spend. (Anonymous access was already closed by
Section 3 of the hardening SQL; this is the residual `authenticated` tier.)

**Consequence for the hardening SQL:** do **not** run Section 7a as-is — a blanket
`REVOKE ... FROM authenticated` would break these admin pages, because they read as `authenticated`.
Fix properly instead (either option closes the member exposure):
- **(a) preferred:** move these reads to the **service client** (a server action / route handler using
  `supabaseAdmin()`), then revoke `authenticated` on the views. The `crm_prospect_scores` client-component
  read should move server-side regardless — a browser should never query that view.
- **(b)** set the views `security_invoker = on` and add **admin-only** RLS policies on their base tables.
I can deliver the exact SQL + the minimal page changes for option (a) on request.

---

## 3. Plan 2 is not wired into the brain (the one real gap)

The brain's knowledge leg calls **`match_kb`** — the existing curated practical-guides KB
(`QA_INDEX` in `lib/knowledge/qa`, ~94 embedded Q&As). It does **not** call **`match_kb_docs`**,
my Plan 2 RPC over the scraped-site knowledge (`kb_docs`). So even once you ingest + embed +
publish `kb_docs`, **the concierge won't use that knowledge until `brain.ts` calls `match_kb_docs`
and feeds its hits into the turn's context.**

`kb_docs`'s migration (`20261001090000_kb_docs.sql`) *is* committed to the repo, so the schema side
is in order; only the brain wiring is missing.

### Proposed change (scoped, additive — needs your go-ahead before I touch `brain.ts`)
Mirrors exactly how `match_kb` / `QA_INDEX` are already handled, as a **separate, clearly-labelled
block** — no change to voice, tone, archetypes or the answer composition:

1. Add `vectorKbDocs(vec)` → `supabaseAdmin().rpc('match_kb_docs', { query_embedding: vec, match_count: 6 })`, returning `{ title, description, url, source }`.
2. Call it in `assembleContext()` using the **same** turn embedding `qvec` already computed.
3. Add the hits to `ConciergeContext` as a new field (e.g. `webKnowledge`), render them in the
   prompt under a labelled block ("FROM OUR CYPRUS GUIDES — you may use these facts and link them"),
   and add their on-site URLs to `guides` so answers link to our own pages.
4. Keep the existing grounding rule intact (name a fact only if it's in context).

It's ~1 new function + ~5 lines in `assembleContext` + a small prompt block. I'll deliver the
**complete** `brain.ts` (your rule) once you approve, since it's the concierge core and your rules
are plan-first on it.

---

## 4. Migrations / drift

- The repo carries 107 ordered migration files, including Plan 1 (`20260930120000_concierge_hybrid_retrieval.sql`)
  and Plan 2 (`20261001090000_kb_docs.sql`).
- The live DB has **no migration tracking** (`list_migrations` empty), so these files are documentation,
  not an applied ledger. The **2026-10-03 security hardening** you ran is **not** yet a repo file —
  worth committing `supabase/migrations/20261003120000_security_hardening.sql` (from the main deliverable)
  so the repo record matches what's live.

---

## 5. What's left

1. **Approve the §3 wiring** → I deliver the complete `brain.ts` so Plan 2 knowledge reaches answers.
2. **Run the ingest/embed/publish** (RUN.md, needs your service key) → then I verify end-to-end.
3. Optional: commit the hardening SQL as a migration file (§4) for the record.
4. **Close the `authenticated` view exposure (§2 MEDIUM)** — move the admin reads of the internal
   views to the service client, then revoke `authenticated`. Do **not** run hardening Section 7a before
   this (it would break the admin pages). I can deliver the SQL + page changes on request.
5. Optional: the `auth_rls_initplan` performance pass (76 policies) from the main report.
