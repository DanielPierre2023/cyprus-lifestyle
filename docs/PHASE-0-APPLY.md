# Phase 0 — how to apply (security & honesty sprint)

Scope approved by the owner: security fixes + removal of false promises. **Not included:** editors/bylines,
AI disclosure, auto-publish. Admin stays English; everything visitor-facing exists in all 7 locales.

Verified in a separate copy of the repo before packaging: `npx tsc --noEmit` ✔ · `npm test` ✔ (44 suites,
5 new) · translation parity ✔ (7 locales × 378 keys, no empty values) · `next build` ✔.
Nothing was run against your live Supabase, Stripe, Vercel or Meta accounts.

---
## 0. Do these FIRST (before deploying the code)

| # | Action | Why |
|---|---|---|
| 1 | **Rotate `ENRICH_SECRET`**: create a new random value, set it in Vercel env **and** in Supabase → Edge Functions → Secrets. | The old value was committed in `CONCIERGE-FIX.md` and is in git history. Removing the file line does not un-leak it. |
| 2 | Set **`WHATSAPP_APP_SECRET`** in Vercel (Meta → App settings → Basic → *App secret*). | The WhatsApp webhook now **refuses all POSTs** without it. Skip this and the WhatsApp bot goes silent. |
| 3 | Set **`TELEGRAM_SECRET_TOKEN`** in Vercel, and make sure `setWebhook` was called with the same value as `secret_token`. | The Telegram webhook now **refuses all POSTs** without it. |
| 4 | Confirm `ENRICH_SECRET` exists in Supabase Edge Function secrets (`enrich-directory`, `events-ingest`). Optionally set `OSM_IMPORT_SECRET` for `import-osm-directory`. | These functions used to run **open** when no secret was set; they now fail closed. |

## 1. SQL — run in Supabase → SQL Editor (each is idempotent; run in this order)

| Order | File | Purpose |
|---|---|---|
| 1 | `supabase/migrations/20261004130100_membership_restore_tokens.sql` | Table for the verified "restore membership" email link |
| 2 | `supabase/migrations/20261004130200_stripe_events.sql` | Stripe event-id ledger + `current_period_end` / `cancel_at_period_end` columns |
| 3 | `supabase/migrations/20261004130300_close_anon_inserts.sql` | Drops 6 anonymous INSERT policies. **Read its header and run its diagnostic query first.** |
| 4 | `supabase/migrations/20261004130400_ai_spend_guard.sql` | `ai_spend_since()` function for the AI budget |

The code is written to keep working (and log) if a migration has not been run yet, so SQL and code can go live in either order.

## 2. Deploy order

1. **Supabase edge functions first**: redeploy `enrich-directory`, `events-ingest`, `import-osm-directory` from `supabase/functions/*/index.ts`
   (the Next app now sends the secret in the `x-enrich-key` header, which only the new edge code understands).
2. Then commit the rest of this package and let Vercel deploy. `package.json`/`package-lock.json` changed
   (adds `sanitize-html` + `@types/sanitize-html`), so Vercel will install it automatically.
3. Optional hardening once all callers use headers: set `ENRICH_DISABLE_QUERY_KEY=1`.

## 3. New environment variables (all documented in `.env.example`)

`ENRICH_DISABLE_QUERY_KEY` · `WHATSAPP_APP_SECRET` (required) · `TELEGRAM_SECRET_TOKEN` (required) ·
`AI_DAILY_BUDGET_USD` (default 40) · `AI_MONTHLY_BUDGET_USD` (default 400) · `AI_KILL_SWITCH` ·
`AI_PUBLIC_DAILY_CALLS` (default 6000) · `AI_PUBLIC_DAILY_TTS` (default 600). `0` = no cap.
**Check the defaults against your real monthly AI spend before deploying** — when a cap is reached, the editorial
desk and the concierge stop answering until the next window (or until you raise the cap).

## 4. What changed, by item

