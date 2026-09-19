# BUILD FIX — commit the complete concierge stack

Your Vercel build failed with:
```
./app/api/concierge/chat/route.ts
Module not found: Can't resolve '@/lib/concierge/memory'
```
Cause: the chat route imports `lib/concierge/memory.ts`, but that file (from the
memory step) wasn't committed to the repo — the incremental zips got out of sync.
Nothing is wrong with the code; a file was simply missing from git.

**This bundle is the complete, self-consistent current concierge stack.** Commit
all of it together and the build compiles (verified here: "Compiled successfully").

## Commit these (app code → Vercel)
```
lib/concierge/brain.ts
lib/concierge/memory.ts            ← the missing file
app/api/concierge/chat/route.ts
app/api/concierge/memory/route.ts
app/api/whatsapp/route.ts
components/ConciergeChat.tsx
app/[locale]/(site)/layout.tsx
messages/en.json  messages/el.json  messages/ro.json  messages/ar.json
messages/de.json  messages/pl.json  messages/ru.json
```
Tip: after unzipping, `git add -A` so nothing is missed, and check
`git status` shows `lib/concierge/memory.ts` as added.

## Database (if not already run — safe to run again)
Paste in the Supabase SQL editor:
```
supabase/migrations/0047_concierge_whatsapp.sql
supabase/migrations/0048_concierge_memory.sql
```
(Both use `create table if not exists`, so re-running is harmless.)

## No env changes needed for the build.
(For streamed replies, `CLAUDE_API_KEY` in Vercel is still recommended — the
concierge falls back to the edge function without it.)

After committing, the build should pass. Then the concierge, memory drawer,
voice, and WhatsApp webhook are all live together.
