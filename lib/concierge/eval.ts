// lib/concierge/eval.ts — roadmap item 14: LIVE-MODEL concierge quality evals.
// ----------------------------------------------------------------------------
// The gold suite (item 05) proves retrieval + intent routing OFFLINE (pure, free).
// This is the missing half: it scores the concierge's ACTUAL PROSE from the live
// model. A curated eval set is answered by the real concierge (same grounding it
// serves guests), then a cheap LLM judge rates each answer on three axes:
//   • grounded  — did it invent a business/price/fact NOT in the context? (anti-hallucination)
//   • language  — is the reply written fully & naturally in the guest's language?
//   • helpful   — is it a useful, warm, concierge-quality answer to the question?
// Results land in concierge_evals (migration 0097), so a drop in answer quality is
// caught — not just a routing regression. ON-DEMAND / OPT-IN ONLY: every run costs
// model calls, so it is never auto-scheduled (cost-sensitive mandate). Triggered
// from the admin panel (a quick sample, synchronous) or the job queue (the full set,
// chunked across worker cycles).
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  assembleContext, conciergeSystem, groundingBlock, CONCIERGE_MODEL, isConciergeLocale,
} from '@/lib/concierge/brain';
import { callClaude, parseAiJson, CLAUDE_HAIKU } from '@/lib/ai';

export interface EvalItem { id: string; locale: string; intent: string; question: string; }

