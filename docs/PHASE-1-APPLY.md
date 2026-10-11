# Phase 1 · Increments 1 + 2 + 1.4a — security hotfix, engineering foundations, rebuildable database, VAT

One cumulative package, applied on top of `main` (commit `5a0226f`). It supersedes the earlier "Increment 1" zip.
Admin remains English-only; nothing here changes what visitors see.

Verified on a separate copy of `main`: secrets scan ✔ · migration rules ✔ · translation parity ✔ · `tsc` ✔ · ESLint 0 errors ✔ ·
51 test suites ✔ · `next build` ✔ · **database restore drill ✔** (below). The GitHub workflow itself can only run on GitHub (see §3).

---
## 1. Run in Supabase → SQL Editor, in this order (each is idempotent, changes no data)

| # | File | What it does |
|---|---|---|
| 1 | `supabase/migrations/20261005120000_hotfix_revoke_public_rpc_and_invoker_views.sql` | Removes anonymous access to 17 privileged functions; makes 22 internal views obey row-level security |
| 2 | `supabase/migrations/20261005120100_close_attribution_anon_insert.sql` | Closes the last wide-open write policy (`attribution_clicks`) |
| 3 | `supabase/migrations/20261005130000_vat_evidence.sql` | Adds 12 empty columns to `ad_orders` for VAT evidence (nullable, no data changed) |

If you already ran #1 from the earlier message: nothing to redo — the file in this package only has a corrected explanatory header
(the SQL statements are identical). Run #2 and #3.

### What was wrong (confirmed on a rebuilt copy of production, then re-tested after the fix)
Anyone holding the public anon key, calling `…/rest/v1/rpc/<name>`, could:
* `fulfil_ad_order(<own unpaid order>)` → create a fulfilment task for your desk (plus draft banner/post rows for some products). **Correction to what I told you earlier:** it cannot by itself make a listing "featured/verified" — orders are only linked to a CRM account after payment.
* `crm_upsert_account(…)` → create junk CRM accounts, or probe whether a domain is already in your CRM.
* `get_analytics_data('7d')` → read your whole-site analytics (it has no admin check).
* `increment_banner_clicks / _impressions(<banner>)` → inflate an advertiser's counts (10 → 11 shown in the test), which undermines your ROI reports; `increment_view_count` does the same for articles.
* `sweep_stuck_rewrite_jobs()` → fail queued rewrite jobs.
And any **signed-in** user (not only admins) could read 22 internal views (revenue, CRM, support mail, AI spend). You have exactly one account today, so nothing leaked — but see §2.

After the fix, the same probes are refused by Postgres itself; ordinary users see empty results; **admins still see everything** (tested).

### Verify
Open `/admin` → Dashboard, Analytics, Attribution, Coverage, Mail, CRM, Fulfilment: all must load as before. Then re-run Supabase's Security Advisor:
"Security Definer View" (22) and the "SECURITY DEFINER function" warnings should be gone, except `has_role` and `get_analytics_data_admin`
(intentional: row-level-security policies call the first; the second checks admin rights itself).

## 2. One setting only you can change
Supabase → **Authentication → Sign In / Providers** → *User Signups* → turn **off** "Allow new users to sign up" (the label can move between
dashboard versions; if you cannot find it, tell me). Until member accounts are built (Increment 1.4) nobody should be able to self-register;
with sign-ups open, any visitor could create an account today. We re-enable it deliberately, with magic-link login, in 1.4.

## 3. Commit the package → first CI run
1. Unzip at the repo root, commit. GitHub Actions starts `CI` with two required-worthy jobs: **quality** and **database (restore drill + security invariants)**.
2. When both are green: GitHub → Settings → Branches → rule for `main` → *Require a pull request* + *Require status checks*: select **quality** and **database…**.
3. If a step fails on GitHub, send me the log — the likely cause is an environment difference (Node/npm/psql version), not logic.
Performance budgets run report-only: `/directory` (537 KB) and `/map` (511 KB) already exceeded their 470 KB budget before this gate existed.

