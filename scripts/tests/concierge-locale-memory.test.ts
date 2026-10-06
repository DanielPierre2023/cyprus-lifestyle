// Channel language memory: short / ambiguous replies keep the sender's last confidently detected language.
import { detectWithConfidence, resolveChannelLocale, englishScore, MEMORY_TTL_MS } from '@/lib/concierge/localeMemory';
import { eq, ok, report } from './_harness';

const NOW = Date.parse('2026-10-08T10:00:00Z');
const r = (text: string, remembered?: string | null, extra: Record<string, unknown> = {}) => resolveChannelLocale({ text, remembered, now: NOW, ...extra });

// confidence
eq('"ja bitte" is NOT confident', detectWithConfidence('ja bitte').confident, false);
eq('"ok" not confident', detectWithConfidence('ok').confident, false);
eq('long German confident', detectWithConfidence('Wir suchen ein gutes Restaurant in Paphos für heute Abend'), { locale: 'de', confident: true });
eq('Polish confident', detectWithConfidence('Szukam dobrej restauracji blisko portu, proszę o polecenie'), { locale: 'pl', confident: true });
eq('Romanian confident', detectWithConfidence('Caut un restaurant bun pentru seara asta, vă rog'), { locale: 'ro', confident: true });
eq('Greek confident', detectWithConfidence('Ευχαριστώ πολύ'), { locale: 'el', confident: true });
eq('Arabic 2+ letters confident', detectWithConfidence('نعم'), { locale: 'ar', confident: true });
eq('one Cyrillic letter is not', detectWithConfidence('д').confident, false);
eq('Russian confident', detectWithConfidence('Да, пожалуйста'), { locale: 'ru', confident: true });
eq('English sentence confident', detectWithConfidence('What is there to do in Paphos tomorrow?'), { locale: 'en', confident: true });
eq('"thanks" alone is confident english', detectWithConfidence('thanks').confident, true);
eq('"yes" alone is not', detectWithConfidence('yes').confident, false);
ok('english score', englishScore('what is there') >= 2 && englishScore('ja bitte') === 0);

// resolution
eq('the bug: "ja bitte" with a German history → de', [r('ja bitte', 'de').locale, r('ja bitte', 'de').source], ['de', 'memory']);
eq('"ja bitte" with no history → en', [r('ja bitte').locale, r('ja bitte').source], ['en', 'default']);
eq('a confident message beats memory and is stored', [r('What is there to do tonight?', 'de').locale, r('What is there to do tonight?', 'de').persist], ['en', 'en']);
eq('a switch to Polish is stored', r('Szukam dobrej restauracji blisko portu, proszę', 'de').persist, 'pl');
eq('ambiguous message never overwrites the stored language', r('ok', 'ro').persist, 'ro');
eq('no memory, ambiguous → nothing to store', r('ok').persist, null);
eq('script is enough even for one word', r('Ευχαριστώ', 'de').locale, 'el');
eq('invalid remembered value ignored', r('ok', 'xx').locale, 'en');
eq('null remembered', r('ok', null).locale, 'en');
const old = new Date(NOW - MEMORY_TTL_MS - 1000).toISOString(); const fresh = new Date(NOW - 3600_000).toISOString();
eq('stale memory (> 30 days) ignored', r('ja bitte', 'de', { rememberedAt: old }).locale, 'en');
eq('fresh memory used', r('ja bitte', 'de', { rememberedAt: fresh }).locale, 'de');
eq('unparseable timestamp trusted', r('ja bitte', 'de', { rememberedAt: 'garbage' }).locale, 'de');
eq('telegram UI-language hint is the fallback of a new chat', [r('ok', null, { hint: 'pl' }).locale, r('ok', null, { hint: 'pl' }).source, r('ok', null, { hint: 'pl' }).persist], ['pl', 'hint', null]);
eq('memory beats the hint', r('ok', 'de', { hint: 'pl' }).locale, 'de');
eq('a confident message beats the hint', r('Wir suchen ein gutes Restaurant in Paphos für heute Abend', null, { hint: 'pl' }).locale, 'de');
eq('three-turn conversation', (() => {
  let mem: string | null = null; const out: string[] = [];
  for (const t of ['Wir suchen ein gutes Restaurant in Paphos für heute Abend', 'ja bitte', 'danke']) { const x = r(t, mem); mem = x.persist ?? mem; out.push(x.locale); }
  return out;
})(), ['de', 'de', 'de']);

// wiring
import { readFileSync } from 'node:fs';
const wa = readFileSync('app/api/whatsapp/route.ts', 'utf8'); const tg = readFileSync('app/api/telegram/route.ts', 'utf8');
ok('whatsapp reads + persists the remembered locale', wa.includes('resolveChannelLocale') && wa.includes('locale,updated_at') && wa.includes('locale: lang.persist'));
ok('telegram reads + persists the remembered locale (UI language as hint)', tg.includes('resolveChannelLocale') && tg.includes('hint: uiLocale') && tg.includes('locale: lang.persist'));
const chat = readFileSync('components/ConciergeChat.tsx', 'utf8'); const route = readFileSync('app/api/concierge/chat/route.ts', 'utf8');
ok('website chat sends the page locale and the route uses it (unchanged)', chat.includes('locale') && /locale:\s*locale|locale,/.test(chat) && route.includes("body.locale"));

report('concierge-locale-memory');
