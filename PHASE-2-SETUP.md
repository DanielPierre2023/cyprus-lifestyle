# Cyprus Lifestyle — Practical Guide Pages (Phase 2)

Turns the knowledge base into **real pages**: one practical guide per question,
generated from `qa.ts`, **fully translated into all 7 languages** so nothing is
ever mixed-language. This is the "advice on our page, linking out, with the
people to make it happen" layer — built for SEO (each page targets a real search)
and for the connector (every page routes to businesses).

## What's new
- **`/guide`** — the index: all 11 domains, each with its questions (localized).
- **`/guide/{slug}`** — 67 guide pages (× 7 languages = ~469 pages), each with:
  the question as the H1, the priced practical answer, **On Cyprus Lifestyle**
  links to the right section of our site (localized), a **connector CTA** to the
  concierge, **related questions**, **more in this topic**, and **FAQ + breadcrumb
  schema** (rich results in Google).
- **The concierge now links to these guide pages** — its "On Cyprus Lifestyle"
  links point to `/guide/{slug}` with the label in the visitor's language.
- **Footer + /ask** now surface Guides for discovery and internal linking.
- **Sitemap** includes `/guide` and every guide page (static, no DB).

## Files
```
lib/knowledge/qa.ts                      (added guideHref)
lib/knowledge/qa.i18n.ts                 (NEW — el/ro/ar/de/pl/ru translations of the KB)
app/[locale]/(site)/guide/page.tsx       (NEW — index)
app/[locale]/(site)/guide/[slug]/page.tsx(NEW — per-question guide)
app/api/concierge/route.ts               (concierge links to guide pages, localized)
app/[locale]/(site)/ask/page.tsx         (Guides link)
app/sitemap.ts                           (guide URLs)
components/Footer.tsx                     (Guides + Ask links)
messages/{en,el,ro,ar,de,pl,ru}.json     (new `guide` UI namespace, 7 languages)
```

## Deploy — 1 place
**Commit & push the app code.** Vercel builds it. **No SQL, no edge-function
change** (the concierge edge function is unchanged since Phase 1 — it already
accepts the knowledge we send it).

## Try it after deploy
- `/guide` · `/ro/guide` · `/ru/guide` · `/de/guide`
- `/guide/scuba-diving` · `/ru/guide/pool-cleaning` · `/ar/guide/engagement-ring` · `/ro/guide/form-company`
- Ask the concierge "how do I clean my pool?" → the answer now links to the full guide.

## Verified
- Build compiled + typechecked; **938 static pages** generated (guide pages included).
- All 6 translations: 11 domains + 67 intents, key parity, no empty values, **every euro figure preserved verbatim**, place names localized.
- All 32 UI keys the guide pages use present in all 7 languages; data path renders localized with no errors.
- (Local build stops only at `/cyprus`, which needs Supabase env vars absent from the sandbox — a pre-existing page, builds on Vercel.)

## Next — Phase 3
Cross-link graph tuning + per-market landing hubs (RU/PL/RO/DE/EN/IL/AR) that
surface exactly what each audience wants first.
