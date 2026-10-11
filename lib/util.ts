// Small shared utilities.

export function slugify(input: string): string {
  const base = (input || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')     // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return base || 'story';
}

// Slug with a short random suffix so two similar titles never collide.
export function uniqueSlug(title: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${slugify(title)}-${suffix}`;
}

export function wordCount(html: string): number {
  return (html || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

export function stripTags(html: string): string {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Escape a value for safe interpolation into HTML text or a quoted attribute. */
export function escapeHtml(v: unknown): string {
  return String(v ?? '').replace(/[&<>"'`]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c] as string
  ));
}

/** Only http(s) URLs may reach an href/src; anything else (javascript:, data:) becomes ''. */
export function safeHttpUrl(v: unknown): string {
  const s = String(v ?? '').trim();
  return /^https?:\/\//i.test(s) ? s : '';
}
