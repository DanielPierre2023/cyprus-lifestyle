# Cyprus Lifestyle — Audience / Market Hubs (Phase 3)

Landing hubs per key market, each surfacing exactly what that audience wants
first — curated from the knowledge base, **fully translated into all 7 languages**.
This is the "don't forget the Russian, Polish, Romanian, German… markets" layer.

## What's new
- **`/for`** — the index: seven audience hubs.
- **`/for/{market}`** — one hub each for **Russian-speakers, Poland, Romanians,
  Germany, the British, Israel, and the Gulf** (× 7 languages = 56 pages). Each hub:
  a tailored hero, **Start here** (three flagship priced answers with a snippet),
  **Practical guides** (the rest, curated for that audience), **Explore the
  directory** (the groups that matter to them, + the Luxury Collection for the
  Gulf hub), and **Ask in your language** (the concierge, which replies in their
  language). All copy localized — nothing mixed-language.
- **Footer + sitemap** now include the hubs.

Curation reflects the market research: e.g. Russian-speakers → residency, non-dom,
property, Russian-speaking doctors, schools, Orthodox liturgy; Poland → sea season,
family beaches, value, food; Germany → Troodos trails, painted churches, wine
villages, agrotourism; the British → buying/title-deeds, healthcare, non-dom; the
Gulf → beaches, halal-friendly dining, villas and quiet luxury.

## Files
```
lib/knowledge/markets.ts                   (NEW — hub definitions + curated guide/group lists)
lib/knowledge/markets.i18n.ts              (NEW — el/ro/ar/de/pl/ru hub copy)
app/[locale]/(site)/for/page.tsx           (NEW — index)
app/[locale]/(site)/for/[market]/page.tsx  (NEW — hub)
app/sitemap.ts                             (hub URLs)
components/Footer.tsx                       (Audiences link)
messages/{en,el,ro,ar,de,pl,ru}.json       (new `market` UI namespace, 7 languages)
```

## Deploy — 1 place
**Commit & push the app code.** Vercel builds it. **No SQL, no edge-function change.**

## Try it after deploy
- `/for` · `/ru/for/russian` · `/de/for/german` · `/pl/for/polish` · `/ar/for/arab` · `/for/british`

## Verified
- Build compiled + typechecked; **994 static pages** (the 56 hub pages included).
- All 7 hub translations valid (7 UI keys + 7 markets each with kicker/title/intro), key parity, no empty values.
- Every featured guide id is a real knowledge-base page; hub data path renders localized in every language.
- (Local build stops only at `/cyprus`, which needs Supabase env absent from the sandbox — builds on Vercel.)

## The build path so far
- Phase 0 — knowledge base spine ✓
- Phase 1 — grounded concierge (7 languages) ✓
- Phase 2 — practical guide pages (~469) ✓
- Phase 3 — audience/market hubs ✓
- Next — Phase 4: the conversational chatbot (this KB is its retrieval spine), and deepening the connector/booking flow so businesses see leads and want to join.
