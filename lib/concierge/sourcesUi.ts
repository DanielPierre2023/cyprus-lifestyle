// lib/concierge/sourcesUi.ts
// ============================================================================
// Guest-facing strings for the "more sources" cards and the WhatsApp/Telegram link lines
// (increment 2.1b). A typed 7-locale module on purpose: messages/*.json is owned elsewhere.
// All text here was written by the assistant — NEEDS NATIVE REVIEW (el ro ar de pl ru).
// Pure: no server-only import, so client components and offline tests can use it.
// ============================================================================
import type { Locale } from '@/lib/locales';
import type { SourceKind } from '@/lib/concierge/sources';

export interface SourcesUi {
  title: string;                       // heading above the cards
  kind: Record<SourceKind, string>;    // small type tag on a card
  readOriginal: string;                // external knowledge page: "Read the original"
  openEvent: string;
  seeAgenda: string;                   // link to /agenda
  seeLive: string;                     // link to /live
  via: string;                         // "via" in a chat line: "Title (via My Cyprus Life): url"
}

export const SOURCES_UI: Record<Locale, SourcesUi> = {
  en: { title: 'More from across the island', kind: { event: 'Event', article: 'Article', activity: 'Experience', kb_doc: 'Guide page', regulation: 'Official note', webcam: 'Live webcam' }, readOriginal: 'Read the original', openEvent: 'Event details', seeAgenda: 'See the full agenda', seeLive: 'Open the live webcams', via: 'via' },
  el: { title: 'Περισσότερα από όλο το νησί', kind: { event: 'Εκδήλωση', article: 'Άρθρο', activity: 'Εμπειρία', kb_doc: 'Σελίδα οδηγού', regulation: 'Επίσημη σημείωση', webcam: 'Ζωντανή κάμερα' }, readOriginal: 'Διαβάστε το πρωτότυπο', openEvent: 'Λεπτομέρειες εκδήλωσης', seeAgenda: 'Δείτε ολόκληρη την ατζέντα', seeLive: 'Ανοίξτε τις ζωντανές κάμερες', via: 'μέσω' },
  ro: { title: 'Mai multe de pe toată insula', kind: { event: 'Eveniment', article: 'Articol', activity: 'Experiență', kb_doc: 'Pagină de ghid', regulation: 'Notă oficială', webcam: 'Cameră live' }, readOriginal: 'Citește originalul', openEvent: 'Detaliile evenimentului', seeAgenda: 'Vezi agenda completă', seeLive: 'Deschide camerele live', via: 'prin' },
  ar: { title: 'المزيد من أنحاء الجزيرة', kind: { event: 'فعالية', article: 'مقال', activity: 'تجربة', kb_doc: 'صفحة دليل', regulation: 'ملاحظة رسمية', webcam: 'كاميرا مباشرة' }, readOriginal: 'اقرأ المصدر الأصلي', openEvent: 'تفاصيل الفعالية', seeAgenda: 'شاهد الأجندة الكاملة', seeLive: 'افتح الكاميرات المباشرة', via: 'عبر' },
  de: { title: 'Mehr von der ganzen Insel', kind: { event: 'Veranstaltung', article: 'Artikel', activity: 'Erlebnis', kb_doc: 'Ratgeberseite', regulation: 'Amtlicher Hinweis', webcam: 'Live-Webcam' }, readOriginal: 'Original lesen', openEvent: 'Details zur Veranstaltung', seeAgenda: 'Ganze Agenda ansehen', seeLive: 'Live-Webcams öffnen', via: 'über' },
  pl: { title: 'Więcej z całej wyspy', kind: { event: 'Wydarzenie', article: 'Artykuł', activity: 'Atrakcja', kb_doc: 'Strona poradnika', regulation: 'Informacja urzędowa', webcam: 'Kamera na żywo' }, readOriginal: 'Czytaj oryginał', openEvent: 'Szczegóły wydarzenia', seeAgenda: 'Zobacz pełną agendę', seeLive: 'Otwórz kamery na żywo', via: 'przez' },
  ru: { title: 'Ещё со всего острова', kind: { event: 'Событие', article: 'Статья', activity: 'Впечатление', kb_doc: 'Страница гида', regulation: 'Официальная заметка', webcam: 'Веб-камера' }, readOriginal: 'Читать оригинал', openEvent: 'Подробности события', seeAgenda: 'Смотреть всю афишу', seeLive: 'Открыть веб-камеры', via: 'через' },
};
export const sourcesUi = (locale: string): SourcesUi => (SOURCES_UI as Record<string, SourcesUi>)[locale] || SOURCES_UI.en;

/** rel for a card link: external knowledge pages nofollow+noopener; affiliate links also "sponsored". */
export function relFor(kind: SourceKind, external: boolean): string | undefined {
  if (!external) return undefined;
  return kind === 'activity' ? 'sponsored nofollow noopener noreferrer' : 'nofollow noopener noreferrer';
}
