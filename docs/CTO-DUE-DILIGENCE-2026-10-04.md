# Cyprus Lifestyle — Acquirer's Due Diligence & Enterprise Improvement Plan

*Prepared 2026-10-04 from a read-through of the repository (612 tracked files, ~88k lines incl. fonts/lockfile) by six parallel domain reviewers plus direct verification of the highest-impact claims. Perspective: CTO + Editor-in-Chief of a premium fashion/lifestyle title evaluating an acquisition.*

> **Status: analysis and plan only. No application code was changed.** Per project standards (Plan → Approve → Act), nothing is implemented until you approve the phases in §10.

---

## 0. How reliable is this report

| Claim type | Basis |
|---|---|
| **Verified by me directly** | Patron tier is "coming soon" (`membership/page.tsx`, `en.json`); €19 price is an env default (`api/membership/checkout/route.ts:22`); `linkEmailToCid` links a paid membership to any caller who knows the email (`lib/concierge/membership.ts:31-45`); a key-bearing URL is committed in `CONCIERGE-FIX.md:42`; `app/api/whatsapp/route.ts` contains no signature verification. |
| **Reported by reviewers with file:line evidence** | Everything else. Treat as *high-confidence leads* — each item should be re-confirmed by the engineer who fixes it. |
| **Not fully covered** | ~100 of 110 SQL migrations were analysed programmatically, not line by line; `process-scraped-article` (3,337 lines) was reviewed by structure and key paths; `lib/map/*`, `lib/activities/*`, `lib/weather.ts`, `lib/geo.ts` were only skimmed; nothing was *run* (no `node_modules`, no build, no live site test). Live-database numbers come from the repo's own 2026-10-03 audit and reviewer read-only counts. |

---

## 1. Executive verdict

**What you would be buying.** An unusually ambitious single-repo Next.js 15 + Supabase platform: a 7-language magazine (EN, DE, EL, PL, RO, RU, AR/RTL), a ~17.8k-row Cyprus business database with embeddings, an AI concierge (web, WhatsApp, Telegram, voice), an AI newsroom with planner → draft → polish → SEO → cover → translate, a CRM/outreach/advertising engine with Stripe, GDPR tooling, and a 36-page admin. The *plumbing* is well beyond launch-stage norms: job queue with `SKIP LOCKED`, HMAC-verified Stripe webhooks, hashed claim tokens, DSAR erasure with an audit trail, hreflang/sitemaps/JSON-LD, perf budgets, 41 pure-logic test suites.

**What stops it being a Vogue-grade asset today.** The product *promises* more than the code *delivers*, and in three places that is a legal/brand liability rather than a gap:

1. **Editorial integrity.** AI text published under *invented human bylines*; "Five minutes with…" and interview formats can be drafted **with no transcript**, which forces fabricated quotes; there is **no fact-check stage** (the concept doc promises one); no AI-disclosure anywhere; prompts that explicitly aim to pass AI detectors. For a title whose value is trust this is the single biggest issue.
2. **Paid promises that are not enforced.** The €19 "Concierge membership" promises "priority — always first in line", "a dedicated human concierge", "unlimited help". The code delivers **one extra sentence in the AI system prompt** plus a preference profile. Advertisers' benefits are never revoked on cancellation. "Verified" is sold, contradicting the Standards page.
3. **Security & trust basics.** Membership is a bearer identity (anonymous browser id + email) — **account takeover is trivial**; an environment secret is committed in docs and gates publishing/spend routes via `?key=`; the WhatsApp webhook is unauthenticated; anon can write straight to newsletter/comment tables bypassing double opt-in; article HTML is rendered unsanitised.

**Operationally:** no CI, no linter, zip-upload commit history ("Add files via upload" ×50), schema **not reproducible from the repo** (`directory_listings` and ~15 migration numbers missing), several promised automations **not scheduled** (only one daily cron exists), no RBAC, no audit log, "member function" (admin side of paying members) **not built**.

**Acquirer's recommendation.** Strong asset *conditional on* a funded 90-day remediation (Phases 0–3 below). Do not take over the brand claims (priority concierge, "verified", human bylines) until they are true. Price the deal on the data + platform + translation architecture, not on the current revenue promises.

---

## 2. Findings by domain

### 2.1 Concierge — "should know everything about Cyprus and cover the entire database"

**Verdict: a good directory + knowledge-base retrieval system, not a whole-database concierge.**

