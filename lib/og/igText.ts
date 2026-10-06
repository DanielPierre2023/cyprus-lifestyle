// lib/og/igText.ts — the pure decisions of the editorial cover (which look, how big, which labels), kept apart from the
// image code so they are unit-tested. Used by the Instagram picture (4:5) and by the Facebook / link-preview card (1.91:1).

export type Variant = 'masthead' | 'arch' | 'noir';
export type Format = 'portrait' | 'landscape';
export const SIZES = { portrait: { width: 1080, height: 1350 }, landscape: { width: 1200, height: 630 } } as const;

/** Shorten a headline at a word boundary so it always fits the artwork. */
export function fitHeadline(title: string, max = 120): string {
  const t = title.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.\-–—]+$/, '')}…`;
}

/** Headline size by length, look and format: short titles are set large, long ones stay legible. */
export function headlineSize(title: string, variant: Variant = 'masthead', format: Format = 'portrait'): number {
  const n = title.length;
  if (format === 'landscape') {
    const narrow = variant === 'arch';                         // the text column beside the arch is narrower
    return n <= 40 ? (narrow ? 54 : 66) : n <= 70 ? (narrow ? 44 : 54) : n <= 100 ? (narrow ? 38 : 46) : (narrow ? 33 : 40);
  }
  if (variant === 'arch') return n <= 40 ? 68 : n <= 70 ? 58 : 50;
  return n <= 36 ? 92 : n <= 60 ? 80 : n <= 90 ? 68 : 58;
}

/**
 * The free Didone covers basic Latin and Latin-1 (English, German, French ...). Greek, Cyrillic, Polish / Romanian letters
 * (ł, ș, ă ...) and anything else are set in Noto Serif instead, so one headline never mixes two faces.
 */
export function needsSerifFallback(title: string): boolean {
  return /[^\u0000-\u00FF\u2000-\u206F\u20A0-\u20CF\s]/.test(title);
}

/** Categories that alternate to the ivory Arch look when the article has a photo: food, travel, lifestyle. */
export const ARCH_CATEGORIES = ['table', 'escapes', 'travel', 'living'] as const;
const ARCH_WORDS = ['table', 'the table', 'escapes', 'travel', 'living', 'lifestyle', 'dining', 'food', 'wine'];
const norm = (s: string) => s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** `labels` = the localized section names (nav.table, nav.escapes in every edition) so a translated kicker is recognised too. */
export function isArchKicker(kicker: string | null | undefined, labels: string[] = []): boolean {
  const k = norm(kicker || '');
  if (!k) return false;
  return ARCH_WORDS.includes(k) || labels.map(norm).includes(k);
}

/** The look for one picture: no photo -> Noir Gold; a photo -> Masthead, or the ivory Arch for food, travel and lifestyle. */
export function pickVariant(o: { hasPhoto: boolean; category?: string | null; kicker?: string | null; labels?: string[] }): Variant {
  if (!o.hasPhoto) return 'noir';
  const cat = norm(o.category || '');
  if ((ARCH_CATEGORIES as readonly string[]).includes(cat) || isArchKicker(o.kicker, o.labels)) return 'arch';
  return 'masthead';
}

/** The size the photograph must be cropped to for a look, or null when the look carries no photograph. */
export function photoBox(variant: Variant, format: Format): { width: number; height: number } | null {
  if (variant === 'noir') return null;
  if (variant === 'masthead') return SIZES[format];
  return format === 'portrait' ? { width: 700, height: 780 } : { width: 340, height: 500 };
}

/** A category slug as a printed section name ("the-table" -> "The Table"); `names` may supply the proper English labels. */
export function sectionLabel(category: string | null | undefined, names: Record<string, string> = {}): string {
  const c = (category || '').trim();
  if (!c) return '';
  if (names[c]) return names[c];
  return c.replace(/[-_]+/g, ' ').replace(/\b\p{L}/gu, (m) => m.toUpperCase());
}
