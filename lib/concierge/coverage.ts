// lib/concierge/coverage.ts
// ============================================================================
// CONCIERGE COVERAGE PROBE — the breadth baseline ("how dumb is he, and where?").
// ----------------------------------------------------------------------------
// The offline gold suite (concierge-gold.test.ts) proves intent ROUTING doesn't
// regress. The live eval (eval.ts) scores ANSWER quality — but it costs model
// calls, so it can only sample. Neither tells us the thing Daniel actually asked:
// across EVERYTHING the concierge should know — investing, law, fine & casual
// dining, museums, theatre, archaeology, weather, diving, boats, yachts, jewellery,
// fashion, nightlife, prices, culture, the current feel of Cyprus — WHERE is he
// blind because the content simply isn't there yet?
//
// This probe answers that, cheaply. For each topic (in all seven languages) it runs
// ONLY the retrieval layer the concierge uses — the directory search, the knowledge
// base, and our articles — WITHOUT generating an answer or calling a judge. So it is
// free of answer/judge model cost and fast enough to run on demand, as often as we
// like, and it produces a coverage MAP: per topic × language, did we return real
// directory listings? a grounded KB answer? a relevant article? — graded
// blind / thin / ok / strong. That map is the baseline for the whole programme:
// every later increment (lighting up semantic + geo retrieval, growing the KB,
// enriching the directory) must move these numbers up, and we can prove it did.
// ============================================================================
import 'server-only';
import { searchDirectory, classifyRequest, categoryProbes, isConciergeLocale } from '@/lib/concierge/brain';
import { retrieveKnowledge } from '@/lib/knowledge/qa';
import { searchArticles } from '@/lib/queries';
import type { Locale } from '@/lib/locales';
import { supabaseAdmin } from '@/lib/supabase/admin';

// A topic the concierge is expected to be good at, and WHICH grounding sources
// ought to cover it. `expect*` say what "good coverage" means for this topic:
//   • directory — real listings (restaurants, wineries, boat charters, jewellers…)
//   • kb        — a priced/practical/cited knowledge-base answer (tax, weather, prices…)
//   • article   — our own editorial (culture, atmosphere, the feel of a place…)
// A topic may expect more than one. `en` is the canonical English probe; localized
// probes for the other six languages live in MULTILINGUAL below.
export interface CoverageTopic {
  key: string;
  label: string;
  pillar: 'knowledge' | 'directory' | 'editorial';
  expectDirectory: boolean;
  expectKb: boolean;
  expectArticle: boolean;
  en: string;
  expectCategory?: string;   // classifyRequest should resolve to this category, when set
  expectDistrict?: string;   // …and this district, when the probe names a town/village
}

export interface CoverageProbe {
  topic: string;
  locale: string;
  q: string;
  expectCategory?: string;
  expectDistrict?: string;
}

