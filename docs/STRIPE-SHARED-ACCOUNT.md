# Stripe account shared by several businesses

The Stripe account (ADD Individual Solutions Ltd) serves several websites, so the account-wide Terms/Privacy URLs
(Settings -> Business) cannot name Cyprus Lifestyle. Leave them as they are. Cyprus Lifestyle does two things instead.

## A. Checkout (automatic, no setup)
Every Checkout Session created by this site shows, above the Pay button:
"By paying you agree to the Terms and acknowledge the Privacy Policy of Cyprus Lifestyle, operated by ADD Individual
Solutions Ltd (Cyprus)", linking to `<NEXT_PUBLIC_SITE_URL>/terms` and `/privacy`. Other websites are unaffected.
The text is English only (Stripe has no per-language custom text). No tick box: Stripe's "terms required" tick needs one
account-wide Terms URL.

## B. Own Customer Portal configuration for Cyprus Lifestyle (one-time, ~2 minutes)
1. In a terminal on your own computer (never paste the key in chat), create the configuration. Use a RESTRICTED key
   (Stripe -> Developers -> API keys -> Create restricted key -> permission "Customer portal: Write"), or your secret key:
```
curl https://api.stripe.com/v1/billing_portal/configurations \
  -u "YOUR_STRIPE_KEY:" \
  -d "business_profile[headline]=Cyprus Lifestyle membership" \
  -d "business_profile[privacy_policy_url]=https://cypruslifestyle.eu/privacy" \
  -d "business_profile[terms_of_service_url]=https://cypruslifestyle.eu/terms" \
  -d "features[invoice_history][enabled]=true" \
  -d "features[payment_method_update][enabled]=true" \
  -d "features[customer_update][enabled]=true" \
  -d "features[customer_update][allowed_updates][]=email" \
  -d "features[customer_update][allowed_updates][]=address" \
  -d "features[customer_update][allowed_updates][]=name" \
  -d "features[subscription_cancel][enabled]=true" \
  -d "features[subscription_cancel][mode]=at_period_end"
```
   Use the live key for live mode (and run it again with the test key if you test in test mode; ids differ per mode).
2. The answer contains `"id": "bpc_..."`. Copy that id.
3. Vercel -> Settings -> Environment Variables: `STRIPE_PORTAL_CONFIGURATION_ID` = that id. Redeploy.
4. Test: sign in as a member with a subscription -> Account -> Manage billing. The portal footer shows the
   Cyprus Lifestyle Terms and Privacy links.
Unset or invalid = the account's default portal, as before.

## Also (Dashboard, Settings -> Business -> Customer emails)
Switch off the failed-payment e-mails to customers (our site sends its own member e-mails).
