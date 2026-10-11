// Editorial humanisation — the PURE helpers added for the anti-AI gate: the
// structural burstiness directive, the transcreation prompt builder, the HTML→text
// stripper for scoring, and the expanded AI-tell list. No I/O and no model calls, so
// this bundles and runs like the other pure suites (see editorial-craft.test.ts).
// The model-backed layer (generate.ts: draftPiece/translatePiece/transcreatePiece/
// polishPiece) is deliberately NOT tested here — it is server-only I/O.
import {
  AI_TELLS, PROSE_STANDARD, antiAiRules, transcreateSystem, stripHtml, lintAiTells,
} from '@/lib/editorial/craft';
import { eq, ok, report } from './_harness';

// ── the prose standard: an intention, not a quota ────────────────────────────────
ok('PROSE_STANDARD is a non-empty string', typeof PROSE_STANDARD === 'string' && PROSE_STANDARD.length > 200);
ok('it lets sentence and paragraph length follow the meaning', /follow the meaning/i.test(PROSE_STANDARD) && /paragraph length follow the logic/i.test(PROSE_STANDARD));
ok('it carries no number and no rhythm quota (the measurements belong to the editor\'s work order)', !/\d/.test(PROSE_STANDARD) && !/(under|over) (eight|twenty|8|25)|at least (two|three|four)|three to five|thirty|uneven|burstiness|verbless/i.test(PROSE_STANDARD));
ok('it forbids mechanical alternation and fragments for effect', /no mechanical alternation/i.test(PROSE_STANDARD) && /no fragment added for effect/i.test(PROSE_STANDARD));
ok('it asks for plain speech verbs and forbids the ornamental ones', /plain speech verbs/i.test(PROSE_STANDARD) && /ornamental/i.test(PROSE_STANDARD));

// ── antiAiRules embeds the standard and keeps its guarantees ──────────────────────
ok('antiAiRules embeds the prose standard verbatim', antiAiRules('German').includes(PROSE_STANDARD));
ok('antiAiRules still bans the dash as a pause mark', /no em or en dashes/i.test(antiAiRules()) && /no em or en dashes/i.test(antiAiRules('German')));
ok('...except in Russian, whose punctuation needs the dash', !/no em or en dashes/i.test(antiAiRules('Russian')) && antiAiRules('Russian').includes('тире'));
ok('antiAiRules (Arabic) names the Arabic comma', antiAiRules('Arabic').includes('،'));
ok('antiAiRules never asks to be undetectable or to defeat a detector', ['English', 'German', 'Polish', 'Greek', 'Arabic'].every((L) => !/undetect|defeat|evade|burstiness|dry aside|occasional short fragment/i.test(antiAiRules(L))));
ok('antiAiRules forbids invented scenes, moods and opinions', /no scene, no mood, no opinion/.test(antiAiRules('English')));
ok('antiAiRules (English) still sets British English', /British English/.test(antiAiRules('English')));
ok('antiAiRules uppercases the target language in the heading', /GERMAN/.test(antiAiRules('German')) && /POLISH/.test(antiAiRules('Polish')) && /RUSSIAN/.test(antiAiRules('Russian')));
ok('antiAiRules names the target language natively for non-English', /idiomatic, publication-grade German/.test(antiAiRules('German')));

// ── AI_TELLS additions (current-generation), still curated & lowercase ───────────
ok('AI_TELLS stays an array of lowercase strings', Array.isArray(AI_TELLS) && AI_TELLS.every((t) => typeof t === 'string' && t === t.toLowerCase()));
ok('AI_TELLS is still a curated size (>= 30)', AI_TELLS.length >= 30);
ok('AI_TELLS adds the current tells', ['underscore', 'pivotal', 'in an era', 'testament', 'showcase', 'stands out', 'evolving landscape'].every((t) => AI_TELLS.includes(t)));
ok('lint catches a new tell (pivotal)', lintAiTells('This was a pivotal season for the harbour.').includes('pivotal'));
ok('lint catches the underscore family via substring', lintAiTells('The numbers underscored the shift.').includes('underscore'));
ok('lint catches the showcase family via substring', lintAiTells('The room showcases his early work.').includes('showcase'));
ok('lint catches "stands out"', lintAiTells('The taverna stands out on the strip.').includes('stands out'));
// Regression: the additions must not fire on plain, human reportage.
eq('lint stays clean on plain reportage', lintAiTells('The road west out of Paphos runs paved as far as Latchi, then gives up.').length, 0);

// ── transcreateSystem prompt builder ────────────────────────────────────────────
{
  const t = transcreateSystem('German');
  ok('transcreateSystem is a substantial prompt', t.length > 200);
  ok('transcreateSystem casts a native German staff writer', /NATIVE GERMAN STAFF WRITER/.test(t));
  ok('transcreateSystem is re-reporting, not translation', /RE-REPORT/.test(t) && /transcreation, not translation/i.test(t));
  ok('transcreateSystem freezes facts AND structure', /every fact/i.test(t) && /section structure/i.test(t));
  ok('transcreateSystem forbids mirroring English shapes', /do not mirror/i.test(t));
  ok('transcreateSystem embeds the standard of the piece', t.includes(PROSE_STANDARD));
  ok('transcreateSystem states the JSON output contract', /JSON/.test(t) && /"title"/.test(t) && /"body"/.test(t));
  ok('transcreateSystem defaults to English', /NATIVE ENGLISH STAFF WRITER/.test(transcreateSystem()));
  // Localises for every non-English edition name we ship.
  ok('transcreateSystem localises for all editions', ['Greek', 'Romanian', 'Arabic', 'Polish', 'Russian'].every((L) => transcreateSystem(L).includes(L.toUpperCase() + ' STAFF WRITER')));
}

// ── stripHtml (plain text for scoring) ──────────────────────────────────────────
eq('stripHtml drops inline tags', stripHtml('<p>Hello <strong>world</strong></p>'), 'Hello world');
eq('stripHtml on empty → empty', stripHtml(''), '');
ok('stripHtml splits block paragraphs into lines', (() => {
  const s = stripHtml('<p>First para.</p><p>Second para.</p>');
  return s.includes('First para.') && s.includes('Second para.') && s.includes('\n');
})());
ok('stripHtml leaves markdown / plain text intact', stripHtml('## A heading\n\nA plain sentence.').includes('A plain sentence.'));
ok('stripHtml removes every tag', !/[<>]/.test(stripHtml('<div class="x"><a href="y">link</a></div>')));
ok('stripHtml decodes common entities', stripHtml('Marks &amp; Spencer').includes('&'));
ok('stripHtml collapses runs of inline whitespace', stripHtml('a\t\t  b').includes('a b'));

report('editorial-humanize.pure');
