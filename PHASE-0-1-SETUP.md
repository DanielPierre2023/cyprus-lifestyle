# Cyprus Lifestyle — Concierge Knowledge Base (Phase 0 + 1)

This turns the **Knowledge Map** into the product spine: one source of truth for
the real questions people ask, wired into the `/ask` concierge so it answers them
accurately — with prices — in all 7 languages, and links people to our own pages
(from which they connect onward to the business).

## What's inside

**Phase 0 — the knowledge base (one source of truth)**
- `lib/knowledge/qa.ts` *(new)* — 11 life domains, 67 real questions, each with a
  practical priced answer, the on-site page(s) that carry it, cross-links, and the
  vendor category we connect to. Also the retrieval used by the concierge (and,
  later, the guide pages and the chatbot).

**Phase 1 — ground the concierge on it**
- `app/api/concierge/route.ts` — retrieves the most relevant knowledge for the
  question and hands it to the concierge.
- `supabase/functions/concierge/index.ts` — uses that knowledge to answer how-to /
  practical questions directly (with the euro figures and honest caveats), returns
  the on-site links it used as `guides`, and still recommends real directory places.
- `components/Concierge.tsx` — renders the "On Cyprus Lifestyle" guide links and
  offers to route any request to the right businesses.
- `app/[locale]/(site)/ask/page.tsx`, `app/[locale]/(site)/directory/page.tsx` —
  pass the new label.
- `messages/{en,el,ro,ar,de,pl,ru}.json` — new `concierge.guidesTitle`, and the
  `/ask` intro, placeholder and examples refreshed to show the concierge now
  answers practical life questions (scuba, pool cleaning, company formation…),
  translated in all 7 languages.

No SQL migration in this step.

---

## Deploy — 2 places

### 1) App code → commit & push (Vercel builds it)
Everything except the edge function:
```
lib/knowledge/qa.ts
app/api/concierge/route.ts
app/[locale]/(site)/ask/page.tsx
app/[locale]/(site)/directory/page.tsx
components/Concierge.tsx
messages/en.json  messages/el.json  messages/ro.json  messages/ar.json
messages/de.json  messages/pl.json  messages/ru.json
```

### 2) Edge function → Supabase dashboard
Open **Edge Functions → concierge → Code**, paste the full contents of
`supabase/functions/concierge/index.ts`, keep **Verify JWT = OFF**, and **Deploy**.
No new secrets — it reuses `CLAUDE_API_KEY`, `SONNET_MODEL`,
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## Try it after deploy (any language)
- "How do I clean my pool, and how much?"
- "Is the Zenobia good for a beginner?"
- "Where do I buy an engagement ring — can I get the VAT back?"
- "How do I form a company and pay non-dom tax?"
- "Cine îmi curăță piscina?" · "Кто установит солнечные панели?" · "Wer reinigt meinen Pool?"

Each answers with real advice + prices, shows **On Cyprus Lifestyle** links to the
right section of our site, and offers to route the request to the businesses.

## What's next (from the build path)
- **Phase 2** — `/guide/[slug]` pages generated from `qa.ts` (7 languages) for SEO + connector.
- **Phase 3** — cross-link graph + per-market landing hubs (RU/PL/RO/DE/EN/IL/AR).
- **Phase 4** — the conversational chatbot (this KB is its retrieval spine).
