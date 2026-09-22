// scripts/seed/sql-util.mjs — pure, side-effect-free SQL helpers for the article
// seed generator (item 16). Kept separate from gen-articles-sql.mjs (which writes a
// file) so tests can import these without triggering generation.

// Dollar-quote a string with a tag guaranteed not to occur inside it — so any
// content (apostrophes, %, non-Latin, even a literal $cl$) is embedded safely.
export function dq(s) {
  const str = String(s ?? '');
  let tag = '$cl$';
  let i = 0;
  while (str.includes(tag)) tag = `$cl${i++}$`;
  return tag + str + tag;
}

// Postgres text[] literal from a JS array, each element dollar-quoted.
export function arr(a) {
  const items = (a || []).map((x) => dq(x)).join(', ');
  return `array[${items}]::text[]`;
}

// Word count from HTML (used for reading metadata; counted on the English canonical).
export function wordCount(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
}
