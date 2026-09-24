// lib/editorial/pipeline.ts
// ============================================================================
// EDITORIAL & INTERVIEW PIPELINE — pure domain logic (NO I/O).
// ----------------------------------------------------------------------------
// The premium magazine is built on recurring FRANCHISES, and every piece moves
// through one editorial WORKFLOW from commission to publish. This module is the
// single source of truth for both, plus the pure system-prompt builders that the
// server-only generate layer (lib/editorial/generate.ts) feeds to the model.
//
// Everything here is deterministic and side-effect-free, so it is unit-tested
// (scripts/tests/editorial.test.ts) and safe to import anywhere — server, client
// or a test bundle. All model calls live in generate.ts; nothing in this file
// touches the network, the database or `server-only`.
// ============================================================================

// ── locales (the seven editions, matching blog_posts' column families) ────────
export const LOCALES = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  el: 'Greek (Ελληνικά)',
  ro: 'Romanian (Română)',
  ar: 'Arabic (العربية)',
  de: 'German (Deutsch)',
  pl: 'Polish (Polski)',
  ru: 'Russian (Русский)',
};

export const isLocale = (x: string): x is Locale => (LOCALES as readonly string[]).includes(x);

// ── article shapes ────────────────────────────────────────────────────────────
export const PIECE_KINDS = ['feature', 'interview', 'profile', 'note', 'edit', 'picks'] as const;
export type PieceKind = (typeof PIECE_KINDS)[number];
export const isPieceKind = (x: string): x is PieceKind => (PIECE_KINDS as readonly string[]).includes(x);

// ── franchises — the recurring columns of the magazine ────────────────────────
export interface Franchise {
  key: string;
  name: string;
  cadence: string;      // publishing rhythm
  kind: PieceKind;      // the default article shape for this column
  description: string;  // the editorial remit, in house voice
}

export const FRANCHISES: Franchise[] = [
  {
    key: 'tastemakers',
    name: 'The Tastemakers',
    cadence: 'weekly',
    kind: 'interview',
    description:
      'Long-form conversations with the people shaping how Cyprus lives well — chefs, designers, hoteliers, gallerists and cultural figures — on taste, craft and the island they are building.',
  },
  {
    key: 'behind-the-business',
    name: 'Behind the Business',
    cadence: 'weekly',
    kind: 'profile',
    description:
      'The founders and operators behind the island’s most interesting companies, and the honest story of how they actually built them — the decisions, the setbacks and the numbers that mattered.',
  },
  {
    key: 'five-min',
    name: 'Five Minutes With',
    cadence: 'twice weekly',
    kind: 'interview',
    description:
      'A fast, sharp Q&A — five questions, five minutes — with someone worth knowing this week. Personable, quotable and quick to read.',
  },
  {
    key: 'maker',
    name: 'The Maker',
    cadence: 'fortnightly',
    kind: 'profile',
    description:
      'Craftspeople and producers — winemakers, ceramicists, boat-builders, perfumers — and the work of their hands, told with a sense of place and process.',
  },
  {
    key: 'at-the-table',
    name: 'At the Table',
    cadence: 'weekly',
    kind: 'feature',
    description:
      'Where and how Cyprus eats and drinks: the restaurants, wineries, tavernas and tables worth travelling for, reported first-hand and without flattery.',
  },
  {
    key: 'concierge-meets',
    name: 'The Concierge Meets',
    cadence: 'monthly',
    kind: 'interview',
    description:
      'Our concierge sits down with a service the discerning resident should have on speed-dial — the fixer, the lawyer, the private doctor — and finds out what excellence really looks like.',
  },
  {
    key: 'power-list',
    name: 'The Power List',
    cadence: 'quarterly',
    kind: 'picks',
    description:
      'The definitive, ranked lists — the names, places and openings that define the season across dining, property, wellness and culture.',
  },
];

export const FRANCHISE_KEYS: ReadonlySet<string> = new Set(FRANCHISES.map((f) => f.key));
export const isFranchise = (key: string): boolean => FRANCHISE_KEYS.has(key);
export const getFranchise = (key: string): Franchise | undefined => FRANCHISES.find((f) => f.key === key);

// ── the editorial workflow (pipeline_status) ──────────────────────────────────
export const PIPELINE_STATUSES = [
  'commissioned', 'dossier', 'drafting', 'editing', 'translating', 'scheduled', 'published',
] as const;
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];
export const isPipelineStatus = (x: string): x is PipelineStatus =>
  (PIPELINE_STATUSES as readonly string[]).includes(x);

// Allowed forward (and a few corrective backward) transitions. The board and the
// routes consult this so a piece can never jump to an incoherent stage.
const STATUS_FLOW: Record<PipelineStatus, PipelineStatus[]> = {
  commissioned: ['dossier', 'drafting'],          // a note/picks can skip the dossier
  dossier:      ['drafting'],
  drafting:     ['editing'],
  editing:      ['translating', 'scheduled'],      // translate first, or schedule a single-edition note
  translating:  ['editing', 'scheduled'],          // back for fixes, or forward to schedule
  scheduled:    ['published', 'editing'],           // go live, or pull back to edit
  published:    [],                                 // terminal
};

