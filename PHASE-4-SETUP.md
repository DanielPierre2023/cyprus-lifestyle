# Cyprus Lifestyle — The Concierge, v1 (web)

The exquisite web concierge from the blueprint (The Concierge Standard). A
discreet **Concierge Bell** on every page unfolds into an editorial chat panel
with **streaming** replies, **grounded** on our knowledge base + directory (it
never invents a place or a price), in all **7 languages incl. RTL**, with real
**place cards**, **guide links**, **lead-routing** to businesses, and a **human
handoff**. Multi-turn.

## How it works (one shared "brain", reused later by WhatsApp)
- `lib/concierge/brain.ts` — the concierge persona + strict grounding, directory
  retrieval, knowledge-base retrieval, and both a **streaming** path (web) and a
  **non-streaming** path (for WhatsApp next). It can only name real published
  listings and uses KB prices; otherwise it says so and offers to connect you.
- `app/api/concierge/chat/route.ts` — a **streaming** (SSE) Node route. The model
  key stays server-side. Rate-limited.
- `components/ConciergeChat.tsx` — the bespoke luxury UI (the Bell → panel,
  streaming caret, starters, place cards with a verified seal, guide chips,
  "Arrange this" lead-routing, "Speak to a person" handoff). RTL-aware.
- Mounted site-wide in `app/[locale]/(site)/layout.tsx`.
- `messages/{7}.json` — new `concierge.chat` strings in all 7 languages (the rest
  reuse existing concierge keys).

## Files
```
lib/concierge/brain.ts                 (NEW)
app/api/concierge/chat/route.ts        (NEW)
components/ConciergeChat.tsx            (NEW)
app/[locale]/(site)/layout.tsx         (mounts the Bell)
messages/{en,el,ro,ar,de,pl,ru}.json   (concierge.chat namespace)
```

## Deploy — 1 place
**Commit & push the app code.** Vercel builds it. **No SQL, no edge-function change.**

**Env:** the chat route calls Anthropic from the Next side using **`CLAUDE_API_KEY`**
— the same key that already powers the editorial AI on the site, so it should
already be in your Vercel project. (Optional: `SONNET_MODEL` to pin the model;
it defaults to the site's Sonnet.) If the concierge ever replies "busy", add
`CLAUDE_API_KEY` to the Vercel environment (same value you use in Supabase).

## Try it after deploy
Click the gold **Concierge Bell** (bottom corner) on any page:
- "Plan a relaxed weekend in Paphos for two"
- "Who can clean my pool, and how much?"
- "A romantic dinner by the sea in Limassol"
- Switch to `/ru`, `/de`, `/ar` — it answers natively, RTL for Arabic.

It streams the reply, shows real listings as cards, links to the matching guides,
and offers to arrange it or connect you to a person.

## Next — WhatsApp channel (the rest of v1)
The brain is built to be shared. WhatsApp needs a **Meta WhatsApp Business API**
setup on your side first:
1. A Meta Business account + a WhatsApp Business number.
2. In Meta for Developers: a WhatsApp app → get the **Phone Number ID**, a
   permanent **Access Token**, and choose a **Verify Token** (any secret string).
3. You'll add these to Vercel env: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
   `WHATSAPP_VERIFY_TOKEN`.
Once you've started that, I'll ship the webhook (`/api/whatsapp`) that runs this
same concierge and replies on WhatsApp — and give you the exact webhook URL to
paste into Meta.

## Roadmap (from the blueprint)
Shipped: v1 web concierge. Next: WhatsApp (v1). Then v2 — voice, hybrid vector
search, cross-session memory, proactive concierge, members' tier.
