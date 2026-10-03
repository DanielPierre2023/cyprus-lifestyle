# Cyprus Lifestyle — Backend & Database Audit (2026-10-03)

Deep audit of the deployed edge functions and the Supabase database, delivered as
**both** a written report and ready-to-run SQL.

## Contents (repo-relative paths — commit as-is)
- `docs/audit/2026-10-03-backend-security-audit.md` — the full report: findings
  ranked by severity, evidence, impact, fixes, and what still needs the repo.
- `docs/audit/2026-10-03-repo-review-addendum.md` — the repo-side review: concierge
  wiring (Zya + semantic confirmed live; Plan 2 not yet wired), repo security
  (strong), and one MEDIUM found in the app (internal views readable by any
  logged-in member). Corrects Finding 4 of the main report.
- `supabase/migrations/20261003120000_security_hardening.sql` — the fix SQL.
  Sections 1–6 are safe to run now (validated live, idempotent). Section 7 is
  commented out and needs a repo check first. Section 8 is verification.

## Apply (Supabase Dashboard → SQL Editor — no CLI)
1. Read the report.
2. Run **Section 1** (critical: locks down `fulfil_ad_order`), then **Sections 2–6**.
3. Enable leaked-password protection in Auth settings.
4. Leave **Section 7** until the repo review (how the admin UI reads the views).
5. Re-run the security advisor to confirm the findings clear.

## Headlines
- 🔴 `fulfil_ad_order()` was callable by anyone → free paid placements. Fixed in §1.
- 🟠 Revenue / AI-spend / CRM / support-ticket views were readable by anonymous users. Fixed in §3.
- 🟠 `get_analytics_data()` exposed all traffic analytics to anyone. Fixed in §2.
- 🟠 Semantic search returns nothing for a public (anon) caller — the embeddings are RLS-locked and the match RPCs were `SECURITY INVOKER`. Fixed in §4.
- The live concierge is now in the **repo** (`lib/concierge/brain.ts`), not the (deprecated) edge function — the repo is needed to confirm the Zya fix actually reaches visitors.

Every database claim was introspected live; every SQL statement was validated in a
rolled-back transaction against the production database before delivery.
