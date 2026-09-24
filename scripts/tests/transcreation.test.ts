// Transcreation rollout policy — pure logic (which franchises re-report natively,
// and how the ?transcreate override interacts with that). The model I/O lives in
// generate.ts (transcreatePiece); this only tests the routing decision.
import { TRANSCREATE_FRANCHISES, parseTranscreateFlag, shouldTranscreate } from '@/lib/editorial/transcreation';
import { eq, ok, report } from './_harness';

// ── the rollout set ──────────────────────────────────────────────────────────
ok('long-form interview franchise (tastemakers) is in the transcreation set', TRANSCREATE_FRANCHISES.has('tastemakers'));
ok('a non-interview franchise is not (yet) in the set', !TRANSCREATE_FRANCHISES.has('at-the-table'));

// ── flag parsing ──────────────────────────────────────────────────────────────
eq('flag "1" → true', parseTranscreateFlag('1'), true);
eq('flag "true" → true', parseTranscreateFlag('true'), true);
eq('flag "0" → false', parseTranscreateFlag('0'), false);
eq('flag "false" → false', parseTranscreateFlag('false'), false);
eq('missing flag → null', parseTranscreateFlag(null), null);
eq('junk flag → null', parseTranscreateFlag('yes'), null);

// ── decision ─────────────────────────────────────────────────────────────────
ok('interview franchise defaults to transcreation', shouldTranscreate('tastemakers', null) === true);
ok('other franchise defaults to translation', shouldTranscreate('at-the-table', null) === false);
ok('explicit on overrides a non-interview franchise', shouldTranscreate('at-the-table', true) === true);
ok('explicit off overrides the interview franchise', shouldTranscreate('tastemakers', false) === false);
ok('null/blank franchise defaults to translation', shouldTranscreate(null, null) === false && shouldTranscreate('', null) === false);

report('transcreation.pure');
