// Editorial pipeline — pure logic (franchises, workflow transitions, prompt
// builders, the commissioning suggester and the markdown→HTML helper). No I/O, so
// this bundles and runs like the other pure suites (see taxonomy.test.ts).
import {
  FRANCHISES, FRANCHISE_KEYS, isFranchise, getFranchise,
  PIECE_KINDS, isPieceKind,
  LOCALES, isLocale, LOCALE_NAMES,
  PIPELINE_STATUSES, isPipelineStatus, nextStatuses, canTransition,
  dossierPrompt, draftPrompt, translatePrompt,
  suggestCommission, mdToHtml,
} from '@/lib/editorial/pipeline';
import { eq, ok, report } from './_harness';

// ── Franchises ─────────────────────────────────────────────────────────────────
eq('seven franchises', FRANCHISES.length, 7);
eq('franchise keys unique', new Set(FRANCHISES.map((f) => f.key)).size, 7);
ok('every franchise has name/cadence/description', FRANCHISES.every((f) => f.name.length > 2 && f.cadence.length > 2 && f.description.length > 20));
ok('every franchise default kind is a valid piece kind', FRANCHISES.every((f) => isPieceKind(f.kind)));
ok('the seven vision franchises exist', ['tastemakers', 'behind-the-business', 'five-min', 'maker', 'at-the-table', 'concierge-meets', 'power-list'].every((k) => isFranchise(k)));
eq('FRANCHISE_KEYS matches the list', FRANCHISE_KEYS.size, FRANCHISES.length);
eq('getFranchise resolves the name', getFranchise('tastemakers')?.name, 'The Tastemakers');
ok('getFranchise unknown → undefined', getFranchise('spaceship') === undefined);
ok('isFranchise rejects unknown', !isFranchise('spaceship'));

// ── Piece kinds ──────────────────────────────────────────────────────────────────
eq('six piece kinds', PIECE_KINDS.length, 6);
ok('kinds include the vision set', ['feature', 'interview', 'profile', 'note', 'edit', 'picks'].every((k) => isPieceKind(k)));
ok('isPieceKind rejects unknown', !isPieceKind('essay'));

