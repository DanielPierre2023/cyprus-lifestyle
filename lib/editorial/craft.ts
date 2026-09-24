// lib/editorial/craft.ts
// ============================================================================
// THE HOUSE BOOK — the editorial craft layer. Pure (NO I/O), so it is unit-tested
// and shared by the generation layer (lib/editorial/generate.ts).
//
// Three things make a Cyprus Lifestyle piece read like a top staff writer wrote it,
// not a machine:
//   1. FRANCHISE FORMAT   — the exact redactional architecture per column (an
//                           interview is built differently from a review or a profile).
//   2. HOUSE STYLE        — the craft standard: NYT / Vogue / Washington Post level.
//   3. ANTI-AI            — the rules that make it undetectable as AI, in every
//                           language (no em dashes, none of the tell-tale phrases,
//                           varied human rhythm) — plus a deterministic scrubber that
//                           guarantees the mechanical tells are gone even if the model
//                           slips.
// ============================================================================

// ── 1. Per-franchise redactional format ─────────────────────────────────────────
// Keyed by franchise key (see lib/editorial/pipeline.ts FRANCHISES). Each is the
// architecture the writer must follow for that column, at magazine standard.
export const FRANCHISE_FORMAT: Record<string, string> = {
  tastemakers:
    'FORMAT — THE TASTEMAKERS (long-form profile interview):\n' +
    '1. SCENE-SET OPENING (1–2 paras): put the reader in the room — where you met, the light and sound, what the subject was doing, one telling physical detail. Cinematic but precise.\n' +
    '2. WHO & WHY NOW (1 para): who they are, why they matter, why this conversation now.\n' +
    '3. THE CONVERSATION (the body): render it as narrative interwoven with verbatim quotes, NOT a raw Q&A transcript. Let the quotes carry the voice; use narration to move between subjects, add context and observe. Include at least one moment of tension, revision or surprise.\n' +
    '4. THE TURN: a deeper or more personal beat about two-thirds through.\n' +
    '5. THE CLOSE: a final image or line that resonates and implies more than it says. Never a summary.',
  'concierge-meets':
    'FORMAT — THE CONCIERGE MEETS (service interview):\n' +
    '1. FRAME THE NEED: when and why a discerning resident would need this service.\n' +
    '2. WHO THEY ARE and what genuinely sets them apart.\n' +
    '3. THE CONVERSATION: what excellence actually looks like in this field — insider knowledge the reader could not get elsewhere — told through verbatim quotes and narration.\n' +
    '4. THE PRACTICAL TAKEAWAY: how to work with them, what to ask for, what it costs where known.\n' +
    '5. A close that lands. Useful above all, but written as prose, never a bulleted list.',
  'five-min':
    'FORMAT — FIVE MINUTES WITH (fast Q&A):\n' +
    '1. STANDFIRST (2–3 sentences): who this is and why they are worth five minutes, with a specific hook.\n' +
    '2. THE EXCHANGE: 5–7 turns in clean Q&A — the question in bold, the answer in plain text. Questions short and sharp; answers the subject’s real words, edited for concision, kept vivid and specific.\n' +
    '3. KICKER: end on the best line, or a one-line sign-off. No padding — every question earns its place.',
  'behind-the-business':
    'FORMAT — BEHIND THE BUSINESS (founder profile):\n' +
    '1. OPEN on a concrete, revealing moment or decision — not a company overview.\n' +
    '2. THE ORIGIN: how and why it began, in specifics.\n' +
    '3. THE HARD PART: the real decisions, setbacks and trade-offs — honest, not a success-story gloss; use actual numbers where you have them.\n' +
    '4. THE PERSON: what drives them, in their own words.\n' +
    '5. WHAT’S NEXT, and a close that lands. Report, never flatter; no corporate-PR tone.',
  maker:
    'FORMAT — THE MAKER (craft profile):\n' +
    '1. OPEN at the hands and the work: the material, the tool, the gesture, the workshop, the place.\n' +
    '2. THE PROCESS, told with real technical specifics only someone who watched would know.\n' +
    '3. THE PERSON and their training or lineage.\n' +
    '4. WHY IT MATTERS: the value of the made thing in a mass-produced world.\n' +
    '5. A close on the object itself. Sensory, precise, unhurried.',
  'at-the-table':
    'FORMAT — AT THE TABLE (dining feature / review):\n' +
    '1. THE ARRIVAL: the approach, the room, the welcome, the atmosphere.\n' +
    '2. THE FOOD: dish by dish, named exactly, with real sensory specifics (texture, temperature, seasoning, technique) and honest judgement.\n' +
    '3. THE PEOPLE behind it, briefly.\n' +
    '4. THE PRACTICALS woven into the prose (what to order, roughly what it costs, when to go) — never a specs box.\n' +
    '5. THE VERDICT: a clear, earned point of view. Praise what deserves it; name what does not.',
  'power-list':
    'FORMAT — THE POWER LIST (ranked authority list):\n' +
    '1. INTRO: frame the season and the criteria with a real point of view, not a disclaimer.\n' +
    '2. THE RANKED ENTRIES: each with the name, a confident one-paragraph rationale mixing fact and judgement, and what earns its place. Rank deliberately.\n' +
    '3. A decisive closing line. A list with opinions, never a directory.',
};

