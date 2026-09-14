// supabase/functions/process-scraped-article/index.ts
//
// ============================================================================
// CYPRUS LIFESTYLE — AI EDITORIAL DESK  (faithful port of TT's engine,
// extended to FOUR NATIVELY-COMPOSED languages: EN · EL · RO · AR)
// ============================================================================
//
// Turns one scraped_articles row (source may be English, Arabic, French,
// German, Romanian or Greek) into a publish-grade FOUR-LANGUAGE article.
//
// KEY PRINCIPLE (per Daniel): nothing is ever a literal translation. Desk 1
// atomises the source into a shared ENGLISH fact digest; then each edition is
// COMPOSED NATIVELY from those facts by its own writing desk — English re-reports
// the story, Greek/Romanian/Arabic are each written by a native-language desk
// that thinks in that language from the first word. An English source is never
// "translated" to English; it is re-reported. Every edition passes the SAME
// gates independently: anti-plagiarism vs the original source, the AI-tell +
// humanness-enforcement loop, and the full NYT/WaPo journalism ruleset.
//
// PIPELINE:
//   0. Source-quality gate (reject CSS/JSON-LD/non-prose)
//   1. Atomic claim (scraped → rewriting)
//   2. Desk 1 (Gemini) — classify category/district/editor, detect source
//      language, atomise facts into English telegrams
//   3. Archetype — evidence-density → article type → length budget
//   4. Desk 2 — for EN, EL, RO, AR: compose NATIVELY from the facts (GPT-4o for
//      the English base, Sonnet for the native-language desks, GPT-4o fallback),
//      with fabrication ban, anti-hallucination, anti-plagiarism, anti-padding,
//      native-language rules, title craft and the humanising constraints
//   5. Per edition: sanitize + AI-tell scrub, plagiarism gate vs source,
//      humanness-enforcement loop (measure → Sonnet revision → re-measure)
//   6. Cover (Unsplash, grounded to Cyprus), author lookup
//   7. Atomic commit via commit_scraper_blog_post (4-lang) + generation_logs
//
// AUTH: admin-only, fails closed. Self-contained — pastes into the dashboard.
// SECRETS: CLAUDE_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, UNSPLASH_ACCESS_KEY.
// CALLS: {source:'cron'} batch | {scraped_article_id:uuid} one now | {} batch
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
type SupaClient = ReturnType<typeof createClient<any, any, any>>;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── models & budgets ─────────────────────────────────────────────────────────
// Model IDs are read from Supabase secrets so the exact ID your account supports
// can be set/changed in the dashboard WITHOUT redeploying code. Defaults below.
// gemini-2.5-flash was retired ("no longer available"). Use the auto-tracking
// alias so a retired snapshot can't 404 the pipeline again; overridable via secret.
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest";
const SONNET_MODEL = Deno.env.get("SONNET_MODEL") || "claude-sonnet-5";
// If the primary Sonnet ID is not served by this key (your usage showed
// claude-sonnet-5 = 0 requests while Sonnet 4.x served fine), the writer
// automatically retries on this model so Sonnet-grade prose is still produced.
// Fallback writer: Opus 5 — higher quality than Sonnet and long-lived (retires
// no sooner than 2027-07-24). Deliberately NOT claude-sonnet-4-5, which retires
// 2026-09-29. Both writer models are Claude; change either via Supabase secrets.
const OPUS_MODEL = Deno.env.get("OPUS_MODEL") || "claude-opus-5";
const GPT_MODEL = Deno.env.get("GPT_MODEL") || "gpt-4o";
// GPT-4o writes flat prose, so it is OFF by default: the writer is Claude-only.
// Set the secret USE_GPT_FALLBACK="true" to re-enable it as a last resort.
const USE_GPT_FALLBACK = (Deno.env.get("USE_GPT_FALLBACK") || "false").toLowerCase() === "true";
const CALL_TIMEOUT_MS = 45000; // per-call abort (matches TT; a prefill retry can follow)
// Kept UNDER Supabase's ~200s edge-function wall-clock kill (TT documents this).
// The four editions compose in parallel, so wall-clock ≈ one edition's time, not 4×.
const TOTAL_SOFT_LIMIT_MS = 180000;
const BATCH_MAX = 3;

// ── taxonomy (Cyprus) ────────────────────────────────────────────────────────
type Lang = "en" | "el" | "ro" | "ar";
const LANGS: Lang[] = ["en", "el", "ro", "ar"];
const LANG_NAME: Record<Lang, string> = { en: "English", el: "Greek", ro: "Romanian", ar: "Arabic" };

type EditorKey = "cyprus" | "business" | "property" | "culture" | "escapes" | "table" | "world";
const VALID_CATEGORIES: string[] = ["cyprus", "business", "property", "culture", "escapes", "table", "world"];
const VALID_SUBCATEGORIES = ["regional", "national", "international"];
const DISTRICTS = ["nicosia", "limassol", "larnaca", "famagusta", "paphos", "kyrenia"];
const CAT_ALIASES: Record<string, string> = {
  news: "cyprus",
  politics: "cyprus",
  economy: "business",
  finance: "business",
  markets: "business",
  "real-estate": "property",
  realestate: "property",
  homes: "property",
  arts: "culture",
  art: "culture",
  heritage: "culture",
  society: "culture",
  travel: "escapes",
  tourism: "escapes",
  hotels: "escapes",
  yachts: "escapes",
  food: "table",
  wine: "table",
  gastronomy: "table",
  dining: "table",
  restaurants: "table",
  greece: "world",
  gulf: "world",
  europe: "world",
  region: "world",
  international: "world",
};
const SUB_ALIASES: Record<string, string> = {
  local: "regional",
  regional: "regional",
  national: "national",
  international: "international",
  world: "international",
};
function editorForCategory(category?: string | null): EditorKey {
  const c = (category || "").toLowerCase();
  if (VALID_CATEGORIES.includes(c) && c !== "world") return c as EditorKey;
  if (c.includes("propert") || c.includes("real")) return "property";
  if (c.includes("business") || c.includes("econom") || c.includes("financ") || c.includes("market")) {
    return "business";
  }
  if (c.includes("cultur") || c.includes("art") || c.includes("herit") || c.includes("society")) {
    return "culture";
  }
  if (c.includes("travel") || c.includes("escape") || c.includes("hotel") || c.includes("yacht")) {
    return "escapes";
  }
  if (
    c.includes("food") || c.includes("table") || c.includes("wine") || c.includes("gastro") ||
    c.includes("restaur")
  ) return "table";
  if (c.includes("world") || c.includes("gulf") || c.includes("greece") || c.includes("europe")) {
    return "world";
  }
  return "cyprus";
}
const AUTHOR_SLUG: Record<EditorKey, string> = {
  cyprus: "cyprus-desk",
  business: "business-desk",
  property: "property-desk",
  culture: "culture-desk",
  escapes: "escapes-desk",
  table: "table-desk",
  world: "cyprus-desk",
};
const AUTHOR_NAME: Record<EditorKey, string> = {
  cyprus: "The Cyprus Desk",
  business: "The Business Desk",
  property: "The Property Desk",
  culture: "The Culture Desk",
  escapes: "The Escapes Desk",
  table: "The Table",
  world: "The Cyprus Desk",
};

// ── Cyprus Lifestyle house voice ─────────────────────────────────────────────
const HOUSE_VOICE =
  `You write for Cyprus Lifestyle — a luxury Cyprus newspaper-magazine read by international investors and relocators, the Cypriot elite, the Gulf's visitors and the Romanian professional community.
VOICE: assured, not loud. Worldly, not distant. Warm, not casual. Precise, never fussy. Restraint reads as expensive; specifics read as true.
HOUSE RULES: British spelling, currency in euro (€), distances in km, dates like "12 September 2026". Never em/en dashes. Sentence-case headlines, never ALL CAPS or Title Case; keep real acronyms (EU, VAT, NATO, CSE). No hype, no hard sell. Concrete nouns over adjectives. Attribute facts to their source; never invent quotes, prices, names or figures. Write for a reader who has been everywhere; tell them something they don't know about Cyprus.`;
const DESK_BRIEF: Record<EditorKey, string> = {
  cyprus:
    "The Cyprus Desk — governance, the Republic, the economy of the island and the stories shaping daily life. Authoritative, current, fair.",
  business:
    "The Business Desk — markets, funds, shipping, tech, tax residency and the money moving through Limassol and Nicosia. Numbers first; one figure that matters.",
  property:
    "The Property Desk — villas, the marina, new coastal architecture, interiors, residency by investment. The island as an address; honest appraisal over sales copy.",
  culture:
    "The Culture Desk — antiquity and Byzantine gold, contemporary art, music, the Aphrodite myth, society and patronage. One artefact, one story.",
  escapes:
    "The Escapes Desk — Akamas, Troodos, the coast, marina life, where to go and how to arrive. One place, done properly.",
  table:
    "The Table — chefs, growers, the Cypriot kitchen and Commandaria, the oldest named wine. Where we are eating, and why.",
  world:
    "The World Desk — the region read through a Cypriot lens: Greece, the Levant, the Gulf, Europe. Why it matters here.",
};
function deskBrief(e: string): string {
  return DESK_BRIEF[e as EditorKey] || DESK_BRIEF.cyprus;
}
function deskName(e: string): string {
  return AUTHOR_NAME[e as EditorKey] || "The Cyprus Desk";
}

// ============================================================================
// ANTI-AI LAYER — de-shout, dash-strip, lexicon scrub, humanize, detector
// (ported from TT; EN full + EL/RO/AR native lexicons)
// ============================================================================
const KEEP_UPPER = new Set<string>([
  "EU",
  "VAT",
  "NATO",
  "CSE",
  "UK",
  "US",
  "USA",
  "UAE",
  "GDP",
  "ECB",
  "IMF",
  "UN",
  "WHO",
  "OECD",
  "OPEC",
  "G7",
  "G20",
  "BRICS",
  "AI",
  "EV",
  "IPO",
  "ETF",
  "VC",
  "CEO",
  "CFO",
  "MP",
  "EEZ",
  "LNG",
  "ID",
  "TV",
  "PR",
  "HR",
  "CBC",
  "RCB",
  "HNWI",
  "KYC",
  "AML",
  "GDPR",
  "RES",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
]);
const PROPER = new Map<string, string>(([
  "cyprus",
  "Cyprus",
  "nicosia",
  "Nicosia",
  "limassol",
  "Limassol",
  "larnaca",
  "Larnaca",
  "famagusta",
  "Famagusta",
  "paphos",
  "Paphos",
  "kyrenia",
  "Kyrenia",
  "troodos",
  "Troodos",
  "akamas",
  "Akamas",
  "ayia",
  "Ayia",
  "napa",
  "Napa",
  "protaras",
  "Protaras",
  "kakopetria",
  "Kakopetria",
  "greece",
  "Greece",
  "athens",
  "Athens",
  "europe",
  "Europe",
  "brussels",
  "Brussels",
  "london",
  "London",
  "dubai",
  "Dubai",
  "abu",
  "Abu",
  "dhabi",
  "Dhabi",
  "israel",
  "Israel",
  "lebanon",
  "Lebanon",
  "egypt",
  "Egypt",
  "monday",
  "Monday",
  "tuesday",
  "Tuesday",
  "wednesday",
  "Wednesday",
  "thursday",
  "Thursday",
  "friday",
  "Friday",
  "saturday",
  "Saturday",
  "sunday",
  "Sunday",
  "january",
  "January",
  "february",
  "February",
  "april",
  "April",
  "june",
  "June",
  "july",
  "July",
  "september",
  "September",
  "october",
  "October",
  "november",
  "November",
  "december",
  "December",
] as string[]).reduce<[string, string][]>((acc, cur, i, arr) => {
  if (i % 2 === 0) acc.push([cur, arr[i + 1]]);
  return acc;
}, []));

