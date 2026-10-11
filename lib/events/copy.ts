// lib/events/copy.ts — the few UI words the automated Agenda adds, as a typed 7-language module (messages/*.json is owned
// elsewhere). Event titles/summaries themselves are NOT machine-translated: when an edition has no translation the original
// (English) text is shown, with a small notice, so the information is always visible.
import type { Locale } from '@/lib/locales';

export interface AgendaCopy {
  onNow: string;            // heading: events that have started and are still running
  comingUp: string;         // heading: upcoming events
  recurringTitle: string;   // heading: yearly events without a new date yet
  recurringIntro: string;
  lastHeld: string;         // "Last held"
  usuallyIn: string;        // label, rendered as "Usually: October"
  dateTbc: string;          // badge for approximate dates
  expectedAround: string;   // "Expected around"
  holidaysTitle: string;
  holidaysIntro: string;
  source: string;           // "Source"
  originalListing: string;  // link text
  englishOnly: string;      // notice when shown in the original language
  allDay: string;
  emptyTitle: string;
  emptyText: string;
  until: string;            // "until"
}

export const AGENDA_COPY: Record<Locale, AgendaCopy> = {
  en: {
    onNow: 'On now', comingUp: 'Coming up', recurringTitle: 'Yearly events — next date to be announced',
    recurringIntro: 'These much-loved events return every year. The new dates are not published yet — follow the link to the organiser for the latest.',
    lastHeld: 'Last held', usuallyIn: 'Usually', dateTbc: 'Date to be confirmed', expectedAround: 'Expected around',
    holidaysTitle: 'Public holidays in Cyprus', holidaysIntro: 'Banks, offices and many shops are closed on these days.',
    source: 'Source', originalListing: 'Original listing', englishOnly: 'Shown in the original language (no translation yet).',
    allDay: 'All day', emptyTitle: 'New dates are being added', emptyText: 'We collect events from official Cyprus sources every few hours. Please check back soon.', until: 'until',
  },
  el: {
    onNow: 'Σε εξέλιξη', comingUp: 'Έρχονται', recurringTitle: 'Ετήσιες εκδηλώσεις — η επόμενη ημερομηνία θα ανακοινωθεί',
    recurringIntro: 'Αυτές οι αγαπημένες εκδηλώσεις επιστρέφουν κάθε χρόνο. Οι νέες ημερομηνίες δεν έχουν ανακοινωθεί ακόμη — ακολουθήστε τον σύνδεσμο προς τον διοργανωτή.',
    lastHeld: 'Τελευταία διοργάνωση', usuallyIn: 'Συνήθως', dateTbc: 'Η ημερομηνία θα επιβεβαιωθεί', expectedAround: 'Αναμένεται περίπου',
    holidaysTitle: 'Αργίες στην Κύπρο', holidaysIntro: 'Τράπεζες, γραφεία και πολλά καταστήματα είναι κλειστά αυτές τις μέρες.',
    source: 'Πηγή', originalListing: 'Αρχική καταχώριση', englishOnly: 'Εμφανίζεται στη γλώσσα της πηγής (δεν υπάρχει μετάφραση ακόμη).',
    allDay: 'Ολοήμερο', emptyTitle: 'Προστίθενται νέες ημερομηνίες', emptyText: 'Συλλέγουμε εκδηλώσεις από επίσημες πηγές της Κύπρου κάθε λίγες ώρες. Ελάτε ξανά σύντομα.', until: 'έως',
  },
  ro: {
    onNow: 'În desfășurare', comingUp: 'Urmează', recurringTitle: 'Evenimente anuale — data următoare va fi anunțată',
    recurringIntro: 'Aceste evenimente îndrăgite revin în fiecare an. Noile date nu au fost publicate încă — urmați linkul către organizator pentru noutăți.',
    lastHeld: 'Ultima ediție', usuallyIn: 'De obicei', dateTbc: 'Data urmează să fie confirmată', expectedAround: 'Estimat în jurul datei',
    holidaysTitle: 'Sărbători legale în Cipru', holidaysIntro: 'Băncile, birourile și multe magazine sunt închise în aceste zile.',
    source: 'Sursă', originalListing: 'Anunțul original', englishOnly: 'Afișat în limba originală (încă netradus).',
    allDay: 'Toată ziua', emptyTitle: 'Se adaugă date noi', emptyText: 'Adunăm evenimente din surse oficiale din Cipru la fiecare câteva ore. Reveniți curând.', until: 'până pe',
  },
  ar: {
    onNow: 'جارية الآن', comingUp: 'قريبًا', recurringTitle: 'فعاليات سنوية — الموعد القادم سيُعلن لاحقًا',
    recurringIntro: 'تعود هذه الفعاليات المحبوبة كل عام. لم تُنشر المواعيد الجديدة بعد — تابع الرابط إلى الجهة المنظِّمة لمعرفة آخر المستجدات.',
    lastHeld: 'آخر إقامة', usuallyIn: 'عادةً', dateTbc: 'الموعد قيد التأكيد', expectedAround: 'متوقع في حدود',
    holidaysTitle: 'العطل الرسمية في قبرص', holidaysIntro: 'تُغلق البنوك والمكاتب والعديد من المتاجر في هذه الأيام.',
    source: 'المصدر', originalListing: 'الإعلان الأصلي', englishOnly: 'يُعرض بلغته الأصلية (لا توجد ترجمة بعد).',
    allDay: 'طوال اليوم', emptyTitle: 'تتم إضافة مواعيد جديدة', emptyText: 'نجمع الفعاليات من مصادر قبرصية رسمية كل بضع ساعات. يُرجى المراجعة قريبًا.', until: 'حتى',
  },
  de: {
    onNow: 'Läuft gerade', comingUp: 'Demnächst', recurringTitle: 'Jährliche Veranstaltungen — nächster Termin folgt',
    recurringIntro: 'Diese beliebten Veranstaltungen kehren jedes Jahr wieder. Die neuen Termine sind noch nicht veröffentlicht — der Link führt zum Veranstalter.',
    lastHeld: 'Zuletzt', usuallyIn: 'Meist', dateTbc: 'Termin noch nicht bestätigt', expectedAround: 'Voraussichtlich',
    holidaysTitle: 'Feiertage in Zypern', holidaysIntro: 'An diesen Tagen sind Banken, Büros und viele Geschäfte geschlossen.',
    source: 'Quelle', originalListing: 'Originaleintrag', englishOnly: 'In der Originalsprache angezeigt (noch keine Übersetzung).',
    allDay: 'Ganztägig', emptyTitle: 'Neue Termine werden ergänzt', emptyText: 'Wir sammeln alle paar Stunden Veranstaltungen aus offiziellen zyprischen Quellen. Schauen Sie bald wieder vorbei.', until: 'bis',
  },
  pl: {
    onNow: 'Trwa teraz', comingUp: 'Wkrótce', recurringTitle: 'Wydarzenia coroczne — kolejny termin zostanie ogłoszony',
    recurringIntro: 'Te lubiane wydarzenia wracają co roku. Nowe terminy nie zostały jeszcze opublikowane — link prowadzi do organizatora.',
    lastHeld: 'Ostatnio', usuallyIn: 'Zwykle', dateTbc: 'Termin do potwierdzenia', expectedAround: 'Szacunkowo około',
    holidaysTitle: 'Święta państwowe na Cyprze', holidaysIntro: 'W te dni banki, biura i wiele sklepów jest zamkniętych.',
    source: 'Źródło', originalListing: 'Oryginalne ogłoszenie', englishOnly: 'Wyświetlono w języku oryginału (brak jeszcze tłumaczenia).',
    allDay: 'Cały dzień', emptyTitle: 'Dodajemy nowe terminy', emptyText: 'Co kilka godzin zbieramy wydarzenia z oficjalnych cypryjskich źródeł. Zajrzyj niedługo.', until: 'do',
  },
  ru: {
    onNow: 'Проходит сейчас', comingUp: 'Скоро', recurringTitle: 'Ежегодные события — дата будет объявлена',
    recurringIntro: 'Эти любимые события возвращаются каждый год. Новые даты ещё не опубликованы — ссылка ведёт к организатору.',
    lastHeld: 'Последний раз', usuallyIn: 'Обычно', dateTbc: 'Дата уточняется', expectedAround: 'Ожидается около',
    holidaysTitle: 'Государственные праздники на Кипре', holidaysIntro: 'В эти дни банки, офисы и многие магазины закрыты.',
    source: 'Источник', originalListing: 'Оригинальное объявление', englishOnly: 'Показано на языке оригинала (перевода пока нет).',
    allDay: 'Весь день', emptyTitle: 'Добавляются новые даты', emptyText: 'Каждые несколько часов мы собираем события из официальных кипрских источников. Загляните позже.', until: 'до',
  },
};

/** Display name of an event's source (the registry's attribution), else the host of its original link. */
export function sourceLabel(source: string | null, sourceUrl: string | null, names: Record<string, string>): string | null {
  if (source && names[source]) return names[source];
  if (sourceUrl && /^https?:\/\//i.test(sourceUrl)) { try { return new URL(sourceUrl).hostname.replace(/^www\./, ''); } catch { /* ignore */ } }
  return null;
}