| Source | Today | Gap / action |
|---|---|---|
| `directory_listings` (~14.7k "listed" + ~3k published) | Searched **and** embedded (name-fuzzy, category, keyword, pgvector global+district, geo radius, top-rated fallback, optional rerank) | Embedding is a manual job; embedded text omits `canonical_category` and development facts → nightly embed cron, richer doc text |
| Static KB (105 intents, doing-business list) | Searched + embedded; keyword leg English-token only | ~~38/105 intents had no translation~~ all 105 translated 2026-10-05 (review pending) |
| `blog_posts` (articles) | Full-text only, top 3, **title only** reaches the prompt | Embed articles; pass excerpt + key facts; use semantic not AND-keyword search |
| `activities` (566 GetYourGuide rows) | Keyword/district only, not embedded | Embed; add to hybrid retrieval |
| `events` | **Ignored** by chat (only 2 titles in greeting) | Date-filtered retrieval ("what's on this weekend") — currently falls back to "general knowledge" = hallucination risk |
| `kb_docs` / `match_kb_docs` | **Dead** (0 rows, no caller) | Wire in or delete |
| `regulation_snapshots/alerts`, `webcams`, map POIs | **Ignored** | Regulation alerts must reach answers (tax/residency are high-stakes); webcams/weather → live "can I swim today" answers |
| Weather | Static monthly table | Live forecast + marine conditions |
| Reviews | Embedded but never shown | Surface review highlights (with licensing check — see §2.7) |
| WhatsApp/Telegram turns | Not logged | Coverage analytics blind to those channels |

Additional concierge defects: recommends `listed` businesses that have **no public page** (cards 404); Latin-script DE/PL/RO WhatsApp/Telegram users are detected as `en` (grounding labels and KB facts in English); LLM "understand"/"rerank" lift is **off by default**; hard-coded prices and "around €19" in the system prompt drift from env; partner-pitch text injected into prompt (prompt-injection surface); client can forge `assistant` turns; TTS endpoint unauthenticated with 4000 chars on `tts-1-hd`; rate limiter fails open.

### 2.2 The €19 subscription — what it actually does

| Promised (en.json) | Delivered in code |
|---|---|
| Priority concierge, always first in line | **No.** Requests carry no `cid`/member flag; request form never sends `cid`; no queue ordering |
| A dedicated human concierge | **No.** No assignee, no SLA, no contact flow (`handled_by` never set) |
| Unlimited help | **Meaningless** — nobody has quotas; same 30/min limit |
| Trips & preferences remembered | **Yes** — durable profile (`subscriber.ts`); but anonymous users already get per-browser memory/saved items free |
| The whole island, curated | Not enforced by anything |
| (technical) | One sentence `MEMBER_BLOCK` in the prompt + "✦ Member" badge |

Billing defects: no `invoice.paid`/`customer.subscription.updated` handler → **a member whose card is recovered by Stripe retry stays locked out**; no Customer Portal/cancel; no annual plan; no VAT/invoice handling; no idempotency on webhook redelivery; no guard against double subscription; membership keyed to `localStorage cl_cid`; and the page copy says "Membership begins free, and always will… a paid tier is on the way" directly above a live paid tier. Patron (a card promising benefits that do not exist, one of which is no longer planned) is a vapor card.

### 2.3 Booking / request flow (concierge → redaction)

Today: honeypot + rate limit → crude substring classifier (premium vs standard) → auto-match ≤6 specialists → row in `concierge_requests` → **English** email to desk (silently nothing if no inbox env var is set) → optional 7-language acknowledgement promising "one business day" → admin list with a status button cycling `new→routed→fulfilled→closed`.

Missing: assignee, notes, SLA timer/alerts, in-panel reply/quote/confirmation, partner hand-off (the `org_id` column is unused), guest status page/notifications, payment/deposit, commission ledger, link to CRM/leads, WhatsApp/Telegram request capture, name/phone fields on the web form, "arrange this for me" button when nothing matched. Client-supplied `answer`/`picks` are stored unvalidated; raw DB error returned to client.

### 2.4 Editorial AI desk — stage by stage (Vogue-EIC view)

| Stage | AI today | Quality | What is missing |
|---|---|---|---|
| Idea/pitch | Planner (Sonnet + web search + demand + directory), pgvector dedupe | **Best part** | Suggested ideas count as "filling" gaps; no trend/competitor/exclusivity scoring |
| Commission | Deterministic mapping | Weak | Ignores idea `needs: interview/visit` → commissions wrong kind |
| Research/dossier | Sonnet, directory row + 5 KB Q&As only | Thin | No web research on subject, no citations, `verify[]` never checked |
| **Interview questions** | Two generators (dossier 8–12; Studio 12–15 after reading subject site) | Good prompts | Studio output is a **dead end** (`editorial_pieces` read by nothing); never sent to subject; answers never captured |
| **"Five minutes with…"** | Format spec only | **Dangerous** | No transcript/answer intake; draft prompt only says "don't invent quotes" → fabricates; no audio transcription, consent, quote approval |
| Draft | Sonnet, franchise-specific | Strong structure | 600–1100 words thin for features; 4096-token JSON can truncate → `{}` |
| Edit/polish | Sonnet + AI-tell lint | OK | No diff/track-changes/human gate |
| **Fact-check** | **None** | — | Promised in concept doc; absent. Humanizer rewrites *after* facts are final |
| SEO | Haiku, 7 languages, clamped | Good | No keyword research, internal links |
| Headline | Edge: English only; Node: none | Weak | No variants, no per-language length check |
| Cover/alt/captions/rights | Unsplash brief + gpt-image-1 | Weak | `alt=""` everywhere; alt text computed but never stored; credit never written in Node desk; "photorealistic" AI covers; no licence/consent fields |
| Translation | Haiku (default), Sonnet transcreation for **1 of 7** franchises | Fragile | Truncation on long AR/RU/EL; no native review state |
| Publish | Flips status | **No gate** | `canTransition` never called; `scheduled` unreachable; auto-features the subject business without disclosure |
| Social | Haiku copy → auto-post 4 platforms | Risky | No approval/preview/scheduling |
| Newsletter | Latest 6 posts | Basic | No curation/editor's note/test send; Friday vs Monday inconsistency; sends sequentially (will time out) |

