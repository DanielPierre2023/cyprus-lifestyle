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
