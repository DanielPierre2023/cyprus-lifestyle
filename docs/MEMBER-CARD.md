# Member card, partner offers and member e-mails (Increment 3.2)

## 1. The member card (/account)
A signed-in member whose membership is entitled (active, complimentary, or a payment problem inside the 7-day grace: exactly `entitled()` in `lib/member/entitlement.ts`) sees a **member card** on /account: status "Member", the year they joined, an optional first name or initials they choose, and a **QR code** (an inline SVG drawn on the server by `lib/qr.ts`, no library, no script). The site has no "Island Key" branding, so the card is simply called the **member card**.

* The QR code encodes `https://<site>/<locale>/card/verify/<token>`.
* **Token** = HMAC-SHA256 over (member id, card version) with `MEMBER_CARD_SECRET` (falls back to the service-role key, like `BOOKING_LINK_SECRET`). Only the token's **SHA-256 hash** is stored (`member_cards.token_hash`); the token is re-derived whenever the member opens /account.
* **Revocable**: (a) the member can press *Replace this card* (version +1: the old QR stops working immediately); (b) when the membership lapses the card stops verifying **at the same moment** the benefits stop, because verification calls the live `entitled()` rule, so no job has to run; (c) changing the secret replaces every card (members get a new one the next time they open /account).
* The member can add a **name on the card** (letters only, up to 24 characters). Default: no name.

## 2. The public verification page `/card/verify/<token>` (7 languages)
No login. `noindex`, `no-referrer`, `force-dynamic` (never cached), rate-limited per address. It shows **only**: Valid / Not valid, "Member", the first name or initials (if the member chose one) and "Member since <year>". It never reads or prints an e-mail, a phone number or the member id (a test enforces this). An unknown, replaced or lapsed card says "Not valid" and nothing else.

## 3. Partner offers and redemptions (Admin → **Member offers**, English)
* **There are no offers by default.** The owner adds an offer: partner name, offer text in English (max 300 characters), optional translations (other languages fall back to English), optional valid-from / valid-to (Cyprus calendar, inclusive), active flag. Offers can be edited, switched off, or deleted while they have no redemptions.
* The card and the verification page show **only active offers inside their dates**.
* With no offer the card says plainly: *"This card identifies you as a Cyprus Lifestyle member. Partner offers are added by Cyprus Lifestyle over time; there are none yet, and the card does not by itself entitle you to a discount anywhere."* Never write copy that implies a discount that is not in the offers list.
* On the verification page staff can press **Redeem** per offer (no login). `POST /api/card/redeem` is same-origin only, rate-limited per address (20 / 10 min) and per card (12 / hour), refuses an invalid card, a switched-off or expired offer, and a second redemption of the same offer by the same member on the same **Cyprus day** (unique index). The log row is `(offer_id, member_id, redeemed_at, redeemed_day)`: **nothing else** (no e-mail, name, venue or IP). Admin sees counts per offer (all time and last 30 days), never member ids.
* Erasure: all three new tables cascade from `concierge_members`, so a GDPR erasure of a member removes the card and the redemption history.

## 4. What the site, the chatbot and the e-mails may say about membership (truth in advertising)
| Claim | Backed by |
|---|---|
| More thorough, anticipatory answers | `MEMBER_PROMPT` is added to the chat prompt for an entitled member. It is an **instruction to the model, not a measured guarantee**. |
| Preferences (interests, districts, dates, party, base...) remembered across devices | `concierge_members.profile`, restored when the member signs in on a device. *Saved items / trip plan are per browser and are NOT claimed.* |
| Priority lane for signed-in members | `bookings.lane='member'` only when the request is sent while signed in at /account and entitled; `compareQueue` lists members first. |
| First-reply **target** 4 working hours (Cyprus working hours, holidays excluded) | `first_response_due_at`, the admin timer, breach alert. Always "target", never "guarantee". |
| Member card (QR) that identifies the member | section 1-2. Offers exist only if the owner added them. |
| NOT allowed | a named or dedicated human concierge, "guaranteed"/"always"/"within N hours" without "target", "unlimited", any discount or "exclusive offers" while the list is empty. |
The chatbot's wording lives in **one place**, `lib/member/truth.ts` (house facts in `brain.ts`, `MEMBER_BLOCK` in `membership.ts`).

## 5. Member e-mails (sent by the daily job, once per event)
`reconcileMembers` (`/api/cron/tick`, daily) now ends with `runLifecycleNotices` (`lib/member/lifecycle.ts`):
* **Payment problem** (a paid membership is `failed` and still inside the 7-day grace): what happened, *benefits continue until <date>*, button to /account (sign in with the e-mail address, then "Manage billing, invoices and cancellation" opens the Stripe portal).
* **Membership ended** (status `canceled`, or `failed` after the grace period): what stops (priority lane, member card, member-level answers), that preferences are kept 90 days then erased, invoices stay downloadable, button to rejoin.
* Not built, on purpose: renewal reminders (Stripe's receipts cover them).
* **Once per event**: `concierge_members.grace_notice_at` / `lapsed_notice_at` are claimed with one atomic conditional update *before* sending (two overlapping runs cannot both send); a failed send releases the claim so tomorrow's run retries. When a membership recovers (back to `active`) both stamps are cleared, so a **later** problem or lapse is announced again. A crash between claim and send loses one notice rather than ever sending two.
* Only **paid** members with an address (complimentary memberships ended by the owner get no automatic mail). Memberships that ended before this shipped were pre-stamped by the migration, so nobody is mailed about an old event. Language: the member's `locale` (captured at checkout from now on, and refreshed when they open /account), else English.
* **Stripe settings**: keep Stripe's own **"failed payment" customer e-mails OFF** (Dashboard → Settings → Billing → Subscriptions and emails: *Send emails about failed payments / Smart Retries* off) so members do not get two messages. **Receipts and invoices stay ON.**
* Latency: the webhook updates the status at once; the e-mail goes out in the next daily run (up to ~24 h).

## 6. One-time set-up
1. Run `supabase/migrations/20261008100000_member_card_offers.sql` in the Supabase SQL editor (3 tables, 2 columns; RLS on, no policy; idempotent). **Before deploying.** Until it is run, /account simply shows no card and the e-mail step logs a warning; nothing else breaks.
2. Optional env var `MEMBER_CARD_SECRET` (random string, 16+ characters). Absent -> `SUPABASE_SERVICE_ROLE_KEY` is used. Changing it replaces every card.
3. Needs `RESEND_API_KEY` / `EMAIL_FROM` for the e-mails (already required elsewhere) and the daily `/api/cron/tick` (already scheduled).
4. Stripe: turn Stripe's failed-payment customer e-mails off (section 5).
5. Test: sign in at /account -> the card appears; "See what venues see" opens the verification page; add an offer in Admin -> Member offers -> it appears on the card and the page; press Redeem twice -> second says "Already redeemed today"; cancel the subscription in Stripe -> the page says "Not valid".

## 7. Verification of the QR encoder
`lib/qr.ts` is a dependency-free encoder (byte mode, level M, versions 1-10, 213 bytes). Before release all lengths 1-213 were encoded and **decoded with an independent reader (jsQR)**: 426/426 round-trips matched, and the version choice equals the reference `qrcode` package. `scripts/tests/qr.test.ts` pins a Reed-Solomon vector, structure, format bits and a snapshot. A verification URL is about 90 characters (version 6, 41x41 modules).