// ── The curated eval set. Synthetic questions (no PII) across the intents that
// matter and all seven languages, so a run exercises retrieval + prose + language
// fidelity together. English (the base) gets the widest spread; each other language
// gets a rotating mix so every locale is scored on grounding and on writing in its
// own tongue. Keep questions realistic — how a guest actually asks.
export const EVAL_SET: EvalItem[] = [
  // English — widest spread.
  { id: 'en-restaurant', locale: 'en', intent: 'restaurant', question: 'Can you recommend a good seafood restaurant in Limassol for a special dinner?' },
  { id: 'en-realestate', locale: 'en', intent: 'realestate', question: 'I want to buy a two-bedroom apartment near the sea in Paphos — where should I start?' },
  { id: 'en-legal', locale: 'en', intent: 'professional', question: 'I need a lawyer in Larnaca to help me set up a Cyprus company. Who do you suggest?' },
  { id: 'en-carhire', locale: 'en', intent: 'mobility', question: 'Where can I rent a car when I land at Larnaca airport?' },
  { id: 'en-near', locale: 'en', intent: 'neighbourhood', question: 'Is there a good pharmacy near Mackenzie in Larnaca?' },
  { id: 'en-kb-property', locale: 'en', intent: 'practical', question: 'As a non-EU citizen, can I buy property in Cyprus, and what is the process?' },
  // Greek.
  { id: 'el-restaurant', locale: 'el', intent: 'restaurant', question: 'Μπορείτε να μου προτείνετε ένα ωραίο εστιατόριο με θαλασσινά στη Λεμεσό;' },
  { id: 'el-realestate', locale: 'el', intent: 'realestate', question: 'Θέλω να αγοράσω ένα διαμέρισμα κοντά στη θάλασσα στην Πάφο. Από πού να ξεκινήσω;' },
  { id: 'el-mobility', locale: 'el', intent: 'mobility', question: 'Πού μπορώ να νοικιάσω αυτοκίνητο στη Λάρνακα;' },
  // Romanian.
  { id: 'ro-realestate', locale: 'ro', intent: 'realestate', question: 'Vreau să cumpăr un apartament cu vedere la mare în Paphos. De unde să încep?' },
  { id: 'ro-mobility', locale: 'ro', intent: 'mobility', question: 'Unde pot închiria o mașină în Larnaca?' },
  { id: 'ro-legal', locale: 'ro', intent: 'professional', question: 'Am nevoie de un avocat în Limassol pentru a înființa o firmă în Cipru.' },
  // Arabic (RTL).
  { id: 'ar-restaurant', locale: 'ar', intent: 'restaurant', question: 'هل يمكنك أن تنصحني بمطعم مأكولات بحرية جيد في ليماسول؟' },
  { id: 'ar-hotel', locale: 'ar', intent: 'hotel', question: 'أبحث عن فندق فاخر في بافوس لقضاء شهر العسل. ماذا تقترح؟' },
  { id: 'ar-realestate', locale: 'ar', intent: 'realestate', question: 'أريد شراء شقة قرب البحر في ليماسول. كيف أبدأ؟' },
  // German.
  { id: 'de-realestate', locale: 'de', intent: 'realestate', question: 'Ich möchte eine Villa mit Meerblick in Limassol kaufen. Wo fange ich an?' },
  { id: 'de-legal', locale: 'de', intent: 'professional', question: 'Ich brauche einen Steuerberater in Nikosia für meine Firmengründung in Zypern.' },
  { id: 'de-kb-weather', locale: 'de', intent: 'practical', question: 'Wie ist das Wetter in Zypern im Oktober — kann man noch im Meer schwimmen?' },
  // Polish.
  { id: 'pl-restaurant', locale: 'pl', intent: 'restaurant', question: 'Czy możesz polecić dobrą restaurację rybną w Limassol?' },
  { id: 'pl-mobility', locale: 'pl', intent: 'mobility', question: 'Gdzie mogę wynająć samochód na lotnisku w Larnace?' },
  { id: 'pl-realestate', locale: 'pl', intent: 'realestate', question: 'Chcę kupić mieszkanie blisko morza w Pafos. Od czego zacząć?' },
  // Russian.
  { id: 'ru-realestate', locale: 'ru', intent: 'realestate', question: 'Хочу купить квартиру у моря в Лимасоле. С чего начать?' },
  { id: 'ru-legal', locale: 'ru', intent: 'professional', question: 'Мне нужен юрист в Ларнаке для открытия компании на Кипре.' },
  { id: 'ru-hotel', locale: 'ru', intent: 'hotel', question: 'Посоветуйте роскошный отель в Пафосе для медового месяца.' },

  // ── The wider vision (item: "he should know everything"): dining both ways,
  // culture & sights, the sea, style, nightlife, prices, investing and the feel of
  // Cyprus — so the live quality eval scores the same breadth the coverage probe maps.
  { id: 'en-finedining', locale: 'en', intent: 'fine-dining', question: "Where is the finest luxury dining in Limassol for a special anniversary dinner?" },
  { id: 'en-casual', locale: 'en', intent: 'casual-dining', question: 'A relaxed place with a lovely sea view in Larnaca for a good, affordable lunch?' },
  { id: 'en-culture', locale: 'en', intent: 'culture', question: 'Which museums and archaeological sites should I see near Paphos?' },
  { id: 'en-diving', locale: 'en', intent: 'activity', question: 'Where can I go scuba diving in Cyprus?' },
  { id: 'en-yacht', locale: 'en', intent: 'luxury', question: "I'd like to charter a private yacht for a day from Limassol." },
  { id: 'en-nightlife', locale: 'en', intent: 'nightlife', question: 'Where is the best nightlife in Ayia Napa, and where do the locals actually go?' },
  { id: 'en-prices', locale: 'en', intent: 'practical', question: 'What does it cost to live comfortably in Cyprus each month?' },
  { id: 'en-invest', locale: 'en', intent: 'practical', question: 'Is Cyprus a good place to invest, and how do foreigners get started?' },
  { id: 'el-culture', locale: 'el', intent: 'culture', question: 'Ποια μουσεία και αρχαιολογικοί χώροι αξίζουν κοντά στην Πάφο;' },
  { id: 'ro-casual', locale: 'ro', intent: 'casual-dining', question: 'Un loc frumos cu vedere la mare în Larnaca, cu o atmosferă plăcută?' },
  { id: 'ar-jewellery', locale: 'ar', intent: 'retail', question: 'أين أشتري مجوهرات فاخرة في ليماسول؟' },
  { id: 'de-invest', locale: 'de', intent: 'practical', question: 'Ist Zypern ein guter Ort zum Investieren, und wie fange ich an?' },
  { id: 'pl-beach', locale: 'pl', intent: 'beach', question: 'Które plaże w pobliżu Ayia Napa są najlepsze?' },
  { id: 'ru-state', locale: 'ru', intent: 'practical', question: 'Как сейчас общая обстановка на Кипре? Стоит ли приезжать?' },
];

