// The editorial cover (Instagram 4:5 and the Facebook / link-preview card): which look, which size, which font. The pictures
// themselves are rendered images; these are the decisions that choose them.
import { ARCH_CATEGORIES, SIZES, fitHeadline, headlineSize, isArchKicker, needsSerifFallback, photoBox, pickVariant, sectionLabel } from '@/lib/og/igText';
import { eq, ok, report } from './_harness';

// headline fitting
eq('short headline untouched', fitHeadline('Limassol at dusk'), 'Limassol at dusk');
const long = 'The quiet luxury of a seafront dinner in Limassol with a very long and rambling headline that keeps going well past what fits on a card';
const cut = fitHeadline(long);
ok('long headline is cut at a word with an ellipsis', cut.endsWith('…') && cut.length <= 120 && !cut.slice(0, -1).endsWith(' '));
ok('landscape allows fewer characters', fitHeadline(long, 100).length <= 100);
ok('whitespace is collapsed', fitHeadline('a   b\n c') === 'a b c');

// sizes
ok('portrait: shorter headlines are set larger', headlineSize('Short') > headlineSize('x'.repeat(70)) && headlineSize('x'.repeat(70)) > headlineSize('x'.repeat(110)));
ok('landscape: shorter headlines are set larger', headlineSize('Short', 'masthead', 'landscape') > headlineSize('x'.repeat(70), 'masthead', 'landscape') && headlineSize('x'.repeat(70), 'masthead', 'landscape') > headlineSize('x'.repeat(110), 'masthead', 'landscape'));
ok('the arch text column is set smaller than the full-width look', headlineSize('x'.repeat(50), 'arch', 'landscape') < headlineSize('x'.repeat(50), 'masthead', 'landscape'));
eq('the two shapes', [SIZES.portrait, SIZES.landscape], [{ width: 1080, height: 1350 }, { width: 1200, height: 630 }]);

// which look
eq('no photograph -> noir', pickVariant({ hasPhoto: false, category: 'table' }), 'noir');
eq('photograph, culture -> masthead', pickVariant({ hasPhoto: true, category: 'culture' }), 'masthead');
eq('photograph, business -> masthead', pickVariant({ hasPhoto: true, category: 'business' }), 'masthead');
for (const c of ARCH_CATEGORIES) eq(`photograph, ${c} -> arch`, pickVariant({ hasPhoto: true, category: c }), 'arch');
eq('a translated kicker still selects the arch (label list)', pickVariant({ hasPhoto: true, kicker: 'Το Τραπέζι', labels: ['The Table', 'Το Τραπέζι', 'Die Tafel'] }), 'arch');
eq('english kicker "The Table" -> arch', pickVariant({ hasPhoto: true, kicker: 'The Table' }), 'arch');
eq('an unrelated kicker -> masthead', pickVariant({ hasPhoto: true, kicker: 'Culture', labels: ['The Table'] }), 'masthead');
ok('empty kicker is not an arch', !isArchKicker('') && !isArchKicker(undefined));

// photograph size per look
eq('noir carries no photograph', photoBox('noir', 'portrait'), null);
eq('masthead photograph fills the picture', photoBox('masthead', 'landscape'), SIZES.landscape);
ok('arch photograph is a portrait window', (photoBox('arch', 'portrait')?.height ?? 0) > (photoBox('arch', 'portrait')?.width ?? 1) && (photoBox('arch', 'landscape')?.height ?? 0) > (photoBox('arch', 'landscape')?.width ?? 1));

// font: Latin and Latin-1 in the Didone, everything else in Noto Serif
ok('english and german use the Didone', !needsSerifFallback('Feedos keeps serving burgers — “vintage”') && !needsSerifFallback('Zypern: Straße, Überraschung, Käse'));
ok('greek and cyrillic fall back', needsSerifFallback('Το κρασί της Λεμεσού') && needsSerifFallback('Кипр: вино и закат'));
ok('polish and romanian special letters fall back', needsSerifFallback('Łódź') && needsSerifFallback('Brașov') && needsSerifFallback('română ă'));

// labels
eq('known section gets the proper English name', sectionLabel('table', { table: 'The Table' }), 'The Table');
eq('unknown slug is title-cased', sectionLabel('doing-business'), 'Doing Business');
eq('empty category -> empty', sectionLabel(null), '');
report('social.igcard');
