// lib/activities/uiLabels.ts
// ============================================================================
// The two labels that client bundles need (the main-nav link, the concierge "Book" action), kept in their own tiny
// module so that importing them does NOT drag the full page copy (lib/activities/pageCopy.ts, ~25 KB for seven
// editions) into the site-wide header or the chat widget. pageCopy.ts reuses these values.
// ============================================================================
import type { Locale } from '@/lib/locales';

export const NAV_LABEL: Record<Locale, string> = {
  en: 'Experiences', el: 'Εμπειρίες', ro: 'Experiențe', ar: 'التجارب', de: 'Erlebnisse', pl: 'Atrakcje', ru: 'Впечатления',
};
export const BOOK_LABEL: Record<Locale, string> = {
  en: 'Book', el: 'Κράτηση', ro: 'Rezervă', ar: 'احجز', de: 'Buchen', pl: 'Rezerwuj', ru: 'Забронировать',
};
export const experiencesNavLabel = (locale: string): string => (NAV_LABEL as Record<string, string>)[locale] || NAV_LABEL.en;
export const bookLabel = (locale: string): string => (BOOK_LABEL as Record<string, string>)[locale] || BOOK_LABEL.en;
