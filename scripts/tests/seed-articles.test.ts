// Seeded-article SQL generation — the pure escaping/formatting helpers (item 16).
// The article content itself is verified on Postgres (the migration gate: all seven
// languages non-null, idempotent). Here we lock down the SQL-safety of the generator
// so a stray delimiter or an apostrophe can never break — or worse, corrupt — the
// generated migration, and that the data set is complete in all seven languages.
import { dq, arr, wordCount } from '../seed/sql-util.mjs';
import { ARTICLES as RAW_ARTICLES, LOCALES } from '../seed/articles.data.mjs';
import { eq, ok, report } from './_harness';

// The data file is plain JS; treat entries as string-indexable for these checks.
const ARTICLES = RAW_ARTICLES as Array<Record<string, any>>;

// dq — dollar-quote with a tag that never occurs inside the string.
eq('plain string', dq('hello'), '$cl$hello$cl$');
ok('apostrophes need no escaping', dq("it's a 5% VAT").includes("it's a 5% VAT"));
ok('string containing $cl$ gets a different tag', (() => {
  const out = dq('has $cl$ inside');
  const tag = out.slice(0, out.indexOf('has'));
  return tag !== '$cl$' && out.endsWith(tag) && out.startsWith(tag);
})());
ok('non-Latin passes through', dq('Αγορά عقار Покупка').includes('Αγορά عقار Покупка'));

// arr — a valid text[] literal, each element dollar-quoted.
eq('empty array', arr([]), 'array[]::text[]');
eq('two elements', arr(['a', 'b']), 'array[$cl$a$cl$, $cl$b$cl$]::text[]');
ok('array element with quote is safe', arr(["a'b"]).includes("a'b"));

// wordCount — strips HTML, counts words.
eq('counts words, ignores tags', wordCount('<p>one two three</p>'), 3);
eq('collapses whitespace', wordCount('<h2>a</h2>\n<p>b   c</p>'), 3);
eq('empty is zero', wordCount(''), 0);

// Data-set completeness — every article, every language, every field.
const FIELDS = ['title', 'excerpt', 'summary', 'seo_title', 'seo_description', 'content'];
ok('7 locales', LOCALES.length === 7);
ok('every article has a slug + category', ARTICLES.every((a) => a.slug && a.category));
ok('every article has all fields in all 7 languages', ARTICLES.every((a) =>
  FIELDS.every((f) => LOCALES.every((l) => typeof a[f]?.[l] === 'string' && a[f][l].trim().length > 0))));
ok('every article has tags in all 7 languages', ARTICLES.every((a) =>
  LOCALES.every((l) => Array.isArray(a.tags?.[l]) && a.tags[l].length > 0)));
ok('slugs are unique', new Set(ARTICLES.map((a) => a.slug)).size === ARTICLES.length);
ok('content is HTML', ARTICLES.every((a) => LOCALES.every((l) => /<p>|<h2>/.test(a.content[l]))));

report('seed.articles');
