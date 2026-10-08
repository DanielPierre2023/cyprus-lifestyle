// The clean-up between the model and the page: it repairs form and never changes content; the relevance backstop; the pipeline's checks.
import { cleanHtml, cleanField, cleanTitle, allowlistHtml, normalizeTags, generateSlug, dedupeAdjacentWords, stripMarkdown, toHtml, countWords, stripTags, coerceToString } from '@/lib/journalism/sanitize';
import { hasCyprusTerms } from '@/lib/journalism/relevance';
import { overlapRatio, factsKept, inventedFigures } from '@/lib/journalism/checks';
import { eq, ok, report } from './_harness';

// ── content is never changed (the sentences the older English clean-up broke) ────────────────────────────────────────
for (const [what, text] of [
  ['"serves as the"', 'Nicosia serves as the capital of the island.'],
  ['a literal landscape', 'The Troodos landscape is protected and a landscape architect will survey it.'],
  ['"vital signs"', 'Vital signs were normal and essential workers were paid.'],
  ['"an integral part"', 'It is an integral part of the plan, in vibrant colours.'],
  ['"foster care"', 'Foster care rules change after the safety harness failed.'],
  ['"comprehensive insurance"', 'Comprehensive health insurance covers the ecosystem of clinics.'],
  ['an unnamed spokesperson', 'A spokesperson said passengers should expect delays until Friday.'],
  ['"experts say that"', 'Experts say that prices will rise by 4 percent.'],
]) eq(`en: ${what} is left as written`, cleanHtml(`<p>${text}</p>`, 'en'), `<p>${text}</p>`);
eq('en: a stock phrase is still cleaned, with its capital', cleanHtml('<p>The city boasts great weather.</p>', 'en'), '<p>The city has great weather.</p>');
eq('en: a dash becomes a comma', cleanHtml('<p>Rome — the city.</p>', 'en'), '<p>Rome, the city.</p>');
eq('ru: the dash stays', cleanHtml('<p>Лимасол — второй по величине город.</p>', 'ru'), '<p>Лимасол — второй по величине город.</p>');
eq('ar: the Arabic comma', cleanHtml('<p>المرسى — الأكبر في الجزيرة.</p>', 'ar'), '<p>المرسى، الأكبر في الجزيرة.</p>');

// ── markup the page may carry ───────────────────────────────────────────────────────────────────────────────────────
eq('a script block goes with its content', allowlistHtml('<p>Hello</p><script>alert(1)</script><p>World</p>'), '<p>Hello</p><p>World</p>');
eq('attributes never survive', allowlistHtml('<p onclick="x()" style="color:red">Hi <strong class="a">there</strong></p>'), '<p>Hi <strong>there</strong></p>');
eq('images, links and frames are dropped, their text kept', allowlistHtml('<p>See <a href="https://x.test">this</a> <img src="a.png"> <iframe src="x"></iframe>now</p>'), '<p>See this  now</p>');
eq('headings are normalised: h1→h2, h4→h3, b→strong, i→em', allowlistHtml('<h1>A</h1><h4>B</h4><b>c</b><i>d</i>'), '<h2>A</h2><h3>B</h3><strong>c</strong><em>d</em>');
eq('<br/> becomes <br>, comments go', allowlistHtml('a<br/>b<!-- hidden -->c'), 'a<br>bc');
eq('a less-than sign in prose is not a tag', allowlistHtml('<p>Fees fell when a < b and 3 <5.</p>'), '<p>Fees fell when a < b and 3 <5.</p>');
eq('uppercase tags are handled', allowlistHtml('<P>Hi</P><SCRIPT>x</SCRIPT>'), '<p>Hi</p>');
eq('bare paragraphs are wrapped', toHtml('One.\n\nTwo.'), '<p>One.</p>\n<p>Two.</p>');
eq('markdown left in a text is removed', stripMarkdown('## Heading\n**bold** text'), 'Heading\nbold text');
eq('an empty paragraph disappears', cleanHtml('<p>One.</p><p> </p><p>Two.</p>', 'en'), '<p>One.</p><p>Two.</p>');
eq('script smuggled through the model is gone before it is measured', cleanHtml('<p>Fees rise.</p><script>steal()</script>', 'de'), '<p>Fees rise.</p>');
eq('non-string input is coerced', [coerceToString(null), coerceToString(['a', ' b ']), coerceToString({ text: 'x' }), coerceToString(5)], ['', 'a b', 'x', '5']);
eq('counts', [countWords('<p>One two</p><p>three</p>'), stripTags('<p>a <b>b</b></p>')], [3, 'a b']);

// ── doubled words, any script ────────────────────────────────────────────────────────────────────────────────────────
eq('"the the" (English) and "shows shows" go', [dedupeAdjacentWords('the the fee', 'en'), dedupeAdjacentWords('This shows shows a rise.'), cleanHtml('<p>The fee of of 90 euros rises.</p>', 'en')], ['the fee', 'This shows a rise.', '<p>The fee of 90 euros rises.</p>']);
eq('short doublings stay ("had had", "that that")', [dedupeAdjacentWords('He had had enough.', 'en'), dedupeAdjacentWords('He said that that was fine.', 'en'), dedupeAdjacentWords('the the fee', 'de')], ['He had had enough.', 'He said that that was fine.', 'the the fee']);
eq('Cyrillic and Greek doublings go too', [dedupeAdjacentWords('новый новый тариф'), dedupeAdjacentWords('νέο τέλος τέλος')], ['новый тариф', 'νέο τέλος']);