// ── The taxonomy — Daniel's vision, made measurable. Ordered roughly by the three
// pillars, but every topic declares its own expected sources. Keep the questions the
// way a real guest asks them. ────────────────────────────────────────────────────
export const COVERAGE_TOPICS: CoverageTopic[] = [
  // Investing, law, money — the KB pillar (priced, cited, practical).
  { key: 'investing',      label: 'Investing in Cyprus',       pillar: 'knowledge', expectDirectory: false, expectKb: true,  expectArticle: true,  en: 'Is Cyprus a good place to invest my money, and how do foreigners get started?' },
  { key: 'tax-residency',  label: 'Tax & residency',           pillar: 'knowledge', expectDirectory: false, expectKb: true,  expectArticle: false, en: 'How does non-dom tax residency work in Cyprus and what would I actually pay?' },
  { key: 'company',        label: 'Company formation',         pillar: 'knowledge', expectDirectory: true,  expectKb: true,  expectArticle: false, en: 'I want to set up a company in Cyprus — what is the process and the corporate tax?', expectCategory: 'accounting' },
  { key: 'law',            label: 'Laws & legal help',         pillar: 'knowledge', expectDirectory: true,  expectKb: true,  expectArticle: false, en: 'What are the current property laws for non-EU buyers, and can you find me a lawyer in Larnaca?', expectCategory: 'law-firm', expectDistrict: 'larnaca' },
  { key: 'prices',         label: 'Prices & cost of living',   pillar: 'knowledge', expectDirectory: false, expectKb: true,  expectArticle: false, en: 'What does it cost to live comfortably in Cyprus each month?' },
  { key: 'weather',        label: 'Weather',                   pillar: 'knowledge', expectDirectory: false, expectKb: true,  expectArticle: false, en: 'What is the weather like in Cyprus in October — can I still swim in the sea?' },
  { key: 'culture',        label: 'Cypriot culture',           pillar: 'editorial', expectDirectory: false, expectKb: true,  expectArticle: true,  en: 'Tell me about Cypriot culture and the traditions I should know about.' },
  { key: 'state-of-cyprus',label: 'The current feel of Cyprus',pillar: 'editorial', expectDirectory: false, expectKb: true,  expectArticle: true,  en: 'How is the general situation in Cyprus right now — is it a good time to be here?' },

  // Property & relocation.
  { key: 'real-estate',    label: 'Buying property',           pillar: 'directory', expectDirectory: true,  expectKb: true,  expectArticle: false, en: 'I want to buy a two-bedroom apartment near the sea in Paphos — where do I start?', expectCategory: 'agency', expectDistrict: 'paphos' },
  { key: 'relocation',     label: 'Relocation & moving',       pillar: 'directory', expectDirectory: true,  expectKb: false, expectArticle: false, en: "I'm moving to Cyprus — can you find movers and relocation help?", expectCategory: 'movers' },

  // Dining, both ways — his explicit ask.
  { key: 'fine-dining',    label: 'Fine & luxury dining',      pillar: 'directory', expectDirectory: true,  expectKb: false, expectArticle: true,  en: "Where is the finest luxury dining in Limassol for a special anniversary dinner?", expectCategory: 'restaurant', expectDistrict: 'limassol' },
  { key: 'casual-dining',  label: 'Casual dining with a view', pillar: 'directory', expectDirectory: true,  expectKb: false, expectArticle: false, en: 'A relaxed place to eat with a lovely sea view in Larnaca, somewhere with real atmosphere but not too expensive?', expectCategory: 'restaurant', expectDistrict: 'larnaca' },
  { key: 'cafes',          label: 'Cafés & coffee',            pillar: 'directory', expectDirectory: true,  expectKb: false, expectArticle: false, en: 'A lovely café for good coffee and people-watching in Nicosia?' },

  // Culture & sights.
  { key: 'museums',        label: 'Museums',                   pillar: 'directory', expectDirectory: true,  expectKb: false, expectArticle: true,  en: 'Which museums are worth visiting in Nicosia?' },
  { key: 'theatre',        label: 'Theatre, shows & spectacles',pillar: 'editorial',expectDirectory: true,  expectKb: false, expectArticle: true,  en: 'Are there any theatre performances or shows on in Cyprus this month?' },
  { key: 'archaeology',    label: 'Archaeological sites',      pillar: 'directory', expectDirectory: true,  expectKb: false, expectArticle: true,  en: 'Which archaeological sites should I see near Paphos?', expectDistrict: 'paphos' },

  // The sea.
  { key: 'beaches',        label: 'Beaches',                   pillar: 'directory', expectDirectory: true,  expectKb: false, expectArticle: false, en: 'Which are the best beaches near Ayia Napa?', expectCategory: 'beach', expectDistrict: 'famagusta' },
  { key: 'diving',         label: 'Scuba & diving',            pillar: 'directory', expectDirectory: true,  expectKb: false, expectArticle: false, en: 'Where can I go scuba diving in Cyprus?' },
  { key: 'boat-trips',     label: 'Boat rentals & trips',      pillar: 'directory', expectDirectory: true,  expectKb: false, expectArticle: false, en: 'Can I rent a boat or take a boat trip from Latchi?' },
  { key: 'yachts',         label: 'Yachts & charters',         pillar: 'directory', expectDirectory: true,  expectKb: false, expectArticle: false, en: "I'd like to charter a private yacht for a day in Limassol.", expectDistrict: 'limassol' },

  // Shopping & style.
  { key: 'jewellery',      label: 'Jewellery',                 pillar: 'directory', expectDirectory: true,  expectKb: false, expectArticle: false, en: 'Where can I buy fine jewellery in Limassol?', expectDistrict: 'limassol' },
  { key: 'fashion',        label: 'Fashion & boutiques',       pillar: 'directory', expectDirectory: true,  expectKb: false, expectArticle: true,  en: 'Where is the best fashion shopping and the nicest boutiques in Cyprus?' },

  // Nightlife.
  { key: 'nightlife',      label: 'Nightlife & party miles',   pillar: 'editorial', expectDirectory: true,  expectKb: false, expectArticle: true,  en: 'Where are the best party spots and nightlife in Ayia Napa, and where do the locals actually go?', expectDistrict: 'famagusta' },

  // Stays & wine.
  { key: 'stays',          label: 'Hotels & stays',            pillar: 'directory', expectDirectory: true,  expectKb: false, expectArticle: false, en: 'A luxury hotel in Paphos for a honeymoon?', expectCategory: 'hotel', expectDistrict: 'paphos' },
  { key: 'wineries',       label: 'Wine & wineries',           pillar: 'directory', expectDirectory: true,  expectKb: false, expectArticle: true,  en: 'Can you recommend a winery to visit in the Limassol wine villages?', expectCategory: 'winery' },

  // Everyday services — including the bulk-imported home trades (the Pila/aircon case).
  { key: 'health',         label: 'Health & clinics',          pillar: 'directory', expectDirectory: true,  expectKb: false, expectArticle: false, en: 'I need a good dentist in Larnaca.', expectDistrict: 'larnaca' },
  { key: 'home-services',  label: 'Home services (aircon, electrician, plumber)', pillar: 'directory', expectDirectory: true, expectKb: false, expectArticle: false, en: 'I need an air-conditioning repair specialist in Pyla.', expectDistrict: 'larnaca' },
  { key: 'mobility',       label: 'Car hire & transfers',      pillar: 'directory', expectDirectory: true,  expectKb: false, expectArticle: false, en: 'Where can I rent a car at Larnaca airport?', expectCategory: 'car-rental' },
];

