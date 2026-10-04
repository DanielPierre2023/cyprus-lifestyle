# Map explorer — setup, rollout & rollback

The new list-and-map explorer (`components/MapExplorer.tsx`, in the site's own Aegean /
gold / Jost design) shows the **whole
directory** — every geocoded business in status `published` **and** `listed`
(≈3k + ≈14.7k), occupied north excluded — in all **89 canonical categories**, plus
every published Agenda event that is upcoming **or still running** (with or without
coordinates — see "Events" below) and the live-webcam layer.

Bookable **experiences** from our own catalogue (booked through the GetYourGuide partner
programme) appear on the map too once their table is loaded — see
[ACTIVITIES-SETUP.md](ACTIVITIES-SETUP.md).

Nothing existing is removed or changed in behaviour:

| Existing piece | Status |
|---|---|
| `components/LiveMap.tsx` (old `/map`) | untouched — still used when `MAP_EXPLORER=off` |
| `components/BusinessMap.tsx` (old `/directory` map) | untouched — still used when `MAP_EXPLORER=map` or `off` |
| `/api/directory/businesses`, `lib/directory/map-data.ts`, `getMapItems()` | untouched |
| Database | **no migration** — read-only use of existing columns (the admin "Complete listings" tool writes only empty contact fields, on request) |
| `lib/directory/taxonomy.ts`, `lib/directory/map-meta.ts` | reused as the single source of categories, icons and labels |

## One switch

Set in Vercel → Project → Settings → Environment Variables, then redeploy:

| `MAP_EXPLORER` | `/map` | `/directory` map section |
|---|---|---|
| `all` *(default when unset)* | **new explorer** | **new explorer** (replaces the old Business map) |
| `map` | **new explorer** | old BusinessMap |
| `off` | old LiveMap | old BusinessMap |

Rollback = set `MAP_EXPLORER=map` (keep the new `/map` only) or `off`, and redeploy. No code revert.

## What was added

```
components/MapExplorer.tsx + .css   the explorer (client)
lib/map/explorer-taxonomy.ts        89 categories → 17 groups, translated group names (7 locales)
lib/map/explorer-index.ts           compact index format, ranking, privacy rules (pure, unit-tested)
lib/map/explorer-data.ts            Supabase reads with column fallbacks + build stats (server-only)
lib/map/hours.ts                    "Open now" from opening hours, Cyprus time (pure, unit-tested)
lib/map/explorer-i18n.ts            UI copy in 7 locales
lib/map/flags.ts                    MAP_EXPLORER switch
app/api/map/index/route.ts          GET  compact index (all points)          CDN 10 min
app/api/map/details/route.ts        GET  popup details for ≤60 ids           CDN 10 min
app/api/map/search/route.ts         GET  business/event name suggestions     rate-limited
app/api/map/geocode/route.ts        GET  address → point (lib/geo.ts)        rate-limited, cached
app/api/map/health/route.ts         GET  what the map is built from + errors  no cache
scripts/tests/map-explorer.test.ts  117 assertions · hours.test.ts 20
```

## How the data flows

1. The page renders the tabs and filter counts on the server (`getExplorerCounts`).
2. The browser loads **`/api/map/index`** once — every point with coordinates,
   category, district, sub-type, price band, rating, paid tier and flags. No names,
   no contact data. ≈1.1 MB raw / **≈250 KB gzipped** for 17.7k places, one CDN
   object shared by all seven languages.
3. Filtering, counting, clustering and ranking run in the browser (instant).
4. Only the cards and popup on screen fetch **`/api/map/details`**: name, photos,
   rating, address, opening hours ("open now"), phone, email, website, social links,
   amenities, description — whatever the listing has. Imported (`listed`) businesses get
   an "Is this your business? Claim, update or remove it" link (→ `/partner?listing=<slug>`).
5. If a column is missing in the database the listing query falls back to fewer columns
   instead of returning nothing; **`/api/map/health`** shows the counts and any errors.

**Tabs and Filters.** Tabs are single-choice: **All · Agenda · Experiences** · then every
category by size; tapping a tab shows only that category, tapping it again → All.
**Filters** combine as many categories as you like (17 groups with group tick-boxes, the 12
experience kinds, Agenda with quick dates or a From–To range, start time), plus places,
interests, price, features and star rating; a combination shows as a "N categories ×" tab.
Big selections start as district bubbles; small ones (< 300) show pins straight away.

**Ratings** look like GetYourGuide's: ★★★★★ **4.7** (1,234) — from the listing's rating /
rating_count (Google Places enrichment), else from our own approved guest reviews.
Experiences never show third-party ratings (partner terms).

**Events.** Every published event whose start OR end is today or later. One without
coordinates is placed at its venue (when the venue name is a directory business), else at
the town / landmark named in the venue or title, else at its district centre — drawn as a
**dashed** pin with "Approximate area". Several events at one spot fan out slightly.

**Ranking** (list order and which pin wins when pins overlap): paid tier
`commercial_rank` (Partner > Featured > Listed — the "map priority" the Listed
tier sells) → `featured` → rating × review volume → has photo → has profile.

**Links:** published listings open `/directory/<type>/<slug>` (locale-prefixed);
`listed` businesses have no profile page, so their card focuses the map and the
popup offers Call / Website / Directions — exactly like the old directory map.

## After deploying — 5-minute check

1. `https://<domain>/api/map/health` → `"ok": true`, `listings.onMap` ≈ 17.7k, `events.total` = your Agenda
   (exact + approx), `errors: []`. If `onMap` is 0, `errors` says which column/table is missing.
2. `https://<domain>/map` → district bubbles; zoom in → icon pins with ratings.
3. Tap the **Agenda** tab → only events (running ones first, "On now"); tap it again → All.
4. **Filters** → tick Restaurant + Café + Agenda → "3 categories ×" tab.
5. Click a business → popup with photo, ★ rating (count), hours, phone, email, website, socials.
6. `https://<domain>/directory` → the same explorer replaces the old "Business map" section.
7. Missing photos / contacts → **Admin → Complete listings** (see [COMPLETE-LISTINGS.md](COMPLETE-LISTINGS.md)).

## Optional follow-ups (not done — your call)

- **Locate me:** `next.config.mjs` sets `Permissions-Policy: geolocation=()`, so the
  button stays hidden. Change to `geolocation=(self)` to enable it.
- **Navigation:** `/map` is not linked from the header/footer or the sitemap.
- **Clean-up:** once happy (2–4 weeks on `all`), `LiveMap.tsx`, `BusinessMap.tsx`
  and `/api/directory/businesses` can be deleted in a separate commit.