| Item | Change | Main files |
|---|---|---|
| 1 Secret gate | One constant-time gate: header `x-enrich-key`, `Authorization: Bearer`, or a signed-in **admin session** (just open the URL while logged in to /admin). Legacy `?key=` still works until you set `ENRICH_DISABLE_QUERY_KEY=1` (so your existing pg_cron jobs/bookmarks don't break). Fails closed when no secret is set. Edge functions fail closed too. | `lib/auth/*`, `lib/editorial/gate.ts`, `app/api/concierge/{embed,embed-directory,publish-directory,normalize-directory,geocode-directory,selftest}`, `app/api/editorial/*`, `supabase/functions/*`, `lib/scrape/events.ts` |
| 2 Leaked key | Committed key URL removed from the doc (you still must rotate — step 0.1). | `CONCIERGE-FIX.md` |
| 3 Webhooks | WhatsApp: HMAC `X-Hub-Signature-256` over the raw body; Telegram: mandatory secret, constant-time; per-sender rate limits. | `app/api/whatsapp`, `app/api/telegram`, `lib/auth/webhookSignature.ts`, `lib/ratelimit.ts` |
| 4 Membership takeover | The email-only "restore" is gone. Now: email → single-use 30-min link (hash stored) → POST confirm that binds the membership to the **confirming** browser. Same generic response whether or not the email is a member. Concierge ids must be ≥32 chars (client already generates UUIDs); GET endpoints rate-limited. Restore email in 7 languages. | `lib/concierge/{membership,restoreToken,restoreEmail,memory}.ts`, `app/api/membership/{status,restore}`, `MembershipCheckout.tsx`, `ConciergeChat.tsx` |
| 5 Honest copy | Removed "priority / always first in line", "dedicated human concierge", "unlimited", the empty Patron card and the "always free / paid tier on the way" contradiction; price label follows `MEMBERSHIP_INTERVAL`; the concierge no longer quotes prices or promises a human. | `messages/*.json` (7), `membership/page.tsx`, `lib/concierge/{brain,membership}.ts` |
| 6 Stripe | Event idempotency; `invoice.paid` / `subscription.updated` handlers (recovered card restores access, a cancelled row is never resurrected); `checkout.session.expired` / async payment events; paid only when `payment_status` is paid; double-subscription blocked (409 `already_member`); refunds/disputes logged for review. | `app/api/advertise/webhook`, `app/api/membership/checkout`, `lib/stripe/*` |
| 7 XSS | Allow-list sanitiser on the public article body. | `lib/sanitizeHtml.ts`, `article/[slug]/page.tsx` |
| 8 Anon inserts | SQL only (see above). | migration 3 |
| 9 Spend cap | Daily/monthly USD cap + kill switch on every model call routed through `lib/ai.ts` and the admin/cron routes that front the edge functions; global daily ceiling on the public concierge/voice/WhatsApp/Telegram. | `lib/aiBudget.ts`, `lib/spendGuard.ts`, `lib/ai.ts`, `app/api/{admin/generate,admin/editorial,cron/process,concierge/*}` |
| 10 Small fixes | Banner tracking validated + rate-limited + no error leakage; failed privacy (DSAR) requests no longer reported as "received"; HTML-escaped onboarding/newsletter emails. | `app/api/banners/track`, `app/api/privacy/request`, `lib/{fulfilment,newsletter,util}.ts` |
| 11 Prices | Advertise FAQ (structured data) now matches the rate card (€149/yr · €49/mo founding; €490/yr · €199/mo standard). | `advertise/page.tsx` |

## 5. Known limits / follow-ups (deliberately not done in Phase 0)

* Existing members whose stored browser id is shorter than 32 characters (only possible from an old fallback) must use "email me a link" once.
* Restoring moves the membership to the browser that confirms; the previous browser loses member status.
* The spend cap counts what is logged in `ai_spend_log` (desk, editorial, translation, social). Concierge/voice are protected by the call ceilings, not dollars. The Supabase edge function `process-scraped-article` is guarded at its Next entry points (admin/cron), not inside the function itself.
* Refunds/disputes are logged, not yet acted on. Cancelled advertisers still keep benefits (de-provisioning, VAT/invoices, Customer Portal are Phase 1).
* `fulfil_ad_order()` still auto-sets "verified" at payment (SQL function change needs your live definition — Phase 1).
* Fresh-environment rebuild is still impossible from the repo (missing `directory_listings` migration) — Phase 1.
* `?key=` stays accepted by default; set `ENRICH_DISABLE_QUERY_KEY=1` when ready. Existing pg_cron jobs that put the key in the URL (see `DEPLOY-increment-3.md`) keep working until then.
* The new restore-email and membership strings in de/el/pl/ro/ru/ar were written by AI — a native-speaker review is recommended before launch.
* `tsconfig.tsbuildinfo` is a build cache and is intentionally not part of this package.

## 6. Verify after deploy

1. `curl -i https://<site>/api/concierge/selftest` → 401; signed in to /admin it works; `curl -H "x-enrich-key: <new>" …` works.
2. `curl -i -X POST https://<site>/api/whatsapp -d '{}'` → 401 (and 503 if `WHATSAPP_APP_SECRET` is missing).
3. Send a real WhatsApp and Telegram message → answered.
4. Membership page → "Email me a link" → mail arrives → link restores; second click says "expired or already used".
5. Stripe → Developers → Webhooks → resend an old event → response contains `"duplicate": true`.
6. Open an article → text, headings and links unchanged.
