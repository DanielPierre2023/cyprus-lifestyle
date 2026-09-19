# Concierge — Members' Tier (and the complete v2 stack)

This bundle completes the **fifth and final v2 feature** of the AI concierge:
the paid **Members' tier**. It also contains the *entire* concierge stack in one
self-consistent set of files, so unzipping it over your repo and committing gives
a build with no missing modules.

```
v2 feature            status
─────────────────────────────
Cross-session memory   ✓ done
Voice (speak/listen)   ✓ done
Hybrid vector search    ✓ done
Proactive concierge     ✓ done
Members' tier           ✓ done  ← this bundle
```

---

## 1. What the members' tier does

A **member** is a guest who subscribes (Stripe, €19/mo by default). For them the
concierge quietly upgrades: it is more thorough, more anticipatory, and offers a
warm hand-off to a human concierge for anything bespoke. Everyone else keeps the
full free concierge — nothing is taken away.

The flow, end to end:

1. On `/membership` the new dark-gold **Concierge** card shows the price and a
   *Become a member* button (`components/MembershipCheckout.tsx`).
2. The button calls `POST /api/membership/checkout`, which opens a **Stripe
   Checkout** subscription (inline price — no product to create in the dashboard)
   and redirects the guest. **Card details never touch our servers.**
3. After payment Stripe calls the **existing** webhook
   `POST /api/advertise/webhook`. A new branch (`metadata.kind === 'membership'`)
   upserts a row into `concierge_members` with `status='active'`.
4. The browser is recognised by its anonymous `cid` (the same id the concierge
   uses for memory). On the next chat turn `app/api/concierge/chat/route.ts`
   checks `isMemberCid(cid)` and, if true, adds `MEMBER_BLOCK` to the system
   prompt and shows the ✦ **Member** badge in the chat header.
5. A member on **another device** taps *Already a member?*, enters their email,
   and `POST /api/membership/status` links their `cid` to the existing row.
6. Cancellations / failed payments flip the row to `canceled` / `failed`
   (handled by `customer.subscription.deleted` and `invoice.payment_failed` in
   the same webhook), so entitlement lapses automatically.

Everything is **best-effort**: if Stripe or Supabase is unconfigured, the button
shows a graceful "not available" message and the concierge serves the free tier.

---

## 2. Setup — three steps

### a) Run the migration

In the Supabase SQL editor, run (in order, if you haven't already):

```
supabase/migrations/0047_concierge_whatsapp.sql
supabase/migrations/0048_concierge_memory.sql
supabase/migrations/0049_concierge_kb_vectors.sql
supabase/migrations/0050_concierge_members.sql   ← new: the members' tier
```

`0050` creates `public.concierge_members` (RLS on, **service-role only** — no
public policies) with a unique index on `stripe_subscription_id` that the
webhook upsert relies on.

### b) Environment variables (Vercel)

The members' tier **reuses your existing Stripe wiring** — there is **no new
Stripe product and no new webhook endpoint** to register.

| Variable | Needed for | Default / note |
|---|---|---|
| `STRIPE_SECRET_KEY` | Checkout + webhook | already set for ad sales |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature | already set — **same endpoint** |
| `MEMBERSHIP_PRICE_EUR` | Price shown & charged | `19` if unset |
| `MEMBERSHIP_INTERVAL` | Billing period | `month` (or `year`) |
| `NEXT_PUBLIC_SITE_URL` | Checkout return URLs | falls back to request origin |

If `STRIPE_SECRET_KEY` is missing the checkout route returns `not_configured`
and the card degrades gracefully.

### c) Deploy

`git add -A && git commit && push`. That's it — the same
`/api/advertise/webhook` endpoint you already registered in Stripe now handles
both ad orders **and** memberships (they're told apart by `metadata.kind`).

---

## 3. Rest of the concierge stack (reference)

These were shipped in the earlier v2 bundles and are included here again so the
set is complete. Their env vars, all optional with graceful fallback:

| Variable | Feature | Fallback if absent |
|---|---|---|
| `CLAUDE_API_KEY` | Streaming replies | falls back to the Supabase **edge** concierge (which holds its own key) |
| `OPENAI_API_KEY` | Hybrid vector recall | falls back to keyword retrieval |
| `SONNET_MODEL`, `CLAUDE_HAIKU` | Model overrides | sensible defaults in code |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | WhatsApp channel | route simply stays idle |

**To backfill vector embeddings** (feeds hybrid search) after deploy, call once:
`POST /api/concierge/embed` with header `x-embed-key: <SUPABASE_SERVICE_ROLE_KEY>`.

---

## 4. Files in this bundle

```
lib/concierge/         brain.ts  embed.ts  memory.ts  membership.ts
lib/knowledge/         qa.ts  qa.i18n.ts  markets.ts  markets.i18n.ts
app/api/concierge/     chat/  embed/  memory/  proactive/  request/  route.ts
app/api/membership/    checkout/route.ts  status/route.ts
app/api/whatsapp/      route.ts
app/api/advertise/     webhook/route.ts            (membership branch added)
components/            ConciergeChat.tsx  MembershipCheckout.tsx  Footer.tsx
app/[locale]/(site)/   layout.tsx  membership/page.tsx  guide/*  for/*
app/sitemap.ts
supabase/migrations/   0047 … 0050
messages/              en el ro ar de pl ru  (.json — all 7 locales)
```

Verified before packaging: `npx tsc --noEmit` → clean; `npx next build` →
*Compiled successfully* (the only stop is the pre-existing `/cyprus` prerender,
which needs Supabase env and builds fine on Vercel).
