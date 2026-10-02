# Owner profile editor

Lets a **verified owner** edit their own listing — no login. They're authenticated by a
secure, single-use **management link emailed only to the on-file `claim_contact`** (the
address that proved ownership during the claim), exchanged for a short httpOnly editing
session. Structured fields (hours, socials, amenities, website) save straight to the
listing; free-text (description) and photo URLs go to a **moderation queue** rather than
overwriting live copy.

**Depends on:** the **claim-to-own** ZIP being deployed first (a listing only becomes
`provenance='owner-verified'` with a `claim_contact` through that flow). See the deploy
order at the bottom.

**Two destinations:**
1. **APP CODE** — commit these files → Vercel.
2. **SQL** — paste `supabase/migrations/20261001140000_owner_editor.sql` into the Supabase
   SQL editor (additive, idempotent). It adds two tables: `directory_owner_tokens`
   (hashed management-link + session ledger) and `directory_listing_edits` (the moderation
   queue). RLS on, service-role only — same pattern as your other tables.

Full diff in `CHANGES.diff`.

## How it works
- Owner-verified listing's detail page shows "Own this business? Manage your listing →".
- They request a link → `/api/directory/owner/request` emails a single-use token **to the
  on-file contact only** (anti-enumerating; same response whether or not the listing exists
  or is verified).
- Opening the link → `/api/directory/owner/verify` consumes it, mints an httpOnly session,
  and opens the editor.
- Save → structured fields (hours/socials/amenities/website) write to the listing's owned
  columns immediately; **description + photo URLs land as `pending`** in
  `directory_listing_edits` for you to approve.

## Security
Tokens are crypto-random, stored sha256-hashed, single-use, short-TTL; session is httpOnly
(never in a URL or the page); request + save are rate-limited + honeypot'd; URLs are
sanitised (http/https only — no `javascript:`/`data:`); empty fields are treated as "no
change" (no destructive clears). Nothing sensitive is logged.

## Approving edits (until the admin UI exists)
Moderated edits sit `pending`. Approve a description by SQL (snippet is in the migration
file footer): set the edit `approved`, then copy its value onto `summary_en`.

## Verified
`npx tsc --noEmit` clean; `npm test` → all 34 suites pass (nothing existing regressed).

## Smoke tests
- On an owner-verified listing, click "Manage your listing" → request link → the email lands
  at the on-file contact only.
- Open the link → editor opens prefilled. Edit **hours** → saves live. Edit **description**
  → lands `pending` (not live) until you approve it.
- A non-verified (reference) listing → generic "check your inbox", no email sent.

---

## Deploy order (important — read once for all the new ZIPs)
Your live repo already has: unify, Phase 0, revenue, single-brain, own-the-data Phase 1, and
your own kb-ingest. Still to deploy, **in this order**:

1. **safety-followups** ZIP (from earlier) — no dependencies.
2. **claim-to-own** ZIP (from earlier) + run its SQL `20261001130000_claim_to_own.sql`.
3. **claim-hardening** ZIP — it *modifies* claim-to-own's files, so deploy it **after** #2
   (its files supersede where they overlap).
4. **owner-editor** ZIP (this one) + run `20261001140000_owner_editor.sql`.
5. **stub-enrichment** ZIP + optionally run `20261001150000_stub_text_status.sql`.

4 and 5 are independent of each other; both are fine to deploy together after 2–3.