## 4. What is in the package
| Area | Files | Gives you |
|---|---|---|
| **Rebuildable database** | `supabase/baseline/*`, `scripts/db/*` | The production schema as one SQL file that **actually runs** (executed on PostgreSQL 16, twice, zero errors) and is **fingerprint-identical** to production: 13 object counts + 8 content digests. Includes the sign-up trigger and storage buckets/policies that your repo never had. See `supabase/baseline/README.md` |
| **Security regression test** | `scripts/db/security-smoke.sql` | Fails the build if a future migration re-opens any hole: tables without RLS, visitor-callable privileged functions, views with owner rights, wide-open write policies, visitors able to execute the functions, ordinary users able to read internal views. Proven to fail on production's present state and on a deliberate regression |
| CI | `.github/workflows/ci.yml` | secrets · migrations · translation parity · types · lint · 47 tests · build · perf report · **database drill** · advisory `npm audit` |
| Dependencies/review | `.github/dependabot.yml`, `.github/pull_request_template.md`, `.github/CODEOWNERS` | weekly dependency PRs; checklist incl. "all 7 locales", "no credentials", "idempotent SQL" |
| Lint | `eslint.config.mjs`, `package.json` | `next lint` could not run before. Now **0 errors**, 112 warnings tracked as debt (81 are `any` types). Blocking rules = correctness; style rules = warnings |
| Secret scanner | `scripts/check-secrets.mjs`, `scripts/lib/secrets.mjs` | Would have caught the committed `ENRICH_SECRET`. Repo is clean (RUN.md holds six *expired* download links — no database keys; harmless) |
| Migration rules | `scripts/check-migrations.mjs`, `scripts/lib/migrations.mjs` | Naming; unique versions; from 20261005 a `drop table/column`/`truncate` needs `-- allow-destructive: <reason>`; `alter type … add value` must be alone in its file |
| Error capture | `instrumentation.ts`, `lib/requestErrorContext.ts` | Every unhandled error in any route is written to your `error_log` (visible in Admin → Analytics). Before, ~7 of ~100 routes reported. Query strings are stripped (URLs can carry secrets) |
| Tests | `scripts/tests/{secret-scan,migrations-check,request-error-context}.test.ts` | 52 new assertions |

## 5. Clean-up candidates — NOT applied; explained and tested
Nothing was deleted. I removed all of the items below in a scratch copy and rebuilt the site: **same 168 pages, shared JavaScript unchanged (102 kB),
page sizes within 20 bytes (the same noise as between two builds of identical code)**; type-check, 47 tests and lint pass.

| Item | What it is | Effect on layout / website |
|---|---|---|
| `CoverImage.tsx` (repo root) | Old duplicate of the cover-image component; the site imports `@/components/CoverImage` (13 files). Nothing imports the root copy | none |
| `CHANGES.diff` | Text patch note from an earlier delivery | none |
| `cyprus-lifestyle-safety-followups-2026-10-01/` | Older copy of 5 files (3 identical to the live ones, 2 older). Nothing imports from it | none; removes the risk of editing a stale copy |
| `tsconfig.tsbuildinfo` | TypeScript's incremental cache, committed once although `.gitignore` lists it (`git rm --cached`) | none; regenerates itself |
| `leaflet`, `@types/leaflet` | Old map library; all three maps use MapLibre; only `package.json` mentions it | none; 3 fewer packages |
| ~25 historic `DEPLOY-*/PHASE-*/FIX-*` notes | Not read by any code | none on the site; moving them would only break links between notes — **recommend leaving them** |
Say "apply the clean-up" and I will deliver it as a package (the file deletions are listed as commands, since a zip cannot delete).

## 6. Decisions recorded
* Roles: **admin only**, no editor/sales/support split.
* Newsletter: always **Friday**; scheduled Friday send **gated by an editor's approval** (build in 1.3); social-post job stays manual.
* VAT: **Stripe Tax**, built (Increment 1.4a): other-EU companies with a VIES-verified VAT number pay no VAT; Cypriot companies and everyone without a verified number pay Cyprus VAT added on top of the advertised price; the €19 membership is VAT-inclusive. **Switched off until you finish `docs/VAT-SETUP.md`** (Stripe registrations) and set `STRIPE_AUTOMATIC_TAX=1`; Admin → *VAT check* proves it.
* Staging project: **not now** (the local/CI restore drill covers the SQL-rehearsal need; Stripe test mode covers payments).

## 6b. VAT package (1.4a) — files
Checkout rules and VIES check `lib/vat/*`, `lib/stripe.ts`; `app/api/advertise/checkout`, `app/api/advertise/webhook`, `app/api/membership/checkout`; buyer form `components/AdvertiseFunnel.tsx` (7 languages); "incl. VAT" on the membership page (7 locales); Admin → *VAT check* (`app/[locale]/admin/(panel)/vat-check`, `app/api/admin/vat-check`, `components/admin/VatCheck.tsx`, one line in `AdminNav.tsx`); a VAT line in `/api/health`; new env vars in `.env.example`; guide `docs/VAT-SETUP.md`. 4 new test suites (158 assertions).
Existing files touched (small, listed so nothing surprises you): `.env.example` (appended), `AdminNav.tsx` (+1 line), `app/api/health/route.ts` (+1 entry), `messages/*.json` (+1 key `membership.concierge.inclVat`), `membership/page.tsx`, `MembershipCheckout.tsx`, the two checkout routes, the advertise webhook (+1 call), `AdvertiseFunnel.tsx`, `lib/stripe.ts` (extended; old behaviour unchanged when no VAT option is passed).

## 7. Next
1.3 audit log (who changed what), Members admin page, publishing-flow fixes, Friday newsletter workflow · 1.4 VAT/invoices, Customer Portal, member accounts + entitlements, benefit removal on cancellation.
