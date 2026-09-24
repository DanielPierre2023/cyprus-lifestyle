# Cyprus Lifestyle — Editorial Engine · Increment 2 (Public category repartition)

APPROVED public-site change: the nav and section pages move to the 9 merged
departments. Nothing is removed — every old URL still works.

Files (repo paths preserved — drag folders into GitHub as-is):

    components/Header.tsx                       ← masthead nav → 9 departments
    components/Footer.tsx                       ← footer "Sections" → 9 departments
    app/[locale]/(site)/[category]/page.tsx     ← section route resolves new + legacy keys
    app/sitemaps/[segment]/route.ts             ← sitemap includes new department URLs
    lib/queries.ts                              ← getByCategory aggregates a department's subcategories
    messages/en,el,ro,ar,de,pl,ru.json          ← nav + section labels for the 3 new departments, 7 languages

## Deploy — one step
Code only (GitHub → Vercel). NO database changes in this increment.

IMPORTANT: deploy Increment 1 FIRST (or together) — these files import
`lib/editorial/taxonomy.ts` from Increment 1.

## What changes for a reader
- The masthead now reads: Style · The Table · Escapes · Design & Living · Property ·
  Business · Culture · People · The Island — in all seven languages.
- New department pages exist: /style, /design-living, /the-island.
- Every existing URL still works: /table, /escapes, /culture, /business, /people,
  /property, and the legacy /cyprus, /relocation, /agenda, /world all still resolve
  and list their articles (a department page now also aggregates its subcategories).
- Look & feel is UNCHANGED — same Aegean Nocturne design, same components. Only the
  section names/structure changed.

## Not touched
Concierge (mic + voice intact), article page rendering, homepage, colours, fonts.

Verified locally: `tsc` clean · all 24 test suites pass.
