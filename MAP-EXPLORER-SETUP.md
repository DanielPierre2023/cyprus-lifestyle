# Map explorer — setup, rollout & rollback

The new list-and-map explorer (`components/MapExplorer.tsx`, in the site's own Aegean /
gold / Jost design) shows the **whole
directory** — every geocoded business in status `published` **and** `listed`
(≈3k + ≈14.7k), occupied north excluded — in all **89 canonical categories**, plus
upcoming Agenda events and the live-webcam layer.

Bookable **experiences** from our own catalogue (booked through the GetYourGuide partner
programme) appear on the map too once their table is loaded — see
[ACTIVITIES-SETUP.md](ACTIVITIES-SETUP.md).

Nothing existing is removed or changed in behaviour:

| Existing piece | Status |
|---|---|
| `components/LiveMap.tsx` (old `/map`) | untouched — still used when `MAP_EXPLORER=off` |
| `components/BusinessMap.tsx` (`/directory` map) | untouched — still used unless `MAP_EXPLORER=all` |
| `/api/directory/businesses`, `lib/directory/map-data.ts`, `getMapItems()` | untouched |
| Database | **no migration** — read-only use of existing columns |
| `lib/directory/taxonomy.ts`, `lib/directory/map-meta.ts` | reused as the single source of categories, icons and labels |

## One switch

Set in Vercel → Project → Settings → Environment Variables, then redeploy:

| `MAP_EXPLORER` | `/map` | `/directory` map section |
|---|---|---|
| `off` | old LiveMap | old BusinessMap |
| `map` *(default when unset)* | **new explorer** | old BusinessMap |
| `all` | **new explorer** | **new explorer** (embedded) |

Rollback = set `MAP_EXPLORER=off` (or `map`) and redeploy. No code revert.

## What was added

```
components/MapExplorer.tsx + .css   the explorer (client)
lib/map/explorer-taxonomy.ts        89 categories → 17 groups, translated group names (7 locales)
lib/map/explorer-index.ts           compact index format, ranking, privacy rules (pure, unit-tested)
lib/map/explorer-data.ts            Supabase reads (server-only)
lib/map/explorer-i18n.ts            UI copy in 7 locales
lib/map/flags.ts                    MAP_EXPLORER switch
app/api/map/index/route.ts          GET  compact index (all points)          CDN 10 min
app/api/map/details/route.ts        GET  card details for ≤60 ids            CDN 10 min
app/api/map/search/route.ts         GET  business/event name suggestions     rate-limited
app/api/map/geocode/route.ts        GET  address → point (lib/geo.ts)        rate-limited, cached
scripts/tests/map-explorer.test.ts  69 assertions
```

## How the data flows

1. The page renders the chips and filter counts on the server (`getExplorerCounts`).
2. The browser loads **`/api/map/index`** once — every point with coordinates,
   category, district, sub-type, price band, rating, paid tier and flags. No names,
   no contact data. ≈1.1 MB raw / **≈250 KB gzipped** for 17.7k places, one CDN
   object shared by all seven languages.
3. Filtering, counting, clustering and ranking run in the browser (instant).
4. Only the cards and popup on screen fetch **`/api/map/details`** (names, photo,
   address, website; phone for **published** listings only; never email).

**Ranking** (list order and which pin wins when pins overlap): paid tier
`commercial_rank` (Partner > Featured > Listed — the "map priority" the Listed
tier sells) → `featured` → rating × review volume → has photo → has profile.

**Links:** published listings open `/directory/<type>/<slug>` (locale-prefixed);
`listed` businesses have no profile page, so their card focuses the map and the
popup offers Call / Website / Directions — exactly like the old directory map.

## After deploying — 5-minute check

1. `https://<domain>/api/map/index` → JSON with `"n"` ≈ your published + listed geocoded count.
2. `https://<domain>/map` → district bubbles; zoom in → icon pins with ratings.
3. Type a category ("dentist") → suggestion with count → pins on the map, URL `?cat=dentist`.
4. Open **Filters** → all 89 categories in 17 groups with counts.
5. Click a `listed` business → popup with Website / Directions, no phone.
6. Optional: set `MAP_EXPLORER=all` and check `/directory`.

## Optional follow-ups (not done — your call)

- **Locate me:** `next.config.mjs` sets `Permissions-Policy: geolocation=()`, so the
  button stays hidden. Change to `geolocation=(self)` to enable it.
- **Navigation:** `/map` is not linked from the header/footer or the sitemap.
- **Clean-up:** once happy (2–4 weeks on `all`), `LiveMap.tsx`, `BusinessMap.tsx`
  and `/api/directory/businesses` can be deleted in a separate commit.
