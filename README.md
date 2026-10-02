# Claim-flow hardening

Two safety fixes on the claim-to-own flow. **No SQL.** Commit these files → Vercel.

**Depends on:** the **claim-to-own** ZIP being deployed first — this ZIP *modifies* two of its
files, so deploy claim-to-own first, then this (its files supersede where they overlap).

Full diff in `CHANGES.diff`.

## 1 — The email verify link is now prefetch-safe
Before, opening the verification link (a GET) flipped ownership immediately — so an email
security scanner or link prefetcher could auto-verify or burn the single-use token before the
human clicked. Now:
- **GET** renders a branded **"Confirm you own &lt;business&gt;"** page and does **zero writes**
  (a new read-only `peekClaimToken` just looks up the business name). Scanners can't trip it.
- The token is consumed and the listing flipped **only on the deliberate POST** (the Confirm
  button), then redirects to the listing with `?claimed=1`.
- All existing security is preserved: tokens stay hashed, single-use, expiring; the token
  travels in the POST body (not the URL); bad/expired tokens get the same generic page
  (anti-enumeration). The OTP (phone) path is unchanged.

## 2 — One claim engine (old partner/claim retired)
There were two claim flows; the old `/api/partner/claim` was weaker (mailed a link to the
claimant on any match and never flipped provenance). It now **delegates to the single
`startClaim` engine**, so every claim path uses the honest-verification flow (secret to the
proven owner; a confirmed claim flips provenance). The one UI that used it — the `/partner`
page — was repointed to the new `/api/directory/claim` engine. The old URL stays as a thin,
backward-compatible shim so any cached/legacy link keeps working.

## Flagged for later (not changed here — not in this workstream's scope)
- The legacy `/api/partner/verify` + `/api/partner/edit` routes and the admin Partners tab
  still exist for the short tail of pre-cutover `?token=` links and existing rows. They can be
  retired once that tail expires.
- The `/sourcing` page prose (7 languages) still says `/partner` edits are "reviewed before
  they go live" — now stale under the claim-to-own flow. A copy update for whoever owns that
  page.

## Verified
`npx tsc --noEmit` clean; `npm test` → all 34 suites pass (incl. `directory.claims` 27 and
`partners.claims` 16; the confirm-step split was verified with in-memory smoke suites —
GET does no writes, POST consumes once and flips).

## Smoke tests
- Open a verification link → you see the **Confirm** page, and the claim is still `pending`
  (nothing flipped). Click **Confirm** → verified + redirect. Re-open the used link → generic
  "can't be used" page.
- Submit a claim from the `/partner` page → it now creates a `directory_claims` row via the new
  engine (not the old `listing_claims` shape).

*Deploy order for all the new ZIPs is in the owner-editor README.*
