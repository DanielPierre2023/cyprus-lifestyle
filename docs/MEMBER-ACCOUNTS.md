# Member accounts, billing portal and what happens when a membership ends (Increment 1.4)

## 1. What members get
* **/account** (linked from the membership page, "Already a member? Sign in to your account"): sign in with the e-mail address used at checkout. No password — a one-time link (works once, 30 minutes) is e-mailed in the member's language. Signing in also switches the member benefits on in that browser (cross-device memory), exactly as the old "Email me a link" box did.
* On the page: membership status (Active / Ending / Payment problem / Ended / Complimentary), the renewal or end date, the member benefits, and
  * **Manage billing, invoices and cancellation** → Stripe's own secure *Customer Portal* (change card, download invoices incl. the VAT invoice, cancel);
  * **Forget what the concierge knows about me** (erases the stored preferences; the membership stays);
  * **Sign out** / **Sign out on all devices**.
* **Ended members can still sign in**: to download invoices and to rejoin. They get no member benefits.
* Sessions are an HttpOnly, Secure, SameSite=Lax cookie (`cl_member`, 30 days, sliding). Only a hash of it is stored. Members are **not** Supabase Auth users, so "Allow new users to sign up" stays OFF and a member can never reach admin data.

## 2. When benefits stop (and what is deleted)
| Situation | Benefits | Account page |
|---|---|---|
| Paying, renewing | yes | Active · Renews on … |
| Cancelled in the portal ("at period end") | yes, until the paid period ends | Ending · Your benefits end on … |
| Card fails (Stripe retries for a few days/weeks) | **yes for 7 more days after the period end**, then no | Payment problem · update your card |
| Subscription ended / unpaid | **no** — at the moment Stripe says so | Ended · Rejoin |
| Complimentary (you granted it) | yes until you end it in Admin → Members | Complimentary |

Safety net: every day the site asks Stripe about paid memberships whose period ended 2+ days ago but which still look active (a cancellation e-mail from Stripe may never have arrived) and corrects them. **90 days after a membership ended, the stored concierge preferences of that person are erased** (data minimisation). Expired sessions and spent sign-in links are deleted daily.

## 3. One-time set-up
1. Run `supabase/migrations/20261005160000_member_accounts.sql` in the Supabase SQL editor (a table for sessions + 3 columns; no data changes). **Do this before deploying**, otherwise sign-in answers "unavailable".
2. **Activate the Stripe Customer Portal** — otherwise the billing button shows "not available right now":
   Stripe Dashboard → Settings → Billing → **Customer portal** (do it in test mode AND in live mode):
   * enable *Update payment methods*, *View invoice history*, *Cancel subscriptions* (choose "at end of billing period");
   * add the links to your Privacy policy (`https://cypruslifestyle.eu/privacy`) and Terms;
   * press **Save**.
3. Stripe webhook events that must be enabled on your endpoint (they probably are): `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid`.
4. Test: buy a membership in Stripe test mode → open `/account` → "Email me a sign-in link" → open the link → *Manage billing* → cancel → the page shows "Ending"; end the subscription immediately in the Stripe dashboard → "Ended" within a minute.

## 4. Honest notes
* The sign-in e-mail goes out in the language of the page the member requested it on.
* A member's browser is "bound" to the membership when they sign in; signing in elsewhere moves the binding (one browser = one membership) — same rule as before.
* Not built (not asked): e-mail to the member when a payment fails or the membership ends. Stripe sends its own payment-failure e-mails if you enable them in Settings → Billing → Subscriptions and e-mails.