function isAllCapsToken(w: string): boolean {
  const l = w.replace(/[^\p{L}]/gu, "");
  if (l.length < 2) return false;
  if (l === l.toLowerCase()) return false;
  return l === l.toUpperCase();
}
function restoreProper(w: string): string {
  return PROPER.get(w.toLowerCase()) ?? w;
}
function deShoutTitle(title: string): string {
  if (!title || typeof title !== "string") return title || "";
  let saw = false;
  const out = title.replace(/[\p{L}][\p{L}\p{M}'''\-]*/gu, (word) => {
    const bare = word.replace(/[.\-']/g, "");
    if (KEEP_UPPER.has(bare.toUpperCase()) && isAllCapsToken(word)) return word;
    if (!isAllCapsToken(word)) return word;
    saw = true;
    const lowered = word.toLowerCase();
    if (lowered.includes("-")) {
      const whole = PROPER.get(lowered);
      if (whole) return whole;
      return lowered.split("-").map(restoreProper).join("-");
    }
    return restoreProper(lowered);
  });
  if (!saw) return title.trim();
  return out.replace(/(^\s*|[.!?:]\s+)([\p{Ll}])/gu, (_m, b, ch) => b + ch.toUpperCase()).replace(
    /\s{2,}/g,
    " ",
  ).trim();
}
// Dash strip — Latin em/en dashes → comma (or Arabic comma for AR). Idempotent.
function stripDashes(s: string, lang: Lang = "en"): string {
  if (!s) return s;
  const sep = lang === "ar" ? "، " : ", ";
  let r = s.replace(/&mdash;|&#8212;|&#x2014;/gi, "—").replace(/&ndash;|&#8211;|&#x2013;/gi, "–");
  r = r.replace(/(\d)\s*[–—]\s*(\d)/g, "$1-$2");
  r = r.replace(/\s+[–—]\s+/g, sep).replace(/\s+--\s+/g, sep);
  r = r.replace(/—/g, sep).replace(/–/g, "-");
  r = r.replace(/\s+،/g, "،").replace(/\s+,/g, ",").replace(/,\s*,/g, ",").replace(/[ \t]{2,}/g, " ");
  return r;
}
function caseRep(to: string) {
  return (m: string): string => {
    if (!to) return "";
    const fa = m.match(/[\p{L}]/u);
    if (fa && fa[0] === fa[0].toUpperCase() && fa[0] !== fa[0].toLowerCase()) {
      return to.charAt(0).toUpperCase() + to.slice(1);
    }
    return to;
  };
}

// per-language mid-sentence AI-cliché → plain replacements
const LEX: Record<Lang, Array<[RegExp, string]>> = {
  en: [
    [/\bdelve into\b/gi, "examine"],
    [/\bdelving into\b/gi, "examining"],
    [/\ba testament to\b/gi, "proof of"],
    [/\btestament to\b/gi, "proof of"],
    [/\bstands as a\b/gi, "is a"],
    [/\bstands as\b/gi, "is"],
    [/\bboasts\b/gi, "has"],
    [/\bboasting\b/gi, "with"],
    [/\bnestled\b/gi, "set"],
    [/\bin the heart of\b/gi, "in"],
    [/\brich tapestry of\b/gi, "mix of"],
    [/\btapestry of\b/gi, "mix of"],
    [/\bwhen it comes to\b/gi, "for"],
    [/\bin the realm of\b/gi, "in"],
    [/\bin the world of\b/gi, "in"],
    [/\bplays? an? (?:crucial|vital|key|pivotal|central|important|significant) role in\b/gi, "is central to"],
    [/\bplays? an? (?:crucial|vital|key|pivotal|central|important|significant) role\b/gi, "is central"],
    [/\bunderscores\b/gi, "highlights"],
    [/\bunderscoring\b/gi, "highlighting"],
    [/\bunderscore\b/gi, "highlight"],
    [/\bshowcasing\b/gi, "showing"],
    [/\bshowcases\b/gi, "shows"],
    [/\bshowcase\b/gi, "show"],
    [/\butilizes\b/gi, "uses"],
    [/\butilizing\b/gi, "using"],
    [/\butilize\b/gi, "use"],
    [/\bleveraging\b/gi, "using"],
    [/\bto leverage\b/gi, "to use"],
    [/\ba myriad of\b/gi, "many"],
    [/\bmyriad of\b/gi, "many"],
    [/\ba plethora of\b/gi, "many"],
    [/\bplethora of\b/gi, "many"],
    [/\bseamlessly\b/gi, "smoothly"],
    [/\bseamless\b/gi, "smooth"],
    [/\bbustling\b/gi, "busy"],
    [/\bmeticulously\b/gi, "carefully"],
    [/\bmeticulous\b/gi, "careful"],
    [/\bcutting-edge\b/gi, "advanced"],
    [/\bstate-of-the-art\b/gi, "advanced"],
    [/\bgame-?chang(?:er|ing)\b/gi, "major shift"],
    [/\bever-(?:evolving|changing)\b/gi, "changing"],
    [/\bsheds light on\b/gi, "explains"],
    [/\bshed light on\b/gi, "explain"],
    [/\bpaving the way for\b/gi, "enabling"],
    [/\bpave the way for\b/gi, "enable"],
    [/\bpaved the way for\b/gi, "enabled"],
    [/\bnavigating the (?:complexities|challenges|landscape) of\b/gi, "handling"],
    [/\btreasure trove of\b/gi, "wealth of"],
    [/\ba beacon of\b/gi, "a symbol of"],
    [/\bpivotal\b/gi, "key"],
  ],
  el: [
    [/\bαποτελεί απόδειξη\b/gi, "αποδεικνύει"],
    [/\bστην καρδιά (της|του)\b/gi, "σε"],
    [/\bδιαδραματίζει καθοριστικό ρόλο\b/gi, "είναι κρίσιμο"],
    [/\bαναδεικνύει\b/gi, "δείχνει"],
    [/\bσηματοδοτεί\b/gi, "δείχνει"],
    [/\bένα ευρύ φάσμα\b/gi, "πολλά"],
    [/\bστη σύγχρονη εποχή\b/gi, "σήμερα"],
  ],
  ro: [
    [
      /\bjoacă un rol (?:crucial|esențial|cheie|vital|decisiv|central|important) (?:în|pentru)\b/gi,
      "este esențial pentru",
    ],
    [/\bjoacă un rol (?:crucial|esențial|cheie|vital|decisiv|central|important)\b/gi, "este esențial"],
    [/\bo gamă largă de\b/gi, "multe"],
    [/\bo gamă variată de\b/gi, "multe"],
    [/\bo multitudine de\b/gi, "multe"],
    [/\bo mulțime de\b/gi, "multe"],
    [/\bpune în lumină\b/gi, "arată"],
    [/\bscoate în evidență\b/gi, "arată"],
    [/\bsubliniază faptul că\b/gi, "arată că"],
    [/\bevidențiază faptul că\b/gi, "arată că"],
    [/\bsubliniază\b/gi, "arată"],
    [/\bevidențiază\b/gi, "arată"],
    [/\bîn contextul în care\b/gi, "în timp ce"],
    [/\bo serie de\b/gi, "mai multe"],
    [/\bo creștere semnificativă\b/gi, "o creștere importantă"],
    [/\bun rol semnificativ\b/gi, "un rol important"],
    [/\bdeschide calea (?:către|pentru|spre)\b/gi, "permite"],
    [/\bîn era digitală\b/gi, "astăzi"],
    [/\bstă ca un testament\b/gi, "dovedește"],
  ],
  ar: [
    [/\bشهادة على\b/g, "دليل على"],
    [/\bنسيج غني من\b/g, "مجموعة من"],
    [/\bفي عالم سريع التغير\b/g, "اليوم"],
    [/\bتجربة سلسة\b/g, "تجربة سهلة"],
    [/\bيلعب دورًا (?:محوريًا|حاسمًا|أساسيًا)\b/g, "أساسي"],
    [/\bفي قلب\b/g, "في"],
    [/\bالغوص في\b/g, "استكشاف"],
    [/\bحجر الزاوية\b/g, "الأساس"],
  ],
};
const FILLERS: Record<Lang, string> = {
  en:
    "Moreover|Furthermore|Additionally|In addition|Notably|Importantly|Crucially|Indeed|Ultimately|In conclusion|In summary|To summarize|To sum up|All in all|That said|It is worth noting that|It is important to note that|In today.?s (?:fast-paced |digital |modern )?world|At the end of the day",
  el:
    "Επιπλέον|Επιπροσθέτως|Αξίζει να σημειωθεί ότι|Είναι σημαντικό να σημειωθεί ότι|Εν κατακλείδι|Συμπερασματικά|Τέλος",
  ro:
    "Mai mult decât atât|Mai mult|Totodată|În plus|De asemenea|Nu în ultimul rând|În esență|De altfel|În concluzie|În cele din urmă|Merită menționat că|Merită subliniat că|Este important de menționat că|Trebuie subliniat că",
  ar: "علاوة على ذلك|إضافة إلى ذلك|من الجدير بالذكر أن|تجدر الإشارة إلى أن|في الختام|في النهاية|وأخيرًا",
};
function dropFillers(s: string, lang: Lang): string {
  const alt = FILLERS[lang];
  if (!alt) return s;
  const re = new RegExp("(^|[.!?؟।]\\s+|\\n+)\\s*(?:" + alt + ")\\b[,،:]?\\s+([\\p{L}])", "gu");
  return s.replace(re, (_m, b, ch) => b + ch.toUpperCase());
}
function scrubLexicon(s: string, lang: Lang): string {
  if (!s) return s;
  let r = s;
  for (const [re, to] of (LEX[lang] || [])) r = r.replace(re, caseRep(to));
  r = dropFillers(r, lang);
  return r.replace(/[ \t]{2,}/g, " ").replace(/\s+،/g, "،").replace(/\s+,/g, ",").replace(/,\s*,/g, ",");
}
function humanizeText(s: string, lang: Lang): string {
  if (!s) return s;
  return scrubLexicon(stripDashes(s, lang), lang).trim();
}
// HTML-preserving: transform ONLY text nodes, never tags/attributes.
function humanizeHtml(html: string, lang: Lang): string {
  if (!html) return html;
  return html.split(/(<[^>]*>)/g).map((seg) => {
    if (!seg || seg[0] === "<") return seg;
    const lead = (seg.match(/^\s*/) || [""])[0], trail = (seg.match(/\s*$/) || [""])[0];
    let core = seg.slice(lead.length, seg.length - trail.length);
    if (!core) return seg;
    if (/[\p{Lu}]{4,}/u.test(core)) core = deShoutTitle(core);
    core = scrubLexicon(stripDashes(core, lang), lang);
    return lead + core + trail;
  }).join("");
}

// ============================================================================
// GUARD PROMPTS — universal method (apply when composing in ANY language)
// ============================================================================
const RULES = `ABSOLUTE RULES FOR NYT/WaPo-GRADE JOURNALISM:
1. INVERTED PYRAMID: most newsworthy fact in the first 3 paragraphs; supporting detail follows; background last.
2. LEAD answers Who/What/Where/When in the first 2 sentences. Opening sentence max 35 words. Active voice.
3. One idea per paragraph, 2-4 sentences, deliberately varied length (a 1-sentence paragraph for impact, a 4-sentence one for context).
4. ATTRIBUTION uses the plain verb for "said"; never the ornamental "stressed/emphasized/highlighted/noted".
5. EVERY number gets context: out of how many, compared to what, over what period. A bare statistic is a failure.
6. Specific over vague. Never "many/several/various/significant" without the number or the named entity.
7. SHOW, DON'T ASSERT. Present the fact that makes the reader conclude importance; do not declare it.
8. EVERY direct quote earns its place; if it only restates a fact, paraphrase and attribute.
9. Do NOT open with a date. Open with the news, a claim, or a vivid concrete detail.
10. NO labeled conclusion. End on the strongest remaining fact or the next decision point.
11. EVERY paragraph carries a specific fact: a name, number, date or place. If not, cut it.
FORMAT: return the body as clean semantic HTML — <p>, and <h2>/<h3>/<blockquote>/<ul><li> only where a long piece needs them. No <h1>, no inline styles, no images.`;

const CL_STANDARDS =
  `CYPRUS LIFESTYLE STANDARDS: we re-report, never republish — every fact is our own sentence. We attribute to the original source of record ("according to the Cyprus Mail", "per the finance ministry"), never to ourselves. We write for an international, moneyed, well-travelled Cyprus audience. Restraint over hype; one exact figure beats three adjectives.`;

const FABRICATION_HARD_STOP = `============================================
FABRICATION HARD STOP — READ FIRST, OBEY ABSOLUTELY
============================================
You will NOT invent quotes. You will NOT invent sources. This overrides every other instruction.
ATTRIBUTION vs FABRICATION: naming the institution behind a finding is correct ("inspectors found the firm lacked a permit"). Putting invented words in a mouth is a firing offence ("'we found it,' a spokesperson said").
RULES: (1) Count the direct quotes in the source; your article has AT MOST that many. (2) If a source is not directly quoted, attribute without quotation marks. (3) Placeholder attributions ("a representative", "an official", "sources said") are fabrication — never pair them with quotation marks unless the exact words are in the source. (4) Before any pair of quotation marks: are these EXACT WORDS in the source, attributed to a NAMED person or institution? No → rewrite without quotation marks.`;

const ANTI_HALLUCINATION =
  `ANTI-HALLUCINATION — HARDEST RULE: write ONLY facts present in the FACTS list, the verified background, or the title. NEVER invent named witnesses, direct quotes, institutional responses, statistics, geographic claims, causal explanations, or "next steps" that the source did not establish. Before each sentence, point silently to the source fact behind it; if you cannot, cut the sentence. If short of target after honestly developing every fact, submit the shorter article. Do not invent.`;

const ANTI_PADDING =
  `ANTI-PADDING — word count is earned by facts, never recycled. Deepen existing paragraphs (more attribution, named consequence, precedent) rather than adding speculation. Every paragraph carries a specific fact. Cut any paragraph of AI hand-wringing ("officials warn", "the region continues to adapt", "the future will likely..."). If the material supports only a short article, write the honest shorter length.`;

const LOCAL_AUDIENCE_CY =
  `LOCAL AUDIENCE DISCIPLINE — the reader knows Cyprus: the districts (Nicosia, Limassol, Larnaca, Famagusta, Paphos, Kyrenia), that Limassol is the business and marina city, Akamas the wild peninsula near Paphos, Troodos the mountains, the CSE the Cyprus Stock Exchange, Commandaria the historic wine. Do not over-explain what a well-travelled Cyprus reader knows. Do add light context for non-Cyprus entities (a foreign fund, a Gulf vehicle, an EU mechanism). Never invent local colour the source did not provide.`;

const ZERO_COPY =
  `ANTI-PLAGIARISM (MANDATORY — VIOLATION = ARTICLE REJECTED): the brief may contain a full source article. Reproduce NOTHING from it. Zero copied or synonym-swapped sentences; zero paragraph structure from the source; zero of its phrases, transitions or lede. METHOD: extract only atomic facts (who/what/when/where/why), forget the source's wording and order, and write from the facts as if learned in a 30-second briefing, choosing a NEW angle. TEST: placed next to the source, no sentence resembles it and no run of 5+ words repeats. This applies even when your language is the SAME as the source's.`;

const FABRICATION_BAN =
  `FABRICATION BAN: Cyprus Lifestyle contacted no one for this article. Never write "sources told Cyprus Lifestyle", "in an interview with Cyprus Lifestyle", "experts consulted by us", or attribute anything to us. Never invent quotes or the names of analysts/experts not in the source. Correct attribution is "according to reports by [original source]" or "per public statements by X". If the exact source is unknown, "according to press reports". Write ONLY what the brief supports.`;

const MASTER_HUMANIZING = `MASTER HUMANISING CONSTRAINTS (apply in every language):
- PLAGIARISM: never reuse more than 3 consecutive words from the source; re-conceptualise every fact in your own structure.
- SENTENCE RHYTHM (AI fingerprint #1): include several sentences under 8 words AND several over 25; never two consecutive sentences within 5 words of each other in length; at least one verbless fragment. Do NOT alternate mechanically short→long→short — that regularity IS the AI signature.
- PARAGRAPH STRUCTURE: no two consecutive paragraphs begin the same way; include at least one 1-2 sentence paragraph AND one of 5+ sentences; alternate fact-dense with interpretive.
- ATTRIBUTION VARIETY: never the same attribution verb twice in a row; at most twice per article "according to"/its equivalent; vary placement.
- STRUCTURAL BANS: three-item lists max once; ban "not only… but also" and negative parallelism ("it's not X, it's Y"); ban symmetric "on one hand… on the other" unless it carries a real sourced counter-argument; ban discourse-marker openers (Moreover/Furthermore/Notably/Indeed/Ultimately and their equivalents). EM/EN DASH BAN: zero em/en dashes anywhere — use commas, full stops or parentheses.
- CLOSER BAN: end on the last attributed fact (a number, a decision, a named position). Never end on a prediction without a named source, a rhetorical question, a "raises questions about", a restated summary, or a community-reaction placeholder.
- CONCRETENESS: use the specialist's precise term; once chosen, keep it — do not synonym-cycle.
- HUMAN DISFLUENCY (small doses): at least one parenthetical aside a journalist would insert; at least one callback to an earlier fact.
- META-COMMENTARY BAN: never describe the article ("this piece explores", "in this article"). The editor signature and register are instructions about method, never phrases to print.`;

const FIRST_PERSON_BAN =
  `FIRST-PERSON BAN (for this article type): zero first-person singular ("I", "in my view") and zero editorial "we"/"our readers". The actor in every sentence is NAMED — the official with title and institution, the expert with affiliation, the affected person with name and place — never the author. The verdict comes from data and attributed voices.`;
function voiceAllowsFirstPerson(t: string): boolean {
  return t === "editorial" || t === "opinion" || t === "opinie";
}

const CATEGORY_DEPTH: Record<string, string> = {
  cyprus:
    "DEPTH: name every actor and institution; quantify the stakes; explain the consequence for the island; at least one attributed position; reference the timeline.",
  business:
    "DEPTH: specific figures (€, revenue, market cap, growth %); name companies, funds, executives and titles; market impact in numbers; institutional reaction (CSE, finance ministry, Central Bank).",
  property:
    "DEPTH: name the development, district, architect/developer, price band per m², yield or residency angle; honest appraisal over sales copy; comparable schemes for context.",
  culture:
    "DEPTH: name the artefact, artist, period, institution or venue; one object, one story; provenance and precedent; avoid catalogue-speak.",
  escapes:
    "DEPTH: name the place precisely, how to arrive, what it costs, when to go; one place done properly with detail a visitor can act on.",
  table:
    "DEPTH: name the chef, venue, dish, grower or wine (Commandaria, xynisteri, maratheftiko); specific plates, a price signal; where and why we are eating.",
  world:
    "DEPTH: read the region through a Cyprus lens (Greece, the Levant, the Gulf, the EU); name the actors and the mechanism; state plainly why it matters to Cyprus.",
  news:
    "DEPTH: name every actor and institution, quantify the stakes, give at least one attributed position, explain the consequence concretely.",
};

// ── per-language NATIVE composition rules (the quality core) ──────────────────
const NATIVE_RULES: Record<Lang, string> = {
  en: `NATIVE ENGLISH — the AI tells to avoid:
- NO trailing participial closers (", ...-ing ..." tacked on a sentence end). Strongest AI fingerprint in news copy: write two sentences with real subjects and finite verbs. At most one in the whole article.
- NO summary closer ("is part of a broader effort", "represents a significant shift", "reflects a commitment to"). End on a concrete fact.
- NO booster adverbs on plain facts ("successfully completed", "significantly improved").
- BANNED VOCABULARY: delve, landscape, robust, comprehensive, leverage, harness, seamless, foster, streamline, empower, spearhead, underscore, pivotal, tapestry, beacon, nestled, vibrant, thriving, boasts, showcases, game-changer, paradigm, ecosystem, synergy, holistic. Never smuggle a variant back ("delves into", "harnessing").
- ATTRIBUTION: said, told reporters, wrote, confirmed, announced, added, explained, warned. Banned as ornament: emphasized, highlighted, underscored, stressed.
- English news prose is short and direct. "The mayor blocked the permit" beats the passive. Avoid stacking prepositional phrases on the sentence tail.`,
  el: `NATIVE GREEK (γράψε ΑΠΕΥΘΕΙΑΣ στα ελληνικά, όχι μετάφραση) — think in Greek from the first word:
- No calques from English structure. Use natural Greek journalistic syntax and word order.
- Attribution verbs: «δήλωσε», «είπε», «ανέφερε», «σύμφωνα με», «όπως μετέδωσε». BANNED as AI tics: «τόνισε», «υπογράμμισε», «επεσήμανε» used repeatedly. Never the same verb twice in a row.
- BANNED packaging words (all inflections): «καθοριστικός/κομβικός ρόλος», «αποτελεί απόδειξη», «ένα ευρύ φάσμα», «στη σύγχρονη εποχή», «σηματοδοτεί», «ολιστικός». Replace with the concrete term or the number.
- Sentence-case headlines (only first word + proper nouns capitalised). Correct monotonic accents (τόνοι) throughout. Numerals with the euro sign (€). No Latin em/en dashes — use commas or full stops.
- Read it aloud in your head: if it sounds like English dressed in Greek words, rewrite it. Greek press has its own rhythm.`,
  ro: `NATIVE ROMANIAN (scrie DIRECT în română, nu traducere) — gândești în română de la primul cuvânt:
- Fără calchii din engleză: "stă ca un testament" → "dovedește"; "peisajul politic" → "scena politică"; "a naviga complexitățile" → "a gestiona"; "în era digitală" → "astăzi".
- Verbe de atribuire: "a declarat", "a spus", "a transmis", "a precizat", "potrivit", "conform". INTERZIS ca tic AI: "a subliniat", "a evidențiat", "a accentuat", "a ținut să menționeze". Niciodată același verb de două ori la rând.
- Cuvinte-ambalaj INTERZISE (toate formele): crucial, esențial, vital, semnificativ, remarcabil, considerabil, rezilient, paradigmă, ecosistem, sinergie. Folosește adjectivul precis sau cifra.
- "Pe măsură ce" maximum o dată. "Acest/Această/Aceste" ca început de propoziție maximum de două ori.
- Diacritice corecte peste tot (ă, â, î, ș, ț). Numerale: "12 milioane de euro", "47 de contracte". Titluri în sentence case. Fără em/en dash — folosește virgule sau puncte.
- Citește fraza cu voce tale în minte: dacă sună a "engleză îmbrăcată în cuvinte românești", rescrie-o.`,
  ar:
    `NATIVE ARABIC — modern standard Arabic (اكتب مباشرةً بالعربية الفصحى، وليست ترجمة) for a right-to-left edition:
- Think in Arabic from the first word; do not mirror English clause order. Use natural MSA journalistic syntax.
- Attribution: «قال»، «صرّح»، «أوضح»، «وفقًا لـ»، «بحسب». Avoid the repetitive AI tic of «أكّد»/«شدّد» on every attribution. Never the same verb twice in a row.
- BANNED AI packaging: «شهادة على»، «نسيج غني من»، «حجر الزاوية»، «في عالم سريع التغير»، «تجربة سلسة»، «الغوص في». Replace with the concrete word or the figure.
- Keep proper nouns and figures exact; render numbers clearly (٪ or %, €). Correct hamza and taa marbuta. NO Latin em/en dashes — use the Arabic comma (،) or a full stop.
- Read it in your head: if it reads like English rendered word-for-word into Arabic, rewrite it into natural press Arabic.`,
};
const TITLE_CRAFT: Record<Lang, string> = {
  en:
    `TITLE (English): sentence case, never shouting; cut any "amid/as/ahead of" tail — the title is the news, not its backdrop; leave one thing for the article (the why, the consequence); kill the narrator voice (who wins, who loses, what breaks); alive verbs (cuts, blocks, defies, wins, opens, buys) not dead ones (announces, discusses, explores); no editorialising adjectives. Under 90 characters.`,
  el:
    `TITLE (Greek): sentence case, μόνο η πρώτη λέξη και τα κύρια ονόματα με κεφαλαίο· χωρίς "εν μέσω"/"καθώς" ουρά· ένα δυνατό ρήμα, όχι ουδέτερο ("ανακοινώνει")· χωρίς επίθετα γνώμης. Κάτω από 90 χαρακτήρες.`,
  ro:
    `TITLU (română): sentence case; taie coada "pe fondul/în contextul"; un verb puternic (taie, blochează, refuză), nu unul slab (anunță, discută); fără adjective de opinie; lasă un singur lucru pentru articol. Sub 90 de caractere.`,
  ar:
    `العنوان (بالعربية): جملة واضحة، دون ذيل "وسط/بينما"؛ فعل قوي لا محايد؛ دون صفات رأي؛ اترك شيئًا واحدًا للمقال. أقل من 90 حرفًا.`,
};
const HUMANIZATION: Record<Lang, string> = {
  en:
    `HUMANISATION (English-specific): no trailing "-ing" closers; no summary-closer paragraph; no booster adverbs; occasional colloquial landing ("in effect", a verbless fragment) at most 2-3 per article. Voice test: if it reads like a press release, rewrite until it reads like a reporter on deadline.`,
  el:
    `HUMANISATION (ελληνικά): σπάσε τον ρυθμό των προτάσεων· απόφυγε τυποποιημένες καταλήξεις· απόφυγε το λεξιλόγιο-σφραγίδα AI· διάβασέ το φωναχτά στο μυαλό σου.`,
  ro:
    `NATURALIZARE (română): variază agresiv lungimile frazelor; evită conectorii birocratici ("în cazul în care" → "dacă"; "în vederea" → "pentru"); registru oral-cultivat cu măsură ("practic", "de fapt", max 2-3).`,
  ar:
    `الأنسنة (بالعربية): نوّع طول الجُمل؛ تجنّب البدايات النمطية؛ تجنّب مفردات الذكاء الاصطناعي؛ اقرأه في ذهنك ليبدو صحافةً عربية طبيعية.`,
};

// ============================================================================
// SANITIZERS + HELPERS + HUMANNESS SCORER  (ported from TT, full depth)
// ============================================================================
function coerceToString(input: unknown): string {
  if (input == null) return "";
  if (typeof input === "string") return input;
  if (Array.isArray(input)) {
    return input.filter((x) => x != null).map((x) =>
      typeof x === "string" ? x.trim() : typeof x === "object"
        ? (() => {
          try {
            return JSON.stringify(x);
          } catch {
            return "";
          }
        })()
        : String(x)
    ).filter(Boolean).join(" ");
  }
  if (typeof input === "object") {
    const o = input as Record<string, unknown>;
    if (typeof o.text === "string") return o.text;
    if (typeof o.content === "string") return o.content;
    if (typeof o.value === "string") return o.value;
    try {
      return JSON.stringify(input);
    } catch {
      return "";
    }
  }
  return String(input);
}
// inflection-aware English verb swaps
const IRREGULAR_PAST: Record<string, string> = { lead: "led", begin: "began", find: "found", hold: "held" };
const IRREGULAR_ING: Record<string, string> = { begin: "beginning", use: "using", lead: "leading" };
function conjugateVerb(base: string, form: "" | "s" | "ed" | "ing"): string {
  if (!form) return base;
  if (form === "s") {
    if (/(s|x|z|ch|sh)$/i.test(base)) return base + "es";
    if (/[^aeiou]y$/i.test(base)) return base.slice(0, -1) + "ies";
    return base + "s";
  }
  if (form === "ed") {
    if (IRREGULAR_PAST[base]) return IRREGULAR_PAST[base];
    if (/e$/i.test(base)) return base + "d";
    if (/[^aeiou]y$/i.test(base)) return base.slice(0, -1) + "ied";
    return base + "ed";
  }
  if (IRREGULAR_ING[base]) return IRREGULAR_ING[base];
  if (/e$/i.test(base) && !/ee$/i.test(base)) return base.slice(0, -1) + "ing";
  return base + "ing";
}
const VERB_SWAPS: [string, string][] = [
  ["enhance", "improve"],
  ["leverage", "use"],
  ["harness", "use"],
  ["foster", "encourage"],
  ["streamline", "simplify"],
  ["empower", "enable"],
  ["utilize", "use"],
  ["spearhead", "lead"],
  ["commence", "begin"],
  ["underscore", "highlight"],
  ["bolster", "strengthen"],
  ["delve", "explore"],
  ["showcase", "show"],
  ["facilitate", "help"],
];
function applyVerbSwaps(text: string): string {
  let out = text;
  for (const [from, to] of VERB_SWAPS) {
    const stem = from.replace(/e$/i, "");
    const re = new RegExp(`\\b(${from}s|${from}ed|${from}d|${stem}ing|${from})\\b`, "gi");
    out = out.replace(re, (m) => {
      const l = m.toLowerCase();
      let f: "" | "s" | "ed" | "ing" = "";
      if (l === `${stem}ing`) f = "ing";
      else if (l === `${from}s`) f = "s";
      else if (l === `${from}ed` || l === `${from}d`) f = "ed";
      const rep = conjugateVerb(to, f);
      return m[0] === m[0].toUpperCase() ? rep[0].toUpperCase() + rep.slice(1) : rep;
    });
  }
  return out;
}
// Full English content sanitizer (110+ rules) — restored to TT depth.
function sanitizeContentEnCore(text: string): string {
  if (text == null) return "";
  if (typeof text !== "string") text = coerceToString(text);
  if (!text) return "";
  let r = text;
  const openers: [RegExp, string][] = [
    [/^In the ever-evolving (field|world|landscape|domain) of [^,.]+,?\s*/im, ""],
    [/^In recent years,?\s*/im, ""],
    [/^Over the past decade,?\s*/im, ""],
    [/^It'?s no secret that\s*/im, ""],
    [/^In an increasingly [^,.]+,?\s*/im, ""],
    [/^In a world where\b[^,.]*,?\s*/im, ""],
  ];
  const starters: [RegExp, string][] = [
    [/^Furthermore,\s*/gm, ""],
    [/^Moreover,\s*/gm, ""],
    [/^Additionally,\s*/gm, ""],
    [/^Interestingly,\s*/gm, ""],
    [/^Notably,\s*/gm, ""],
    [/^Importantly,\s*/gm, ""],
    [/^Specifically,\s*/gm, ""],
    [/^Indeed,\s*/gm, ""],
    [/^Essentially,\s*/gm, ""],
    [/^Ultimately,\s*/gm, ""],
    [/^Consequently,\s*/gm, ""],
    [/^Overall,\s*/gm, ""],
    [/^It is worth (noting|mentioning) that\s*/gm, ""],
    [/^It should be noted that\s*/gm, ""],
  ];
  const phrases: [RegExp, string][] = [
    [/\bin today'?s world\b/gi, "today"],
    [/\bthe realm of\b/gi, "the field of"],
    [/\bit is important to note\b/gi, ""],
    [/\bit'?s worth noting\b/gi, ""],
    [/\ba testament to\b/gi, "proof of"],
    [/\bshed light on\b/gi, "clarify"],
    [/\bat the end of the day\b/gi, "ultimately"],
    [/\bparadigm shift\b/gi, "fundamental change"],
    [/\bin conclusion\b/gi, ""],
    [/\bin summary\b/gi, ""],
    [/\bto conclude\b/gi, ""],
    [/\blooking ahead\b/gi, ""],
    [/\bas we move forward\b/gi, ""],
    [/\bwhen it comes to\b/gi, "for"],
    [/\bplays a (crucial|essential|vital|key|important|significant) role\b/gi, "matters"],
    [/\bgame[- ]changer\b/gi, "breakthrough"],
    [/\bcutting[- ]edge\b/gi, "advanced"],
    [/\bonly time will tell\b/gi, ""],
    [/\bthe future looks bright\b/gi, ""],
    [/\bremains to be seen\b/gi, ""],
    [/\bthe landscape of\b/gi, "the field of"],
    [/\bserves as a?\b/gi, "is a"],
  ];
  const tier1: [RegExp, string][] = [
    [/\blandscape\b/gi, "field"],
    [/\btapestry\b/gi, "mix"],
    [/\brealm\b/gi, "area"],
    [/\bparadigm\b/gi, "model"],
    [/\bembark(s|ed|ing)? (on|upon)\b/gi, "start"],
    [/\bbeacon\b/gi, "signal"],
    [/\brobust\b/gi, "strong"],
    [/\bcomprehensive\b/gi, "thorough"],
    [/\bseamless(ly)?\b/gi, "smooth"],
    [/\bpivotal\b/gi, "key"],
    [/\bintegral\b/gi, "central"],
    [/\bintricate\b/gi, "complex"],
    [/\bmultifaceted\b/gi, "complex"],
    [/\bcrucial\b/gi, "important"],
    [/\bessential\b/gi, "necessary"],
    [/\bvital\b/gi, "important"],
    [/\bsynergy\b/gi, "cooperation"],
    [/\becosystem\b/gi, "environment"],
    [/\bholistic\b/gi, "complete"],
    [/\bwatershed moment\b/gi, "turning point"],
    [/\bnestled in\b/gi, "in"],
    [/\bvibrant\b/gi, "active"],
    [/\bthriving\b/gi, "growing"],
  ];
  const vagueAttr: [RegExp, string][] = [
    [/\bexperts (believe|say|argue|suggest|note|warn)\b/gi, ""],
    [/\bstudies (show|suggest|indicate|reveal|confirm)\b/gi, ""],
    [/\bcritics (argue|say|claim|contend|note|warn)\b/gi, ""],
    [/\banalysts (say|suggest|believe|predict|note|warn)\b/gi, ""],
  ];
  const closers: [RegExp, string][] = [
    [/[^.!?]*\bthis incident underscores[^.]*\./gi, ""],
    [/[^.!?]*\bthese events raise questions[^.]*\./gi, ""],
    [/[^.!?]*\bthe community awaits answers[^.]*\./gi, ""],
    [/[^.!?]*\bsuch cases highlight[^.]*\./gi, ""],
    [/[^.!?]*\bthe next phase will involve[^.]*\./gi, ""],
    [/[^.!?]*\bonly time will tell[^.]*\./gi, ""],
    [/\braises questions about\b/gi, "prompts questions about"],
  ];
  const fabrications: [RegExp, string][] = [
    [/[^.!?]*\btold reporters\b[^.]*\./gi, ""],
    [/[^.!?]*\btold (this paper|this publication|Cyprus Lifestyle)\b[^.]*\./gi, ""],
    [/[^.!?]*\bin an? (exclusive |statement |interview )?(with|to) Cyprus Lifestyle\b[^.]*\./gi, ""],
    [/[^.!?]*\bspeaking on (the )?condition of anonymity\b[^.]*\./gi, ""],
    [
      /[^.!?]*\baccording to (a |an )(source|insider|official)(?!\s+(named|called|identified)\b)[^.]*\./gi,
      "",
    ],
    [/[^.!?]*\ba spokesperson (confirmed|said|told|stated|noted)[^.]*\./gi, ""],
    [/[^.!?]*\ban official (?!named\b)(confirmed|said|told|stated|noted|added)\b[^.]*\./gi, ""],
  ];
  for (
    const [p, s] of [...openers, ...starters, ...phrases, ...tier1, ...vagueAttr, ...closers, ...fabrications]
  ) r = r.replace(p, s as string);
  r = applyVerbSwaps(r);
  r = stripDashes(r, "en");
  r = r.replace(/It'?s not (just )?[^,.]+[,;] it'?s /gi, "");
  r = r.replace(/^#{1,6}\s+(.+)$/gm, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");
  r = r.replace(/\n{3,}/g, "\n\n").replace(/  +/g, " ").replace(/ ,/g, ",").replace(/ \./g, ".").replace(
    /\.\s*\./g,
    ".",
  ).replace(/,\s*,/g, ",");
  return r.trim();
}
// language-dispatched sanitizers
function sanitizeHtml(html: string, lang: Lang): string {
  const s = lang === "en" ? scrubLexicon(sanitizeContentEnCore(html), "en") : humanizeHtml(html, lang);
  return s;
}
function sanitizeField(text: string, lang: Lang): string {
  if (text == null) return "";
  if (typeof text !== "string") text = coerceToString(text);
  if (!text) return "";
  return lang === "en" ? scrubLexicon(sanitizeContentEnCore(text), "en") : humanizeText(text, lang);
}
function sanitizeTitle(text: string, lang: Lang): string {
  if (text == null) return "";
  if (typeof text !== "string") text = coerceToString(text);
  if (!text) return "";
  return deShoutTitle(sanitizeField(text, lang).replace(/[#*_`]/g, "").replace(/[.,;:،]+$/, "").trim());
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  return (tags as unknown[]).filter((t): t is string => typeof t === "string" && t.length > 0)
    .map((t) =>
      t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-").replace(
        /[^a-z0-9\-Ͱ-Ͽ؀-ۿ]/g,
        "",
      ).replace(/-{2,}/g, "-").replace(/^-|-$/g, "").slice(0, 50)
    )
    .filter((t) => {
      if (!t || t.length < 2 || seen.has(t)) return false;
      seen.add(t);
      return true;
    }).slice(0, 8);
}
function normalizeControlCharsInJsonStrings(s: string): string {
  let out = "", inString = false, escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      out += ch;
      inString = !inString;
      continue;
    }
    if (inString) {
      const code = ch.charCodeAt(0);
      if (ch === "\n") {
        out += "\\n";
        continue;
      }
      if (ch === "\r") {
        out += "\\r";
        continue;
      }
      if (ch === "\t") {
        out += "\\t";
        continue;
      }
      if (code < 0x20) {
        out += "\\u" + code.toString(16).padStart(4, "0");
        continue;
      }
    }
    out += ch;
  }
  return out;
}
function parseJsonSafe(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch { /* */ }
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  if (s === -1 || e <= s) return null;
  const sub = cleaned.substring(s, e + 1);
  try {
    return JSON.parse(sub);
  } catch { /* */ }
  try {
    return JSON.parse(normalizeControlCharsInJsonStrings(sub));
  } catch {
    return null;
  }
}
function generateSlug(title: string): string {
  const base = (title || "article").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(
    /[^a-z0-9\s-]/g,
    "",
  ).trim().replace(/\s+/g, "-").replace(/-+$/, "").substring(0, 60);
  return `${base || "article"}-${Math.random().toString(36).substring(2, 10)}`;
}
function stripTags(html: string): string {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function countWords(text: string): number {
  if (text == null || typeof text !== "string" || !text) return 0;
  return stripTags(text).split(/\s+/).filter((w) => w.length > 0).length;
}
function ensureParagraphs(text: string): string {
  if (text == null) return "";
  if (typeof text !== "string") text = coerceToString(text);
  if (!text) return "";
  const t = text.trim();
  return t.replace(/\n{3,}/g, "\n\n");
}
function toHtml(text: string): string {
  const t = (text || "").trim();
  if (!t) return "";
  if (/<(p|h2|h3|ul|ol|blockquote)[\s>]/i.test(t)) return t;
  return t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) =>
    `<p>${p.replace(/\n+/g, " ")}</p>`
  ).join("\n");
}

// AI-tell / humanness scorer (multi-language)
interface HumannessReport {
  score: number;
  flags: string[];
}
function measureHumanness(html: string, lang: Lang): HumannessReport {
  const text = stripTags(html || "");
  const flags: string[] = [];
  let score = 100;
  const sentences = text.replace(/\n+/g, " ").split(/(?<=[.!?؟])\s+/).filter((s) => s.length > 5);
  const lengths = sentences.map((s) => s.split(/\s+/).length);
  const mean = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  const stdDev = Math.sqrt(
    lengths.length ? lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length : 0,
  );
  if (stdDev < 5) {
    flags.push(`LOW_BURSTINESS:${stdDev.toFixed(1)}`);
    score -= 20;
  } else if (stdDev < 9) {
    flags.push(`MODERATE_BURSTINESS:${stdDev.toFixed(1)}`);
    score -= 12;
  }
  let sameLen = 0;
  for (let i = 1; i < lengths.length; i++) if (Math.abs(lengths[i] - lengths[i - 1]) < 4) sameLen++;
  if (sameLen / Math.max(lengths.length - 1, 1) > 0.5) {
    flags.push("UNIFORM_LENGTHS");
    score -= 15;
  }
  const paras = text.split(/\n\n+/).filter((p) => p.trim().length > 20);
  if (paras.length > 2) {
    const pl = paras.map((p) => p.split(/\s+/).length);
    const pm = pl.reduce((a, b) => a + b, 0) / pl.length;
    const ps = Math.sqrt(pl.reduce((a, b) => a + (b - pm) ** 2, 0) / pl.length);
    if (ps < 14) {
      flags.push("UNIFORM_PARAGRAPHS");
      score -= 12;
    }
  }
  if (lang === "en" || lang === "ro") {
    const partic = lang === "ro"
      ? (text.match(
        /,\s+(?:[a-zăâîșț]+\s+){0,3}(?:oferind|subliniind|evidențiind|marcând|demonstrând|permițând|asigurând|reflectând|consolidând)\b/gi,
      ) || []).length
      : (text.match(/,\s+(?:\w+\s+){0,3}\w+ing\b[^.!?]*[.!?]/g) || []).length;
    const paraN = text.split(/\n\n+/).filter((p) => p.trim().length > 40).length || 1;
    if (partic >= 2 && partic / paraN > 0.34) {
      flags.push(`PARTICIPIAL_CLOSERS:${partic}`);
      score -= 15;
    }
  }
  const demo = lang === "ro"
    ? /(?:^|[.!?]\s+)(Acest[ăa]?|Aceste|Aceasta)\s/gm
    : lang === "en"
    ? /(?:^|[.!?]\s+)(This|These|That|Those)\s/gm
    : null;
  if (demo) {
    const d = (text.match(demo) || []).length;
    if (d > 2) {
      flags.push(`DEMONSTRATIVE_OVERKILL:${d}`);
      score -= 10;
    }
  }
  const summaryCloser = lang === "ro"
    ? /\b(reprezintă un pas (important|semnificativ)|face parte dintr-un efort mai amplu|rămâne esențial)/gi
    : lang === "en"
    ? /\b(is part of a broader (effort|initiative)|represents a (significant|major) (shift|step)|remains? (important|key|crucial|essential) to the success|reflects? (a|an|the) (commitment|ongoing|broader)|demonstrat\w+ (the|its|their) commitment to)/gi
    : null;
  if (summaryCloser && (text.match(summaryCloser) || []).length > 0) {
    flags.push("SUMMARY_CLOSER");
    score -= 12;
  }
  const spec = lang === "ro"
    ? ["rămâne de văzut", "viitorul va", "este de așteptat", "în cele din urmă"]
    : lang === "en"
    ? ["is expected to", "remains to be seen", "the future will", "only time will tell", "will likely"]
    : lang === "el"
    ? ["μένει να φανεί", "το μέλλον θα"]
    : ["يبقى أن نرى", "المستقبل سوف"];
  const lastParas = text.split(/\n\n+/).slice(-2).join(" ").toLowerCase();
  if (spec.some((p) => lastParas.includes(p))) {
    flags.push("SPECULATIVE_ENDING");
    score -= 15;
  }
  const aiWords = lang === "ro"
    ? [
      "semnificativ",
      "considerabil",
      "remarcabil",
      "esențial",
      "crucial",
      "vital",
      "paradigm",
      "ecosistem",
      "sinergie",
      "reziliență",
    ]
    : lang === "el"
    ? ["σηματοδοτεί", "κομβικός", "ολιστικ", "ευρύ φάσμα", "στη σύγχρονη εποχή"]
    : lang === "ar"
    ? ["شهادة على", "نسيج", "حجر الزاوية", "سلس", "الغوص في"]
    : [
      "delve",
      "landscape",
      "robust",
      "comprehensive",
      "leverage",
      "foster",
      "seamless",
      "holistic",
      "paradigm",
      "ecosystem",
      "synergy",
      "nestled",
      "boasts",
      "showcases",
      "underscores",
      "tapestry",
    ];
  let aiCount = 0;
  for (const w of aiWords) {
    aiCount +=
      (text.toLowerCase().match(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  }
  if (aiCount > 2) {
    flags.push(`AI_VOCAB:${aiCount}`);
    score -= aiCount * 3;
  }
  if ((text.match(/[—–]/g) || []).length > 0) {
    flags.push("EM_DASH");
    score -= 8;
  }
  return { score: Math.max(0, Math.min(100, score)), flags };
}

// ============================================================================
// CALLERS + SPEND + HUMANNESS LOOP + GATES + ARCHETYPE  (ported from TT)
// ============================================================================
let _admin: SupaClient | null = null;
function adminClient(): SupaClient {
  if (!_admin) {
    _admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  }
  return _admin;
}
const PRICE: Record<string, { in: number; out: number }> = {
  "gemini-2.5-flash": { in: 0.3, out: 2.5 },
  "gpt-4o": { in: 2.5, out: 10 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
};
async function logSpend(provider: string, model: string, fn: string, inChars: number, outChars: number) {
  try {
    const p = PRICE[model] ?? { in: 2, out: 8 };
    const inTok = Math.ceil(inChars / 4), outTok = Math.ceil(outChars / 4);
    const usd = +(((inTok * p.in) + (outTok * p.out)) / 1_000_000).toFixed(6);
    await adminClient().from("ai_spend_log").insert({
      provider,
      model,
      function_name: fn,
      units: inTok + outTok,
      unit_kind: "tokens",
      usd,
      caller: "process-scraped-article",
      meta: {},
    });
  } catch { /* telemetry */ }
}
const COMPOSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    excerpt: { type: "string" },
    summary: { type: "string" },
    content_html: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    seo_title: { type: "string" },
    seo_description: { type: "string" },
  },
  required: ["title", "excerpt", "summary", "content_html", "tags", "seo_title", "seo_description"],
  additionalProperties: false,
} as const;
const TITLE_REGEN_SCHEMA = {
  type: "object",
  properties: { title: { type: "string" } },
  required: ["title"],
  additionalProperties: false,
} as const;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  label: string,
  maxRetries = 2,
): Promise<Response> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e as Error;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
    }
  }
  throw lastErr || new Error(`${label}: retries exhausted`);
}
async function callGemini(
  system: string,
  user: string,
  maxTokens = 4000,
  fn = "gemini",
): Promise<{ text: string; error?: string }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  let geminiErr = "";
  if (apiKey) {
    try {
      const res = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens },
          }),
        },
        "gemini",
      );
      const raw = await res.text();
      if (res.ok) {
        const data = JSON.parse(raw);
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text) {
          logSpend("gemini", GEMINI_MODEL, fn, system.length + user.length, text.length);
          return { text };
        }
        geminiErr = "empty";
      } else {
        geminiErr = `${res.status}: ${raw.substring(0, 160)}`;
      }
    } catch (e) {
      geminiErr = (e as Error).message;
    }
  } else {
    geminiErr = "GEMINI_API_KEY not set";
  }
  // Resilience: if Gemini is unavailable (retired model, outage, quota, bad key),
  // Claude does the same task so Desk 1 / the visual brief never dies. The prompt
  // already specifies the exact output format, which Claude follows. This is the
  // enterprise guarantee: no single provider outage can break article generation.
  console.warn(`[${fn}] Gemini failed (${geminiErr.substring(0, 120)}) — Claude fallback`);
  const c = await callSonnetForRevision(system, user, Math.min(maxTokens, 8000));
  if (c.text) return { text: c.text };
  return {
    text: "",
    error: `Gemini(${geminiErr.substring(0, 80)}) + Claude(${(c.error || "empty").substring(0, 80)})`,
  };
}
async function callGPT4o(
  system: string,
  user: string,
  maxTokens = 8000,
  fn = "gpt4o",
): Promise<{ text: string; error?: string }> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return { text: "", error: "OPENAI_API_KEY not set" };
  try {
    const res = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GPT_MODEL,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0.55,
        max_tokens: maxTokens,
      }),
    }, "gpt4o");
    const raw = await res.text();
    if (!res.ok) return { text: "", error: `GPT-4o ${res.status}: ${raw.substring(0, 200)}` };
    const data = JSON.parse(raw);
    const text = data.choices?.[0]?.message?.content || "";
    logSpend("openai", GPT_MODEL, fn, system.length + user.length, text.length);
    return { text };
  } catch (e) {
    return { text: "", error: `GPT-4o: ${(e as Error).message}` };
  }
}
async function callSonnet(
  system: string,
  user: string,
  maxTokens = 4096,
  _temperature = 0.6, // deprecated on newer Claude models (sonnet-5/opus-5) — NOT sent
  jsonSchema?: Record<string, unknown>,
  fn = "sonnet",
  model = SONNET_MODEL,
): Promise<{ text: string; error?: string }> {
  const apiKey = Deno.env.get("CLAUDE_API_KEY");
  if (!apiKey) return { text: "", error: "CLAUDE_API_KEY not set" };
  try {
    const useStructured = !!jsonSchema;
    // NOTE: `temperature` is intentionally omitted. claude-sonnet-5 / claude-opus-5
    // return HTTP 400 ("`temperature` is deprecated for this model") if it is sent,
    // which was failing every composition. The model default is used instead.
    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      system,
      messages: useStructured
        ? [{ role: "user", content: user }]
        : [{ role: "user", content: user }, { role: "assistant", content: "{" }],
    };
    if (useStructured) body.output_config = { format: { type: "json_schema", schema: jsonSchema } };
    const res = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(body),
    }, "sonnet");
    const raw = await res.text();
    if (!res.ok) return { text: "", error: `Sonnet ${res.status} (${model}): ${raw.substring(0, 180)}` };
    const data = JSON.parse(raw);
    const cont = data?.content?.[0]?.text || "";
    logSpend("anthropic", model, fn, system.length + user.length, cont.length);
    return { text: useStructured ? cont : "{" + cont };
  } catch (e) {
    return { text: "", error: `Sonnet: ${(e as Error).message}` };
  }
}
async function callPolishModel(
  system: string,
  user: string,
  maxTokens: number,
  temperature: number,
  label: string,
  jsonSchema?: Record<string, unknown>,
): Promise<
  { text: string; provider: "sonnet" | "opus" | "gpt4o" | null; error?: string; sonnetError?: string }
> {
  // Claude-only writer chain (GPT-4o writes flat prose and is OFF by default).
  // The article is tried THREE ways before giving up, so neither a rejected
  // output_config nor a single unavailable model can knock it out of the pipeline:
  //   (1) SONNET_MODEL, structured output — guaranteed-valid JSON where supported;
  //   (2) SONNET_MODEL, prefill ("{" continuation) — universal, no beta feature;
  //   (3) OPUS_MODEL, prefill — higher-quality fallback if Sonnet is unavailable.
  // Both models are long-lived Claude (Sonnet 5 → ~Jun 2027, Opus 5 → ~Jul 2027).
  // Only if ALL THREE fail is GPT-4o considered, and only when explicitly enabled
  // via the USE_GPT_FALLBACK secret; otherwise the edition fails loudly (a clean
  // failure beats flat text).
  const tryPrefill = async (model: string) => {
    const r = await callSonnet(system, user, maxTokens, temperature, undefined, label, model);
    const ok = !r.error && !!r.text && r.text.length > 50 && !!parseJsonSafe(r.text);
    return { ok, err: r.error || (r.text ? `json_invalid(${r.text.length})` : "empty"), text: r.text };
  };

  // (1) primary model, structured output
  let structuredErr = "";
  if (jsonSchema) {
    const s = await callSonnet(system, user, maxTokens, temperature, jsonSchema, label, SONNET_MODEL);
    if (!s.error && s.text && s.text.length > 50 && parseJsonSafe(s.text)) {
      return { text: s.text, provider: "sonnet" };
    }
    structuredErr = s.error || (s.text ? `structured_json_invalid(${s.text.length})` : "structured_empty");
    console.warn(
      `[${label}] ${SONNET_MODEL} structured failed (${structuredErr.substring(0, 110)}) — prefill`,
    );
  }

  // (2) primary model, prefill
  const p1 = await tryPrefill(SONNET_MODEL);
  if (p1.ok) {
    return {
      text: p1.text,
      provider: "sonnet",
      sonnetError: structuredErr ? `structured:${structuredErr}`.substring(0, 160) : undefined,
    };
  }

  // (3) fallback writer — Opus 5 (higher quality), prefill
  let fbNote = "";
  if (OPUS_MODEL && OPUS_MODEL !== SONNET_MODEL) {
    console.warn(
      `[${label}] ${SONNET_MODEL} prefill failed (${p1.err.substring(0, 80)}) — trying ${OPUS_MODEL}`,
    );
    const p2 = await tryPrefill(OPUS_MODEL);
    if (p2.ok) {
      return {
        text: p2.text,
        provider: "opus",
        sonnetError: `${SONNET_MODEL} down (structured:${
          structuredErr || "n/a"
        } prefill:${p1.err}) — used ${OPUS_MODEL}`
          .substring(0, 160),
      };
    }
    fbNote = ` | ${OPUS_MODEL}:${p2.err}`;
  }

  const sonnetErr = `${SONNET_MODEL}(structured:${structuredErr || "n/a"} prefill:${p1.err})${fbNote}`;
  console.warn(`[${label}] all Sonnet attempts failed — ${sonnetErr.substring(0, 160)}`);

  // (4) GPT-4o — only if explicitly re-enabled
  if (USE_GPT_FALLBACK) {
    const gpt = await callGPT4o(system, user, Math.min(maxTokens, 14000), label);
    if (!gpt.error && gpt.text && gpt.text.length > 50) {
      return { text: gpt.text, provider: "gpt4o", sonnetError: sonnetErr.substring(0, 160) };
    }
    return {
      text: "",
      provider: null,
      error: `All failed — Sonnet(${sonnetErr.substring(0, 80)}) GPT-4o:${
        (gpt.error || "empty").substring(0, 50)
      }`,
    };
  }
  return { text: "", provider: null, error: `Sonnet unavailable — ${sonnetErr.substring(0, 150)}` };
}

// ── SELF-TEST ────────────────────────────────────────────────────────────────
// Admin-triggered diagnostic ({ action:"selftest" }). Calls each configured model
// with a tiny prompt and reports exactly which ones this key serves and why any
// fail — so model availability is a FACT in the response, never a guess. Makes no
// database writes and costs a few tokens.
async function runSelfTest(): Promise<Record<string, unknown>> {
  const tinySchema = {
    type: "object",
    properties: { ok: { type: "boolean" } },
    required: ["ok"],
    additionalProperties: false,
  } as const;
  const sys = "You are a connectivity test. Output only the requested JSON.";
  const usr = 'Return exactly {"ok":true} and nothing else.';

  const testClaude = async (model: string) => {
    const t0 = Date.now();
    const structured = await callSonnet(sys, usr, 64, 0, tinySchema, "selftest", model);
    const sOk = !structured.error && !!parseJsonSafe(structured.text);
    const t1 = Date.now();
    const prefill = await callSonnet(sys, usr, 64, 0, undefined, "selftest", model);
    const pOk = !prefill.error && !!parseJsonSafe(prefill.text);
    return {
      model,
      structured_output: sOk
        ? `ok (${t1 - t0}ms)`
        : `FAIL: ${(structured.error || "unparseable").substring(0, 160)}`,
      prefill: pOk
        ? `ok (${Date.now() - t1}ms)`
        : `FAIL: ${(prefill.error || "unparseable").substring(0, 160)}`,
      usable: sOk || pOk,
    };
  };

  const [primary, fallback] = await Promise.all([testClaude(SONNET_MODEL), testClaude(OPUS_MODEL)]);

  // Raw Gemini health (Desk 1 fact-extraction). Tested directly — NOT through
  // callGemini — so we see Gemini's TRUE status, since Desk 1 now falls back to
  // Claude if Gemini is down.
  let geminiStatus = "";
  const gkey = Deno.env.get("GEMINI_API_KEY");
  if (!gkey) geminiStatus = "FAIL: GEMINI_API_KEY not set";
  else {
    try {
      const gr = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${gkey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Return the word OK." }] }],
            generationConfig: { maxOutputTokens: 16 },
          }),
        },
      );
      const rawg = await gr.text();
      geminiStatus = gr.ok ? `ok (${GEMINI_MODEL})` : `FAIL: ${gr.status} ${rawg.substring(0, 120)}`;
    } catch (e) {
      geminiStatus = `FAIL: ${(e as Error).message}`;
    }
  }
  const geminiOk = geminiStatus.startsWith("ok");
  const writerOk = primary.usable || fallback.usable;

  return {
    // Pipeline is OK as long as a writer works — Desk 1 falls back to Claude if
    // Gemini is down, so a dead Gemini alone no longer blocks generation.
    ok: writerOk,
    verdict: !writerOk
      ? "NO writer model works — articles cannot be composed. See writer errors below."
      : primary.usable
      ? `Primary writer ${SONNET_MODEL} works — prose quality will be full.${
        geminiOk ? "" : " (Gemini is down; Desk 1 will use Claude.)"
      }`
      : `Primary ${SONNET_MODEL} is DOWN; fallback ${OPUS_MODEL} works, so articles still compose.`,
    writer_primary: primary,
    writer_fallback: fallback,
    gemini: geminiOk ? geminiStatus : `${geminiStatus.substring(0, 160)}  (Desk 1 will fall back to Claude)`,
    secrets_present: {
      CLAUDE_API_KEY: !!Deno.env.get("CLAUDE_API_KEY"),
      GEMINI_API_KEY: !!Deno.env.get("GEMINI_API_KEY"),
      OPENAI_API_KEY: !!Deno.env.get("OPENAI_API_KEY"),
      UNSPLASH_ACCESS_KEY: !!Deno.env.get("UNSPLASH_ACCESS_KEY"),
    },
    config: { SONNET_MODEL, OPUS_MODEL, GEMINI_MODEL, USE_GPT_FALLBACK },
  };
}
async function callSonnetForRevision(
  system: string,
  user: string,
  maxTokens: number,
): Promise<{ text: string; error?: string }> {
  const apiKey = Deno.env.get("CLAUDE_API_KEY");
  if (!apiKey) return { text: "", error: "CLAUDE_API_KEY not set" };
  const once = async (model: string): Promise<{ text: string; error?: string }> => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          // `temperature` omitted — deprecated on sonnet-5/opus-5 (returns 400).
          model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: user }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const raw = await res.text();
      if (!res.ok) {
        return { text: "", error: `Sonnet revision ${res.status} (${model}): ${raw.substring(0, 120)}` };
      }
      const data = JSON.parse(raw);
      const text = data?.content?.[0]?.text || "";
      logSpend("anthropic", model, "humanness", system.length + user.length, text.length);
      return { text };
    } catch (e) {
      return { text: "", error: `Sonnet revision (${model}): ${(e as Error).message}` };
    }
  };
  // Same model resilience as the writer: if the primary Sonnet ID is not served
  // by this key, fall back so the humanising pass still runs.
  const primary = await once(SONNET_MODEL);
  if (primary.text) return primary;
  if (OPUS_MODEL && OPUS_MODEL !== SONNET_MODEL) {
    const fb = await once(OPUS_MODEL);
    if (fb.text) return fb;
    return { text: "", error: `${primary.error || "empty"} | ${fb.error || "empty"}` };
  }
  return primary;
}
function buildHumannessRevisionPrompt(flags: string[]): string {
  const out: string[] = [];
  for (const f of flags) {
    if (f.startsWith("LOW_BURSTINESS") || f.startsWith("MODERATE_BURSTINESS")) {
      out.push(
        "BURSTINESS: vary sentence lengths aggressively — several under 8 words and several over 25; never two consecutive within 5 words; include one verbless fragment.",
      );
    } else if (f.startsWith("UNIFORM_LENGTHS")) {
      out.push("UNIFORM_LENGTHS: break the pattern with a very short then a very long sentence.");
    } else if (f.startsWith("UNIFORM_PARAGRAPHS")) {
      out.push("UNIFORM_PARAGRAPHS: include at least one 1-2 sentence paragraph and one of 5+ sentences.");
    } else if (f.startsWith("PARTICIPIAL_CLOSERS")) {
      out.push(
        'PARTICIPIAL_CLOSERS: rewrite sentences that end with a trailing "-ing" clause as separate sentences with a real subject and finite verb; keep at most one.',
      );
    } else if (f.startsWith("DEMONSTRATIVE_OVERKILL")) {
      out.push(
        'DEMONSTRATIVE_OVERKILL: reduce sentences beginning with "This/These" (or the language equivalent) to at most two; use the specific noun instead.',
      );
    } else if (f.startsWith("SUMMARY_CLOSER")) {
      out.push(
        "SUMMARY_CLOSER: delete the closing paragraph that restates significance; end on a concrete fact, number, date or quote.",
      );
    } else if (f.startsWith("SPECULATIVE_ENDING")) {
      out.push(
        "SPECULATIVE_ENDING: cut speculation from the ending; close on the last verifiable fact or attributed statement.",
      );
    } else if (f.startsWith("AI_VOCAB")) {
      out.push("AI_VOCAB: replace AI-signature vocabulary with concrete, plain words in this language.");
    } else if (f.startsWith("EM_DASH")) {
      out.push(
        "EM_DASH: remove every em/en dash; use commas, full stops or parentheses (the Arabic comma for Arabic).",
      );
    }
  }
  return out.length
    ? out.join("\n\n")
    : "General naturalness: vary sentence rhythm and paragraph structure; remove AI-signature vocabulary.";
}
async function humannessEnforceLoop(
  html: string,
  lang: Lang,
  budgetMs: number,
): Promise<{ html: string; before: number; after: number; applied: boolean }> {
  const before = measureHumanness(html, lang);
  if (before.score >= 90 || budgetMs < 20000) {
    return { html, before: before.score, after: before.score, applied: false };
  }
  const targeted = buildHumannessRevisionPrompt(before.flags);
  const system = `You are a senior editor at Cyprus Lifestyle editing a ${
    LANG_NAME[lang]
  } article (HTML). It failed the naturalness check on the SPECIFIC PATTERNS below. Fix ONLY these patterns, changing nothing else. Keep the article in ${
    LANG_NAME[lang]
  }.
UNTOUCHABLE: do not change any fact, name, number, date, quote or institution; do not add information; keep the same paragraph count and roughly the same length; keep the HTML tags; no em/en dashes.
PATTERNS TO FIX:
${targeted}
OUTPUT: JSON only, no preamble: {"content_html":"..."}`;
  const user = `ARTICLE (${
    LANG_NAME[lang]
  }, fix ONLY the patterns; keep HTML):\n\n${html}\n\nCorrected version (JSON):`;
  const result = await callSonnetForRevision(
    system,
    user,
    Math.min(12000, Math.max(4000, Math.ceil(html.length / 1.5))),
  );
  if (result.error || !result.text) {
    return { html, before: before.score, after: before.score, applied: false };
  }
  const parsed = parseJsonSafe(result.text);
  let revised = (parsed?.content_html as string) || (parsed?.content as string) || "";
  if (!revised || revised.length < 100) {
    return { html, before: before.score, after: before.score, applied: false };
  }
  revised = ensureParagraphs(sanitizeHtml(revised, lang));
  const ratio = revised.length / html.length;
  if (ratio < 0.8 || ratio > 1.2) return { html, before: before.score, after: before.score, applied: false };
  const after = measureHumanness(revised, lang);
  if (after.score <= before.score) return { html, before: before.score, after: before.score, applied: false };
  return { html: revised, before: before.score, after: after.score, applied: true };
}

interface SourceCheck {
  ok: boolean;
  reason?: string;
}
function isSourceContentRealProse(text: string): SourceCheck {
  if (!text || text.length < 200) {
    return { ok: false, reason: `source too short (${text?.length ?? 0} chars)` };
  }
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 80) return { ok: false, reason: `only ${words.length} words in source` };
  const css = [
    /\.tdi_\d+/g,
    /font-size:\s*\d+px/g,
    /background-color:\s*#[0-9a-f]/gi,
    /margin-bottom:\s*\d+px/g,
    /@media\s*\(/g,
    /webkit-transform/g,
    /\bdisplay:\s*(block|flex|inline|none)\b/g,
  ];
  let hits = 0;
  for (const p of css) hits += (text.match(p) || []).length;
  if (hits > Math.max(8, text.length / 200)) {
    return { ok: false, reason: `${hits} CSS patterns — source appears to be a CSS dump` };
  }
  if (text.startsWith("{") && text.includes('"@context"')) {
    return { ok: false, reason: "source is JSON-LD, not article body" };
  }
  const letters = (text.match(/[a-zA-ZăâîșțĂÂÎȘȚͰ-Ͽ؀-ۿ]/g) || []).length;
  if (letters / text.length < 0.45) {
    return {
      ok: false,
      reason: `letter density ${(letters / text.length).toFixed(2)} too low (markup suspected)`,
    };
  }
  return { ok: true };
}
function checkSourceOverlap(output: string, source: string, n = 5): number {
  const o = stripTags(output), s = source || "";
  if (!o || !s || o.length < 50 || s.length < 50) return 0;
  const tok = (str: string) =>
    str.replace(/[^a-zA-Z0-9ăâîșțĂÂÎȘȚͰ-Ͽ؀-ۿ\s]/g, " ").split(/\s+/).filter((w) => w.length > 0).map((w) => ({
      norm: w.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""),
      isCap: /^[A-ZĂÂÎȘȚΈ-Ϋ]/.test(w),
    })).filter((t) => t.norm.length > 0);
  const ot = tok(o), st = tok(s);
  if (ot.length < n || st.length < n) return 0;
  const grams = new Set<string>();
  for (let i = 0; i <= st.length - n; i++) {
    const w = st.slice(i, i + n);
    if (w.filter((t) => t.isCap).length >= 2) continue;
    grams.add(w.map((t) => t.norm).join(" "));
  }
  let hits = 0, total = 0;
  for (let i = 0; i <= ot.length - n; i++) {
    const w = ot.slice(i, i + n);
    if (w.filter((t) => t.isCap).length >= 2) continue;
    total++;
    if (grams.has(w.map((t) => t.norm).join(" "))) hits++;
  }
  return total === 0 ? 0 : hits / total;
}
function isTitleGeneric(title: string): boolean {
  if (!title || title.length < 10 || title.length > 140) return true;
  const t = title.toLowerCase();
  for (
    const p of [
      /^(new|various|certain|several|some)\s+/i,
      /\b(in the current context|the landscape of|the challenges of)\b/i,
      /^(about|regarding|concerning)/i,
      /\b(continues to|faces|tackles)\s+(challenges|issues|developments)\b/i,
    ]
  ) if (p.test(t)) return true;
  if (title.split(/\s+/).length < 3) return true;
  return false;
}

// evidence-density archetype
function countDigestFacts(digest: string): number {
  if (!digest) return 0;
  return digest.split(/\n+/).map((l) => l.trim()).filter((l) => /^\d{1,2}[.)]\s+\S/.test(l)).length;
}
function inferArticleType(category: string, content: string, srcWords = 0, digest = ""): string {
  const facts = countDigestFacts(digest);
  const head = content.slice(0, 500).toLowerCase();
  if (category === "opinion") return "editorial";
  if (facts >= 14 && (head.includes("reportage") || head.includes("feature"))) return "reportaj";
  if (facts >= 11 && head.includes("analysis")) return "analiza";
  if (facts > 0 && facts <= 6) return "breva";
  if (facts === 0 && srcWords > 0 && srcWords < 400) return "breva";
  return "news";
}
interface ArchetypeBudget {
  minWords: number;
  tokenBudget: number;
  hint: string;
  label: string;
}
const FRAGMENT_FLOOR = 120;
function judgeLength(wc: number, depth: number) {
  return { isFragment: wc < FRAGMENT_FLOOR, belowDepth: wc < depth, wc };
}
function getArchetypeBudget(t: string): ArchetypeBudget {
  switch (t) {
    case "breva":
      return {
        minWords: 200,
        tokenBudget: 3000,
        label: "brief",
        hint:
          "ARCHETYPE: news brief. One central fact, written tight. Natural length 200-450 words. No padding, no banned closers.",
      };
    case "reportaj":
      return {
        minWords: 500,
        tokenBudget: 9000,
        label: "feature",
        hint:
          "ARCHETYPE: reportage / feature. Natural length 700-1800 words. Scenic opening, concrete voices, narrative arc.",
      };
    case "analiza":
      return {
        minWords: 400,
        tokenBudget: 9000,
        label: "analysis",
        hint:
          "ARCHETYPE: analysis. Natural length 600-1500 words. Structured argument with data and implications; end with what changes downstream.",
      };
    case "editorial":
    case "opinion":
    case "opinie":
      return {
        minWords: 350,
        tokenBudget: 8000,
        label: "opinion",
        hint:
          "ARCHETYPE: editorial / opinion. Natural length 500-1200 words. Voice-driven, clear position, argument with evidence.",
      };
    default:
      return {
        minWords: 300,
        tokenBudget: 7000,
        label: "news",
        hint:
          "ARCHETYPE: news article. Natural length 350-900 words. Inverted pyramid; two or more attributed sources where the material supports it.",
      };
  }
}

// AI-grounded cover query (falls back to a deterministic Cyprus query)
async function buildVisualQuery(titleEn: string, category: string, district: string | null): Promise<string> {
  const place = district ? `${district} Cyprus` : "Cyprus";
  try {
    const r = await callGemini(
      `Return ONLY a 3-6 word English stock-photo search query for a RELEVANT real photo for this Cyprus article. Include the place/landmark when the subject is a named place. Concrete photographable nouns, no punctuation.`,
      `TITLE: ${titleEn}\nCATEGORY: ${category}\nPLACE: ${place}`,
      60,
      "visual-brief",
    );
    const q = (r.text || "").replace(/["'\n]/g, " ").replace(/\s+/g, " ").trim();
    if (q && q.split(/\s+/).length <= 8) return q;
  } catch { /* fall through */ }
  const kw = (titleEn.toLowerCase().match(/\b[a-z]{4,}\b/g) || []).filter((w) =>
    !["with", "from", "that", "this", "over", "after", "into"].includes(w)
  ).slice(0, 3).join(" ");
  return `${kw} ${place}`.trim();
}

// ============================================================================
// DESKS — Desk 1 (enrich) + native composition per language + cover/author
// ============================================================================
interface EnrichResult {
  research: string;
  category: string;
  subcategory: string;
  district: string | null;
  editor: EditorKey;
  sourceLang: string;
  ok: boolean;
}
async function enrichSource(
  sourceTitle: string,
  sourceContent: string,
  hintCategory: string,
): Promise<EnrichResult> {
  const system =
    `You are a senior research editor at Cyprus Lifestyle. The SOURCE ARTICLE may be in English, Arabic, French, German, Romanian or Greek. Your job:
1. CLASSIFY into ONE category: ${VALID_CATEGORIES.join(", ")}.
2. CLASSIFY into ONE subcategory: ${VALID_SUBCATEGORIES.join(", ")}.
3. DETECT the Cyprus district if local: ${DISTRICTS.join(", ")}. Otherwise "national".
4. DETECT the source language (en/el/ro/ar/fr/de/other).
5. ATOMISE the facts into ENGLISH TELEGRAMS (numbered, one fact per line, max 15 words each). English only, never echo the source's phrasing.
OUTPUT (exact order, CAPS headers, one per line):
CATEGORY: <${VALID_CATEGORIES.join("|")}>
SUBCATEGORY: <${VALID_SUBCATEGORIES.join("|")}>
DISTRICT: <district slug or national>
SOURCE_LANG: <en|el|ro|ar|fr|de|other>
FACTS:
1. WHO: ... | ACTION: ... | WHEN: ... | WHERE: ...
2. QUOTE: "..." — SPEAKER: ...
[continue as needed]
STRICT: English telegrams only, max 15 words each, facts only.`;
  const user = `SOURCE TITLE: ${sourceTitle}\n\nSOURCE ARTICLE:\n${
    sourceContent.slice(0, 16000)
  }\n\nClassify, detect district and language, atomise the facts.`;
  const res = await callGemini(system, user, 6000, "enrich");
  if (res.error || !res.text || res.text.length < 50) {
    const cat = CAT_ALIASES[(hintCategory || "").toLowerCase()] ||
      (VALID_CATEGORIES.includes((hintCategory || "").toLowerCase())
        ? (hintCategory as string).toLowerCase()
        : "cyprus");
    return {
      research: `FACTS (auto): ${sourceContent.substring(0, 500)}`,
      category: cat,
      subcategory: "regional",
      district: null,
      editor: editorForCategory(cat),
      sourceLang: "other",
      ok: false,
    };
  }
  const txt = res.text;
  let category = (txt.match(/CATEGORY:\s*([a-z_-]+)/i)?.[1] || hintCategory || "cyprus").toLowerCase();
  category = CAT_ALIASES[category] || category;
  if (!VALID_CATEGORIES.includes(category)) category = "cyprus";
  let subcategory = (txt.match(/SUBCATEGORY:\s*([a-z_-]+)/i)?.[1] || "regional").toLowerCase();
  subcategory = SUB_ALIASES[subcategory] || subcategory;
  if (!VALID_SUBCATEGORIES.includes(subcategory)) subcategory = "regional";
  let district: string | null = (txt.match(/DISTRICT:\s*([a-z_-]+)/i)?.[1] || "").toLowerCase();
  if (!DISTRICTS.includes(district)) district = null;
  const sourceLang = (txt.match(/SOURCE_LANG:\s*([a-z]+)/i)?.[1] || "other").toLowerCase();
  const research = txt.match(/FACTS:\s*\n([\s\S]+)$/i)?.[1]?.trim() || txt;
  return {
    research,
    category,
    subcategory,
    district,
    editor: editorForCategory(category),
    sourceLang,
    ok: true,
  };
}

interface LangBundle {
  lang: Lang;
  title: string;
  excerpt: string;
  summary: string;
  content: string;
  tags: string[];
  seoTitle: string;
  seoDesc: string;
  ok: boolean;
  wc: number;
  humanness: number;
  reason?: string; // why this edition failed (empty on success)
  provider?: string; // which model actually wrote it: "sonnet" | "gpt4o"
  sonnetError?: string; // if Sonnet fell back to GPT-4o, the Sonnet API error
}

// Native composition desk — writes the article in `lang` from the English facts.
async function composeNatively(
  lang: Lang,
  sourceTitle: string,
  research: string,
  category: string,
  editor: EditorKey,
  articleType: string,
  arch: ArchetypeBudget,
): Promise<LangBundle> {
  const failWith = (reason: string): LangBundle => ({
    lang,
    title: "",
    excerpt: "",
    summary: "",
    content: "",
    tags: [],
    seoTitle: "",
    seoDesc: "",
    ok: false,
    wc: 0,
    humanness: 0,
    reason,
  });
  const catDepth = CATEGORY_DEPTH[category] || CATEGORY_DEPTH.news;
  const firstPerson = voiceAllowsFirstPerson(articleType) ? "" : "\n\n" + FIRST_PERSON_BAN;
  const langDirective = lang === "en"
    ? `Write the article in ENGLISH, re-reporting the story in our own words.`
    : `Compose the article NATIVELY in ${
      LANG_NAME[lang]
    } from the facts below. This is NOT a translation: think in ${
      LANG_NAME[lang]
    } from the first word, as a ${
      LANG_NAME[lang]
    } journalist would. Keep every fact, number, name, date and quote exact.`;
  const system = `${HOUSE_VOICE}

You are writing for ${deskBrief(editor)}
${langDirective}

${FABRICATION_HARD_STOP}

── NYT/WaPo JOURNALISM RULES ──
${RULES}

── STANDARDS ──
${CL_STANDARDS}

── ANTI-PLAGIARISM ──
${ZERO_COPY}

── FABRICATION BAN ──
${FABRICATION_BAN}

── ANTI-HALLUCINATION ──
${ANTI_HALLUCINATION}

── ANTI-PADDING + LOCAL AUDIENCE ──
${ANTI_PADDING}

${LOCAL_AUDIENCE_CY}

── CATEGORY DEPTH (${category.toUpperCase()}) ──
${catDepth}

── MASTER HUMANISING ──
${MASTER_HUMANIZING}

── NATIVE ${LANG_NAME[lang].toUpperCase()} RULES ──
${NATIVE_RULES[lang]}

${HUMANIZATION[lang]}${firstPerson}

── TITLE CRAFT ──
${TITLE_CRAFT[lang]}

${arch.hint}

Write EVERYTHING (title, excerpt, summary, body, tags, SEO) in ${
    LANG_NAME[lang]
  }. content_html is clean semantic HTML (<p>, and <h2>/<h3>/<blockquote>/<ul><li> only where a long piece needs them; no <h1>, no inline styles, no images). Tags are 3-6 short native-language slugs.
OUTPUT — JSON only, no preamble: {"title":"...","excerpt":"...","summary":"...","content_html":"...","tags":["..."],"seo_title":"...","seo_description":"..."}`;
  const user =
    `SOURCE TITLE: ${sourceTitle}\n\nEXTRACTED FACTS (write from these; do NOT copy any phrasing):\n${research}\n\nWrite the ${
      LANG_NAME[lang]
    } article as JSON. Every sentence is your own construction in ${LANG_NAME[lang]}.`;
  const result = await callPolishModel(
    system,
    user,
    arch.tokenBudget,
    lang === "en" ? 0.6 : 0.55,
    `compose-${lang}`,
    COMPOSE_SCHEMA,
  );
  if (result.error) {
    console.warn(`[compose-${lang}] failed: ${result.error}`);
    return failWith(result.error);
  }
  const parsed = parseJsonSafe(result.text);
  if (!parsed) {
    console.warn(`[compose-${lang}] failed: json_parse (provider=${result.provider})`);
    return failWith(`json_parse (provider=${result.provider})`);
  }
  const content = ensureParagraphs(
    sanitizeHtml(toHtml((parsed.content_html as string) || (parsed.content as string) || ""), lang),
  );
  if (!content || countWords(content) < FRAGMENT_FLOOR) {
    const wc = content ? countWords(content) : 0;
    console.warn(`[compose-${lang}] failed: fragment ${wc}w (provider=${result.provider})`);
    return failWith(`fragment_${wc}w`);
  }
  const tags = normalizeTags(parsed.tags);
  return {
    lang,
    title: sanitizeTitle((parsed.title as string) || sourceTitle, lang),
    excerpt: sanitizeField((parsed.excerpt as string) || "", lang),
    summary: sanitizeField((parsed.summary as string) || (parsed.excerpt as string) || "", lang),
    content,
    tags,
    seoTitle: sanitizeTitle((parsed.seo_title as string) || (parsed.title as string) || "", lang),
    seoDesc: sanitizeField((parsed.seo_description as string) || (parsed.excerpt as string) || "", lang),
    ok: true,
    wc: countWords(content),
    humanness: 0,
    provider: result.provider || undefined,
    sonnetError: result.sonnetError,
  };
}

async function regenerateTitleIfGeneric(
  current: string,
  research: string,
  editor: EditorKey,
  lang: Lang,
): Promise<string | null> {
  if (lang === "en" && !isTitleGeneric(current)) return null;
  if (lang !== "en") return null; // generic detection is EN-tuned; skip for other langs
  const sys = `${HOUSE_VOICE}\n\nYou are writing for ${
    deskBrief(editor)
  }\nTitle rejected as generic: "${current}". Produce a NEW English title.\n${TITLE_CRAFT.en}\nUnder 90 chars, sentence case. JSON: {"title":"..."}`;
  const result = await callPolishModel(
    sys,
    `RESEARCH: ${research.substring(0, 600)}\n\nNew title as JSON.`,
    300,
    0.7,
    "2C-title",
    TITLE_REGEN_SCHEMA,
  );
  if (result.error) return null;
  const cleaned = sanitizeTitle((parseJsonSafe(result.text)?.title as string) || "", "en");
  if (cleaned.length < 8 || cleaned.length > 120 || isTitleGeneric(cleaned)) return null;
  return cleaned;
}

async function getAuthorId(supabase: SupaClient, editor: EditorKey): Promise<string | null> {
  const { data } = await supabase.from("authors").select("id").eq(
    "slug",
    AUTHOR_SLUG[editor] || "cyprus-desk",
  ).maybeSingle();
  return (data?.id as string) || null;
}
async function fetchUnsplashImage(
  query: string,
  category: string,
  district: string | null,
): Promise<string | null> {
  const accessKey = Deno.env.get("UNSPLASH_ACCESS_KEY");
  if (!accessKey) return null;
  const grab = async (q: string): Promise<string | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${
          encodeURIComponent(q)
        }&per_page=6&orientation=landscape&content_filter=high`,
        {
          headers: { "Authorization": `Client-ID ${accessKey}`, "Accept-Version": "v1" },
          signal: controller.signal,
        },
      );
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      return (Array.isArray(data.results) && data.results[0]?.urls?.regular as string) || null;
    } catch {
      clearTimeout(timer);
      return null;
    }
  };
  for (
    const q of [
      query,
      `${category} ${district ? district + " " : ""}Cyprus`.trim(),
      `Cyprus ${category}`.trim(),
    ]
  ) {
    const u = await grab(q);
    if (u) return u;
  }
  return null;
}

// ============================================================================
// processOne — 4-language native composition lifecycle
// ============================================================================
interface ScrapedRow {
  id: string;
  original_title: string | null;
  original_url: string | null;
  original_content: string | null;
  original_content_full: string | null;
  category?: string | null;
  scope?: string | null;
  source_word_count?: number | null;
  status?: string | null;
}

async function processOne(
  supabase: SupaClient,
  row: ScrapedRow,
  autoPublish: boolean,
): Promise<
  { ok: boolean; reason?: string; post_id?: string; providers?: string; quality_warning?: string }
> {
  const t0 = Date.now();
  const title = row.original_title || "";
  const content = row.original_content_full || row.original_content || "";
  const sourceUrl = row.original_url || "";

  const sc = isSourceContentRealProse(content);
  if (!sc.ok) {
    await supabase.from("scraped_articles").update({
      status: "failed",
      error_message: `SOURCE_INVALID: ${sc.reason}`,
    }).eq("id", row.id);
    return { ok: false, reason: `SOURCE_INVALID: ${sc.reason}` };
  }

  const { data: claimed, error: claimErr } = await supabase.from("scraped_articles").update({
    status: "rewriting",
    rewrite_started_at: new Date().toISOString(),
  }).eq("id", row.id).eq("status", "scraped").select().single();
  if (claimErr || !claimed) return { ok: false, reason: "CLAIM_REFUSED" };

  const log: Record<string, unknown> = {
    brief_excerpt: title.slice(0, 200),
    article_type: "rewrite",
    category: row.category || null,
  };
  try {
    // Desk 1
    const enrich = await enrichSource(title, content, row.category || "");
    const { editor, category, subcategory, district, sourceLang } = enrich;
    const srcWords = countWords(content);
    const articleType = inferArticleType(category, content, srcWords, enrich.research);
    const arch = getArchetypeBudget(articleType);
    Object.assign(log, {
      category,
      editor,
      word_count_req: arch.minWords,
      desk1_ok: enrich.ok,
      desk1_ms: Date.now() - t0,
    });
    console.log(
      `[writer] Desk1 editor=${editor} cat=${category} district=${
        district || "national"
      } src=${sourceLang} archetype=${arch.label} facts=${countDigestFacts(enrich.research)}`,
    );

    // Desk 2 — compose all four editions natively, in parallel
    const composed = await Promise.all(
      LANGS.map((l) => composeNatively(l, title, enrich.research, category, editor, articleType, arch)),
    );
    const byLang: Record<Lang, LangBundle> = {
      en: composed[0],
      el: composed[1],
      ro: composed[2],
      ar: composed[3],
    };

    // English is the anchor + fallback — must succeed
    if (!byLang.en.ok) {
      byLang.en = await composeNatively("en", title, enrich.research, category, editor, articleType, arch);
    }
    if (!byLang.en.ok) {
      await supabase.from("scraped_articles").update({
        status: "failed",
        error_message: "EN composition failed",
      }).eq("id", row.id);
      return { ok: false, reason: "EN composition failed" };
    }
    if (judgeLength(byLang.en.wc, arch.minWords).isFragment) {
      await supabase.from("scraped_articles").update({
        status: "failed",
        error_message: `FRAGMENT: ${byLang.en.wc}w EN`,
      }).eq("id", row.id);
      return { ok: false, reason: `FRAGMENT ${byLang.en.wc}w` };
    }

    // retry any failed non-English edition once (parallel), else fall back to EN
    const retryLangs = (["el", "ro", "ar"] as Lang[]).filter((l) => !byLang[l].ok);
    if (retryLangs.length && (Date.now() - t0) < TOTAL_SOFT_LIMIT_MS - 60000) {
      const retried = await Promise.all(
        retryLangs.map((l) =>
          composeNatively(l, title, enrich.research, category, editor, articleType, arch)
        ),
      );
      retryLangs.forEach((l, i) => {
        if (retried[i].ok) byLang[l] = retried[i];
      });
    }

    // No silent English fallback. If a non-English edition still failed after the
    // retry, DO NOT copy the English text into it — that is exactly what produced
    // the "all four editions in English" bug, and it hid the real failure. Abort
    // loudly with the exact per-language reason (e.g. the Sonnet/GPT-4o API error)
    // and leave the item in the queue for a clean retry, so we never again ship
    // English disguised as a translation.
    const failedLangs = (["el", "ro", "ar"] as Lang[]).filter((l) => !byLang[l].ok);
    if (failedLangs.length) {
      for (const l of failedLangs) log[`desk2b_${l}_ok`] = false;
      const detail = failedLangs
        .map((l) => `${l.toUpperCase()}=${byLang[l].reason || "unknown"}`)
        .join(" · ");
      // Surface the underlying Sonnet API error if Sonnet fell back to GPT-4o for
      // any edition — that is the real cause (short GPT-4o output → fragment).
      const sonnetDown = LANGS.map((l) => byLang[l].sonnetError).find((e) => e) || "";
      const sonnetNote = sonnetDown
        ? ` Sonnet is not running (${sonnetDown}) — GPT-4o alone is producing short/flat text.`
        : "";
      Object.assign(log, {
        status: "error",
        error_stage: `compose_${failedLangs.join("+")}`,
        error_msg: `Non-English editions failed — ${detail}.${sonnetNote}`.substring(0, 500),
        total_ms: Date.now() - t0,
      });
      await supabase.from("generation_logs").insert(log).then(() => {}, () => {});
      await supabase.from("scraped_articles").update({
        status: "failed",
        error_message: `Non-English composition failed — ${detail}.${sonnetNote}`.substring(0, 500),
      }).eq("id", row.id);
      console.warn(
        `[writer] ABORT ${row.id}: ${detail} | EN via ${byLang.en.provider || "?"} | sonnet: ${
          sonnetDown || "ok"
        }`,
      );
      return {
        ok: false,
        reason: `Non-English composition failed — ${detail}.${sonnetNote} (English wrote via ${
          byLang.en.provider || "?"
        }.)`,
      };
    }

    // Desk 2C — regenerate a generic English title
    if (Date.now() - t0 < TOTAL_SOFT_LIMIT_MS - 30000) {
      const nt = await regenerateTitleIfGeneric(byLang.en.title, enrich.research, editor, "en");
      if (nt) byLang.en.title = nt;
    }

    // Per-edition: plagiarism gate (vs source) + humanness loop, run in PARALLEL
    // so four editions don't stack their revision passes back-to-back (keeps a
    // single article safely within the edge runtime).
    const humBudget = TOTAL_SOFT_LIMIT_MS - (Date.now() - t0);
    await Promise.all(LANGS.map(async (l) => {
      const b = byLang[l];
      if (!b.ok) return;
      const overlap = checkSourceOverlap(b.content, content, 5);
      if (overlap > 0.18) {
        console.warn(
          `[writer] ${l} overlap ${
            (overlap * 100).toFixed(1)
          }% vs source (src=${sourceLang}) — flagged for editor`,
        );
      }
      b.humanness = measureHumanness(b.content, l).score;
      if (b.humanness < 90 && humBudget > 25000) {
        const loop = await humannessEnforceLoop(b.content, l, humBudget);
        if (loop.applied) {
          b.content = loop.html;
          b.humanness = loop.after;
          b.wc = countWords(b.content);
        }
      }
      log[`desk2b_${l}_ok`] = true;
      log[`${l}_humanness`] = b.humanness;
      log[`words_${l}`] = b.wc;
    }));

    // cover + author
    const authorId = await getAuthorId(supabase, editor);
    let cover: string | null = null;
    if (Date.now() - t0 < TOTAL_SOFT_LIMIT_MS - 8000) {
      const q = await buildVisualQuery(byLang.en.title, category, district);
      cover = await fetchUnsplashImage(q, category, district);
    }

    // commit (atomic, 4-lang)
    const publishNow = autoPublish === true;
    const nowIso = new Date().toISOString();
    const slug = generateSlug(byLang.en.title);
    const f = (l: Lang, k: keyof LangBundle) => byLang[l][k] as string;
    const blogPayload: Record<string, unknown> = {
      title_en: f("en", "title"),
      title_el: f("el", "title"),
      title_ro: f("ro", "title"),
      title_ar: f("ar", "title"),
      content_en: f("en", "content"),
      content_el: f("el", "content"),
      content_ro: f("ro", "content"),
      content_ar: f("ar", "content"),
      excerpt_en: f("en", "excerpt"),
      excerpt_el: f("el", "excerpt"),
      excerpt_ro: f("ro", "excerpt"),
      excerpt_ar: f("ar", "excerpt"),
      summary_en: f("en", "summary"),
      summary_el: f("el", "summary"),
      summary_ro: f("ro", "summary"),
      summary_ar: f("ar", "summary"),
      tags_en: byLang.en.tags,
      tags_el: byLang.el.tags,
      tags_ro: byLang.ro.tags,
      tags_ar: byLang.ar.tags,
      seo_title_en: f("en", "seoTitle"),
      seo_title_el: f("el", "seoTitle"),
      seo_title_ro: f("ro", "seoTitle"),
      seo_title_ar: f("ar", "seoTitle"),
      seo_description_en: f("en", "seoDesc"),
      seo_description_el: f("el", "seoDesc"),
      seo_description_ro: f("ro", "seoDesc"),
      seo_description_ar: f("ar", "seoDesc"),
      slug,
      category,
      subcategory,
      county: district,
      cover_image: cover,
      source_url: sourceUrl,
      scraped_article_id: row.id,
      ai_editor: editor,
      author_name: deskName(editor),
      author_id: authorId,
      word_count: String(byLang.en.wc),
      status: publishNow ? "published" : "draft",
      published_at: publishNow ? nowIso : "",
    };
    const writeback: Record<string, unknown> = {
      assigned_editor: editor,
      rewritten_en: f("en", "content"),
      rewritten_el: f("el", "content"),
      rewritten_ro: f("ro", "content"),
      rewritten_ar: f("ar", "content"),
      title_en: f("en", "title"),
      title_el: f("el", "title"),
      title_ro: f("ro", "title"),
      title_ar: f("ar", "title"),
      excerpt_en: f("en", "excerpt"),
      excerpt_el: f("el", "excerpt"),
      excerpt_ro: f("ro", "excerpt"),
      excerpt_ar: f("ar", "excerpt"),
      summary_en: f("en", "summary"),
      summary_el: f("el", "summary"),
      summary_ro: f("ro", "summary"),
      summary_ar: f("ar", "summary"),
      rewrite_tags: byLang.en.tags,
      rewrite_tags_en: byLang.en.tags,
      rewrite_tags_el: byLang.el.tags,
      rewrite_tags_ro: byLang.ro.tags,
      rewrite_tags_ar: byLang.ar.tags,
      seo_title_en: f("en", "seoTitle"),
      seo_title_el: f("el", "seoTitle"),
      seo_title_ro: f("ro", "seoTitle"),
      seo_title_ar: f("ar", "seoTitle"),
      seo_description_en: f("en", "seoDesc"),
      seo_description_el: f("el", "seoDesc"),
      seo_description_ro: f("ro", "seoDesc"),
      seo_description_ar: f("ar", "seoDesc"),
      category,
      subcategory,
      cover_image: cover,
      output_word_count: String(byLang.en.wc),
    };
    const { data: rpc, error: rpcErr } = await supabase.rpc("commit_scraper_blog_post", {
      p_blog_payload: blogPayload,
      p_scraped_id: row.id,
      p_writeback: writeback,
    });
    if (rpcErr || !rpc) throw new Error(`commit_scraper_blog_post RPC failed: ${rpcErr?.message || "no id"}`);
    const postId = rpc as string;
    const providers =
      `en=${byLang.en.provider} el=${byLang.el.provider} ro=${byLang.ro.provider} ar=${byLang.ar.provider}`;
    // If every edition wrote via gpt4o, Sonnet is not running — the article will
    // read flat because the Sonnet humanising pass never happened. Flag it in the
    // log's error_msg (harmless on an ok row) so it is visible without digging.
    const allGpt = LANGS.every((l) => byLang[l].provider === "gpt4o");
    const sonnetDown = LANGS.map((l) => byLang[l].sonnetError).find((e) => e) || "";
    Object.assign(log, {
      status: "ok",
      total_ms: Date.now() - t0,
      ...(allGpt
        ? {
          error_msg: `quality-warning: all editions via gpt4o (Sonnet: ${sonnetDown || "?"})`.substring(
            0,
            500,
          ),
        }
        : {}),
    });
    await supabase.from("generation_logs").insert(log).then(() => {}, () => {});
    console.log(
      `[writer] DONE ${row.id} → ${postId} | providers ${providers} | sonnet: ${
        sonnetDown || "ok"
      } | EN ${byLang.en.wc}w h${byLang.en.humanness} EL ${byLang.el.humanness} RO ${byLang.ro.humanness} AR ${byLang.ar.humanness} | ${
        ((Date.now() - t0) / 1000).toFixed(1)
      }s`,
    );
    return {
      ok: true,
      post_id: postId,
      providers,
      quality_warning: allGpt
        ? `All editions written by GPT-4o — Sonnet did not run${
          sonnetDown ? ` (${sonnetDown})` : ""
        }, so the text reads flat. Fix the Sonnet call, then regenerate.`
        : undefined,
    };
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`[writer] EXCEPTION ${row.id}: ${msg}`);
    await supabase.from("generation_logs").insert({
      ...log,
      status: "error",
      error_stage: "processOne",
      error_msg: msg.substring(0, 500),
      total_ms: Date.now() - t0,
    }).then(() => {}, () => {});
    await supabase.from("scraped_articles").update({
      status: "failed",
      error_message: msg.substring(0, 500),
      rewrite_error: msg.substring(0, 500),
      rewrite_finished_at: new Date().toISOString(),
    }).eq("id", row.id);
    return { ok: false, reason: msg };
  }
}

// ============================================================================
// AUTH + SERVE
// ============================================================================
async function requireAdmin(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) return null;
  try {
    const probe = createClient(Deno.env.get("SUPABASE_URL")!, token, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await probe.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (!error) return null;
  } catch { /* not service-role */ }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey!,
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id)
      .eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    return null;
  } catch (e) {
    console.error("[requireAdmin] deny:", (e as Error).message);
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => ({})) as {
      scraped_article_id?: string;
      source?: string;
      auto_publish?: boolean;
      action?: string;
      selftest?: boolean;
    };

    // Diagnostic: which models does this key actually serve? No DB writes.
    if (body.action === "selftest" || body.selftest === true) {
      const report = await runSelfTest();
      return new Response(JSON.stringify(report), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const supabase = adminClient();
    const fromCron = body.source === "cron";
    try {
      await supabase.rpc("sweep_stuck_rewrite_jobs");
    } catch { /* optional */ }
    const { data: settings } = await supabase.from("automation_settings").select(
      "processor_enabled, auto_publish",
    ).eq("id", 1).maybeSingle();
    const s = settings as { processor_enabled: boolean; auto_publish: boolean } | null;

    if (body.scraped_article_id) {
      const { data, error } = await supabase.from("scraped_articles").select(
        "id, original_title, original_url, original_content, original_content_full, category, scope, source_word_count, status",
      ).eq("id", body.scraped_article_id).single();
      if (error || !data) {
        return new Response(JSON.stringify({ ok: false, error: "scraped article not found" }), {
          status: 404,
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      const out = await processOne(supabase, data as ScrapedRow, body.auto_publish === true);
      // Always 200 so the reason reaches the browser (supabase.functions.invoke
      // hides the body on a non-2xx status). The admin UI reads out.ok/out.reason.
      return new Response(JSON.stringify(out), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    if (fromCron && !s?.processor_enabled) {
      return new Response(JSON.stringify({ ok: true, skipped: "processor_disabled" }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const autoPublish = (s?.auto_publish === true) && (fromCron || body.auto_publish === true);
    const { data: rows } = await supabase.from("scraped_articles").select(
      "id, original_title, original_url, original_content, original_content_full, category, scope, source_word_count, status",
    ).eq("status", "scraped").eq("is_used", false).order("created_at", { ascending: true }).limit(BATCH_MAX);
    const list = (rows || []) as ScrapedRow[];
    const results: Array<
      {
        id: string;
        ok: boolean;
        reason?: string;
        post_id?: string;
        providers?: string;
        quality_warning?: string;
      }
    > = [];
    const start = Date.now();
    for (const r of list) {
      if (Date.now() - start > TOTAL_SOFT_LIMIT_MS - 30000) break;
      const out = await processOne(supabase, r, autoPublish);
      results.push({ id: r.id, ...out });
    }
    return new Response(
      JSON.stringify({
        ok: true,
        processed: results.length,
        published: results.filter((r) => r.ok).length,
        results,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