const LANG_NAME: Record<string, string> = {
  en: 'English', el: 'Greek', ro: 'Romanian', ar: 'Arabic', de: 'German', pl: 'Polish', ru: 'Russian',
};

// ── Pure scoring (unit-tested, no I/O, no model). ─────────────────────────────
export interface EvalScores { grounded: number; language: number; helpful: number; }

// Coerce a judge score to an integer in 0..5 (0 = missing/invalid).
export function clampScore(n: unknown): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(5, v));
}

export function overallScore(s: EvalScores): number {
  return Math.round(((s.grounded + s.language + s.helpful) / 3) * 100) / 100;
}

// Verdict rules: a hallucination (grounded ≤ 2) or wrong language (language ≤ 2) is
// a hard FAIL regardless of the average — those are the two things that must never
// ship. Otherwise a mediocre average (< 3.5) is WEAK, and the rest PASS.
export function verdictFor(s: EvalScores): 'pass' | 'weak' | 'fail' {
  if (s.grounded <= 2 || s.language <= 2) return 'fail';
  if (overallScore(s) < 3.5) return 'weak';
  return 'pass';
}

// ── Live answer — the REAL concierge, same grounding it serves guests. ─────────
export interface AnswerResult { answer: string; grounding: string; picks: number; kb: number; error?: string; }

export async function conciergeAnswer(locale: string, question: string): Promise<AnswerResult> {
  const loc = isConciergeLocale(locale) ? locale : 'en';
  const ctx = await assembleContext(loc, question);
  const grounding = groundingBlock(ctx, loc);
  const system = conciergeSystem(loc) + grounding;
  const r = await callClaude({
    systemInstruction: system,
    userMessage: question,
    model: CONCIERGE_MODEL,
    maxTokens: 700,
    fn: 'eval-answer',
  });
  return { answer: r.text || '', grounding, picks: ctx.picks.length, kb: ctx.kb.length, error: r.error };
}

// ── LLM judge — cheap Haiku, strict rubric, JSON out. It sees the SAME context the
// concierge was allowed to use, so it can tell a grounded answer from a fabricated
// one (a business/price not in the context is a hallucination). ────────────────
const JUDGE_SYSTEM =
  'You are a strict quality evaluator for a luxury concierge assistant serving the Republic of Cyprus (the south; never Northern Cyprus). ' +
  'You are given: the CONTEXT the concierge was allowed to use (its ONLY permitted source of specific businesses, prices and facts), the guest QUESTION, the REQUIRED LANGUAGE of the reply, and the concierge ANSWER. ' +
  'Score the answer on three axes, each an integer from 1 (poor) to 5 (excellent):\n' +
  '- grounded: Does every SPECIFIC business name, price, phone number or hard fact in the answer appear in the CONTEXT? General common knowledge about Cyprus (driving on the left, the euro, the airport names, that the sea is swimmable into autumn) is allowed and NOT a fabrication. Honestly saying it does not have something and offering to have the concierge desk follow up is well-grounded — do NOT penalise it. 5 = invents nothing; 1 = fabricates specific businesses or prices not in the context.\n' +
  '- language: Is the answer written entirely and naturally in the REQUIRED LANGUAGE? 5 = fluent and fully in that language; 3 = mostly, with slips; 1 = wrong language or heavily mixed.\n' +
  '- helpful: Is it a useful, warm, concierge-quality answer to the question — concise, specific and actionable? 5 = excellent; 1 = evasive, generic or off-topic.\n' +
  'Return ONLY a JSON object: {"grounded":n,"language":n,"helpful":n,"notes":"one short sentence"}.';

export interface JudgeResult extends EvalScores { notes: string; error?: string; }

