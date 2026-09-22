# Cyprus Lifestyle — Editorial Backlog (item 16)

The prioritized, evidence-based worklist for the bulk multilingual content sprint.
Every article ships in **all seven languages** (EN · EL · RO · AR · DE · PL · RU) —
no English fallback — because a null `content_{locale}` falls back to English in
`getArticle()`, and the whole point of a seven-edition product is that it doesn't.

## How this list was prioritised (the evidence)

Three signals, combined:

1. **Proven concierge intents (item 02).** The knowledge base has 78 curated Q&A topics — every one is a question guests actually ask the concierge. An article on that topic directly deepens a proven demand and gives the concierge a richer page to point to. Topic ids are cited per row.
2. **Coverage gaps (item 04).** The directory-coverage views show which verticals are thin; editorial fills the gap while listings catch up.
3. **Monetisation.** Verticals with advertisers (property, legal/tax, health, mobility, relocation) earn their keep — an article on "buying property" sits next to the estate-agent and lawyer listings it sends readers to. Per-listing revenue (item 17) makes that link measurable.

Priority tiers: **P0** = high demand × monetisable × fact-stable (do first); **P1** = high demand, either less monetisable or needs more research; **P2** = long-tail SEO and seasonal.

## P0 — flagship evergreen (do first)

| # | Working title | Category | KB topic(s) | Why | Facts to verify + cite |
| --- | --- | --- | --- | --- | --- |
| 1 | Buying property in Cyprus as a foreigner | property | `buy-property`, `property` | Highest-value + monetisable (estate agents, lawyers) | Non-EU permit + area limit, VAT 5%/19%, transfer fees, stamp-duty status, title deeds — **✅ shipped, batch 1** |
| 2 | The best time to visit Cyprus | travel | `when-to-visit`, `sea`, `plan` | Broad top-of-funnel demand; low fact-risk | Seasonal temps, sea temps, crowds/prices — **✅ shipped, batch 1** |
| 3 | Cyprus tax residency: the 60-day rule & non-dom | business | `non-dom`, `get-residency` | HNW relocation; monetisable (tax/legal/accounting) | 60-day rule, non-dom SDC exemption + 17-year limit, 2026 dividend SDC 5% — **✅ shipped, batch 2** |
| 4 | Moving to Cyprus: a relocation checklist | living | `get-residency`, `cost-of-living`, `schools`, `healthcare` | Core relocation intent; links many verticals | EU yellow slip / non-EU permits, GESY, banking, licences — **✅ shipped, batch 2** |
| 5 | Setting up a company in Cyprus | business | `form-company`, `business-banking`, `expand-business` | Monetisable (corporate services, banks) | 15% corp tax (from 2026), IP box, formation steps, substance — **✅ shipped, batch 2** |

## P1 — high demand, next

| # | Working title | Category | KB topic(s) | Notes |
| --- | --- | --- | --- | --- |
| 6 | Cost of living in Cyprus (2026) | living | `cost-of-living`, `daily-budget` | Refresh yearly; strong SEO — **✅ shipped, batch 3** |
| 7 | Renting a home in Cyprus | living | `renting` | Pairs with buy-property — **✅ shipped, batch 3** |
| 8 | Healthcare in Cyprus: GHS & private | living | `healthcare`, `health`, `english-doctor` | Monetisable (clinics) — **✅ shipped, batch 3** |
| 9 | Schools & education for expat families | living | `schools`, `childcare-eldercare` | Family relocation |
| 10 | Getting around Cyprus: airports, driving, taxis | travel | `getting-around`, `airport-transfer` | Monetisable (car hire, transfers) |
| 11 | The best beaches in Cyprus | travel | `best-beaches`, `family-beaches` | Seasonal hero; directory tie-in |
| 12 | A food lover's guide to Cyprus (meze & wine) | food | `what-is-meze`, `taste-wine`, `wine-halloumi-day` | Restaurant/winery listings |
| 13 | Buying a car / driving licence & MOT | living | `car-mot`, `import-pet-car` | Practical relocation |
| 14 | Banking in Cyprus for residents & non-residents | business | `banking`, `business-banking` | Monetisable |

## P2 — long-tail & seasonal (batch as capacity allows)

Troodos hiking & painted churches (`hiking-troodos`, `painted-churches`); wineries & the wine villages (`villages`, `taste-wine`); watersports & prices (`watersports-prices`, `scuba-diving`, `boat-trips`); golf in Cyprus (`golf`); renovating a village stone house (`renovate-village-house`, `stay-stone-house`); solar & energy (`solar-panels`); pets — importing & vets (`import-pet-car`); day trips & villages (`villages-day-trip`, `which-town`); festivals & the cultural calendar (`festivals`); where to shop (`where-to-shop`, `authentic-gifts`).

## Production standard (every article)

- **All 7 languages**, proper localisation (not machine-literal); identical facts/numbers across languages.
- **Web-researched + cited** — figures attributed; regulatory/financial claims carry an "as of 2026, confirm with a professional" caveat, in keeping with the house grounding rules.
- Republic of Cyprus (**south only**); never Northern Cyprus.
- Full metadata per language: `title`, `excerpt`, `summary`, `seo_title`, `seo_description`, `tags`; `reading_time_min`, `word_count`, `category`, `author_name`, `published_at`.
- Seeded by an **idempotent migration** (UPSERT on `slug`), so re-running never duplicates and edits re-apply — verified on the migration gate.

## Shipped

- **Batch 1** — `0100_seed_articles.sql`: #1 (buying property) and #2 (best time to visit).
- **Batch 2** — `0101_seed_articles_batch2.sql`: #3 (tax residency & non-dom), #4 (relocation checklist), #5 (company formation), with the 2026 reform figures (15% corporate tax, 5% dividend SDC).

- **Batch 3** — `0102_seed_articles_batch3.sql`: #6 (cost of living), #7 (renting), #8 (healthcare / GESY), with 2026 figures (GESY 2.65% contribution, €6 specialist co-pay; rents by city; monthly budgets).

All in all seven languages, generated from `scripts/seed/articles.data.mjs` (each article tagged with a `batch`, written to its own migration so an applied batch is never rewritten). P0 complete; P1 underway. Remaining P1: #9 schools, #10 getting around, #11 beaches, #12 food, #13 driving, #14 banking.
