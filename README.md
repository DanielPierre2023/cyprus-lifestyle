# Phase 0 — Security de-risk (code-only, no SQL)

Four confirmed security fixes, re-verified against `main` at `829a82e`. All are
additive, behaviour-preserving for legitimate users, and need no migration and no
new env. One earlier suspicion (an "mdToHtml XSS") was **re-checked and dropped** —
it is not exploitable; details at the end so you know it was looked at, not missed.

**Destination:** commit these six files → Vercel. Nothing to run in Supabase.

```
lib/directory/map-data.ts
app/api/directory/businesses/route.ts
lib/concierge/membership.ts
lib/crm.ts
lib/og/card.tsx
lib/ratelimit.ts
```

Full diff in `CHANGES.diff` (6 files, +71 / −21).

---

## 1 — Unauthenticated PII dump on the directory map  *(highest impact)*

**Was:** `GET /api/directory/businesses?cat=<category>` is public, uncapped and
edge-cached, and returned `email` **and** `phone` for **every** geocoded business —
all ~15k rows including the bulk-imported `listed` set that isn't even on the public
site. Anyone could enumerate the ~85 categories and scrape the whole directory's
contact details (third-party business PII, much of it Google-derived).

**Now:** `email` is no longer selected or emitted to the public map at all, and
`phone` is returned **only for `published`** listings (never the scraped `listed`
set). The map still has everything it needs — pin, name, link. The info-window's
email action in `BusinessMap.tsx` is already guarded by `if (p.email)`, so it simply
stops rendering; no frontend change required.
*(Files: `lib/directory/map-data.ts`, `app/api/directory/businesses/route.ts`.)*

## 2 — Membership account-takeover via LIKE injection  *(highest impact)*

**Was:** `linkEmailToCid()` did `.ilike('email', e)` with the caller's raw input. A
request with `email = '%'` matches **any** active member, and the function then
re-points that member's account to the caller's browser (`cid`) — i.e. it hijacks a
real member's subscription and detaches them from it.

**Now:** LIKE wildcards in the input are escaped (`\`, `%`, `_`), so the match is the
exact address, case-insensitive — the intended behaviour. Same one-line hardening
applied to the CRM domain lookup in `lib/crm.ts` (same class of bug, lower severity).
The admin search boxes (`admin/crm`, `admin/editorial`) use `ilike` too but are
admin-gated and intentional substring search — left as-is on purpose.
*(Files: `lib/concierge/membership.ts`, `lib/crm.ts`.)*

## 3 — SSRF in the OG image generator

**Was:** `/api/og?c=<url>` passed the `c` param straight to `fetch(coverUrl)` in
`lib/og/card.tsx` with no validation — the server would fetch any URL an attacker
supplied (internal services, `169.254.169.254` metadata, other hosts, using the site
as a proxy).

**Now:** the cover is fetched only when the URL passes `isPublicHttpsUrl()` — https
only, no credentials, and loopback / private (RFC1918) / link-local / metadata / IPv6
/ `*.internal` / `*.local` targets rejected. Redirects are disabled (`redirect:
'error'`, so a public URL can't 302 to an internal one), with a 4s timeout and an 8 MB
cap. Legitimate public cover images are unaffected.
*Follow-up (not in this ZIP): a strict host allowlist + IP-resolution would also close
DNS-rebinding; this already blocks the common vectors.*
*(File: `lib/og/card.tsx`.)*

## 4 — Rate limiter ignored per-endpoint limits in production

**Was:** the distributed (Upstash) limiter was built once as
`slidingWindow(5, '60 s')` and reused for every bucket, so whenever Upstash is
configured **every endpoint was throttled at 5 requests / 60s** regardless of the
limit passed — e.g. the concierge asks for 12/60s but silently got 5, and no bucket
could be made stricter than 5 either. (The in-memory fallback already honoured the
args; only the production path was wrong.)

**Now:** one `Ratelimit` is created per `(limit, window)` and reused, so each bucket
gets the limit the caller actually requested. One shared Redis client. Still fails
open (never blocks on a limiter error).
*(File: `lib/ratelimit.ts`.)*

---

## Verified before shipping
- `npm run typecheck` → clean (exit 0).
- `npm test` → all 30 suites pass.
- Changes are additive and degrade safely (map email action self-hides; OG falls back
  to the text card; limiter fails open).

## Smoke tests after deploy
- `GET /api/directory/businesses?cat=<any category>` → feature `properties` contain
  **no `email`**, and `phone` only on `published` rows.
- Join membership on one device, then "link by email" on another with your real email
  → still links. (And `email=%` style input no longer matches anyone.)
- Open any article/listing OG image (`/api/og?...`) → still renders with its cover.
  `/api/og?c=http://169.254.169.254/` → renders the **text-only** card (fetch refused).
- Concierge under load → allowed up to its own limit (12/60s), not 5.

---

## Re-checked and intentionally NOT changed
- **`mdToHtml` ("XSS")** — not exploitable. It `escapeHtml`s every block's text first,
  and `inline()` only turns `[text](https://…)` into `<a>` *after* escaping, with the
  URL capture stopping at whitespace — so no new tag and no attribute can be injected.
  No change made.
- **Admin `ilike` search** (`admin/crm`, `admin/editorial`) — admin-gated, intentional
  substring search. Left as-is.

*Separate from security (revenue correctness, not in this ZIP): the honeypot uses the
`company` field, and the membership Stripe webhook's error handling — both flagged for
a later pass. Say the word and I'll verify and fix those next.*