Other: fake editor personas (`0015_editors.sql`); bug `AI_TELLS.slice(0,40)` drops 22 of 62 tells (incl. all 2025-26 ones); dash scrubber corrupts "Paphos–Limassol"; over-aggressive scrubbing deletes attributed facts ("told reporters"); cost: no daily/monthly cap, two inconsistent price tables, ~$1–3 per article (reviewer estimate, unverified); two diverging pipelines (Node desk vs 3,337-line edge function with Romanian leftovers from the sister project); RSS-scraped third-party articles rewritten and optionally **auto-published**; concept-doc franchises (Island Index, The Circle, Cover Story, At Home With…) not in code; no issue/series model; author pages marked up as `Organization`.

### 2.5 Languages — "everything in all 7"

> **Updated 2026-10-05** (increments 5.1 and 5.2; figures re-measured against the repository and the live database with read-only queries). The table below keeps the original findings, with the outdated cells replaced. What changed since 2026-10-04: `messages/*.json` grew from 376 to **499 keys** (Business Hub) and is still clean in all 7 locales; the knowledge base is now **105/105 intents and 13/13 domains translated** in all six locales (38 intents were added in 5.2, machine-written, needs native review); the DSAR acknowledgement e-mail is wired (once per address per 24 h); every public form/route returns a stable error `code` next to the unchanged English `error`; date/number/currency formatting call sites moved onto `lib/i18n/format.ts`; the error and 404 pages carry de/pl/ru. Owner decision of 2026-10-05: **every page is shown in every edition with an English fallback — no noindex gate, no 404** (see `docs/I18N.md`).

| Layer | State |
|---|---|
| `messages/*.json` (**499 keys**, was 376) | **Clean**: 0 missing/empty/placeholder mismatches in all 7 (CI-gated) |
| Knowledge base (`qa.i18n.ts`) | ~~36% (38/105) intents untranslated~~ **105/105 intents and 13/13 domains translated** in el/ro/ar/de/pl/ru (the 38 `doing-business`/`licensing`/lifestyle intents were added 2026-10-05; machine-written, native review pending) |
| DB `blog_posts` | 74/74 published in all 6 non-EN locales ✔ (bodies); 5 articles still have English-copy titles/excerpts/summaries in 1–3 locales — data script `supabase/data/blog_translations_20261007.sql` |
| DB `directory_listings` (17,833) | ~~summaries ~71% untranslated~~ Re-measured: all **3,076 published listings have an English summary and all six translations** (203 apparent German gaps are identical-by-nature stubs such as "Restaurant in Paphos."). 9,452/17,833 rows (53%) carry a translated summary overall; the other **8,358 are unpublished `listed` rows with no summary in ANY language** (a content-generation gap, not a translation gap). Names are mostly proper nouns (83 rows have a distinct Greek name). Untranslated text falls back to English; hreflang is emitted for all editions by decision (no noindex gate) |
| DB `events` (**16** published, was 31) | 0% of titles translated in any locale at the time of measurement; titles of 11 events and summaries of 9 events written in `supabase/data/events_translations_20261007.sql` (owner runs it); 5 events keep English titles (proper nouns/line-ups) |
| Inline dictionaries (**~248 scanned**, was ~25) | Error/404 pages now EN/EL/RO/AR/DE/PL/RU; CI gate `check:i18n-dicts` fails on any new or worse gap (3 known gaps in the baseline) |
| Hard-coded English (public) | Claim-listing box on every listing page; `/partner`; `/directory/manage`; OwnerEditor; OwnerRequestLink; PrivacyRequestForm; ConciergeChat trip-plan labels; advertise FAQ; OG "The Arabic Edition" |
| Emails/pages | Claim, owner-link and newsletter-confirm pages/e-mails are localised (5.1); **DSAR acknowledgement e-mail now sent** (once per address per 24 h, fixed text, only our own reference echoed); public API routes return `{ ok:false, code, error }` with locale-aware `error` (admin and `api/concierge/*` excluded) |
| Formatting | `lib/i18n/format.ts` exists (currency, numbers, dates, CLDR plurals); pages, components and `gyg.ts` (el→el-GR, ro→ro-RO) now use it; **still open: concierge call sites** (`lib/concierge/brain.ts` en-US money, `api/concierge/proactive`, `lib/concierge/sources.ts`) |
| Fonts/OG/RTL | Bodoni Moda lacks Greek subset; Arabic OG card is text-less; globals.css has 0 logical properties |
| Structure | 4 translation mechanisms, no shared type/CI check; flat `*_<locale>` columns need `ALTER` for every new locale; no glossary, TM, review state, or stale detection |
| Admin | 120+ files English-only (middleware comment says intentional) |

