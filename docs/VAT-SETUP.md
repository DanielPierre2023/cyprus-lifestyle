# VAT set-up (Phase 1 · Increment 1.4a)

## 1. Short answers

* **Was it set up like this before?** No. The original checkout charged the flat rate-card price, asked for no country and no VAT number, and never calculated VAT.
* **Is it now?** Yes, in the code — it switches on when you complete section 4 and set `STRIPE_AUTOMATIC_TAX=1`. Until then checkouts still work but add **no VAT** (the admin page *VAT check* and `/api/health` show this in red).
* **"VAT-exclusive" = VAT is added on top.** Advertising/listing prices are shown without VAT; at checkout Stripe adds the VAT of the buyer's situation (Cyprus today: 19%, always the *current* rate Stripe holds — the website never prints a percentage). Example: Listed €149 → €149.00 + €28.31 = **€177.31**; Featured €49/month → €49.00 + €9.31 = **€58.31**.
* **The €19 membership is VAT-inclusive:** the customer pays exactly €19. Inside it: Cyprus 19% → €3.03 VAT / €15.97 net. The membership page now says "incl. VAT" in all 7 languages.

## 2. The rules (advertising, listings, sponsorships)

| Buyer | Result |
|---|---|
| Company in **another EU country**, VAT number **confirmed in VIES** | **No VAT** (reverse charge). Pays €149.00. Invoice shows the buyer's VAT number and "Reverse charge". |
| Company in **Cyprus**, even with a valid CY VAT number | **Cyprus VAT**, like a private person (a domestic sale is never reverse-charged). |
| EU company/person **without** a confirmed number | **Cyprus VAT** (treated as a private person). |
| Number **invalid** | Checkout refused with a message; buyer may continue without a number and pays VAT. |
| VIES **not reachable** | Number is never trusted: buyer may retry or continue without it (VAT added). |
| Buyer **outside the EU** | No EU VAT (expected — see "Check this first" below). |

Stripe itself only checks a VAT number's *format* and applies the reverse charge on that alone, so **our server checks every number against the EU's VIES register before anything is created**; only a confirmed number is passed to Stripe.

## 3. What is stored per order (migration `20261005130000_vat_evidence.sql`)

Declared country, VIES result, VIES consultation number (if `VIES_REQUESTER_VAT` is set), what we *expected*, and what Stripe *charged* (net / VAT / total / billing country / invoice id). If Stripe's result differs from the expectation, `vat_alert` is set and shown in red on **Admin → VAT check**.

## 4. One-time Stripe set-up (yours — I cannot see or change your Stripe account)

Do it first in Stripe **test mode** (separate settings), then again in live mode.

1. **Settings → Tax** (`dashboard.stripe.com/settings/tax`): confirm *head office* = your Cyprus address; preset tax code any; default tax behaviour any (our checkout sets it per item).
2. **Tax → Locations** (`dashboard.stripe.com/tax/locations`): add **Cyprus – domestic registration** with your Cyprus VAT number. Without a registration in a country, Stripe returns zero tax there.
3. For private customers in other EU countries (membership): ask your accountant which applies —
   * **small seller option** (all EU cross-border B2C sales below €10,000/year → Cyprus VAT applies; Stripe asks this when you add the Cyprus registration), or
   * **Union OSS** registration (destination-country VAT, one return via Cyprus).
4. Invoices: *Settings → Billing → Invoice template* — show your tax ID.
5. Vercel env vars (see `.env.example`): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VIES_REQUESTER_VAT=CY…` (your own VAT number), `SELLER_COUNTRY=CY`, and finally `STRIPE_AUTOMATIC_TAX=1`.
6. Run migration `20261005130000_vat_evidence.sql` in the Supabase SQL editor.
7. Open **Admin → VAT check → Run the VAT check**. All six rows must be **PASS**.
8. Make 3 test purchases with card `4242 4242 4242 4242`: (a) Cyprus company → VAT added; (b) a company in another EU country using a **real** VAT number from any invoice you hold (VIES is public) → €149.00, no VAT; (c) the same company without a number → VAT added. Check the Stripe invoice and the row in *VAT check*.
9. Repeat 1–2 in live mode, switch to the live key, run the check again, then watch the first live order.

## 5. Check this first (honest caveats)

* **Non-EU buyers:** Stripe's documentation says tax code "General – Services" is taxed in the seller's country when sold to *individuals*. A US company without a tax ID may therefore be seen as an individual. The self-check row "US company" will tell you on your real account; if it fails, tell me and I will mark non-EU buyers as exempt on the Stripe customer (small, separate change — it also changes the invoice wording, so ask your accountant).
* **Arabic:** Stripe's hosted payment page does not offer Arabic; Arabic visitors see it in their browser language or English. Our own form, page and emails stay Arabic.
* **The €19 membership has no VAT-number field** — it is a consumer product; everybody pays €19 incl. VAT.
* **Name/address of a company are not compared** with the VIES record (many states do not publish them). Only the number's validity is verified and stored.
* **VIES evidence:** if `VIES_REQUESTER_VAT` is set, VIES returns a consultation number per check — kept as audit proof.
* **EC Sales List / OSS returns:** use Stripe's reports (Tax → Locations → your location); subscription renewals are not rows in `ad_orders`. The database is supporting evidence only. Your accountant confirms the filings.
* Old orders (before this change) carry no VAT data.

## 6. Cost (flagged)

* Stripe Tax *Tax Basic* pay-as-you-go: **0.5% of the transaction volume** (incl. tax), only in places where you are registered (Stripe price list, checked 2026-10-03).
* The **Admin VAT check** makes 6 Stripe Tax calculation calls per run, listed at **US$0.05 each (≈ US$0.30 per run)**; it runs only when you click. I could not confirm whether test-mode calls are billed.
* VIES lookups are free. Filing services (Taxually etc.) are optional and not used.

## 7. If a scenario fails

| Message | Fix |
|---|---|
| "not collecting" for Cyprus | Add the Cyprus registration (step 2). |
| "not collecting" for Greece (membership) | Choose small-seller or OSS (step 3). |
| VAT added to a verified EU company | Head office must be Cyprus; re-run. |
| "head office" error | Step 1. |
| Member price changed | Do not override tax behaviour in Stripe; tell me. |
