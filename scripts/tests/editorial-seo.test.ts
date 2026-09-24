// Editorial SEO package — pure logic (HTML stripping, length clamps, tag + FAQ
// normalisers, the coercer/fallback/fill helpers, and the prompt-builder contracts).
// The model I/O (packagePiece / translatePackage) is integration and lives in
// generate.ts; these are the deterministic pieces that feed and guard it.
import {
  SEO, stripHtml, clampText, normalizeTags, coerceFaq, coercePackage, withinLimits,
  fallbackPackage, fillPackage, packageSystem, packageUser, translatePackageSystem,
  type PackageFields,
} from '@/lib/editorial/seo';
import { eq, ok, report } from './_harness';

// ── stripHtml ──────────────────────────────────────────────────────────────────
eq('stripHtml removes tags', stripHtml('<p>Hello <strong>world</strong></p>').replace(/\s+/g, ' ').trim(), 'Hello world');
ok('stripHtml drops script/style', !/alert/.test(stripHtml('<style>x{}</style><script>alert(1)</script><p>ok</p>')));
eq('stripHtml decodes entities', stripHtml('<p>Tom &amp; Jerry &gt; all</p>').trim(), 'Tom & Jerry > all');
ok('stripHtml collapses blank-line runs to a paragraph break', !/\n{3,}/.test(stripHtml('<p>a</p>\n\n\n\n<p>b</p>')));
ok('stripHtml has no double spaces', !/ {2,}/.test(stripHtml('<p>a    b</p>')));

// ── clampText ────────────────────────────────────────────────────────────────────
eq('clampText leaves short text', clampText('short title', 60), 'short title');
ok('clampText caps at max', clampText('word '.repeat(40), 60).length <= 60);
ok('clampText cuts on a word boundary', !/\s$/.test(clampText('the quick brown fox jumps over the lazy dog again and again', 30)));
ok('clampText no trailing comma/dash', !/[\s,;:–—-]$/u.test(clampText('one, two, three, four, five, six, seven, eight, nine', 20)));
ok('clampText handles a single long word', clampText('x'.repeat(80), 60).length <= 60);

// ── normalizeTags ──────────────────────────────────────────────────────────────
const tags = normalizeTags(['Limassol', 'limassol', '#Burgers', 'WINE FESTIVAL', '   ', 'x'.repeat(50)]);
ok('tags lowercased', tags.every((t) => t === t.toLowerCase()));
ok('tags deduped (limassol once)', tags.filter((t) => t === 'limassol').length === 1);
ok('tags strip leading #', tags.includes('burgers'));
ok('tags drop empties', !tags.includes(''));
ok('tags drop over-long', !tags.some((t) => t.length > SEO.tagMaxLen));
ok('tags accept a comma string', normalizeTags('a, b, c').length === 3);
ok('tags cap at max', normalizeTags(Array.from({ length: 30 }, (_, i) => `tag${i}`)).length <= SEO.tagsMax);

// ── coerceFaq ────────────────────────────────────────────────────────────────────
const faq = coerceFaq([
  { q: 'Where is Feedos?', a: 'It is an American diner in Limassol.' },
  { question: 'Alt keys?', answer: 'Yes, question/answer keys are accepted too.' },
  { q: 'no', a: 'x' },                         // too short → dropped
  { q: 'Good question here', a: 'ok' },        // answer too short → dropped
]);
eq('faq keeps the valid items', faq.length, 2);
ok('faq reads q/a', faq[0].q === 'Where is Feedos?' && faq[0].a.length > 0);
ok('faq reads question/answer', faq[1].q === 'Alt keys?');
ok('faq caps at max', coerceFaq(Array.from({ length: 12 }, () => ({ q: 'A real question?', a: 'A real answer that is long enough.' }))).length <= SEO.faqMax);
ok('faq ignores non-array', coerceFaq('nope').length === 0);

// ── coercePackage ──────────────────────────────────────────────────────────────
const raw = {
  seo_title: 'Feedos, Limassol: The Honest Burger That Skips the Wine Festival Entirely and Then Some',
  seo_description: 'x'.repeat(300),
  excerpt: 'A short elegant standfirst.',
  summary: 'A card summary.',
  tags: ['Feedos', 'limassol', 'burgers'],
  faq: [{ q: 'Is it good?', a: 'Yes, genuinely good burgers.' }],
};
const pkg = coercePackage(raw);
ok('coerce clamps seo title to <=60', pkg.seoTitle.length <= SEO.titleMax);
ok('coerce clamps description to <=155', pkg.seoDescription.length <= SEO.descMax);
eq('coerce keeps excerpt', pkg.excerpt, 'A short elegant standfirst.');
ok('coerce normalizes tags', pkg.tags.includes('feedos'));
ok('coerce keeps faq', pkg.faq.length === 1);
ok('coerced package is within limits', withinLimits(pkg));
ok('coerce reads camelCase keys too', coercePackage({ seoTitle: 'Camel Title', seoDescription: 'Desc' }).seoTitle === 'Camel Title');
ok('coerce of junk is safe + empty-ish', (() => { const p = coercePackage(null); return p.seoTitle === '' && p.tags.length === 0 && p.faq.length === 0; })());

// ── fallbackPackage / fillPackage ────────────────────────────────────────────────
const fb = fallbackPackage('Feedos Keeps Serving Burgers', '<p>First sentence here. Second sentence follows. Third one too. Fourth extra.</p>');
ok('fallback seo title from headline', fb.seoTitle.includes('Feedos'));
ok('fallback excerpt is the first sentence', /First sentence here\./.test(fb.excerpt));
ok('fallback summary spans a few sentences', fb.summary.length >= fb.excerpt.length);
ok('fallback within limits', withinLimits(fb));

const partial: Partial<PackageFields> = { seoTitle: 'Kept Title', tags: ['kept'] };
const filled = fillPackage(partial, 'Head Line', 'Body sentence one. Body sentence two.');
eq('fill keeps provided title', filled.seoTitle, 'Kept Title');
eq('fill keeps provided tags', filled.tags.join(','), 'kept');
ok('fill supplies missing excerpt from body', filled.excerpt.length > 0);
ok('fill supplies missing description', filled.seoDescription.length > 0);

// ── prompt builders (contracts) ──────────────────────────────────────────────────
const sys = packageSystem({ langName: 'English', category: 'table', place: 'Limassol' });
ok('package prompt sets the 60-char title limit', /<=60/.test(sys));
ok('package prompt sets the 110-155 description window', /110-155/.test(sys));
ok('package prompt grounds in the place', /Limassol/.test(sys));
ok('package prompt asks for tags + faq', /"tags"/.test(sys) && /"faq"/.test(sys));
ok('package prompt bans em dash', /em dash/i.test(sys));
ok('package prompt is British English', /British English/.test(sys));
ok('package user carries headline + article', (() => { const u = packageUser('T', '<p>Body</p>'); return /HEADLINE/.test(u) && /ARTICLE/.test(u) && /Body/.test(u); })());

const tsys = translatePackageSystem('Greek');
ok('translate prompt names the language', /Greek/.test(tsys));
ok('translate prompt keeps the 60-char title limit', /<=60/.test(tsys));
ok('translate prompt keeps the 110-155 window', /110 and 155/.test(tsys));

// ── limits sanity ────────────────────────────────────────────────────────────────
ok('title limit is a Google-safe length', SEO.titleMax >= 50 && SEO.titleMax <= 65);
ok('description limit is a Google-safe length', SEO.descMax >= 150 && SEO.descMax <= 165);

report('editorial-seo.pure');