**Decision needed (my recommendation):** treat *public site + emails + business hub + concierge* as "everything" (full 7-language, CI-enforced); keep the *editorial/admin back-office* English-first with a documented exemption, except where output is user-facing (e.g. reply language lists must include all 7). Translating admin is low ROI for a small team.

### 2.6 Backend / admin — "every feature a logical, practical, working use"

36 pages, all in nav. Verdict by group:

- **Working & valuable:** Dashboard, Articles, Editor (with bugs), Plan, Ideas, Field Notes, Quality, Directory, Complete listings, Coverage, Agenda, Privacy/DSAR, Mail (SLA + AI draft), Requests, Fulfilment, Attribution.
- **Dead ends / half-built:** Editorial Studio (saves to a table nothing reads), Editorial Pipeline (read-only board), Comments (AI reply shown in `alert()`, can't be posted), Subscribers (200-row cap, wrong per-language counts, no export/search), Newsletter (no preview/test/confirm, double-send risk), CRM (can't create accounts/notes/deals), Settings (can't add/revoke admins in UI), Sponsors rate card read-only.
- **Missing entirely:** **Members** admin (see/grant/comp/revoke concierge members, MRR), RBAC (everyone is full admin), audit log, review moderation UI, manual-claim approval UI, activities admin, newsletter-sponsor UI, `mail_autoanswer_enabled` switch.
- **Broken wiring:** Editor/Articles call non-existent `/api/admin/revalidate` ("instant live" never happens); every re-save resets `published_at`; `cron/process`, `cron/social`, `cron/newsletter-weekly` **are not scheduled** (only `cron/tick` daily) so "AI processor", "auto-publish", "Mondays 06:00 newsletter" toggles do nothing as shipped; admin Partners page moderates **legacy tables**, not the live claim/edit flow; two inbound-mail systems (Inbox vs Mail); two owner-edit queues; outreach bug (`Number(cap) ?? 40`, failed send advances step).

### 2.7 Commercial plans & dashboards

Current price points (DB `ad_pricing`): Listed €149/yr (rack €490), Featured €49/mo (€199), Partner €3,000/yr (€6,000), banner €79/mo, section sponsorship €149/mo, sponsored feature €149, newsletter sole sponsor €79/send, category exclusive €39/mo, agenda event €19; `premium-listing` duplicates `tier-listed`.

Problems: public FAQ/JSON-LD says €490/yr & €850/mo while page says €149/€49 (contradiction in structured data); "Founding-100" not enforced and prices re-read live (silent re-pricing); 70–87% strike-through + "Most popular" badges read like a coupon site, wrong for a luxury title; featured/banner/exclusive overlap; **"Verified" is sold** while Standards claims editorial verification; section/category exclusivity unenforced (second buyer can pay for an occupied section); no ownership check at checkout; no audience proof/media kit; directory enquiries emailed to every listing for free (nothing left to sell); banner tracking unauthenticated and un-rate-limited (inflatable impressions).

Payments: webhook signature is sound, but — no de-provisioning on cancel/lapse/refund/dispute; no `checkout.session.expired`; `payment_status` unchecked; **no VAT (Cyprus 19%), no VAT-ID/reverse charge, no invoices, no Customer Portal**; inline `price_data` (no Products/Prices lookup keys); ads and membership share one webhook endpoint.

Business self-service: claim-to-own (good: hashed, anti-enumeration) and an owner editor with 60-minute single-use session. **No accounts/org/team, no uploads (URLs only), English-only fields, no article/press/event/offer submission, no leads inbox, no analytics, no billing, no entitlement view, no submission lifecycle.** Reviews are never moderated (stay pending forever).

### 2.8 Database, security, repo, SEO, performance, GDPR

| # | Sev | Finding |
|---|---|---|
| 1 | Critical | **Schema not reproducible**: `directory_listings` created by no migration; ~15 migration numbers absent; `schema_all.sql` stale (4 locales); live has no migration ledger → DR runbook claim is false |
| 2 | High | Membership account takeover (`linkEmailToCid`, `/api/membership/status`) + unauthenticated `GET /api/concierge/memory?cid=` |
| 3 | High | Committed key URL (`CONCIERGE-FIX.md:42`); one `ENRICH_SECRET` gates ~15 routes incl. publish-directory (flips ~14.7k listings public) and all `/api/editorial/*`, passed as `?key=`, non-constant-time; edge functions `enrich-directory`/`events-ingest` fail **open** if secret unset; `import-osm-directory` "open by default". **Rotate and scrub history** |
| 4 | High | WhatsApp webhook has no HMAC check; Telegram secret optional; no rate limit → token-burn & impersonation |
| 5 | High | Anon `with check (true)` inserts on `newsletter_subscribers`, comments, `contact_messages`, analytics → bypass honeypot/rate limit/double opt-in (GDPR consent proof) |
| 6 | High | `authenticated` role can read revenue/CRM/ticket/AI-spend views (hardening §7 still commented out) |
| 7 | High | Stored XSS: article body via `dangerouslySetInnerHTML`, no sanitiser anywhere; model/scraped HTML passes through; `mdToHtml` doesn't escape link quotes |
| 8 | High | No CI, no linter (`next lint` has no config), zip-upload workflow, tests never run automatically |
| 9 | High | AI-generated content under human bylines + detector-evasion framing + no disclosure (EU AI Act Art. 50 from Aug 2026; Google scaled-content policy) |
| 10 | Med | No global LLM spend cap (concierge, TTS, desk); two price tables; `ai_spend_log` deliberately model-blind |
| 11 | Med | Public pages read via service role — safety depends on every query repeating `status='published'` |
| 12 | Med | GDPR: erasure omits WhatsApp/Telegram threads (phone numbers, no TTL), reviews, claims, owner tokens, auth users; ROPA omits OpenAI, Google, Resend, Meta/Telegram, Stripe, Upstash, Sentry; Sentry has no consent gate; scraped Google Places reviews/photos conflict with Maps platform terms; silent DSAR insert failure (`catch` is dead) |
| 13 | Med | Images `unoptimized: true`; 5 font families; 395–426 KB first-load JS; concierge on every page; Vercel region vs Supabase eu-central-1 unverified; Hobby plan (non-commercial) implied |
| 14 | Med | Observability: no Sentry server config; `logServerError` in 7 of 98 routes; no alerting; no uptime monitor |
| 15 | Low | Stray files (`CoverImage.tsx`, `CHANGES.diff`, followups folder, `tsbuildinfo`, ~50 root `.md`), unused `leaflet`, missing `esbuild` devDep, 2 npm-audit findings, `.env.example` `.com` vs `.eu`, no `List-Unsubscribe` header, no skip link, `alt=""` defaults, picsum.photos fallback covers |

Positives worth preserving: server-only service client, Stripe HMAC, hashed tokens, escaped JSON-LD, SSRF guard on OG, honeypot + rate limit on most POSTs, solid hreflang/sitemap/Google-News sitemap, stub-listing noindex gate, `job_queue` with dead-letter, DSAR machinery, message-catalogue parity.

---

## 3. Target concierge: "The Island Key" (top solution + innovative use)

**Principle:** the subscription must be *felt* in every interaction and *measurable*, otherwise it is marketing. Make the concierge a **membership operating system** that connects three parties — member, partner, redaction — and monetises all three honestly.

### 3.1 Member benefits (every one enforced in code, shown in a member dashboard)

1. **Priority lane (real):** member requests get `priority=member`, jump the queue, and an SLA clock (e.g. first human reply ≤ 4 working hours; standard ≤ 1 business day). SLA breaches alert the desk.
2. **Named human:** each member is assigned a concierge (by language/district); the AI drafts, the human approves anything bespoke.
3. **Island Key card (innovative):** a digital member card (wallet pass + QR) redeemed at partner venues for member privileges. Every redemption is logged → **partners get measurable ROI; the redaction gets a commission/fee ledger; the subscription becomes self-financing and sellable** (partners in Signature/Partner tiers fund the privileges — member never pays twice). This also turns the directory into a *loyalty network* no competitor has.
4. **Trip Dossier:** the AI builds a personalised itinerary (dates, party, tastes, language) from the *whole* database (directory, events, activities, weather, regulations), an editor-reviewed PDF + live link, re-planned automatically if weather/events change.
5. **Concierge on the member's channel:** one thread across web / WhatsApp / Telegram, same memory, verified by magic link (not a browser id).
6. **Editorial access:** early access to *The Island Index*, member-only events, "Ask the Editors" monthly session, the Circle diary.
7. **Quotas that mean something:** e.g. 2 bespoke arrangements/month included, extra at a disclosed fee — replaces the meaningless "unlimited".
8. **Billing self-service:** Stripe Customer Portal, annual plan, VAT-inclusive consumer pricing.

### 3.2 Reader ladder (hypotheses to A/B — prices are **not validated**)

| Tier | Price (VAT incl.) | Purpose |
|---|---|---|
| **Reader** | Free | Letter, archive, saved items, AI concierge (rate-limited), account via magic link |
| **Member — The Island Key** | €19/mo or €190/yr (existing price, now *earned*) | Items 1–8 above |
| **Private Client** | from €79/mo, capped seats, application-based | Named senior concierge, 1-hour SLA, bespoke arrangements, private events |
| *Retire* | Patron; the vapor card | Fold events into Member |

(The commercial reviewer proposed €9/€49; I recommend keeping €19 *only if* items 1–3 ship — otherwise the price is not defensible. Test €9 "Insider" without priority/dossier as a conversion rung if needed.)

---

## 4. Booking automation: concierge → partner → redaction

```
Guest (web / WhatsApp / Telegram / email)
   │ AI extracts: name, contact, dates, party, budget, language, picks   ← structured form + chat-slot filling
   ▼
[bookings] row (idempotent id, source channel, member/cid, locale, priority score)
   │ AI classify + dedupe + risk flags (budget, regulated activity, minors)
   ▼
Auto-assign (district × category × language × load) → SLA clock starts
   ▼
Partner outreach: AI drafts enquiry in PARTNER's language → email/WhatsApp
   with one-click magic link: Accept / Quote / Decline / Propose alternative (no login)
   │ partner response captured → [booking_quotes]
   ▼
AI drafts guest reply (best 1–3 options) ─ standard: auto-send after rules pass;
                                           premium/high-value: human approves
   ▼
Guest status page + notifications on the ORIGIN channel; confirm → Stripe deposit/payment link
   ▼
Confirmed → calendar/ICS + reminder → post-stay survey → review prompt
   ▼
Ledger: commission/fee (disclosed), partner performance score, member credits used
   ▼
Redaction feed (firewalled from paid placement):
   • "Demand signals": what guests ask most → feeds planner ideas weekly
   • Top-rated fulfilled experiences → candidate leads for editorial features (editor decides; paid status never buys coverage)
```

**Data model (new):** `bookings`, `booking_events` (audit), `booking_quotes`, `booking_assignments`, `partner_contacts`, `commission_ledger`, `member_entitlements`, `sla_policies`. **Automations:** SLA timers + breach alerts, status-change emails/WhatsApp in guest language, partner reminder cadence (24h/48h), auto-fail-over to next-best partner, desk alert if no desk inbox configured, weekly demand digest. **Disclosure:** UI labels "Partner"/"Sponsored"/"Featured" on cards; commission disclosed in terms.

---

## 5. Editorial AI desk — target state (AI help at every step)

| Stage | AI assistance to add/fix | Human gate |
|---|---|---|
| Pitch | Trend + competitor + exclusivity scoring; gap math counts only *approved* ideas | Editor approves |
| Commission | Respect `needs: interview/visit`; auto-generate brief, deadline, budget | Commissioning editor |
| Research | Dossier with web research, **cited sources**, prior-coverage check, `verify[]` tracked | — |
| **Interview** | Question generator (done) → **send questionnaire/schedule link to subject**; live-interview co-pilot (follow-up suggestions); **audio upload → transcription → speaker-tagged transcript** | Subject consent |
| **Five Minutes With…** | Transcript → Q&A formatter with **verbatim quote verification** (every quote must match transcript), length limiter, subject-approval link with timestamp. **Hard rule: no transcript ⇒ no draft** | Subject + editor sign-off |
| Draft | Franchise templates incl. Cover Story, At Home With, Island Index entries; longer-form support, chunked generation (no truncation) | — |
| Edit | Structured diff/track-changes; style-guide check (house book) | Section editor |
| **Fact-check** | Claim extraction → verify vs dossier/sources/web → fact-flags table; **publish blocked while flags open** | Fact-checker |
| Headlines | 5 variants + SEO/social/email subject lines, per-language length checks | Editor picks |
| Images | Picture-desk: alt text ×7, caption, credit, licence, usage window, consent fields; AI-image policy (label, never "photorealistic" on news/reviews) | Picture editor |
| Translation | Transcreation for all franchises, glossary + TM, back-translation check, native-reviewer queue with status | Native reviewer for high-traffic |
| SEO | Keyword intent, internal link suggestions, schema by format | — |
| Publish | Enforced state machine; scheduler (cron publishes due items); sponsored-disclosure | Chief editor |
| Distribution | Social variants with preview/approval + scheduling + UTM; newsletter curation + editor's note + test send + per-locale subject A/B | Editor |
| Learning | Post-publish performance → planner | — |

**Integrity package (non-negotiable before launch):** real named editors or an honest "Cyprus Lifestyle Desk"; per-piece `responsible_editor`, `fact_checked_by`, `ai_assisted` flags; published AI-use policy on Standards; sanitise HTML on write and render; remove detector-evasion prompts and the model-blind spend log; stop auto-publishing rewritten third-party RSS content (or restrict to attributed, short, linking summaries); one consolidated pipeline (retire the divergent Node/edge duplicate).

---

## 6. Business Hub — subscriber dashboard (`/account`)

Auth: magic link + passkey; `organizations`, `org_members` (Owner/Editor/Billing), listing ownership tied to verified claim.

- **Overview:** plan, renewal, quotas used, items pending with the desk.
- **Profile & media:** all fields in 7 languages (AI-drafted, human-approved), uploads to Supabase Storage (logo, gallery, menus, press kit) with rights declaration, type/size limits, moderation.
- **Submissions:** one typed table (article, press release, offer, event, announcement) → states *draft → submitted → in review → changes requested → approved → scheduled → published / rejected*; AI pre-check (tone, claims, language), quota per tier, "Partner content" label; desk queue with checklist, SLA, side-by-side diff, translation job. *The tier buys the slot, never the coverage.*
- **Leads:** directory enquiries, concierge hand-offs, click-to-call; status, reply in-app, CSV export — this is what makes paid tiers worth buying.
- **Reviews:** reply/report. **Analytics:** views, CTA clicks, concierge recommendations, banner CTR (with de-duplicated tracking), monthly emailed PDF.
- **Billing:** Customer Portal, VAT invoices (Cyprus 19%, VAT-ID, EU reverse charge), plan changes, dunning banner.
- **Entitlements:** single `entitlements` table driven by Stripe subscription/invoice events with grace period + nightly reconciliation; **de-provision on lapse** (unfeature, deactivate banners, release sections/categories).

### Business plan architecture (non-redundant; prices are hypotheses)

| Tier | Price | What it is |
|---|---|---|
| **Claimed** | Free | Claim, edit basics, capped enquiries, view counts — the data-quality & funnel engine |
| **Verified Profile** | ~€240/yr | 7-language profile, gallery, leads inbox, 1 offer, 2 events/yr, review replies; **badge only after editorial QA passes** (never auto-set at payment) |
| **Signature** | ~€790/yr or €79/mo | Verified + category priority, rotating display, 4 newsletter mentions, 1 editorial-reviewed partner article/yr, 6 events, monthly report, funds Island Key privileges |
| **Partner** | from €6,000/yr, by invitation | Enforced category exclusivity (unique constraint), optional section sponsorship, named series, account manager |
| **À la carte** | rate card | Sponsored feature, newsletter sole sponsor, event spotlight, banner — priced at rack with a **published media kit** (audience, languages, list size, sample report) |
| *Drop* | — | `premium-listing`, `directory-exclusive` (absorbed in Partner), public "% off" strike-throughs; keep founding terms as private price-lock agreements with a DB counter |

---

## 7. Admin restructure

**Roles:** admin · editor · sales · support (use `user_roles` + `requireRole()`; Settings → Team to invite/set/revoke). **Audit log:** `admin_audit_log` (actor, action, entity, diff) written by publish/delete/role/newsletter/outreach/erasure/moderation.

**IA:** Overview · Newsroom (Desk: Ideas/Plan/Pipeline, Articles+Editor, Field Notes, Quality, Sources) · Listings (Directory incl. Complete/Coverage, Moderation incl. claims+owner edits+reviews, Agenda, Experiences) · Audience (**Members**, Subscribers, Newsletter, Social, Comments) · Inbox (unified Mail incl. contact + Bookings) · Revenue (CRM hub, Outreach, Advertising, Fulfilment, Attribution) · System (Automation = all toggles + cron/job health, Analytics split, Privacy, Team, Audit, Dev tools).

**Merge/delete:** Editorial Studio → Pipeline; Inbox → Mail; Partners → Moderation; Sponsors banners → Advertising; remove `generate`, dead routes behind Dev.

---

## 8. Roadmap (phases, acceptance criteria)

Durations assume a small senior team (2–3 engineers + 1 designer + editorial lead + part-time counsel/accountant). Estimates are planning ranges, not commitments.

### Phase 0 — Stop the bleeding (weeks 0–2) · *no new features*
- Rotate `ENRICH_SECRET`; scrub history; move key-gated routes to admin-session or `Authorization` header with constant-time compare; make edge-function gates fail **closed**.
- WhatsApp HMAC, mandatory Telegram secret, per-sender rate limits.
- Replace email→cid linking with verified magic link; stop exposing memory by `cid` alone.
- Close anon direct-insert policies; run hardening §7 after moving admin reads to server client.
- Sanitise article HTML (write + render); escape link quotes.
- Truth-in-advertising: remove/soften "priority", "dedicated", "unlimited", "verified (paid)"; fix FAQ/JSON-LD prices; fix "membership begins free" copy.
- Add `invoice.paid` / `subscription.updated` handlers; webhook event-id idempotency.
- Global LLM spend cap + kill switch.
**Accept:** external pen-test checklist passes; Stripe test: failed→recovered payment restores access.

### Phase 1 — Foundations (weeks 2–8)
- Git workflow (PRs, protected main), **CI** (typecheck, lint config, 41 suites, i18n parity, `npm audit`, build, perf budgets), Dependabot; remove stray files.
- **Reproducible schema:** dump live → baseline migration; migration ledger; staging Supabase project; restore drill.
- Real accounts (Supabase Auth, magic link/passkey) for members & business users; `entitlements` table; Stripe Products/Prices, Customer Portal, `automatic_tax`, VAT-ID, invoices.
- RBAC + audit log; Members admin; publish pipeline fix (revalidate, `published_at`, state machine, scheduler); schedule all promised crons (or remove the promises).
- Observability: Sentry server/edge, `logServerError` everywhere, uptime + alerts; paid Vercel plan (commercial use), region next to Supabase.
**Accept:** fresh environment rebuilds from repo; every admin action in audit log; every toggle has a running job.

### Phase 2 — Concierge as product (weeks 6–16)
- Retrieval over **all** sources (events, articles with vectors, activities, regulations, webcams/weather, kb_docs or retire); nightly embeddings; locale-aware grounding; labelled partner results; link only published listings.
- Booking engine (§4), partner magic-link responses, SLA/assignment, guest status page, multichannel capture, commission ledger.
- Island Key: priority lane, named concierge, card + redemption, Trip Dossier, quotas.
- Eval harness extended (recall per source/locale, hallucination rate, SLA metrics).
**Accept:** "what's on this week", "can I swim today", "residency requirements" answered from live data in all 7 languages; a member request is demonstrably first in queue with SLA tracking.

### Phase 3 — Editorial desk & integrity (weeks 8–20)
- Integrity package (§5); transcript-required rule; fact-check stage; picture desk; headline lab; publish gate; unified pipeline; real franchises/issue/series model; Person schema; AI-disclosure.
- Newsletter and social with preview/approval/scheduling.
**Accept:** no piece can publish without responsible editor, fact flags cleared, alt text ×7, credit/licence, all editions.

### Phase 4 — Business Hub & plans (weeks 12–26)
- Accounts/orgs, uploads, submissions workflow, leads inbox, analytics, billing; new tier architecture; media kit; enforced exclusivity; de-provisioning.

### Phase 5 — Full 7-language completeness (parallel, weeks 4–20)
- CI parity for messages **and** TS dictionaries and DB coverage; ESLint `no-literal-string` on public code; translate 38 KB intents; backfill ~12.6k listing summaries ×6 and events (de/pl/ru) via job queue with `source_hash`/status; `translations` table (long-term) + glossary + TM + native-review queue; localise emails, verify pages, API error *codes*; locale-aware formatting helper (currency/dates/plurals, `ar-u-nu-latn` decision); Greek font subset; logical CSS/RTL regression tests; no hreflang/index for empty translations.
- Extend reply-language lists (proof, comment-reply, scraper, media kit, inbox) to all 7.

### Phase 6 — Brand, scale & growth (months 5–9)
- Image strategy (CDN/transform instead of `unoptimized`), font diet, JS budget cut, tag-based revalidation for 7×~3k pages; data-licensing review for Google-sourced content; sponsorship inventory manager; partner marketplace; mobile PWA/app for Island Key.

---

## 9. KPIs

Editorial: % pieces with fact-check complete (target 100%), time idea→publish, edit-distance AI→published, corrections rate. Concierge: first-response SLA hit-rate, request→booking conversion, answer grounding rate, hallucination rate (eval), member retention. Commercial: MRR/ARR, ARPU, lead→paid conversion, involuntary churn (dunning recovery), partner NPS/renewal. Platform: CWV (LCP < 2.5s p75), error rate, deploy frequency, MTTR, translation coverage per locale (target ≥ 95% for published surfaces).

## 10. Decisions needed from you (approval gate)

1. Approve **Phase 0** as an immediate, no-regret security/truth sprint?
2. Editorial integrity policy: real named editors vs "Desk" + disclosure; and whether RSS-rewrite auto-publish is retired. (I recommend: retire auto-publish, name real editors/desk, publish AI policy.)
3. Admin language scope: public + business hub + emails in 7 languages, admin English-first (my recommendation) vs translate admin too.
4. Island Key pricing: keep €19 only if priority/named-human/card ship; confirm willingness to fund partner privileges via Signature tier.
5. Budget acknowledgements for paid services my standards ask me to flag: Vercel Pro (commercial use), Supabase Pro/staging, Upstash, Resend volume, Sentry, transcription (e.g. Whisper API — or self-hosted open-source to avoid cost), and Google Places enrichment (~$500–650 per repo docs). Free/self-hosted alternatives will be preferred where viable.

**Owner decisions recorded 2026-10-06**
- **No AI-disclosure statement on articles.** Owner decision: articles carry no notice about AI involvement, in any of the seven languages, and the generation and translation prompts now say so. This replaces the "publish AI policy" part of the recommendation in item 2 above. Risk accepted by the owner and noted here for the record: finding 9 in the table above (EU AI Act Art. 50, from Aug 2026, which exempts text that has undergone human review or editorial control under someone's editorial responsibility; and Google's scaled-content policy). Application dates were not re-checked when this note was written.
- Auto-publish stays as it is.

Upon approval I will deliver each phase as complete files with full paths, starting with Phase 0.
