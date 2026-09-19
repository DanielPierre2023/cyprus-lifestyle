# Cyprus Lifestyle — The Concierge on WhatsApp (v1)

The same grounded, multilingual concierge, now reachable on WhatsApp. It answers
in the guest's language, remembers the conversation per number, only recommends
real listings, and drops in the on-site link that helps them act.

## Files
```
app/api/whatsapp/route.ts                 (NEW — the webhook)
lib/concierge/brain.ts                     (added detectLocale + "reply in the guest's language" mode)
supabase/migrations/0047_concierge_whatsapp.sql   (NEW — per-user conversation memory)
```

## Deploy — 3 steps

### 1) Database (paste in Supabase → SQL Editor)
Run `supabase/migrations/0047_concierge_whatsapp.sql` (creates `concierge_wa_threads`).

### 2) App code
Commit & push `app/api/whatsapp/route.ts` and `lib/concierge/brain.ts`. Vercel builds it.

### 3) Meta / WhatsApp setup (the part only you can do)
In **Meta for Developers** (developers.facebook.com):
1. Create/select a **Business app**, add the **WhatsApp** product, connect a
   **WhatsApp Business phone number**. Note the **Phone number ID**.
2. Create a **permanent access token** (System User token with `whatsapp_business_messaging`).
3. Choose any secret string as your **Verify Token** (e.g. a long random string).
4. Add these to **Vercel → Project → Settings → Environment Variables** (Production), then redeploy:
   ```
   WHATSAPP_TOKEN=<permanent access token>
   WHATSAPP_PHONE_NUMBER_ID=<phone number id>
   WHATSAPP_VERIFY_TOKEN=<the secret string you chose>
   ```
   (`CLAUDE_API_KEY` is already used by the site; the webhook reuses it. Optional:
   `WHATSAPP_API_VERSION`, default `v21.0`, and `NEXT_PUBLIC_SITE_URL` for link building.)
5. In the WhatsApp product → **Configuration → Webhook**, set:
   - **Callback URL:** `https://<your-site>/api/whatsapp`  (e.g. `https://cyprus-lifestyle.vercel.app/api/whatsapp`)
   - **Verify token:** the same `WHATSAPP_VERIFY_TOKEN`
   - Click **Verify and save** (Meta calls the GET route — it must return the challenge).
6. **Subscribe** the webhook to the **`messages`** field.

That's it. Message your WhatsApp Business number and the concierge replies.

## How it behaves
- **Grounded:** same brain as the web concierge — only names real published
  listings, uses the priced knowledge base, never invents. Adds one relevant
  on-site link (a guide or a listing) so the guest can go deeper / connect.
- **Multilingual:** detects the guest's language (incl. Greek, Russian, Arabic
  scripts) and replies in it; for Latin scripts it replies in whatever language
  the guest wrote.
- **Memory:** last ~12 turns per number, in `concierge_wa_threads`.
- **Reliable:** acks Meta instantly and processes after (no retry storms); dedupes
  repeated webhook deliveries by message id; always inside WhatsApp's 24-hour
  reply window because it only answers inbound messages (no template needed).

## Notes / next
- Non-text messages get a short "text me what you're after" nudge (v1).
- v2 options: voice notes (speech-to-text in, TTS out), proactive messages
  (needs approved message templates), and richer WhatsApp interactive buttons.
- WhatsApp free-form replies are only allowed within 24h of the user's last
  message — fine here since we always reply to an inbound message.
