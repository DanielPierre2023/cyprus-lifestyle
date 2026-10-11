# Experiences catalogue — setup, editing & the partner programme

Cyprus Lifestyle has its **own catalogue of 566 bookable experiences** (boat trips,
diving, jeep safaris, Troodos & wine tours, culture, classes …):
`data/activities/cyprus-experiences.csv`. Every entry has **our** title, summary, kind,
tags, price level and map area, and links out to book with our booking partner
(GetYourGuide, partner id `YEP5D0C`, commission on every booking). It is used in:

1. **The map explorer** (`/map` and the `/directory` map) — 12 experience
   kinds as chips, a Filters group ("Activities & tours"), the Price filter (€ … €€€€),
   search suggestions; each experience is a pin + card with our summary and **Book on
   GetYourGuide** (partner link, disclosed).
2. **The concierge** (web chat, Ask box, WhatsApp, Telegram) — every message is matched
   (all 7 languages) against the catalogue; the best few ground the answer and appear
   as booking cards (links on WhatsApp/Telegram).

Nothing existing changes: one new table, read-only use, and if it is missing or empty the
map and the concierge behave exactly as before.

## What the catalogue contains — and what it doesn't

| Kept (facts) | Written by us | Not stored anywhere |
|---|---|---|
| what the trip is, where it goes, departure town, duration, what's included (pickup, meal, private, small group), price level, the booking link | title, summary, kind, tags, price band (€ < 30, €€ < 80, €€€ < 200, €€€€ ≥ 200 — per person or per group), map area from **our own gazetteer** (`lib/activities/places.ts`) | the platform's titles, descriptions, photos, star ratings, review counts, badges ("Likely to sell out"), supplier names, pickup-hotel lists, exact prices and discounts |

Cards show the experience's kind icon instead of a photo; exact price, availability and
the meeting point are always confirmed on the booking page.

The cleaning also **fixed the export's geography**: towns and landmarks are pinned from
our own gazetteer (the export put Lara Bay in Larnaca, "Limassol" at Cape Greco and some
Larnaca cruises at the airport), the two Blue Lagoons / sea caves / "Turtle Bays" (Akamas
vs Cape Greco) are told apart, wrong kinds were corrected (a buggy tour is not diving) and
impossible durations (a "20-day" jeep safari) dropped. 49 entries were corrected by hand —
see `OVERRIDES` in `scripts/activities/clean-export.ts`.

| | |
|---|---|
| Experiences in the catalogue | **566** (527 shown by default) |
| Visit northern sites (Varosha, Salamis, Kyrenia, Bellapais …) | 39 — hidden unless `ACTIVITIES_NORTH_TOURS=show` |
| Left out | 7 — 6 operators based in the occupied north / outside Cyprus, 1 adult-entertainment venue |
| Pinned at a landmark / at the departure town / no pin (island-wide) | 353 / 210 / 3 |

Kinds: boat trips 184 · culture 114 · food & wine 62 · safaris 58 · diving & snorkelling 49 ·
tours 33 · nature 24 · classes 19 · watersports 15 · adventure 4 · tickets 4.

## Go live — 4 steps

1. **Supabase → SQL Editor:** run `supabase/migrations/20261004120000_activities.sql`
   (the table; RLS: public read of active rows, admin all). If you had run the earlier
   draft of this migration, it also **drops** that draft's copied-content columns.