export async function judgeAnswer(item: EvalItem, answer: string, grounding: string): Promise<JudgeResult> {
  const lang = LANG_NAME[item.locale] || 'English';
  const user = [
    `REQUIRED LANGUAGE: ${lang}`,
    `GUEST QUESTION: ${item.question}`,
    `CONTEXT THE CONCIERGE WAS ALLOWED TO USE:\n${(grounding || '(none)').slice(0, 3000)}`,
    `CONCIERGE ANSWER:\n${(answer || '(empty)').slice(0, 2500)}`,
  ].join('\n\n');
  const r = await callClaude({
    systemInstruction: JUDGE_SYSTEM, userMessage: user,
    model: CLAUDE_HAIKU, jsonMode: true, maxTokens: 300, fn: 'eval-judge',
  });
  if (r.error) return { grounded: 0, language: 0, helpful: 0, notes: '', error: r.error };
  const j = parseAiJson<{ grounded?: number; language?: number; helpful?: number; notes?: string }>(r.text);
  return {
    grounded: clampScore(j.grounded),
    language: clampScore(j.language),
    helpful: clampScore(j.helpful),
    notes: String(j.notes || '').slice(0, 300),
  };
}

// ── One batch: answer → judge → verdict → persist, tallying a summary. ─────────
export interface EvalRunSummary { runId: string; n: number; pass: number; weak: number; fail: number; errors: number; avgOverall: number; }

export function newRunId(prefix = 'run'): string {
  const ts = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  return `${prefix}-${ts}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function runEvalBatch(items: EvalItem[], runId: string): Promise<EvalRunSummary> {
  const sb = supabaseAdmin();
  let pass = 0, weak = 0, fail = 0, errors = 0, sum = 0, scored = 0;
  for (const item of items) {
    const loc = isConciergeLocale(item.locale) ? item.locale : 'en';
    let answer = '', notes = '', verdict: string | null = null;
    let scores: EvalScores = { grounded: 0, language: 0, helpful: 0 };
    let overall: number | null = null;
    try {
      const a = await conciergeAnswer(loc, item.question);
      answer = a.answer;
      if (a.error || !answer) {
        notes = `answer error: ${a.error || 'empty answer'}`;
        scores = { grounded: 1, language: 1, helpful: 1 }; overall = 1; verdict = 'fail';
      } else {
        const j = await judgeAnswer(item, answer, a.grounding);
        if (j.error) {
          notes = `judge error: ${j.error}`; verdict = null; overall = null; // scored later, not now
        } else {
          scores = { grounded: j.grounded, language: j.language, helpful: j.helpful };
          overall = overallScore(scores);
          verdict = verdictFor(scores);
          notes = j.notes;
        }
      }
    } catch (e) {
      notes = `error: ${(e as Error).message}`;
      scores = { grounded: 1, language: 1, helpful: 1 }; overall = 1; verdict = 'fail';
    }
    if (verdict === 'pass') pass++;
    else if (verdict === 'weak') weak++;
    else if (verdict === 'fail') fail++;
    else errors++; // judge unavailable — not counted as pass/weak/fail
    if (overall != null) { sum += overall; scored++; }
    try {
      await sb.from('concierge_evals').insert({
        run_id: runId,
        locale: loc,
        intent: item.intent,
        question: item.question,
        answer: answer.slice(0, 4000),
        grounded_score: scores.grounded || null,
        language_score: scores.language || null,
        helpful_score: scores.helpful || null,
        overall,
        verdict,
        notes: notes || null,
        model: CONCIERGE_MODEL,
      });
    } catch { /* a persistence failure must not abort the batch */ }
  }
  return { runId, n: items.length, pass, weak, fail, errors, avgOverall: scored ? Math.round((sum / scored) * 100) / 100 : 0 };
}

// A spread sample across locales (round-robin), so a quick synchronous run touches
// several languages and intents rather than clustering on one. Used by the admin
// "run a quick sample" button — small, to stay within the serverless time budget.
export function sampleEvalSet(n = 4): EvalItem[] {
  const byLocale = new Map<string, EvalItem[]>();
  for (const it of EVAL_SET) {
    const a = byLocale.get(it.locale) || [];
    a.push(it); byLocale.set(it.locale, a);
  }
  const locales = Array.from(byLocale.keys());
  const out: EvalItem[] = [];
  const want = Math.min(n, EVAL_SET.length);
  let round = 0;
  while (out.length < want && round < EVAL_SET.length) {
    for (const loc of locales) {
      const arr = byLocale.get(loc)!;
      if (round < arr.length) { out.push(arr[round]); if (out.length >= want) break; }
    }
    round++;
  }
  return out;
}