// Fallback by piece KIND when a franchise has no specific format (see PIECE_KINDS).
const KIND_FORMAT: Record<string, string> = {
  interview: FRANCHISE_FORMAT.tastemakers,
  profile: FRANCHISE_FORMAT['behind-the-business'],
  feature: FRANCHISE_FORMAT['at-the-table'],
  picks: FRANCHISE_FORMAT['power-list'],
  note:
    'FORMAT — THE NOTE (short dispatch):\n' +
    '1. A single sharp opening line. 2. Three to five tight paragraphs on one thing worth knowing, with specifics. 3. A close that points forward. No filler.',
  edit:
    'FORMAT — THE EDIT (curated short items):\n' +
    'A brief framing line, then 3–6 short entries, each a name plus a vivid two-to-three-sentence take with a clear reason it made the cut.',
};

export function formatFor(franchise?: string | null, kind?: string | null): string {
  if (franchise && FRANCHISE_FORMAT[franchise]) return FRANCHISE_FORMAT[franchise];
  if (kind && KIND_FORMAT[kind]) return KIND_FORMAT[kind];
  return KIND_FORMAT.feature;
}

// ── 2. House style — the craft standard ─────────────────────────────────────────
export const HOUSE_STYLE =
  'CRAFT STANDARD — write to the level of the New York Times, Vogue and the Washington Post. ' +
  'Reported, specific and stylish, with a clear point of view and not a wasted word. Show, do not tell. ' +
  'Lead with the concrete: real names, real numbers, sensory detail, the exact thing observed — not adjectives ' +
  'about it. Every claim is earned; every quote is verbatim from the material and never invented. Have an ' +
  'opinion and let it show with taste. Write for an intelligent reader who has been everywhere; do not explain ' +
  'the obvious, do not sell, do not gush.';

// ── 3. Anti-AI — undetectable, human, in every language ─────────────────────────
// The phrases a detector (and a good editor) reads as machine-written. Curated to
// avoid false positives on ordinary journalism.
export const AI_TELLS: string[] = [
  'in the world of', 'when it comes to', "it's worth noting", 'it is worth noting', 'needless to say',
  'nestled', 'boasts', 'boasting', 'a testament to', 'testament to', 'rich tapestry', 'tapestry of',
  'in conclusion', 'in summary', 'look no further', 'hidden gem', 'must-visit', 'must-see',
  'stands as a', 'a myriad of', 'myriad of', 'plethora of', 'delve into', 'delving into',
  'elevate your', 'elevate the', 'seamless', 'seamlessly', 'curated selection', 'whether you are',
  "whether you're", 'at the end of the day', 'that being said', 'navigating the', 'navigate the',
  'in today’s', "in today's", 'ever-evolving', 'ever-changing', 'game-changer', 'treasure trove',
  'in the heart of', 'nestled in the heart', 'more than just', "isn't just", 'is not just',
  'first and foremost', 'a feast for the senses', 'leave you wanting more', 'a symphony of',
  'as we navigate', 'unlock the', 'a world of', 'when it comes down to', 'truly',
  // current-generation AI tells (2025–2026). 'underscore' catches underscored/
  // underscoring, 'showcase' catches showcases/showcasing (substring match).
  'underscore', 'pivotal', 'in an era', 'testament', 'showcase', 'stands out', 'evolving landscape',
];