// The stages a piece may legally move to next (empty once published).
export function nextStatuses(from: PipelineStatus): PipelineStatus[] {
  return STATUS_FLOW[from] ? [...STATUS_FLOW[from]] : [];
}

// May a piece move from → to?
export function canTransition(from: PipelineStatus, to: PipelineStatus): boolean {
  return !!STATUS_FLOW[from]?.includes(to);
}

// ── the subject of a piece (what the interview/profile is ABOUT) ───────────────
export interface PipelineSubject {
  name: string;
  category?: string | null;   // canonical category label or key
  district?: string | null;   // nicosia | limassol | ...
  summary?: string | null;    // the business's own words / our summary
  website?: string | null;
  tags?: string[] | null;
}

function subjectFacts(subject: PipelineSubject): string {
  const lines: string[] = [`Name: ${subject.name}`];
  if (subject.category) lines.push(`Category: ${subject.category}`);
  if (subject.district) lines.push(`District: ${subject.district}`);
  if (subject.website) lines.push(`Website: ${subject.website}`);
  if (subject.tags && subject.tags.length) lines.push(`Tags: ${subject.tags.join(', ')}`);
  if (subject.summary) lines.push(`What we know: ${subject.summary}`);
  return lines.join('\n');
}

// The shared voice contract — the House Book in one paragraph, so every prompt
// produces the same register.
const HOUSE_VOICE =
  'You write for Cyprus Lifestyle, a premium multilingual magazine for discerning residents of, and movers to, the Republic of Cyprus. ' +
  'The voice is warm, literate and precise — confident but never sycophantic, specific over generic, and always honest: never fabricate quotes, awards, prices or facts, and never flatter a business you cannot verify. ' +
  'Write about the south (Republic of Cyprus) only.';

// ── pure system-prompt builders ───────────────────────────────────────────────

// The DOSSIER prompt: research the subject and produce an interview briefing plus
// a set of tailored, non-generic questions. JSON out, so generate.ts can persist it.
export function dossierPrompt(subject: PipelineSubject): string {
  return [
    HOUSE_VOICE,
    '',
    'TASK: You are the commissioning editor preparing to INTERVIEW the business below in Cyprus. ' +
      'Using ONLY the grounded facts provided (in this prompt and in the knowledge supplied by the caller), ' +
      'write a tight briefing dossier and a set of interview questions for the journalist.',
    '',
    'THE SUBJECT:',
    subjectFacts(subject),
    '',
    'The briefing must orient the journalist fast: who this is, why they matter now, what to look for on the ground, ' +
      'and the ONE angle that would make the piece sing. The questions must be specific to THIS subject — ' +
      'open, human and revealing, never a generic template. Ask about origin, craft, the hard decisions, the customer, ' +
      'and Cyprus itself. Do not invent facts; where you are unsure, frame it as a question to ask.',
    '',
    'Return ONLY JSON of the exact shape: ' +
      '{"briefing":"<2-4 short paragraphs, plain text>","questions":["<question 1>","<question 2>", "..."]}. ' +
      'Provide between 8 and 12 questions.',
  ].join('\n');
}

// The DRAFT prompt: turn the dossier/notes into a finished house-voice article in
// the given franchise and shape. Body is MARKDOWN. JSON out (title + body_md).
export function draftPrompt(
  kind: PieceKind,
  franchise: string,
  notes: string,
  subject: PipelineSubject,
): string {
  const f = getFranchise(franchise);
  const franchiseLine = f
    ? `FRANCHISE — "${f.name}" (${f.cadence}): ${f.description}`
    : `FRANCHISE: ${franchise}`;
  return [
    HOUSE_VOICE,
    '',
    `TASK: Write a publication-ready ${kind} for the franchise below, in ENGLISH as the source edition. ` +
      'It will later be translated into the other editions, so keep it clean, well-structured and self-contained.',
    '',
    franchiseLine,
    '',
    'THE SUBJECT:',
    subjectFacts(subject),
    '',
    'MATERIAL (dossier, interview transcript and/or the editor’s notes — ground the piece in this, add nothing false):',
    notes && notes.trim() ? notes.trim() : '(none supplied — write from the subject facts above only, and do not invent quotes)',
    '',
    'Craft: a compelling title, a strong opening that earns the reader’s attention, a clear through-line built on the ' +
      'franchise’s angle, and a close that lands. Use real specifics from the material; if you have no verified quote, ' +
      'do not manufacture one. Aim for 600–1100 words unless the shape (a note, a picks list) calls for less.',
    '',
    'FORMAT: the body must be MARKDOWN — use ## / ### headings, **bold**, *italics*, and - bullet lists where they help. ' +
      'Do NOT include the title as a heading inside the body (it is returned separately).',
    '',
    'Return ONLY JSON of the exact shape: {"title":"<the headline>","body_md":"<the article body in markdown>"}.',
  ].join('\n');
}