// Localized probes for the other six languages, spread across the topics so every
// language is exercised on several kinds of request (dining, property, services,
// culture, prices, the sea, nightlife). These use wording the intent dictionaries
// already recognise, so a MISS here means missing CONTENT, not a missing keyword.
const MULTILINGUAL: CoverageProbe[] = [
  // Greek
  { topic: 'fine-dining',   locale: 'el', q: 'Πού μπορώ να δειπνήσω πολυτελώς στη Λεμεσό για μια ξεχωριστή βραδιά;', expectCategory: 'restaurant', expectDistrict: 'limassol' },
  { topic: 'museums',       locale: 'el', q: 'Ποια μουσεία αξίζει να επισκεφθώ στη Λευκωσία;' },
  { topic: 'weather',       locale: 'el', q: 'Πώς είναι ο καιρός στην Κύπρο τον Οκτώβριο; Κάνει ακόμα για μπάνιο;' },
  { topic: 'real-estate',   locale: 'el', q: 'Θέλω να αγοράσω διαμέρισμα κοντά στη θάλασσα στην Πάφο.', expectDistrict: 'paphos' },
  { topic: 'home-services', locale: 'el', q: 'Χρειάζομαι τεχνικό για κλιματιστικό στην Πύλα.', expectDistrict: 'larnaca' },
  // Romanian
  { topic: 'casual-dining', locale: 'ro', q: 'Un loc frumos cu vedere la mare unde să mănânc în Larnaca, cu atmosferă plăcută?', expectDistrict: 'larnaca' },
  { topic: 'company',       locale: 'ro', q: 'Vreau să înființez o firmă în Cipru — care este procesul și impozitul?' },
  { topic: 'home-services', locale: 'ro', q: 'Am nevoie de un reparator de aer condiționat în Pila.', expectDistrict: 'larnaca' },
  { topic: 'nightlife',     locale: 'ro', q: 'Unde este cea mai bună viață de noapte în Ayia Napa?', expectDistrict: 'famagusta' },
  { topic: 'mobility',      locale: 'ro', q: 'Unde pot închiria o mașină în Larnaca?', expectCategory: 'car-rental' },
  // Arabic
  { topic: 'fine-dining',   locale: 'ar', q: 'أين أفضل مطعم فاخر في ليماسول لعشاء خاص؟', expectCategory: 'restaurant', expectDistrict: 'limassol' },
  { topic: 'stays',         locale: 'ar', q: 'أبحث عن فندق فاخر في بافوس لشهر العسل.', expectCategory: 'hotel', expectDistrict: 'paphos' },
  { topic: 'yachts',        locale: 'ar', q: 'أريد استئجار يخت خاص ليوم واحد في ليماسول.', expectDistrict: 'limassol' },
  { topic: 'jewellery',     locale: 'ar', q: 'أين أشتري مجوهرات فاخرة في ليماسول؟', expectDistrict: 'limassol' },
  // German
  { topic: 'investing',     locale: 'de', q: 'Ist Zypern ein guter Ort zum Investieren, und wie fange ich an?' },
  { topic: 'tax-residency', locale: 'de', q: 'Wie funktioniert die Non-Dom-Steuerresidenz in Zypern?' },
  { topic: 'wineries',      locale: 'de', q: 'Können Sie ein Weingut in den Weindörfern von Limassol empfehlen?', expectCategory: 'winery' },
  { topic: 'diving',        locale: 'de', q: 'Wo kann ich in Zypern tauchen gehen?' },
  // Polish
  { topic: 'real-estate',   locale: 'pl', q: 'Chcę kupić mieszkanie blisko morza w Pafos.', expectDistrict: 'paphos' },
  { topic: 'mobility',      locale: 'pl', q: 'Gdzie mogę wynająć samochód na lotnisku w Larnace?', expectCategory: 'car-rental' },
  { topic: 'fine-dining',   locale: 'pl', q: 'Gdzie zjem wykwintną kolację w Limassol?', expectCategory: 'restaurant', expectDistrict: 'limassol' },
  { topic: 'beaches',       locale: 'pl', q: 'Które plaże w pobliżu Ayia Napa są najlepsze?', expectCategory: 'beach', expectDistrict: 'famagusta' },
  // Russian
  { topic: 'real-estate',   locale: 'ru', q: 'Хочу купить квартиру у моря в Лимасоле.', expectDistrict: 'limassol' },
  { topic: 'law',           locale: 'ru', q: 'Мне нужен юрист на Кипре для покупки недвижимости.', expectCategory: 'law-firm' },
  { topic: 'nightlife',     locale: 'ru', q: 'Где лучшие вечеринки и ночная жизнь в Айя-Напе?', expectDistrict: 'famagusta' },
  { topic: 'prices',        locale: 'ru', q: 'Сколько стоит комфортно жить на Кипре в месяц?' },
  { topic: 'state-of-cyprus',locale: 'ru',q: 'Как сейчас общая обстановка на Кипре? Стоит ли приезжать?' },
];

