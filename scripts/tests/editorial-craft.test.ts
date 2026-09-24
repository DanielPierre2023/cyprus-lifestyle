// Editorial craft — pure logic (per-franchise formats, house style, anti-AI rules,
// the deterministic scrubber and the tell linter). No I/O, so it bundles and runs like
// the other pure suites. The generation layer (generate.ts) applies these.
import {
  FRANCHISE_FORMAT, formatFor, HOUSE_STYLE, AI_TELLS, antiAiRules, craftBlock,
  deAiScrub, lintAiTells, polishSystem,
} from '@/lib/editorial/craft';
import { FRANCHISE_KEYS } from '@/lib/editorial/pipeline';
import { eq, ok, report } from './_harness';

// ── Per-franchise formats ────────────────────────────────────────────────────────
ok('every franchise has a redactional format', [...FRANCHISE_KEYS].every((k) => (FRANCHISE_FORMAT[k] || '').length > 60));
ok('tastemakers format is the long interview', /THE TASTEMAKERS/.test(formatFor('tastemakers')) && /SCENE-SET/.test(formatFor('tastemakers')));
ok('at-the-table format is the review', /AT THE TABLE/.test(formatFor('at-the-table')) && /VERDICT/.test(formatFor('at-the-table')));
ok('five-min format is the Q&A', /FIVE MINUTES WITH/.test(formatFor('five-min')) && /Q&A/.test(formatFor('five-min')));
ok('kind fallback: interview → tastemakers shape', /TASTEMAKERS/.test(formatFor(null, 'interview')));
ok('kind fallback: picks → power list', /POWER LIST/.test(formatFor('nonexistent-franchise', 'picks')));
ok('default fallback is a feature', /AT THE TABLE/.test(formatFor(null, null)));

// ── House style + anti-AI rules ──────────────────────────────────────────────────
ok('house style names the standard', /New York Times|Vogue|Washington Post/.test(HOUSE_STYLE));
ok('anti-AI bans the em dash', /em dash|—/.test(antiAiRules()));
ok('anti-AI (English) sets British English', /British English/.test(antiAiRules('English')));
ok('anti-AI (Greek) targets Greek natively', /GREEK/.test(antiAiRules('Greek')) && /Greek/.test(antiAiRules('Greek')));
ok('craftBlock combines format + style + anti-AI', (() => { const b = craftBlock('tastemakers', 'interview'); return /TASTEMAKERS/.test(b) && /CRAFT STANDARD/.test(b) && /UNDETECTABLY/.test(b); })());
ok('there are many curated AI tells', AI_TELLS.length >= 30);

// ── Deterministic scrubber ───────────────────────────────────────────────────────
eq('em dash with spaces → comma', deAiScrub('the villa — all stone — sat above'), 'the villa, all stone, sat above');
eq('em dash no spaces → comma', deAiScrub('It was over—finally.'), 'It was over, finally.');
eq('number range keeps its en dash', deAiScrub('open 9–11 daily'), 'open 9–11 daily');
eq('en dash between words → comma', deAiScrub('Nicosia–Limassol drive'), 'Nicosia, Limassol drive');
eq('double spaces collapse', deAiScrub('a  b   c'), 'a b c');
ok('paragraph breaks are preserved', deAiScrub('A — B\n\nC — D').includes('\n\n'));
eq('newline block scrub', deAiScrub('A — B\n\nC — D'), 'A, B\n\nC, D');
ok('no space left before punctuation', !/\s[,.;:!?]/.test(deAiScrub('word — , stray')));

// ── Tell linter ──────────────────────────────────────────────────────────────────
ok('linter flags classic tells', (() => { const t = lintAiTells('This hidden gem, nestled in the heart of town, boasts a vibrant scene.'); return t.includes('hidden gem') && t.includes('nestled') && t.includes('boasts'); })());
ok('linter flags an em dash', lintAiTells('It was over — finally').includes('em dash (—)'));
eq('clean prose has no tells', lintAiTells('The road west out of Paphos runs paved as far as Latchi, then gives up.').length, 0);

// ── Polish prompt ────────────────────────────────────────────────────────────────
ok('polish system carries the detected tells + JSON contract', (() => { const p = polishSystem('tastemakers', 'interview', ['hidden gem', 'boasts']); return p.includes('hidden gem') && p.includes('boasts') && p.includes('body_md') && /executive editor/i.test(p); })());
ok('polish system localises', /GERMAN/.test(polishSystem('maker', 'profile', [], 'German')));

report('editorial-craft.pure');
