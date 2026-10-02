# Safety follow-ups — ad-order webhook + the last two hot-link surfaces

Three small, surgical fixes that finish off the Phase 0 / Own-the-Data safety work.
Commit these files → Vercel. **No SQL.**

These build on the three ZIPs from the previous batch (revenue, single-brain, own-the-data).
A few files here (`CoverImage.tsx`, `lib/seo.ts`, the advertise webhook) are the **complete
latest** versions — they already include the earlier changes, so just take the newest file.
`CHANGES.diff` shows only what's new vs those three ZIPs.

---

## 1 — Ad-order webhook now checks its reconciliation write
`app/api/advertise/webhook/route.ts` — the `checkout.session.completed` ad-order branch used
to ignore the error on the `ad_orders` "mark paid" write and return 200, so a real DB failure
there left a paid order stuck `pending` with no retry (the same bug class as the membership
one, which the revenue ZIP already fixed). Now that single write is checked **before** any
non-idempotent CRM/fulfilment/email side-effect runs: a genuine DB error answers **500** so
Stripe retries; a no-match (`PGRST116`) or malformed id (`22P02`) is acknowledged (no retry
storm on foreign events). The downstream side-effects stay best-effort (and now logged).

## 2 — Owned-image policy centralised + two remaining surfaces gated
- **`lib/images.ts` (new)** — the `isOwnedImage()` policy now lives in one shared module
  (previously inside `CoverImage.tsx`). `CoverImage` re-exports it, so nothing else breaks.
- **`lib/seo.ts`** — the OG social-card URL only carries a cover image when it's **ours**; a
  scraped third-party cover is dropped and the card renders text-only (branded). This stops the
  OG route from server-fetching a hot-linked image.
- **`components/DirectoryMap.tsx`** — map popups only embed an image when it's ours; a
  hot-linked one shows no image rather than loading a third party's file in the visitor's browser.

Together with the earlier `CoverImage` gate, **every** image surface — cards, hero, map pins,
map popups, and OG cards — now refuses to hot-link scraped third-party images.

---

## Verified
- `npx tsc --noEmit` → clean. `npm test` → all 32 suites pass.

## Smoke tests after deploy
- Open the directory map, click a pin whose listing has an external (scraped) image → popup
  shows name/link, **no** image. A pin with a Supabase-hosted image → image shows.
- Share/preview a listing whose cover is a scraped image → the OG card is the branded
  text-only card (no hot-linked photo); a listing with an owned cover → shows it.
- A Stripe `checkout.session.completed` for a real ad order still marks it paid and runs
  onboarding; if the DB write genuinely fails, Stripe's dashboard shows a 500 and retries
  (instead of a silent 200).
