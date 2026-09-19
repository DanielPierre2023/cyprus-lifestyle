# The "Concierge is busy" fix — found it

**Root cause:** the code was asking Anthropic for a model called
`claude-sonnet-4-6`. That model **does not exist** — Anthropic's current Sonnet is
`claude-sonnet-5`. So every concierge request was rejected, and the chat showed
its catch-all "busy" message. It was never your API key (that's been correct all
along) and never a rate limit.

Interestingly your **Supabase edge functions already used the correct
`claude-sonnet-5`** — only the Next.js side (`lib/ai.ts`) had the wrong one, and
that's the path the live chat uses. One line.

---

## Two ways to fix it — pick one

### Option A — fastest, no deploy of code (30 seconds)
In Vercel → Settings → Environment Variables, add:

```
SONNET_MODEL = claude-sonnet-5
```

Redeploy. That variable overrides the wrong default everywhere it's used
(the code already reads `SONNET_MODEL` first). The concierge answers immediately.

### Option B — the permanent fix (deploy this bundle)
This bundle sets the correct model in the code, so you don't need the env var at
all. Deploy it and it's fixed for good. (If you also did Option A, that's fine —
they agree.)

Either way you're done. Option A gets you live in the next 30 seconds; Option B
makes it permanent.

---

## Confirm it — the new self-test

After the fix + redeploy, open this in your browser (uses your ENRICH_SECRET):

```
https://cyprus-lifestyle.vercel.app/api/concierge/selftest?key=enrich-live-3f9c7a2b
```

It calls Claude and OpenAI for real and shows the actual result:

- Working → `{ "ok": true, "claude": { "ok": true, "model": "claude-sonnet-5", "sample": "ok" }, "openai": { "ok": true, "dims": 1536 } }`
- Broken → it prints the **real** error (e.g. "model: … not found", or an auth
  error), so you never have to guess from "busy" again.

Then open the chat on the site — it should answer. If it still says "busy",
you're seeing a cached page: redeploy and hard-refresh (Ctrl/Cmd-Shift-R).

---

## Your Stripe question — yes, Vercel is correct

`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` go in **Vercel**, not Supabase.
The checkout and webhook run in your Next.js app on Vercel, so that's where they
belong. Your Supabase "custom secrets" (CLAUDE_API_KEY, OPENAI_API_KEY, etc.) are
for the edge functions — leave those as they are. It's fine that some keys live in
both places; each runtime reads its own.

---

## Also included in this bundle (from the earlier fix round)

So one deploy gets everything:

```
lib/ai.ts                                   ← THE fix (claude-sonnet-5)
app/api/concierge/selftest/route.ts         ← NEW live provider check
components/ConciergeChat.tsx                 ← chat sits above the map (mobile bug)
components/DirectoryMap.tsx / LiveMap.tsx    ← map keeps its layers to itself
app/api/health/route.ts                      ← /api/health readiness checklist
app/api/concierge/embed/route.ts            ← clearer auth error
app/api/concierge/embed-directory/route.ts  ← clearer auth error
```

Verified: `npx tsc --noEmit` clean; `npx next build` compiles (only the known
`/cyprus` prerender stops the sandbox build — it builds fine on Vercel).