// The TRANSLATE prompt: render an existing piece into the target edition, keeping
// meaning, tone and formatting. JSON out (title + body).
export function translatePrompt(targetLocale: string): string {
  const name = isLocale(targetLocale) ? LOCALE_NAMES[targetLocale] : targetLocale;
  return [
    HOUSE_VOICE,
    '',
    `TASK: TRANSLATE the article below into ${name}. Produce a faithful, natural-sounding ${name} edition — ` +
      'not a literal word-for-word rendering. Preserve the meaning, the register and every fact exactly; ' +
      'do not add, drop or embellish anything.',
    '',
    'Keep ALL formatting and structure intact — the same headings, paragraph breaks, bold/italic emphasis, links and ' +
      'list items, in the same order (the body may be markdown or HTML; return it in the SAME format you receive it). ' +
      'Translate the title too. Keep proper nouns, brand names and Cyprus place names appropriate for the language ' +
      '(transliterate where that is the natural convention).',
    '',
    'Return ONLY JSON of the exact shape: {"title":"<translated title>","body":"<translated body, same format>"}.',
  ].join('\n');
}

// ── pure commissioning suggester ──────────────────────────────────────────────
// Given a subject (and/or a chosen franchise), propose a coherent commission the
// editor can accept or tweak: which franchise, which shape, the angle and a
// working title. Deterministic — no model call.
export interface CommissionInput {
  subjectName?: string | null;
  category?: string | null;   // canonical category key or label
  district?: string | null;
  franchise?: string | null;  // force a franchise, else it is inferred
}
export interface CommissionSuggestion {
  franchise: string;
  kind: PieceKind;
  angle: string;
  workingTitle: string;
}

// Map a category signal to the most fitting franchise.
function inferFranchise(category?: string | null): string {
  const c = (category || '').toLowerCase();
  if (/rest|cafe|caf|bar|tavern|dining|food|deli|patiss|baker/.test(c)) return 'at-the-table';
  if (/wine|winery|maker|craft|ceramic|artisan|boat|perfum/.test(c)) return 'maker';
  if (/hotel|resort|villa|stay|spa|beauty|wellness|design|gallery|museum|culture/.test(c)) return 'tastemakers';
  if (/law|account|bank|insur|consult|immigration|company|doctor|clinic|dentist|concierge|service/.test(c))
    return 'concierge-meets';
  // founders & operators of everything else
  return 'behind-the-business';
}

export function suggestCommission(input: CommissionInput): CommissionSuggestion {
  const key = input.franchise && isFranchise(input.franchise) ? input.franchise : inferFranchise(input.category);
  const f = getFranchise(key)!; // key is guaranteed valid above
  const who = (input.subjectName || '').trim() || 'a Cyprus business worth knowing';
  const place = input.district ? `${input.district.charAt(0).toUpperCase()}${input.district.slice(1)}` : 'Cyprus';

  const angle =
    f.kind === 'picks'
      ? `A ranked ${f.name} for ${place}${input.category ? ` — the best in ${input.category}` : ''}.`
      : f.kind === 'profile'
        ? `How ${who} was built, in their own words — the ${f.name.toLowerCase()} treatment.`
        : `A ${f.name} conversation with ${who}${input.district ? ` in ${place}` : ''} — craft, taste and the island they’re shaping.`;

  const workingTitle =
    f.kind === 'picks'
      ? `${f.name}: ${input.category || place}`
      : `${f.name}: ${who}`;

  return { franchise: key, kind: f.kind, angle, workingTitle };
}

// ── minimal, dependency-free markdown → HTML ──────────────────────────────────
// The pipeline works in markdown (draftPiece / translatePiece), but blog_posts.content
// is rendered as raw HTML by the reader. The draft route runs the model's markdown
// through this before storing it, so articles render correctly with no new dependency.
// Pure and unit-tested. Handles the subset the house voice uses: headings, bold,
// italics, links, ordered/unordered lists and blank-line paragraphs.
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inline(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>');
}

export function mdToHtml(md: string): string {
  const src = String(md || '').replace(/\r\n/g, '\n').trim();
  if (!src) return '';
  const blocks = src.split(/\n{2,}/);
  const out: string[] = [];
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;
    const lines = block.split('\n');

    // heading (only if the whole block is a single heading line)
    const h = block.match(/^(#{1,4})\s+(.*)$/);
    if (h && lines.length === 1) {
      const level = h[1].length + 1; // # → h2, ## → h3 … (h1 is the article title)
      const lvl = Math.min(level, 6);
      out.push(`<h${lvl}>${inline(escapeHtml(h[2].trim()))}</h${lvl}>`);
      continue;
    }

    // unordered list
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      const items = lines.map((l) => `<li>${inline(escapeHtml(l.replace(/^\s*[-*]\s+/, '').trim()))}</li>`);
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    // ordered list
    if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
      const items = lines.map((l) => `<li>${inline(escapeHtml(l.replace(/^\s*\d+\.\s+/, '').trim()))}</li>`);
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // paragraph (soft line breaks → <br>)
    out.push(`<p>${lines.map((l) => inline(escapeHtml(l.trim()))).join('<br>')}</p>`);
  }
  return out.join('\n');
}
