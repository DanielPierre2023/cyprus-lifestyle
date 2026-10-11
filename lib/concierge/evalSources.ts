// lib/concierge/evalSources.ts
// ============================================================================
// Eval coverage for retrieval over ALL sources (increment 2.1).
//  • OFFLINE_GOLD: question → which sources/legs the pure intent layer must switch on. Free; run by
//    scripts/tests/concierge-sources.test.ts on every push.
//  • EVAL_SOURCE_ITEMS: live-model eval questions in the same shape as lib/concierge/eval.ts EVAL_SET,
//    one per new source and language. Since increment 2.1b they ARE part of EVAL_SET (lib/concierge/eval.ts),
//    so they run only when the owner triggers the paid eval; this file itself never calls a model.
// ============================================================================
export interface SourceGold { id: string; locale: string; q: string; events?: boolean; regulation?: boolean; conditions?: boolean; window?: string | null; }

export const OFFLINE_GOLD: SourceGold[] = [
  { id: 'en-weekend', locale: 'en', q: "What's on this weekend in Limassol?", events: true, window: 'weekend' },
  { id: 'en-tomorrow', locale: 'en', q: 'Any concert tomorrow evening?', events: true, window: 'tomorrow' },
  { id: 'en-next-week', locale: 'en', q: 'festivals happening next week', events: true, window: 'next_week' },
  { id: 'en-tax', locale: 'en', q: 'What is the VAT rate for new build property?', regulation: true },
  { id: 'en-visa', locale: 'en', q: 'Do I need a visa to live in Cyprus?', regulation: true },
  { id: 'en-swim', locale: 'en', q: 'Can I swim today at Fig Tree Bay? Any webcam?', conditions: true, window: 'today' },
  { id: 'en-taxi-not-tax', locale: 'en', q: 'I need a taxi from Larnaca airport' },
  { id: 'en-plain', locale: 'en', q: 'a quiet family beach near Paphos' },
  { id: 'el-weekend', locale: 'el', q: 'Τι εκδηλώσεις γίνονται αυτό το σαββατοκύριακο στη Λεμεσό;', events: true, window: 'weekend' },
  { id: 'el-tomorrow', locale: 'el', q: 'Υπάρχει συναυλία αύριο;', events: true, window: 'tomorrow' },
  { id: 'el-tax', locale: 'el', q: 'Ποιος είναι ο φόρος για αγορά ακινήτου;', regulation: true },
  { id: 'ro-weekend', locale: 'ro', q: 'Ce evenimente sunt în acest weekend la Paphos?', events: true, window: 'weekend' },
  { id: 'ro-visa', locale: 'ro', q: 'Am nevoie de viză pentru a locui în Cipru?', regulation: true },
  { id: 'ar-weekend', locale: 'ar', q: 'ما هي الفعاليات في عطلة نهاية الأسبوع في ليماسول؟', events: true, window: 'weekend' },
  { id: 'ar-tax', locale: 'ar', q: 'ما هي الضريبة على شراء عقار؟', regulation: true },
  { id: 'ar-swim', locale: 'ar', q: 'هل يمكنني السباحة اليوم؟ هل توجد كاميرا مباشرة؟', conditions: true, window: 'today' },
  { id: 'de-weekend', locale: 'de', q: 'Welche Veranstaltungen gibt es am Wochenende in Paphos?', events: true, window: 'weekend' },
  { id: 'de-tax', locale: 'de', q: 'Wie hoch ist die Steuer beim Immobilienkauf?', regulation: true },
  { id: 'de-swim', locale: 'de', q: 'Kann man heute schwimmen? Wie ist das Wetter?', conditions: true, window: 'today' },
  { id: 'pl-weekend', locale: 'pl', q: 'Jakie wydarzenia są w ten weekend w Limassol?', events: true, window: 'weekend' },
  { id: 'pl-visa', locale: 'pl', q: 'Czy potrzebuję wizy, żeby zamieszkać na Cyprze?', regulation: true },
  { id: 'ru-weekend', locale: 'ru', q: 'Какие мероприятия на выходных в Лимасоле?', events: true, window: 'weekend' },
  { id: 'ru-tomorrow', locale: 'ru', q: 'Есть ли концерт завтра?', events: true, window: 'tomorrow' },
  { id: 'ru-tax', locale: 'ru', q: 'Какой налог при покупке недвижимости?', regulation: true },
];

export interface SourceEvalItem { id: string; locale: string; intent: string; source: string; question: string; }
export const EVAL_SOURCE_ITEMS: SourceEvalItem[] = [
  { id: 'en-events-weekend', locale: 'en', intent: 'events', source: 'event', question: "What's on this weekend in Limassol? Please only tell me what you actually know about." },
  { id: 'de-events-weekend', locale: 'de', intent: 'events', source: 'event', question: 'Was ist dieses Wochenende in Paphos los?' },
  { id: 'el-events-tomorrow', locale: 'el', intent: 'events', source: 'event', question: 'Τι εκδηλώσεις υπάρχουν αύριο στη Λάρνακα;' },
  { id: 'ru-events-weekend', locale: 'ru', intent: 'events', source: 'event', question: 'Что происходит на выходных в Лимасоле?' },
  { id: 'en-article', locale: 'en', intent: 'editorial', source: 'article', question: 'Do you have any of your own guides about the Troodos villages?' },
  { id: 'ro-article', locale: 'ro', intent: 'editorial', source: 'article', question: 'Aveți articole despre vinurile din Cipru?' },
  { id: 'pl-activity', locale: 'pl', intent: 'experiences', source: 'activity', question: 'Szukam rejsu łodzią z Limassol dla rodziny z dziećmi.' },
  { id: 'ar-activity', locale: 'ar', intent: 'experiences', source: 'activity', question: 'أبحث عن رحلة غوص قرب بافوس.' },
  { id: 'en-regulation', locale: 'en', intent: 'regulation', source: 'regulation', question: 'Has anything changed recently in the rules for non-EU buyers of property?' },
  { id: 'de-regulation', locale: 'de', intent: 'regulation', source: 'regulation', question: 'Wie lange dauert eine Aufenthaltsgenehmigung in Zypern, und gibt es neue Regeln?' },
  { id: 'en-conditions', locale: 'en', intent: 'conditions', source: 'webcam', question: 'Is it a good beach day today in Ayia Napa? Can I see it live?' },
  { id: 'en-kbdoc', locale: 'en', intent: 'culture', source: 'kb_doc', question: 'What cultural things are worth doing in Nicosia old town?' },
  { id: 'en-listed-nolink', locale: 'en', intent: 'grounding', source: 'listing', question: 'Recommend a pharmacy in Larnaca and give me the link to its page.' },
];