// ── Structural anti-AI — human "burstiness" ──────────────────────────────────────
// Deliberately uneven architecture is the single hardest thing for a model to fake,
// so we spell it out. Exported so the transcreation pass can reuse it and so it can
// be unit-tested. The prose is itself bursty, to model the instruction.
export const BURSTINESS: string = [
  '• Structure with human burstiness. Make paragraph lengths deliberately UNEVEN: some paragraphs a single short sentence, others a full, winding block. Never put two adjacent paragraphs of similar length next to each other.',
  '• Spread sentence length wide on purpose. Set very short sentences (three to five words) hard against long ones (thirty words or more). Some land in two words. Others run on, gathering clauses, doubling back, holding the reader until the thought is fully spent.',
  '• Keep the rhythm unpredictable. No uniform cadence, no metronome of medium-length sentences, no paragraph built to the same shape as the one before it. If a pattern starts to form, break it.',
].join('\n');

// The instruction block that makes the model write undetectably. Language-agnostic
// (the same rules hold in every edition); `language` names the target for translations.
export function antiAiRules(language = 'English'): string {
  return [
    `WRITE UNDETECTABLY AS A HUMAN ${language.toUpperCase()} STAFF WRITER — this is non-negotiable:`,
    '• NEVER use an em dash (—) or a spaced en dash used as one. Use commas, full stops, semicolons or parentheses instead.',
    '• NEVER use these phrases or their close variants: ' + AI_TELLS.slice(0, 40).join('; ') + '.',
    '• Vary sentence length and rhythm hard: mix short, blunt sentences with longer ones. Do not start consecutive sentences the same way, and avoid participial openers ("Nestled…", "Boasting…", "Perched…").',
    BURSTINESS,
    '• No habitual tricolons (lists of three), no "not only X but also Y", no "isn’t just X, it’s Y", no rhetorical questions as filler.',
    '• Do NOT end with a summary that restates the piece. End on an image, a line of dialogue, or a forward look.',
    '• Cut hype adjectives (vibrant, bustling, stunning, breathtaking, iconic, elevated, curated, seamless). Replace them with the specific thing.',
    '• Use contractions where the register allows. Let the prose breathe like a person wrote it: an occasional short fragment, a dry aside, a real opinion.',
    '• Keep every proper noun, number, date and quote exactly as given. Invent nothing.',
    (language === 'English'
      ? '• Write in British English spelling and Cyprus usage.'
      : `• Write idiomatic, publication-grade ${language} as a native journalist would — never a translated-sounding or machine-sounding rendering, and avoid ${language}’s own AI/marketing clichés.`),
  ].join('\n');
}

// The full craft block appended to a draft/polish system prompt.
export function craftBlock(franchise?: string | null, kind?: string | null, language = 'English'): string {
  return [formatFor(franchise, kind), '', HOUSE_STYLE, '', antiAiRules(language)].join('\n');
}

// ── Deterministic scrubber — guarantees the mechanical tells are gone ────────────
// Runs on every generated/translated body. Preserves newlines (markdown paragraphs)
// and number ranges (9–11); only removes the dash-as-punctuation AI tell and tidies
// the artefacts. Pure + unit-tested.
export function deAiScrub(input: string): string {
  let s = String(input || '');
  s = s.replace(/[ \t]*—[ \t]*/g, ', ');                 // em dash → comma
  s = s.replace(/[ \t]*―[ \t]*/g, ', ');                 // horizontal bar → comma
  s = s.replace(/([^\d\s])[ \t]*–[ \t]*([^\d\s])/g, '$1, $2'); // en dash between words → comma (keep number ranges)
  s = s.replace(/ ,/g, ',').replace(/,{2,}/g, ',');       // tidy stray commas
  s = s.replace(/,([ \t]*)([.!?;:])/g, '$2');             // ", ." → "."
  s = s.replace(/[ \t]{2,}/g, ' ');                        // collapse runs of spaces (not newlines)
  s = s.replace(/[ \t]+([,.;:!?])/g, '$1');                // no space before punctuation
  s = s.replace(/[ \t]+\n/g, '\n');                        // trim trailing spaces on lines
  return s.trim();
}

