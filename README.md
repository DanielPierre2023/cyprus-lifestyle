# Revenue correctness — honeypot + membership Stripe webhook

Two confirmed bugs that were **silently losing money**, both fixed and covered by new
tests. Commit these files → Vercel. **No SQL to run.**

A few files here (`lib/ratelimit.ts`, `lib/concierge/membership.ts`) also contain the
earlier Phase 0 security fixes — these copies are the complete latest version, so just
take the newest file; deploy order vs the Phase 0 ZIP doesn't matter.

Full diff in `CHANGES.diff`.

---

## Bug 1 — the advertise form was silently dropping every lead with a company name

`isHoneypot()` treated a filled **`company`** field as a bot. But the advertise quote
form (`AdvertiseFunnel.tsx`) has a **real, visible "Company (optional)" field**, and the
advertise lead route does `if (isHoneypot(body)) return {ok:true}` — so **every genuine
advertiser who typed their company name was silently discarded while the UI said "Thank
you."** That is a direct revenue leak on your highest-value form. (The advertise form's
actual intended trap was a hidden `website` input that nothing on the server ever read —
dead.)

**Fix:** a dedicated honeypot field `_gotcha` (new `lib/honeypot.ts`, shared constant) that
no real form collects and browser autofill ignores, rendered as a properly hidden input
(`components/HoneypotField.tsx`) on the five public forms (advertise, enquiry, contact,
newsletter, comments). `isHoneypot` now checks `_gotcha` only. The advertise form keeps its
real `company` field. Net effect: real leads get through; naive bots still get caught.

## Bug 2 — the membership Stripe webhook acknowledged payments it never recorded

Two real problems in `app/api/advertise/webhook/route.ts` (membership branch):

1. **Silent 200.** The `upsert` result was never checked and the handler returned
   `{received:true}` regardless; a blanket `catch` swallowed errors too. supabase-js returns
   `{error}` instead of throwing, so DB failures were invisible — Stripe saw 200 and never
   retried.
2. **Wrong conflict target.** The upsert used `onConflict: 'stripe_subscription_id'`, but the
   only unique index on that column (migration 0050) is **partial**
   (`where stripe_subscription_id is not null`). PostgREST emits a bare `ON CONFLICT`, which
   Postgres can't match to a partial index → error `42P10`, **0 rows written**. If the live
   DB matches 0050, **no paid membership was ever recorded**, and each was acknowledged 200.

**Fix:** a new `recordMembershipCheckout()` in `lib/concierge/membership.ts` that does
update-else-insert (no `ON CONFLICT`, so it works regardless of the live index), is
idempotent across Stripe retries (keyed on subscription id, then session id), and handles the
concurrent-delivery race (`23505`). The webhook now returns **HTTP 500 on a genuine write
failure so Stripe retries**, and only 200 once the row is durably written. Signature
verification was already correct and was left as-is. A successful webhook behaves exactly as
before.

---

## Verified
- `npx tsc --noEmit` → clean. `npm test` → **32 suites / 801 assertions pass** (two new
  suites: `honeypot.wiring`, `stripe.webhook.membership`; each was mutation-checked — the new
  tests fail if the bug is reintroduced).

## Smoke tests after deploy
- On `/advertise`, request a quote **with a Company filled in** → then
  `select name, company from ad_leads order by created_at desc limit 1;` shows the row.
  (Before: no row.)
- `curl -X POST <site>/api/advertise/lead -d '{"name":"x","email":"x@y.co","_gotcha":"spam"}'`
  → `{ok:true}` and **no** row; same call without `_gotcha` → row created.
- Run `select count(*) from concierge_members;` — if it's 0 while Stripe shows membership
  subscriptions, that confirms Bug 2 was live. Do a test checkout (card 4242) → one `active`
  row; Resend the event in Stripe → still one row, 200.

---

## Known remaining (NOT in this ZIP — flagged honestly, I can do next)
- **Same bug class on the ad-order branch:** the `ad_orders` checkout write also ignores its
  error, so a paid ad order can stay `pending` with a 200. It was left out on purpose — a
  blind strict-fail there risks retry storms on foreign events, and its CRM/email side-effects
  aren't idempotent. The safe targeted fix is small; say the word.
- **Backfilling missed members:** events already acknowledged 200 won't auto-retry. Within
  Stripe's 30-day window you can Resend each `checkout.session.completed`; older ones need a
  manual insert. Check the admin error log after deploy — if webhooks now show 500, the most
  likely cause is that **migration 0050 was never applied** (run
  `select indexdef from pg_indexes where tablename='concierge_members';` to confirm).