// ── short fields and titles ──────────────────────────────────────────────────────────────────────────────────────────
eq('a field is plain text', cleanField('<p>**Fees** rise  on 1 March</p>', 'en'), 'Fees rise on 1 March');
eq('a shouted title is calmed, and loses its full stop', cleanTitle('LIMASSOL MARINA RAISES FEES.', 'en'), 'Limassol marina raises fees');
eq('a question mark in a title stays', cleanTitle('Are fees too high?', 'en'), 'Are fees too high?');
eq('empty stays empty', [cleanHtml('', 'en'), cleanField(undefined, 'en'), cleanTitle(null, 'en')], ['', '', '']);

// ── tags ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
eq('Russian tags survive (the older clean-up dropped every Cyrillic letter)', normalizeTags(['Лимасол', 'Кипрский рынок', 'Й-тест']), ['лимасол', 'кипрский-рынок', 'й-тест']);
eq('Greek accents go, the letters stay', normalizeTags(['Λεμεσός']), ['λεμεσος']);
eq('Latin diacritics go', normalizeTags(['Ayia Nápa', 'Șoseaua Cluj', 'Łódź']), ['ayia-napa', 'soseaua-cluj', 'łodz']);
eq('Arabic tags survive', normalizeTags(['قبرص', 'الأعمال']), ['قبرص', 'الأعمال']);
eq('duplicates, one-letter tags, non-strings and the cap of eight', [normalizeTags(['a', 'A', 'ab', 'AB', 5, '', 'x y']), normalizeTags(Array.from({ length: 12 }, (_, i) => `tag${i}`)).length, normalizeTags('x')], [['ab', 'x-y'], 8, []]);
eq('a long tag is cut at 50', normalizeTags(['x'.repeat(80)])[0].length, 50);
eq('slug', [generateSlug('Limassol Marina: fees rise!', () => 0.123456789).startsWith('limassol-marina-fees-rise-'), generateSlug('', () => 0.5).startsWith('article-'), generateSlug('Λεμεσός', () => 0.5).startsWith('article-')], [true, true, true]);

// ── the relevance backstop ───────────────────────────────────────────────────────────────────────────────────────────
for (const [l, t] of [['en', 'The Cyprus Stock Exchange rose'], ['de', 'Zypern führt neue Regeln ein'], ['pl', 'Rząd Cypru zapowiedział zmiany'], ['pl', 'Na Cyprze otwarto marinę'], ['ro', 'Guvernul din Cipru a decis'], ['ru', 'Власти Кипра повысили сбор'], ['ru', 'В Лимассоле открылась марина'], ['el', 'Η Κύπρος αυξάνει το τέλος'], ['ar', 'ارتفعت الرسوم في قبرص'], ['fr', 'Chypre relève ses taxes'], ['en', 'Paphos airport opens a new terminal']]) ok(`${l}: names the island or a town: "${t}"`, hasCyprusTerms(t));
for (const t of ['Cypress Hill play in Texas', 'Die Zypresse im Garten blüht', 'Wine exports from Chile grew 6 percent', 'Rakel won the prize', 'Пафос и громкие слова', 'Cyprian of Carthage']) ok(`not the island: "${t}"`, !hasCyprusTerms(t));

// ── the pipeline's checks ────────────────────────────────────────────────────────────────────────────────────────────
{
  const src = 'The harbour authority said the monthly berth fee will rise to 90 euros from 1 March because dredging has not been done since 2019 and the council voted 31 to 18 for the works.';
  ok('a copied text has a high overlap', overlapRatio(`<p>${src}</p>`, src) > 0.9);
  ok('a re-written text has a low one', overlapRatio('<p>Berth holders in Limassol face a steeper monthly charge next spring, as councillors approved a dredging programme by 31 votes to 18.</p>', src) < 0.12);
  const ru = 'Портовое управление сообщило, что ежемесячный сбор за место вырастет до 90 евро с 1 марта, потому что дноуглубление не проводилось с 2019 года.';
  ok('Cyrillic text is compared too (the older check was blind to it)', overlapRatio(`<p>${ru}</p>`, ru) > 0.9);
  ok('a long verbatim quotation does not count as borrowing', overlapRatio('<p>The mayor said: "We will not accept this decision because it harms every berth holder in the town today". Fees follow in March.</p>', 'He said "We will not accept this decision because it harms every berth holder in the town today" on Monday.') < 0.12);
  const a = '<p>The fee rises to 90 euros on 1 March. The mayor said: “We will fight this decision in court because it is unfair”.</p>';
  ok('a reordered rewrite keeps the facts', factsKept(a, '<p>On 1 March the fee rises to 90 euros. The mayor said: “We will fight this decision in court because it is unfair”.</p>', 'en'));
  ok('a changed figure is caught', !factsKept(a, a.replace('90', '95'), 'en'));
  ok('a dropped figure is caught', !factsKept(a, a.replace('to 90 euros ', ''), 'en'));
  ok('a changed quotation is caught', !factsKept(a, a.replace('in court', 'at the tribunal'), 'en'));
  eq('invented figures', [inventedFigures('Fees rise to 99 euros on 1 March', 'The fee is 90 euros from 1 March'), inventedFigures('Fees rise on 1 March', 'The fee is 90 euros from 1 March')], [['99'], []]);
  eq('Arabic-Indic digits are read as digits', inventedFigures('الرسوم ٩٠ يورو', 'fee 90 euros'), []);
}
report('journalism-sanitize');