// The full probe set: every topic in English, plus the localized spread. Built once.
export const COVERAGE_PROBES: CoverageProbe[] = [
  ...COVERAGE_TOPICS.map((t) => ({ topic: t.key, locale: 'en', q: t.en, expectCategory: t.expectCategory, expectDistrict: t.expectDistrict })),
  ...MULTILINGUAL,
];

export const TOPIC_BY_KEY: Record<string, CoverageTopic> = Object.fromEntries(COVERAGE_TOPICS.map((t) => [t.key, t]));

// ── Pure grading (unit-tested, no I/O, no model). ─────────────────────────────
export type CoverageVerdict = 'blind' | 'thin' | 'ok' | 'strong';
export interface ProbeCounts { dir: number; kb: number; articles: number; }

// Grade one probe against what its topic was expected to cover:
//   blind  — nothing came back from ANY source
//   thin   — an expected source returned nothing, or coverage is barely there
//   ok     — the expected sources returned something usable
//   strong — the expected sources are well populated (several hits each)
export function coverageVerdict(topic: CoverageTopic | undefined, c: ProbeCounts): CoverageVerdict {
  const total = c.dir + c.kb + c.articles;
  if (total === 0) return 'blind';
  // Which sources this topic is graded on. If a topic declares none, grade on the pool.
  const expected: number[] = [];
  if (!topic || (!topic.expectDirectory && !topic.expectKb && !topic.expectArticle)) {
    expected.push(total);
  } else {
    if (topic.expectDirectory) expected.push(c.dir);
    if (topic.expectKb) expected.push(c.kb);
    if (topic.expectArticle) expected.push(c.articles);
  }
  const anyExpectedEmpty = expected.some((n) => n === 0);
  if (anyExpectedEmpty || total < 2) return 'thin';
  if (expected.every((n) => n >= 3)) return 'strong';
  return 'ok';
}

const VERDICT_POINTS: Record<CoverageVerdict, number> = { blind: 0, thin: 0.34, ok: 0.7, strong: 1 };

// A 0..100 coverage score for a set of verdicts (the headline number that must rise).
export function coverageScore(verdicts: CoverageVerdict[]): number {
  if (!verdicts.length) return 0;
  const sum = verdicts.reduce((a, v) => a + VERDICT_POINTS[v], 0);
  return Math.round((sum / verdicts.length) * 1000) / 10;
}

export interface ProbeResult {
  topic: string;
  locale: string;
  q: string;
  dir: number;
  kb: number;
  articles: number;
  category: string | null;
  district: string | null;
  categoryHit: boolean;   // classifyRequest resolved the expected category/district (or any, when none expected)
  verdict: CoverageVerdict;
}

export interface CoverageTally { n: number; blind: number; thin: number; ok: number; strong: number; score: number; }