// Which AI tells appear in a text (case-insensitive), plus the em-dash flag. Used to
// score a draft and to tell the polish pass exactly what to remove.
export function lintAiTells(text: string): string[] {
  const hay = ' ' + String(text || '').toLowerCase().replace(/\s+/g, ' ') + ' ';
  const found = new Set<string>();
  for (const t of AI_TELLS) if (hay.includes(t.toLowerCase())) found.add(t);
  if (/—|―/.test(String(text || ''))) found.add('em dash (—)');
  return [...found];
}

// Strip HTML markup to plain text so the AI-tell scorer (scoreAiTells) sees prose,
// not tags. Block-level closings become newlines, so paragraph-aware tells still
// register; every other tag is dropped and the common entities are decoded. Markdown
// or plain text passes through essentially unchanged. Pure + unit-tested.
export function stripHtml(input: string): string {
  let s = String(input || '');
  s = s.replace(/<\s*(?:br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/blockquote)\s*\/?>/gi, '\n'); // block ends → newline
  s = s.replace(/<[^>]+>/g, '');                                                        // drop all remaining tags
  s = s.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
  s = s.replace(/[ \t]+/g, ' ');                                                        // collapse inline whitespace (keep newlines)
  s = s.replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n');                    // tidy newlines
  return s.trim();
}

// The polish/de-AI pass system prompt: rewrite to the standard, enforce the format,
// remove every detected tell. Facts and quotes are frozen.
export function polishSystem(franchise?: string | null, kind?: string | null, tells: string[] = [], language = 'English'): string {
  return [
    `You are the executive editor of Cyprus Lifestyle, editing a ${language} piece to the highest publishable standard.`,
    'Rewrite the article below so it reads as if written by a top human staff writer and is undetectable as AI. ' +
      'Sharpen the prose, fix any flat or generic passages, and make the rhythm human. Keep EVERY fact, name, ' +
      'number, date and quotation exactly as they are — change wording and structure, never the facts.',
    '',
    craftBlock(franchise, kind, language),
    tells.length ? `\nThese AI tells were detected and MUST be gone from your version: ${tells.join('; ')}.` : '',
    '',
    'Return ONLY JSON: {"title":"<the headline>","body_md":"<the edited article body, in the SAME format you received it — markdown or HTML>"}.',
  ].join('\n');
}

// ── Transcreation prompt — re-report natively, kill translationese ────────────────
// For the six non-English editions: instead of a faithful translation, re-report the
// piece AS A NATIVE writer of the target language, keeping every fact and the section
// structure but rebuilding the prose in that language's own rhythm. Pure; the model
// call lives in generate.ts (transcreatePiece). Reuses antiAiRules (which carries the
// BURSTINESS directive) so the output obeys the same anti-AI contract.
export function transcreateSystem(language = 'English'): string {
  const L = language.toUpperCase();
  return [
    `You are a NATIVE ${L} STAFF WRITER at Cyprus Lifestyle, a premium magazine for discerning residents of the Republic of Cyprus.`,
    '',
    `TASK: RE-REPORT the piece below in ${language}. This is transcreation, not translation. Rewrite it as if you had reported and written it yourself in ${language} from the first line, for ${language}-speaking readers.`,
    '',
    '• Keep EVERY fact, name, number, date, price and quotation exactly as given. Add nothing, drop nothing, invent nothing.',
    '• Keep the section structure and running order: the same beats and headings, in the same sequence, and return the body in the SAME format you receive it (markdown or HTML).',
    `• Do NOT mirror the English sentence shapes, clause order or idioms. Think in ${language} and phrase it the way a ${language} journalist actually writes; where English uses a turn of phrase ${language} would not, recast it natively rather than carrying it across.`,
    `• Translate meaning and effect, never words. The result must read as though ${language} were the original language, with no trace of an English source underneath.`,
    '',
    HOUSE_STYLE,
    '',
    antiAiRules(language),
    '',
    'Return ONLY JSON of the exact shape: {"title":"<the re-reported title>","body":"<the re-reported body, same format as received>"}.',
  ].join('\n');
}
