# Claim-to-own — the conversion engine

This is the mechanism that turns a borrowed, scraped listing into a first-party **owned**
record. A business claims its listing, proves it controls the business, and the listing flips
to `provenance='owner-verified'` (with `claimed_at` / `verified_at` / `claim_contact` recorded)
and the desk is notified to complete the profile and upsell.

**Two destinations:**
1. **APP CODE** — commit these files → Vercel.
2. **SQL** — paste `supabase/migrations/20261001130000_claim_to_own.sql` (below) into the
   Supabase SQL editor. Additive, idempotent. It adds only the `directory_claims` ledger; the
   listing columns it flips (`provenance`, `claimed_at`, `verified_at`, `claim_contact`) are
   already live from the Phase 1 migration you ran.

Full diff in `CHANGES.diff` (10 files, +968).

---

## The honest-verification principle

A claim must prove the claimant controls the **business**, not just their own inbox. The
channel is chosen server-side, strongest proof first, and a secret is only ever sent to an
address/phone that proves control:

1. **On-file email** — the listing has an email → the verify link goes to **that** address
   (only the real owner receives it; the claimant is never shown it).
2. **Website-domain match** — else if the claimant's email domain matches the listing's website
   host (free-mail and social hosts excluded) → link to the claimant.
3. **Phone OTP** — else if an SMS provider is configured **and** the listing has a phone on file
   → 6-digit code to the on-file phone. (No provider set → this channel is skipped.)
4. **Manual** — else a pending row for the desk to verify out-of-band. It **never** falls back
   to emailing a link to an address the claimant merely typed.

Security built in: tokens/OTPs are crypto-random, stored **hashed** (sha256), **single-use**
(cleared on verify), **expire** (link 72h, OTP 10min), OTP has a **5-attempt lock**, the
initiate endpoint is **rate-limited + honeypot'd**, and responses are **anti-enumerating**
(identical body whether or not a listing has an on-file email). `directory_claims` is RLS-on
with no policies (service-role only).

## SQL to paste

```sql
create extension if not exists pgcrypto;

create table if not exists public.directory_claims (
  id             uuid primary key default gen_random_uuid(),
  listing_slug   text not null,
  claimant_name  text,
  claimant_email text,
  claimant_phone text,
  method         text not null,                     -- 'onfile_email' | 'domain_email' | 'phone_otp' | 'manual'
  token_hash     text,                              -- sha256(email token); single-use, cleared on verify
  code_hash      text,                              -- sha256(phone OTP); single-use, cleared on verify
  status         text not null default 'pending',   -- pending | verified | rejected | expired
  attempts       int  not null default 0,
  expires_at     timestamptz,
  verified_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists directory_claims_slug_idx       on public.directory_claims (listing_slug);
create index if not exists directory_claims_token_hash_idx on public.directory_claims (token_hash);
create index if not exists directory_claims_status_idx     on public.directory_claims (status);
alter table public.directory_claims enable row level security;
-- No policies: only the service role touches this table.

select
  (select count(*) from public.directory_claims)                          as claim_rows,
  (select count(*) from public.directory_claims where status='pending')    as pending,
  (select count(*) from public.directory_claims where status='verified')   as verified;
```

## Files

New: the migration, `lib/directory/claims.ts` (engine), `app/api/directory/claim/route.ts`
(initiate), `app/api/directory/claim/verify/route.ts` (email-link GET + OTP POST),
`components/ClaimListing.tsx` (the "Own this business?" form, with a "Verified owner" state),
`scripts/tests/claims.test.ts`. Edited: `lib/queries.ts` (+`provenance` on the Listing type),
the listing detail page (renders `<ClaimListing>`), `honeypot.test.ts` (wiring guard),
`.env.example` (optional SMS + `DIRECTORY_INBOX` vars).

## Verified
- `npx tsc --noEmit` → clean. `npm test` → **33 suites pass** (new `directory.claims`, 27
  assertions). I also read the engine myself and confirmed the token single-use/expiry, the
  anti-enumeration in the route, and the domain-match denylist.

## Smoke tests
- Claim a listing that **has an on-file email** → generic "we've started verifying" message; the
  link lands in the business's on-file inbox; clicking it flips the listing.
- Claim one with **only a website** and a matching-domain email → link goes to you.
- Claim one with **neither** → generic message; a "manual claim to review" email reaches the desk.
- After clicking a verify link, confirm in SQL:
  `select provenance, claimed_at, verified_at, claim_contact from directory_listings where slug='<slug>';`
  → `owner-verified`, timestamps set, contact recorded; and the claim row shows `status='verified'`
  with `token_hash` NULL (single-use).

---

## Two things to decide / harden next (flagged honestly)

1. **There are now two claim flows.** A pre-existing `app/api/partner/claim` + `lib/partners/claims.ts`
   (roadmap item 09) mails a link to the *claimant* on any email/domain match — a weaker design
   than this one (which mails the **owner** on file and flips provenance). I did **not** touch it, to
   avoid breaking whatever UI points at it. You should decide to **retire it or redirect it** to this
   new engine so there's one claim path — I can do that cleanly on request.
2. **The email verify link is a GET that flips state.** Corporate email link-scanners/antivirus can
   pre-fetch links, which could consume the single-use token before the human clicks (or auto-verify,
   though only from the owner's own inbox). Recommended hardening: make the GET show a branded
   **confirm page** with a POST button, so a prefetch doesn't settle the claim. Small follow-up.

## Deferred to the next increment (documented, not built)
- The self-serve **owner profile editor** (a verified owner rewriting description, uploading photos,
  setting hours/socials) — today verification flips provenance + records contact + pings the desk.
- **SMS provider** wiring (set `SMS_PROVIDER`/`TWILIO_*` to light up the phone channel).
- **Moderation + a claims admin view** (approving manual claims, reviewing owned content).
- **Localization** of the claim form copy (currently English via default props, overridable).
