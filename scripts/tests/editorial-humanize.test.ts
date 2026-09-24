// Editorial humanisation — the PURE helpers added for the anti-AI gate: the
// structural burstiness directive, the transcreation prompt builder, the HTML→text
// stripper for scoring, and the expanded AI-tell list. No I/O and no model calls, so
// this bundles and runs like the other pure suites (see editorial-craft.test.ts).
// The model-backed layer (generate.ts: draftPiece/translatePiece/transcreatePiece/
// polishPiece) is deliberately NOT tested here — it is server-only I/O.
import {
  AI_TELLS, BURSTINESS, antiAiRules, transcreateSystem, stripHtml, lintAiTells,
} from '@/lib/editorial/craft';
import { eq, ok, report } from './_harness';

// ── BURSTINESS structural directive ────────────────────────────────────────────
ok('BURSTINESS is a non-empty string', typeof BURSTINESS === 'string' && BURSTINESS.length > 120);
ok('BURSTINESS demands uneven paragraph lengths', /uneven/i.test(BURSTINESS) && /paragraph/i.test(BURSTINESS));
ok('BURSTINESS wants one-sentence AND long paragraphs', /single (short )?sentence/i.test(BURSTINESS) && /\blong\b/i.test(BURSTINESS));
ok('BURSTINESS spreads sentence length (short vs long numbers)', /three to five/i.test(BURSTINESS) && /thirty/i.test(BURSTINESS));
ok('BURSTINESS forbids uniform rhythm', /uniform|metronome|unpredictab/i.test(BURSTINESS));
ok('BURSTINESS forbids two adjacent similar paragraphs', /adjacent|next to each other|the one before/i.test(BURSTINESS));

// ── antiAiRules embeds burstiness and keeps its existing guarantees ──────────────
ok('antiAiRules embeds the BURSTINESS block verbatim', antiAiRules('German').includes(BURSTINESS));
ok('antiAiRules still bans the em dash', /em dash|—/.test(antiAiRules()));
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
  ok('transcreateSystem embeds the anti-AI + burstiness rules', t.includes(BURSTINESS));
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