2. Run `supabase/migrations/20261004120100_activities_seed.sql` (566 rows, upsert — safe
   to re-run; it also removes the earlier draft's rows that are not in the catalogue).
3. **Vercel → Environment Variables** (optional): `GYG_PARTNER_ID` / `NEXT_PUBLIC_GYG_PARTNER_ID`
   (default `YEP5D0C`), and `ACTIVITIES_NORTH_TOURS=show` only if you decide to offer tours
   that visit the north (default: hidden, like the concierge's "never Northern Cyprus").
4. Redeploy. Check: `/api/map/index` contains ids starting with `a:`; `/map` shows the
   experience chips first; ask the concierge "boat trip to the Blue Lagoon" or "Tauchen in
   Protaras" — booking cards appear under the answer.

## Editing the catalogue

`data/activities/cyprus-experiences.csv` is the source of truth. Edit it (any spreadsheet
app), then regenerate the seed and run it in the SQL editor:

```bash
npx tsx scripts/activities/import-catalog.ts data/activities/cyprus-experiences.csv \
  supabase/migrations/20261004120100_activities_seed.sql
```

The importer validates every row first (kind, price band, a clean
`https://www.getyourguide.com/…-t<id>/` booking link that matches `gyg_id`, coordinates
inside the Republic, district) and stops with the line number of a bad row. The map and
the concierge pick changes up within 10 minutes.

- **Add an experience:** find it on GetYourGuide, copy its page link (without `?…`) into
  `booking_url` and the number after `-t` into `gyg_id`; write the title and summary
  yourself; pick `kind`, `tags`, `price_band`, `district`, `town`, `landmark`, `lat`/`lng`
  (a place from `lib/activities/places.ts` is easiest). Never paste their description,
  photos or ratings.
- **Promote a favourite:** set `priority` 1–3 (3 = top). It lifts the experience in the
  concierge and the map list, and a re-seed never resets a priority set in the database.
- **Hide one:** delete its row and re-seed, or set `status = 'hidden'` in the table.
- `scripts/activities/clean-export.ts` is the one-time converter that built this file
  from the export. Don't feed it new scraped exports (see below).

## How the pieces fit

```
data/activities/cyprus-experiences.csv ──► scripts/activities/import-catalog.ts ──► public.activities (Supabase)
  (built once by clean-export.ts with                                                 │
   lib/activities/curate.ts + places.ts)                                              ├─► lib/activities/data.ts (cached 10 min, graceful)
                                                                                      │     ├─► lib/map/explorer-data.ts ─► /api/map/index|details|search ─► MapExplorer
                                                                                      │     └─► lib/concierge/brain.ts ─► grounding + meta.activities
                                                                                      │             ├─► ConciergeChat / Concierge (ActivityCards)
                                                                                      │             └─► WhatsApp / Telegram (partner link)
                                                                                      └─► lib/activities/match.ts (multilingual ranking, pure)
```

- **Concierge rules** (system prompt): for "what to do", excursions, a landmark … it looks
  at the catalogue, recommends one to three **in its own words** with a reason (what, from
  where, how long, what's included, price level), says the live price and meeting point
  are confirmed on booking, and never invents prices, availability, ratings or inclusions.
- **Clicks** on booking cards are logged to `attribution_clicks` as `gyg:<id>` (label `book`).

## Earning — GetYourGuide Partner Programme (partner id `YEP5D0C`)

- **Every booking link** (map cards, concierge cards, WhatsApp/Telegram, widget fallbacks)
  carries `?partner_id=YEP5D0C&utm_medium=online_publisher&cmp=<campaign>`; GetYourGuide
  sets a **31-day** cookie, so bookings in that window are credited to you. Campaigns:
  `cl-map`, `cl-concierge`, `cl-map-widget` / `cl-widget`.
- **Disclosure:** every card and chat link is marked as a partner link ("we may earn a
  commission, at no extra cost to you"), `rel="sponsored"`. Also mention GetYourGuide
  (affiliate links / partner script) on your **privacy page**.
- **Partner script + widgets:** `components/GygWidget.tsx` — the analytics script loads only
  after cookie consent; `<GygWidget kind="city" location="paphos" locale={locale} />` shows
  GetYourGuide's own live inventory (official widget). `/map` shows a Cyprus-wide one.
  ⚠ The widget builder's sample used **location id 200 = Sydney** — the Cyprus ids are in
  `lib/gyg.ts` (Cyprus 169006, Paphos 426, Limassol 32399, Larnaca 1587, Nicosia 415,
  Ayia Napa 124743, Protaras 132513).
- **Security headers** (`next.config.mjs`) allow `widget.getyourguide.com` and
  `*.getyourguide.com` for the widget.

## Partner terms — how this setup is meant to fit them

Not legal advice. The partner terms forbid scraping or programmatically extracting
content from GetYourGuide's website, and copying, storing or editing GetYourGuide content
outside the official tools (deep links, widgets, the API). This setup therefore:

- stores **no** GetYourGuide content — only facts and our own wording, with deep links;
- shows GetYourGuide's own content only through the **official widget**;
- discloses the partner relationship on every link.

Keep it that way: grow the catalogue by hand, not from new scraped exports. Once the site
passes ~100k monthly visits you can apply for the **Partner API** (live data, used in real
time, not cached). If you want certainty, show your partner manager a sample entry and ask
them to confirm in writing.

## Public pages (increment 5.3)

Every active experience now has its own page, in all seven editions (`/activities`, `/de/activities/<slug>` …):

| Route | What |
|---|---|
| `/activities` | the index: filter chips (type, district, duration, price level), 24 per page |
| `/activities/browse/<filters>` | a filtered / paginated list. Filters live in the PATH, e.g. `kind-boat_district-paphos_dur-half_price-2_page-2` (fixed order, page 1 omitted) so every list is a cacheable ISR page. Only the unfiltered list and single-facet page 1 are indexable; combinations are `noindex,follow`. |
| `/activities/<slug>` | the detail page: our title and summary (English in every edition — owner rule), kind, place, duration, price level / basis, group size, a link to the map explorer, the partner booking link (`rel="sponsored nofollow noopener"`, partner id from `lib/activities/classify.ts affiliateUrl`), `TouristTrip` + breadcrumb JSON-LD (no ratings, prices or coordinates), self canonical + hreflang for all editions |

- **Honesty:** a pin is an *approximate area* ("Around the Blue Lagoon (Latchi) — approximate area" / "Departs from the Paphos area — approximate area"); every page says the real meeting point is confirmed on the booking page, and the price level is indicative.
- **North:** tours that visit northern sites (`visits_north`) have **no page, no sitemap entry, no concierge card** unless `ACTIVITIES_NORTH_TOURS=show` (same switch as the map). With it on, the page carries a plain note that the site is not under the control of the Republic's government.
- **Labels** come from the typed module `lib/activities/pageCopy.ts` (7 locales; **needs native review** for el ro ar de pl ru); `messages/*.json` is untouched.
- **Cache / revalidation:** ISR 3600 like the other pages; data reads are tagged `activities` and `activity:<slug>` (+ per-locale twins on the pages). Refresh after a catalogue edit with `POST /api/revalidate/tags {"kind":"activity","slug":"<slug>"}`, or point a Supabase DB webhook for table `activities` at it. Nothing is pre-rendered at build (`generateStaticParams` returns `[]`): a page renders on first visit, then is cached.
- **Sitemap:** child `/sitemaps/activities` (listed in `/sitemap.xml`): `/activities` + one URL per visible experience, with hreflang alternates.
- **Concierge:** the cards link to the experience page (internal); GetYourGuide stays as the secondary "Book" action. WhatsApp / Telegram send the page link first, then (for the first experience) the partner link.

### Concierge language memory (WhatsApp / Telegram)

`lib/concierge/localeMemory.ts`: the last *confidently* detected language is kept in the existing `locale` column of `concierge_wa_threads` / `concierge_tg_threads` (no migration). A short or ambiguous reply ("ja bitte") uses it; an unconfident message never overwrites it; memory older than 30 days is ignored; a brand-new Telegram chat falls back to the Telegram UI language, then English. Rows written before this change may hold an unconfident `en`; they heal on the next clearly identifiable message.

### Orphan vectors (nightly embed job)

`/api/concierge/embed-sources` now first deletes `concierge_embeddings` rows whose article / event / experience is no longer published / active (batches of 100, ≤ 2000 per run, 12 s budget, idempotent). The response reports it under `prune`. Guards: a source with no live rows is skipped, so is a run that would delete more than half of a source's vectors (`?prune=force` lifts that); `?prune=0` turns the step off; `?dry=1` only reports.
