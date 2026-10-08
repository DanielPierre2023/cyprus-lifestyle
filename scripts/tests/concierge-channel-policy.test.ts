// The concierge speaks as Cyprus Lifestyle on every channel: no other site named or linked, our GetYourGuide link, the guest's language.
import { readFileSync } from 'node:fs';
import { buildChannelLines, appendChannelLinks, composeChannelReply, type ChannelCtx } from '@/lib/concierge/channelLinks';
import { kbDocHit, cardsFor, type SourceHit } from '@/lib/concierge/sources';
import { groundingBlock, conciergeSystem, type ConciergeContext } from '@/lib/concierge/brain';
import { ALL_INTENTS } from '@/lib/knowledge/qa';
import { localizedIntent } from '@/lib/knowledge/qa.i18n';
import { resolveChannelLocale, settleLocale, localeFromPhone } from '@/lib/concierge/localeMemory';
import { guessLatinLocale, detectLocaleFull } from '@/lib/concierge/localeGuess';
import { gygPartnerIdFromEnv } from '@/lib/gyg';
import { eq, ok, report } from './_harness';

const SITE = 'https://cypruslifestyle.eu';
const P = gygPartnerIdFromEnv();
const guide = ALL_INTENTS[0].item;

// ── 1. the link lines under a WhatsApp / Telegram answer ──────────────────────────────────────────────────────────
const kbHit: SourceHit = { kind: 'kb_doc', id: 'd1', title: 'Hidden villages of Troodos', snippet: 's', href: 'https://mycypruslife.com/troodos', external: true, label: 'third_party', lang: 'en', fellBack: false, score: 0.6, sourceName: 'My Cyprus Life', caveats: [] };
const ctxBase: ChannelCtx = { guides: [], picks: [], sources: [kbHit] };
{
  const lines = buildChannelLines(ctxBase, 'en', SITE);
  eq('a scraped knowledge page produces no link line at all', lines, []);
  ok('no "via", no site name, no outside link in any language', ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'].every((l) => { const t = buildChannelLines(ctxBase, l, SITE).join('\n'); return !/mycypruslife|My Cyprus Life/i.test(t) && !/https:\/\/(?!cypruslife)/.test(t); }));
}
{ // the guide is offered in the guest's language: URL prefix AND label
  const ctx: ChannelCtx = { guides: [{ label: 'English label', path: `/guide/${guide.id}`, id: guide.id }], picks: [], sources: [] };
  for (const l of ['de', 'ro', 'pl', 'el', 'ru', 'ar']) {
    const line = buildChannelLines(ctx, l, SITE)[0];
    eq(`guide line in ${l}: localised label and /${l}/ link`, line, `${localizedIntent(guide.id, l).q}: ${SITE}/${l}${`/guide/${guide.id}`}`);
  }
  eq('english guide line has no prefix', buildChannelLines(ctx, 'en', SITE)[0], `${localizedIntent(guide.id, 'en').q}: ${SITE}/guide/${guide.id}`);
  eq('a guide without an id keeps its label', buildChannelLines({ guides: [{ label: 'Plain', path: '/guide/x' }], picks: [] }, 'ro', SITE)[0], `Plain: ${SITE}/ro/guide/x`);
}
{ // an official note keeps its government link
  const reg: SourceHit = { kind: 'regulation', id: 'r1', title: 'Rates update', snippet: 's', href: 'https://www.mof.gov.cy/x', external: true, label: 'official', lang: 'en', fellBack: false, score: 0.6, caveats: [] };
  ok('official government notes are still linked', buildChannelLines({ guides: [], picks: [], sources: [reg] }, 'en', SITE).join('\n').includes('https://www.mof.gov.cy/x'));
}

// ── 2. the whole reply: composeChannelReply ───────────────────────────────────────────────────────────────────────
{
  const raw = 'Troodos is lovely in October (via My Cyprus Life): https://mycypruslife.com/troodos. According to Visit Cyprus, the villages are quiet. Book the tour at https://www.getyourguide.com/troodos-l254053/wine-tour-t99/ today.';
  const ctx: ChannelCtx = { guides: [{ label: 'x', path: `/guide/${guide.id}`, id: guide.id }], picks: [], sources: [kbHit], activities: [{ title: 'Wine tour', url: `https://www.getyourguide.com/troodos-l254053/wine-tour-t99/?partner_id=${P}&cmp=cl-concierge`, slug: null }] };
  const out = composeChannelReply(raw, ctx, 'ro', SITE);
  ok('no blocked name or address survives', !/mycypruslife|My Cyprus Life|visitcyprus|Visit Cyprus|according to/i.test(out));
  ok('every GetYourGuide link carries our partner id', (out.match(/https:\/\/www\.getyourguide\.com\/[^\s]+/g) || []).length >= 2 && (out.match(/https:\/\/www\.getyourguide\.com\/[^\s]+/g) || []).every((u) => new URL(u).searchParams.get('partner_id') === P));
  ok('and exactly once each', (out.match(/partner_id=/g) || []).length === (out.match(/getyourguide\.com/g) || []).length);
  ok('the guide link is in the guest language', out.includes(`${SITE}/ro/guide/${guide.id}`));
  eq('idempotent', composeChannelReply(out, { guides: [], picks: [] }, 'ro', SITE), out);
  eq('an answer without anything to fix only gains the guide line', composeChannelReply('Încearcă portul la apus.', { guides: [], picks: [] }, 'ro', SITE), 'Încearcă portul la apus.');
  eq('appendChannelLinks itself is unchanged for plain answers', appendChannelLinks('Hi', { guides: [{ label: 'G', path: '/guide/a' }], picks: [] }, 'en', SITE), `Hi\n\nG: ${SITE}/guide/a`);
}

// ── 3. what the model is given ─────────────────────────────────────────────────────────────────────────────────────
{
  const visit = ALL_INTENTS.find((h) => h.item.source && /visitcyprus\.com/.test(h.item.source))!;
  const gov = { ...ALL_INTENTS[1], item: { ...ALL_INTENTS[1].item, id: 'gov-test', source: 'https://www.tax.gov.cy/en/page' } };
  const base: ConciergeContext = { candidates: [], picks: [], guides: [], articles: [], kb: [visit], canRoute: false, luxury: false };
  const g1 = groundingBlock(base, 'en');
  ok('a tourism-board address is never handed to the model', !/visitcyprus/i.test(g1) && !g1.includes('official government page'));
  const g2 = groundingBlock({ ...base, kb: [gov] }, 'en');
  ok('a government page is still handed over, to confirm figures', g2.includes('https://www.tax.gov.cy/en/page') && g2.includes('confirm exact figures'));
  const sys = conciergeSystem('ro');
  ok('the persona forbids naming or linking other sites', sys.includes('SOURCES AND LINKS') && /Never name, quote or link another website/.test(sys));
  ok('and says guides exist in the guest language', /Our guides exist in all seven languages/.test(sys));
  ok('and that a GetYourGuide link is ours', /GetYourGuide link is our booking partner link/.test(sys));
  const hit = kbDocHit({ id: 'k1', title: 'Hidden villages of Troodos - My Cyprus Life', description: 'Quiet villages. Source: My Cyprus Life', url: 'https://mycypruslife.com/x', source: 'mycypruslife', lang: 'en' }, 'en');
  ok('the model sees no site name in a scraped title or snippet', !!hit && hit.title === 'Hidden villages of Troodos' && !/my cyprus life/i.test(hit.snippet));
  ok('scraped pages never become a card', cardsFor([hit!], 'en').length === 0);
}

// ── 4. language: guides in the guest's language ────────────────────────────────────────────────────────────────────
// 4.1 the pre-model guess recognises short, accent-free messages as people really type them
eq('ro greeting without diacritics', guessLatinLocale('Buna ziua'), 'ro');
eq('ro request without diacritics', guessLatinLocale('Buna ziua, as dori informatii despre excursii in Paphos'), 'ro');
eq('ro question without diacritics', guessLatinLocale('Unde pot gasi un ghid pentru Limassol?'), 'ro');
eq('de without umlauts', guessLatinLocale('Hallo, was kostet ein Mietwagen?'), 'de');
eq('pl without diacritics', guessLatinLocale('Czesc, szukam wycieczek, ile kosztuje?'), 'pl');
for (const t of ['Hello, what is the best beach for kids?', 'Can you recommend a good restaurant in Paphos?', 'I am in Paphos in the old town in the evening', 'How much is a taxi from the airport to Limassol?',
  'Do you have a guide for Troodos?', 'Tell me about the salt lake in Larnaca', 'What is the weather like tomorrow?', 'Thanks a lot! Can I book a boat tour for two people?', 'Is there a good dentist near me?',
  'I was wondering where I can take care of my car', 'I want to rent a villa for a week in August', 'ok', 'hello', 'thanks', 'yes please']) eq(`English stays English: ${t}`, detectLocaleFull(t), 'en');

// 4.2 the phone number is a weak prior for a brand-new sender
eq('Romanian number', localeFromPhone('40722123456'), 'ro');
eq('German, Austrian, Swiss numbers', [localeFromPhone('4915112345678'), localeFromPhone('436641234567'), localeFromPhone('41791234567')], ['de', 'de', 'de']);
eq('Polish, Greek, Russian numbers', [localeFromPhone('48501234567'), localeFromPhone('306912345678'), localeFromPhone('79161234567')], ['pl', 'el', 'ru']);
eq('Gulf and Egypt numbers', [localeFromPhone('971501234567'), localeFromPhone('966512345678'), localeFromPhone('201001234567')], ['ar', 'ar', 'ar']);
eq('Cyprus, UK, US and nonsense give no hint', [localeFromPhone('35799123456'), localeFromPhone('447911123456'), localeFromPhone('14155550123'), localeFromPhone(''), localeFromPhone(null)], [null, null, null, null, null]);
eq('"+357" is not mistaken for Romania or Greece by its first digits', localeFromPhone('3579912'), null);

// 4.3 resolving: nothing remembered + inconclusive message → the phone prior; memory beats it; a confident message beats both
const NOW = Date.parse('2026-10-08T10:00:00Z');
const res = (text: string, remembered: string | null, hint: string | null) => resolveChannelLocale({ text, remembered, hint, now: NOW });
eq('"salut" from a Romanian number → ro', res('salut', null, localeFromPhone('40722123456')).locale, 'ro');
eq('memory beats the phone prior', res('ok', 'de', localeFromPhone('40722123456')).locale, 'de');
eq('a confident English message beats the phone prior', res('What is there to do in Paphos tomorrow?', null, 'ro').locale, 'en');

// 4.4 after the answer: the reply is long enough to tell its language; a guess gives way to it, memory and confident messages do not
const roReply = 'Vă recomand portul vechi din Paphos, mai ales la apus, când lumina este foarte frumoasă. Dacă doriți, vă pot propune și o excursie cu barca pentru a doua zi.';
const enReply = 'I would suggest the old harbour in Paphos, especially at sunset, when the light is lovely. If you like, I can also suggest a boat trip for the next day.';
{
  const guess = res('Hello', null, 'ro');            // inconclusive message, only the phone prior
  eq('a Romanian reply settles an inconclusive guess to ro, and it is remembered', settleLocale(guess, roReply), { locale: 'ro', persist: 'ro' });
  eq('an English reply corrects a wrong phone prior', settleLocale(guess, enReply), { locale: 'en', persist: 'en' });
  const nothing = res('ok', null, null);             // no memory, no hint, message says nothing
  eq('with no prior at all the reply decides', settleLocale(nothing, roReply), { locale: 'ro', persist: 'ro' });
  const remembered = res('ok', 'de', null);
  eq('a remembered language is not overruled by one reply', settleLocale(remembered, enReply), { locale: 'de', persist: 'de' });
  const confident = res('Caut un restaurant bun pentru seara asta, vă rog', null, null);
  eq('a confident message is not overruled by the reply', settleLocale(confident, enReply), { locale: 'ro', persist: 'ro' });
  eq('an inconclusive reply leaves the guess alone', settleLocale(guess, 'ok'), { locale: 'ro', persist: null });
  const staleEn = res('ok', 'en', null);              // threads written by the old code hold "en" for every message it could not identify
  eq('a remembered "en" gives way to a confident Romanian reply', settleLocale(staleEn, roReply), { locale: 'ro', persist: 'ro' });
  eq('a remembered "en" stays when the reply is English too', settleLocale(staleEn, enReply), { locale: 'en', persist: 'en' });
  eq('a remembered "en" stays when the reply says nothing', settleLocale(staleEn, 'ok'), { locale: 'en', persist: 'en' });
}

// ── 5. wiring (the routes cannot be bundled here, so these are static guards) ──────────────────────────────────────
const wa = readFileSync('app/api/whatsapp/route.ts', 'utf8'); const tg = readFileSync('app/api/telegram/route.ts', 'utf8');
const brain = readFileSync('lib/concierge/brain.ts', 'utf8'); const guidePage = readFileSync('app/[locale]/(site)/guide/[slug]/page.tsx', 'utf8');
const sources = readFileSync('lib/concierge/sources.ts', 'utf8'); const cs = readFileSync('components/ConciergeSources.tsx', 'utf8');
ok('whatsapp + telegram send through composeChannelReply, never the bare appender', wa.includes('composeChannelReply(') && tg.includes('composeChannelReply(') && !/[^e]appendChannelLinks\(/.test(wa + tg));
ok('both settle the language on the reply and remember it', wa.includes('settleLocale(lang, answer)') && tg.includes('settleLocale(lang, answer)') && wa.includes('locale: persistLocale') && tg.includes('locale: persistLocale'));
ok('whatsapp uses the phone number as the prior, telegram its UI language', wa.includes('hint: localeFromPhone(wa)') && tg.includes('hint: uiLocale'));
ok('the web stream and both non-streaming answers go through the policy', brain.includes('new LinkPolicyStream(') && brain.includes('guard.push(') && brain.includes('guard.flush()') && (brain.match(/applyLinkPolicy\(extractText\(data\)/g) || []).length === 2);
ok('only government / EU pages are cited from the knowledge base', brain.includes('isOfficialAuthorityUrl(h.item.source)') && guidePage.includes('isOfficialAuthorityUrl(hit.item.source)'));
ok('scraped titles and snippets are scrubbed', sources.includes('scrubSourceNames(safeText(r.title') && sources.includes('scrubSourceNames(safeText(r.description'));
ok('no "read the original" link to another site in the sources card', !cs.includes('readOriginal'));
ok('email drafts go through the policy too', readFileSync('lib/mail/assist.ts', 'utf8').includes('applyLinkPolicy(rawText'));
ok('the channel lines no longer link a knowledge page', !readFileSync('lib/concierge/channelLinks.ts', 'utf8').includes("h.kind === 'kb_doc'"));

report('concierge-channel-policy');
