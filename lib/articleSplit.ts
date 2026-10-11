// lib/articleSplit.ts — where the in-article concierge prompt goes. Pure, unit-tested.
// Rule: after the third paragraph, but only in an article of five or more paragraphs (a short piece keeps just the closing box),
// and only at a point where NO container is still open (a quote, list, table, figure, or one of our own cards such as the
// specialist card <aside>): cutting inside a card would break its layout and its styling.
const CONTAINERS = 'blockquote|ul|ol|table|figure|details|aside|div|section|article|header|footer|nav|form|dl|pre';
const OPEN = new RegExp(`<(?:${CONTAINERS})\\b[^>]*>`, 'gi');
const CLOSE = new RegExp(`</(?:${CONTAINERS})\\s*>`, 'gi');
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
