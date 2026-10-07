// lib/articleSplit.ts — where the in-article concierge prompt goes. Pure, unit-tested.
// Rule: after the third paragraph, but only in an article of five or more paragraphs (a short piece keeps just the closing box),
// and never inside a quote, a list or a table that is still open at that point.
const OPEN = /<(blockquote|ul|ol|table|figure|details)\b/gi;
const CLOSE = /<\/(blockquote|ul|ol|table|figure|details)\s*>/gi;
const count = (re: RegExp, s: string) => (s.match(re) || []).length;

export function splitForConcierge(html: string, after = 3, minParagraphs = 5): { head: string; tail: string } | null {
  const s = String(html || '');
  const ends: number[] = [];
  const re = /<\/p\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) ends.push(m.index + m[0].length);
  if (ends.length < minParagraphs) return null;
  for (let i = after - 1; i < ends.length - 1; i++) {
    const head = s.slice(0, ends[i]);
    if (count(OPEN, head) === count(CLOSE, head)) {
      const tail = s.slice(ends[i]);
      return tail.replace(/<[^>]+>/g, '').trim() ? { head, tail } : null;
    }
  }
  return null;
}
