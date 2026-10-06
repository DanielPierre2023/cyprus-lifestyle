# Stripe account shared by several businesses

The Stripe account (ADD Individual Solutions Ltd) serves several websites, so the account-wide Terms/Privacy URLs
(Settings -> Business) cannot name Cyprus Lifestyle. Leave them as they are. Cyprus Lifestyle does two things instead.

## A. Checkout (automatic, no setup)
Every Checkout Session created by this site shows, above the Pay button:
"By paying you agree to the Terms and acknowledge the Privacy Policy of Cyprus Lifestyle, operated by ADD Individual
Solutions Ltd (Cyprus)", linking to `<NEXT_PUBLIC_SITE_URL>/terms` and `/privacy`. Other websites are unaffected.
The text is English only (Stripe has no per-language custom text). No tick box: Stripe's "terms required" tick needs one
account-wide Terms URL.

## B. Own Customer Portal configuration for Cyprus Lifestyle (one-time, no terminal, no key to paste)
The site creates it for you with the Stripe key it already has on the server.
1. Sign in to `/admin` in your browser.
2. In the same browser open `https://cypruslifestyle.eu/api/admin/stripe-portal` - it only reports whether the
   configuration exists.
3. Open `https://cypruslifestyle.eu/api/admin/stripe-portal?create=1` - it creates the configuration (Terms and Privacy of
   this site, invoices, card update, cancel at period end) and shows `"id":"bpc_..."`. Opening it again never creates a
   second one; it shows the same id.
4. Vercel -> Settings -> Environment Variables: `STRIPE_PORTAL_CONFIGURATION_ID` = that id. Redeploy.
   (Test mode and live mode have different ids: do it once per mode that you use.)
5. Test: sign in as a member with a subscription -> Account -> Manage billing. The portal footer shows the
   Cyprus Lifestyle Terms and Privacy links.
Unset or invalid = the account's default portal, as before.

## Also (Dashboard, Settings -> Business -> Customer emails)
Switch off the failed-payment e-mails to customers (our site sends its own member e-mails).