function tally(results: ProbeResult[]): CoverageTally {
  const t: CoverageTally = { n: results.length, blind: 0, thin: 0, ok: 0, strong: 0, score: 0 };
  for (const r of results) t[r.verdict]++;
  t.score = coverageScore(results.map((r) => r.verdict));
  return t;
}

export function overallCoverage(results: ProbeResult[]): CoverageTally {
  return tally(results);
}

export function rollupByTopic(results: ProbeResult[]): Record<string, CoverageTally> {
  const groups = new Map<string, ProbeResult[]>();
  for (const r of results) { const a = groups.get(r.topic) || []; a.push(r); groups.set(r.topic, a); }
  const out: Record<string, CoverageTally> = {};
  for (const [k, arr] of groups) out[k] = tally(arr);
  return out;
}

export function rollupByLocale(results: ProbeResult[]): Record<string, CoverageTally> {
  const groups = new Map<string, ProbeResult[]>();
  for (const r of results) { const a = groups.get(r.locale) || []; a.push(r); groups.set(r.locale, a); }
  const out: Record<string, CoverageTally> = {};
  for (const [k, arr] of groups) out[k] = tally(arr);
  return out;
}

// The topics where he is blind or thin — the worklist, worst first, for the next
// increments (grow the KB here, enrich the directory there).
export function gaps(results: ProbeResult[]): { topic: string; score: number; verdicts: CoverageVerdict[] }[] {
  const byTopic = rollupByTopic(results);
  return Object.entries(byTopic)
    .map(([topic, t]) => ({ topic, score: t.score, verdicts: results.filter((r) => r.topic === topic).map((r) => r.verdict) }))
    .filter((g) => g.score < 70)
    .sort((a, b) => a.score - b.score);
}

// ── The live probe (retrieval only — no answer, no judge, so it is cheap). ────
// Runs each probe through the SAME retrieval the concierge uses, with a small
// concurrency pool so the whole set finishes inside the serverless budget.
export async function runOneProbe(p: CoverageProbe): Promise<ProbeResult> {
  const loc = isConciergeLocale(p.locale) ? p.locale : 'en';
  const topic = TOPIC_BY_KEY[p.topic];
  let dir = 0, kb = 0, articles = 0;
  try {
    const picks = await searchDirectory(loc, p.q, 8);
    dir = picks.length;
  } catch { /* directory unavailable — recorded as 0 */ }
  try {
    kb = retrieveKnowledge(p.q, 5).length;
  } catch { /* KB is in-memory; ignore */ }
  try {
    const arts = await searchArticles(loc as Locale, p.q, 3);
    articles = Array.isArray(arts) ? arts.length : 0;
  } catch { /* articles unavailable — recorded as 0 */ }
  const cls = classifyRequest(p.q);
  const wantCat = p.expectCategory ?? topic?.expectCategory ?? null;
  const wantDist = p.expectDistrict ?? topic?.expectDistrict ?? null;
  // categoryHit: did routing land where we expected? When nothing specific is
  // expected, credit any resolved category or a fired category-probe.
  let categoryHit: boolean;
  if (wantCat || wantDist) {
    categoryHit = (!wantCat || cls.category === wantCat) && (!wantDist || cls.district === wantDist);
  } else {
    categoryHit = cls.category != null || categoryProbes(p.q).length > 0;
  }
  const verdict = coverageVerdict(topic, { dir, kb, articles });
  return { topic: p.topic, locale: loc, q: p.q, dir, kb, articles, category: cls.category, district: cls.district, categoryHit, verdict };
}

export async function runCoverageProbe(probes: CoverageProbe[], concurrency = 5): Promise<ProbeResult[]> {
  const out: ProbeResult[] = [];
  let i = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, probes.length)) }, async () => {
    while (i < probes.length) {
      const idx = i++;
      out[idx] = await runOneProbe(probes[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export function newCoverageRunId(prefix = 'cov'): string {
  const ts = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  return `${prefix}-${ts}-${Math.random().toString(36).slice(2, 6)}`;
}

// Persist a run so breadth is tracked over time (best-effort — a write failure must
// never lose the scorecard the caller already has).
export async function persistCoverage(runId: string, results: ProbeResult[]): Promise<void> {
  const sb = supabaseAdmin();
  const rows = results.map((r) => ({
    run_id: runId,
    topic: r.topic,
    locale: r.locale,
    question: r.q.slice(0, 500),
    dir_count: r.dir,
    kb_count: r.kb,
    article_count: r.articles,
    category: r.category,
    district: r.district,
    category_hit: r.categoryHit,
    verdict: r.verdict,
  }));
  try { await sb.from('concierge_coverage').insert(rows); } catch { /* keep the scorecard even if the write fails */ }
}
