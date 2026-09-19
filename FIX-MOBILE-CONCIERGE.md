# Fixes — mobile header + concierge reliability

Two live defects fixed and verified.

## 1) Mobile header malformation (the "US LIFESTYLE" clipping + horizontal scroll)
Cause: the utility strip (7 languages + Directory/Map/Membership/Subscribe) and
the large wordmark were wider than the phone viewport and didn't wrap, forcing a
horizontal page scroll and pushing the centred masthead off-screen.

Fix (`app/globals.css`):
- The utility strip now **wraps and centres** on ≤900px (languages on one row,
  the bordered links wrapping tidily) instead of overflowing.
- The wordmark **scales to fit** and wraps cleanly to two centred lines on very
  narrow phones; the monogram and tagline scale with it.
- Added a global `overflow-x: hidden` guard so nothing can force sideways scroll.

Verified with a real headless render: **no horizontal overflow at 500px or 360px**;
"CYPRUS LIFESTYLE" fits (one line at ~500px, a clean two-line stack at 360px).

## 2) Concierge replied "busy"
Cause: the streaming chat route calls Anthropic from the Next side using
`CLAUDE_API_KEY`. If that key isn't in the **Vercel** environment (it lives in
Supabase for the edge functions), streaming has nothing to call and the panel
shows the fallback "busy" message.

Fix (`lib/concierge/brain.ts`): the concierge is now **resilient**. If streaming
is unavailable (no key on the Next side, an error, or an empty stream), it
**falls back to the Supabase edge `concierge` function** — which holds its own
model key — and returns a grounded answer in one piece. So it always answers.
Also set the chat route `maxDuration` to 60s (safe on all Vercel plans).

### For the best experience (streaming, token-by-token, multi-turn)
Add **`CLAUDE_API_KEY`** to the **Vercel** project env (same value you use in
Supabase) and redeploy. With it, replies stream live; without it, the concierge
still answers via the fallback (just not streamed).

## Files
```
app/globals.css                       (mobile header + overflow guard)
lib/concierge/brain.ts                 (resilient streaming + edge fallback)
app/api/concierge/chat/route.ts        (maxDuration 60)
```

## Deploy
Commit & push. **No SQL, no edge-function change.** (Optionally add
`CLAUDE_API_KEY` to Vercel for streamed replies.)