// ── Locales ──────────────────────────────────────────────────────────────────────
eq('seven locales', LOCALES.length, 7);
ok('locales are the seven editions', ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'].every((l) => isLocale(l)));
ok('isLocale rejects unknown', !isLocale('fr'));
ok('every locale has a display name', LOCALES.every((l) => LOCALE_NAMES[l].length > 2));

// ── Workflow / transitions ───────────────────────────────────────────────────────
eq('seven pipeline statuses', PIPELINE_STATUSES.length, 7);
ok('statuses run commissioned → published', PIPELINE_STATUSES[0] === 'commissioned' && PIPELINE_STATUSES[6] === 'published');
ok('isPipelineStatus validates', isPipelineStatus('drafting') && !isPipelineStatus('done'));
eq('published is terminal', nextStatuses('published').length, 0);
ok('commissioned → dossier allowed', canTransition('commissioned', 'dossier'));
ok('commissioned → drafting allowed (skip the dossier)', canTransition('commissioned', 'drafting'));
ok('dossier → drafting allowed', canTransition('dossier', 'drafting'));
ok('drafting → editing allowed', canTransition('drafting', 'editing'));
ok('editing → translating allowed', canTransition('editing', 'translating'));
ok('translating → scheduled allowed', canTransition('translating', 'scheduled'));
ok('scheduled → published allowed', canTransition('scheduled', 'published'));
ok('cannot jump commissioned → published', !canTransition('commissioned', 'published'));
ok('cannot go backwards published → editing', !canTransition('published', 'editing'));
ok('every non-terminal status has a next', PIPELINE_STATUSES.filter((s) => s !== 'published').every((s) => nextStatuses(s).length > 0));
ok('every next status is itself valid', PIPELINE_STATUSES.every((s) => nextStatuses(s).every((n) => isPipelineStatus(n))));
// nextStatuses hands back a copy — mutating it must not corrupt the internal flow.
ok('nextStatuses returns a fresh array', (() => {
  const a = nextStatuses('commissioned');
  a.push('published');
  return nextStatuses('commissioned').length === 2;
})());

// ── Prompt builders ──────────────────────────────────────────────────────────────
{
  const subject = { name: 'Zambartas Wineries', category: 'winery', district: 'limassol', summary: 'A family winery near Agios Amvrosios.' };

  const dp = dossierPrompt(subject);
  ok('dossierPrompt non-empty', dp.length > 100);
  ok('dossierPrompt names the subject', dp.includes('Zambartas Wineries'));
  ok('dossierPrompt is Cyprus-scoped', dp.includes('Cyprus'));
  ok('dossierPrompt asks for briefing + questions JSON', dp.includes('JSON') && dp.includes('briefing') && dp.includes('questions'));

  const drp = draftPrompt('interview', 'tastemakers', 'some editor notes', subject);
  ok('draftPrompt non-empty', drp.length > 100);
  ok('draftPrompt names the franchise', drp.includes('The Tastemakers'));
  ok('draftPrompt states the kind', drp.includes('interview'));
  ok('draftPrompt requires markdown', drp.toLowerCase().includes('markdown'));
  ok('draftPrompt returns title + body_md JSON', drp.includes('title') && drp.includes('body_md'));

  const tp = translatePrompt('el');
  ok('translatePrompt non-empty', tp.length > 50);
  ok('translatePrompt names the target language', tp.includes('Greek'));
  ok('translatePrompt says translate', tp.toLowerCase().includes('translate'));
  ok('translatePrompt returns title + body JSON', tp.includes('JSON') && tp.includes('body'));
}

// ── Commissioning suggester ──────────────────────────────────────────────────────
{
  const s = suggestCommission({ subjectName: 'Tsiakkas Winery', category: 'winery', district: 'limassol' });
  ok('suggests a valid franchise', isFranchise(s.franchise));
  eq('winery → The Maker', s.franchise, 'maker');
  eq('kind matches the franchise default', s.kind, getFranchise(s.franchise)!.kind);
  ok('angle is a real sentence', s.angle.length > 10);
  ok('workingTitle names the subject', s.workingTitle.includes('Tsiakkas'));

  eq('restaurant → At the Table', suggestCommission({ category: 'restaurant' }).franchise, 'at-the-table');
  eq('law-firm → The Concierge Meets', suggestCommission({ category: 'law-firm', subjectName: 'A firm' }).franchise, 'concierge-meets');
  eq('hotel → The Tastemakers', suggestCommission({ category: 'hotel', subjectName: 'A hotel' }).franchise, 'tastemakers');
  eq('explicit valid franchise wins', suggestCommission({ category: 'restaurant', franchise: 'power-list' }).franchise, 'power-list');
  eq('invalid forced franchise falls back to inference', suggestCommission({ category: 'restaurant', franchise: 'nonsense' }).franchise, 'at-the-table');
  ok('empty input still yields a valid franchise', isFranchise(suggestCommission({}).franchise));
}

// ── markdown → HTML ──────────────────────────────────────────────────────────────
{
  eq('empty → empty', mdToHtml(''), '');
  eq('whitespace → empty', mdToHtml('   '), '');
  ok('plain text is wrapped in a paragraph', mdToHtml('Hello world.').includes('<p>Hello world.</p>'));
  ok('# → h2 (title level reserved)', mdToHtml('# Big').includes('<h2>Big</h2>'));
  ok('## → h3', mdToHtml('## A heading').includes('<h3>A heading</h3>'));
  ok('bold', mdToHtml('a **bold** word').includes('<strong>bold</strong>'));
  ok('link', mdToHtml('see [here](https://example.com)').includes('<a href="https://example.com"'));
  ok('unordered list', (() => { const h = mdToHtml('- one\n- two'); return h.includes('<ul>') && h.includes('<li>one</li>') && h.includes('<li>two</li>'); })());
  ok('ordered list', (() => { const h = mdToHtml('1. one\n2. two'); return h.includes('<ol>') && h.includes('<li>one</li>'); })());
  ok('escapes raw angle brackets & ampersands', (() => { const h = mdToHtml('a < b & c'); return h.includes('&lt;') && h.includes('&amp;'); })());
  eq('blank line splits paragraphs', (mdToHtml('one\n\ntwo').match(/<p>/g) || []).length, 2);
}

report('editorial.pure');
