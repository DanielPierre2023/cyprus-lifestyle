// scripts/lib/i18nDicts.mjs — the inline-dictionary scanner behind `npm run check:i18n-dicts`.
import { scanSource, compareToBaseline, makeBaseline, summarise, isExempt, LOCALES } from '../lib/i18nDicts.mjs';
import { eq, ok, report } from './_harness';

const full = `const COPY = {
  en: { a: 'Hello {name}', b: 'Home' }, el: { a: 'Γεια {name}', b: 'Αρχική' }, ro: { a: 'Salut {name}', b: 'Acasă' },
  ar: { a: 'مرحبا {name}', b: 'الرئيسية' }, de: { a: 'Hallo {name}', b: 'Start' }, pl: { a: 'Cześć {name}', b: 'Start' }, ru: { a: 'Привет {name}', b: 'Главная' },
};`;
eq('complete dictionary: no gaps', scanSource('x.ts', full).map((d: any) => [d.id, d.missing, d.shape]), [['x.ts#COPY', [], {}]]);

const four = `export const COPY = { en: { t: 'a' }, el: { t: 'b' }, ro: { t: 'c' }, ar: { t: 'd' } };`;
const d4 = scanSource('x.ts', four)[0];
eq('four-language dictionary reports de/pl/ru', d4.missing, ['de', 'pl', 'ru']);

eq('fewer than 3 locale keys is not a dictionary', scanSource('x.ts', `const x = { en: 1, el: 2 };`), []);
eq('non-locale keys ignored', scanSource('x.ts', `const x = { en: 1, el: 2, foo: 3, bar: 4 };`), []);

const overlay = `const O = { a: { el: {q:'1'}, ro: {q:'1'}, ar: {q:'1'}, de: {q:'1'}, pl: {q:'1'}, ru: {q:'1'} } };`;
eq('overlay without en but with the six others is complete', scanSource('x.ts', overlay).map((d: any) => d.missing), [[]]);
eq('overlay missing one of the six is a gap', scanSource('x.ts', `const O = { el: 1, ro: 1, ar: 1, de: 1, pl: 1 };`)[0].missing, ['en', 'ru']);

const shape = `const C = { en: { a: 'x {n}', b: 'y' }, el: { a: 'x' }, ro: { a: 'x {n}', b: '', c: 'z' }, ar: { a: 'x {n}', b: 'y' } };`;
const ds = scanSource('x.ts', shape)[0];
eq('shape: missing key in el', ds.shape.el.missing, ['b']);
eq('shape: placeholder mismatch in el', ds.shape.el.placeholder, ['a']);
eq('shape: extra + empty in ro', [ds.shape.ro.extra, ds.shape.ro.empty], [['c'], ['b']]);
ok('shape: clean locale has no entry', !('ar' in ds.shape));

const same = `const C = { en: { a: 'Translate me please' }, el: { a: 'Translate me please' }, ro: { a: 'Tradu' } };`;
eq('identical-to-EN strings counted', scanSource('x.ts', same)[0].sameAsEn, { el: 1 });

const opaque = `const UI = {t:'a'}; const B = { en: UI, el: { t: 'x' }, ro: { t: 'y' }, ar: { t: 'z' }, de: { t: 'q' }, pl: { t: 'w' }, ru: { t: 'e' } };`;
eq('identifier reference value is not compared structurally', scanSource('x.ts', opaque).map((d: any) => [d.missing, d.shape]), [[[], {}]]);
eq('shorthand property counts as present', scanSource('x.ts', `const en = 1; const L = { en, el: en, ro: en, ar: en, de: en, pl: en, ru: en };`).map((d: any) => d.missing), [[]]);

const dupes = `const A = [ { en:1, el:1, ro:1 }, { en:1, el:1, ro:1 } ];`;
eq('anonymous duplicates get distinct ids', scanSource('x.ts', dupes).map((d: any) => d.id), ['x.ts#A', 'x.ts#A#2']);
eq('function-owned dictionary id', scanSource('x.ts', `function f() { return { en: 1, el: 2, ro: 3 }; }`).map((d: any) => d.id), ['x.ts#f()']);
eq('tsx parses', scanSource('a.tsx', `const C = { en: <b/>, el: <i/>, ro: <u/> };`).length, 1);

// ratchet
const dicts = scanSource('x.ts', four);
const base = makeBaseline(dicts);
eq('baseline records missing locales', base, { 'x.ts#COPY': { missing: ['de', 'pl', 'ru'] } });
eq('known gap passes', compareToBaseline(dicts, base).problems, []);
ok('new dictionary with gap fails', compareToBaseline(dicts, {}).problems.length === 1);
ok('worse gap fails', compareToBaseline(dicts, { 'x.ts#COPY': { missing: ['de'] } }).problems.length === 1);
ok('fixed gap is flagged as improvable, not failing', (() => { const r = compareToBaseline(scanSource('x.ts', full), { 'x.ts#COPY': { missing: ['de'] } }); return r.problems.length === 0 && r.improvable.length === 1; })());
ok('vanished dictionary is flagged improvable', compareToBaseline([], base).improvable.length === 1);
ok('new shape problem fails', compareToBaseline(scanSource('x.ts', shape), { 'x.ts#C': { missing: ['de', 'pl', 'ru'] } }).problems.length > 0);
eq('shape baseline accepts known kinds', compareToBaseline(scanSource('x.ts', shape), makeBaseline(scanSource('x.ts', shape))).problems, []);

// summary + exemptions
const sum = summarise(scanSource('x.ts', four));
eq('summary rows cover all locales', sum.map((r: any) => r.locale), LOCALES);
eq('summary counts missing', sum.map((r: any) => r.missing), [0, 0, 0, 0, 1, 1, 1]);
ok('admin / tests exempt', isExempt('app/[locale]/admin/(panel)/x.tsx') && isExempt('app/api/admin/y/route.ts') && isExempt('scripts/tests/a.test.ts') && !isExempt('app/api/contact/route.ts') && !isExempt('lib/administer.ts'));
report('i18n-dicts');
