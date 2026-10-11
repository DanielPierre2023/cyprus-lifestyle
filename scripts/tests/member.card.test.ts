// Member card (token, verification verdict, rotation, lapse), partner offers (rules, redemption once a day), copy parity,
// and the "venues see ONLY ..." guarantee.
import { readFileSync } from 'node:fs';
import { cardSecret, deriveCardToken, cardVerifyUrl, cleanCardName, memberSinceYear, verdictFor } from '@/lib/member/card';
import { ensureCard, rotateCard, setCardName, lookupCard, liveOffers, redeemedToday, redeemOffer } from '@/lib/member/cardStore';
import { checkOfferInput, offerIsLive, offerText, cyprusToday } from '@/lib/member/offers';
import { cardCopyAll } from '@/lib/member/cardCopy';
import { hashRestoreToken, isPlausibleRestoreToken } from '@/lib/concierge/restoreToken';
import { GRACE_DAYS } from '@/lib/member/entitlement';
import { MEMBER_PROMPT, MEMBERSHIP_FACTS } from '@/lib/member/truth';
import { LOCALES } from '@/lib/locales';
import { fakeDb } from './_fakeDb';
import { eq, ok, report } from './_harness';

const NOW = new Date('2026-10-20T12:00:00Z');
const d = (days: number) => new Date(NOW.getTime() + days * 86400000).toISOString();
const SECRET = 'test-secret-0123456789-abcdef';
const OID = '11111111-1111-4111-8111-111111111111';

// ── token ─────────────────────────────────────────────────────────────────
{
  const t1 = deriveCardToken(SECRET, 'm1', 1);
  ok('token has the bearer-link shape (43 base64url chars)', isPlausibleRestoreToken(t1));
  ok('deterministic; changes with version, member and secret', t1 === deriveCardToken(SECRET, 'm1', 1) && t1 !== deriveCardToken(SECRET, 'm1', 2) && t1 !== deriveCardToken(SECRET, 'm2', 1) && t1 !== deriveCardToken('other-secret-0123456789', 'm1', 1));
  eq('secret: MEMBER_CARD_SECRET wins, else service role, else none (too short counts as none)',
    [cardSecret({ MEMBER_CARD_SECRET: 'a'.repeat(20), SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(20) }), cardSecret({ SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(20) }), cardSecret({}), cardSecret({ MEMBER_CARD_SECRET: 'short' })],
    ['a'.repeat(20), 'b'.repeat(20), null, null]);
  eq('verification URL is locale-prefixed except English', [cardVerifyUrl('https://x.eu/', 'en', t1), cardVerifyUrl('https://x.eu', 'ar', t1), cardVerifyUrl('https://x.eu', 'zz', t1)], [`https://x.eu/card/verify/${t1}`, `https://x.eu/ar/card/verify/${t1}`, `https://x.eu/card/verify/${t1}`]);
}

// ── the name and the year ──────────────────────────────────────────────────
eq('card names', ['Maria', ' Anna  Lena ', 'J. K.', "O'Brien", 'Ελένη', 'Ольга', '', '   ', 'a'.repeat(25), '<b>x</b>', 'x@y.com', '+357 99 123456', '123', null, 5].map(cleanCardName),
  ['Maria', 'Anna Lena', 'J. K.', "O'Brien", 'Ελένη', 'Ольга', null, null, null, null, null, null, null, null, null]);
eq('member-since year uses the Cyprus calendar', [memberSinceYear('2026-01-01T00:30:00Z'), memberSinceYear('2025-12-31T22:30:00Z'), memberSinceYear(null), memberSinceYear('nonsense')], [2026, 2026, null, null]);

// ── verdict: same rule as entitled() ───────────────────────────────────────
{
  const m = (o: Record<string, unknown> = {}) => ({ id: 'm1', status: 'active', stripe_subscription_id: 'sub_1', current_period_end: d(10), created_at: '2025-03-04T10:00:00Z', ...o });
  eq('active -> valid, shows the chosen name and the year', verdictFor(m(), 'Maria', NOW), { valid: true, name: 'Maria', sinceYear: 2025 });
  ok('complimentary (active, no subscription) -> valid', verdictFor(m({ stripe_subscription_id: null }), null, NOW).valid);
  ok('payment problem inside the 7-day grace -> valid', verdictFor(m({ status: 'failed', current_period_end: d(-3) }), null, NOW).valid);
  ok('payment problem after the grace -> NOT valid', !verdictFor(m({ status: 'failed', current_period_end: d(-GRACE_DAYS - 1) }), null, NOW).valid);
  ok('canceled / unknown status / missing member -> NOT valid', !verdictFor(m({ status: 'canceled' }), null, NOW).valid && !verdictFor(m({ status: 'pending' }), null, NOW).valid && !verdictFor(null, null, NOW).valid);
  eq('an invalid card reveals nothing at all', verdictFor(m({ status: 'canceled' }), 'Maria', NOW), { valid: false });
  eq('the valid verdict has exactly three fields: valid, name, sinceYear (no e-mail, phone or id)', Object.keys(verdictFor(m({ email: 'secret@example.com' }), 'Maria', NOW)).sort(), ['name', 'sinceYear', 'valid']);
  ok('a hand-edited name that is not a name is dropped', (verdictFor(m(), 'call 0035799123456', NOW) as { name: string | null }).name === null);
}

// ── store: ensure / rotate / lookup (the token itself is never stored) ──────
async function main() {
  {
    const db = fakeDb({ concierge_members: [{ id: 'm1', status: 'active', created_at: '2025-03-04T10:00:00Z', email: 'm1@example.com' }], member_cards: [] }, { member_cards: [['member_id'], ['token_hash']] });
    const c1 = await ensureCard(db.sb, 'm1', SECRET);
    ok('a card is registered on first use', !!c1 && c1.version === 1 && db.tables.member_cards.length === 1);
    ok('only the hash is stored, never the token', db.tables.member_cards[0].token_hash === hashRestoreToken(c1!.token) && !JSON.stringify(db.tables.member_cards[0]).includes(c1!.token));
    const again = await ensureCard(db.sb, 'm1', SECRET);
    ok('asking again gives the same card and no second row', again!.token === c1!.token && db.tables.member_cards.length === 1);

    const found = await lookupCard(db.sb, c1!.token);
    eq('a scan resolves to the member', found?.member.id, 'm1');
    ok('garbage / unknown token -> not found', (await lookupCard(db.sb, 'nope')) === null && (await lookupCard(db.sb, 'A'.repeat(43))) === null && (await lookupCard(db.sb, undefined)) === null);

    // name
    ok('name is saved and returned', (await setCardName(db.sb, 'm1', ' Maria ')) && (await ensureCard(db.sb, 'm1', SECRET))!.displayName === 'Maria');
    ok('a bad name is refused and the old one stays', !(await setCardName(db.sb, 'm1', '<script>')) && (await ensureCard(db.sb, 'm1', SECRET))!.displayName === 'Maria');
    ok('an empty name clears it', (await setCardName(db.sb, 'm1', '')) && (await ensureCard(db.sb, 'm1', SECRET))!.displayName === null);

    // rotation revokes the old token
    const r = await rotateCard(db.sb, 'm1', SECRET, NOW);
    ok('rotation issues a different token, version 2', !!r && r.version === 2 && r.token !== c1!.token);
    ok('the OLD token stops resolving at once, the new one works', (await lookupCard(db.sb, c1!.token)) === null && (await lookupCard(db.sb, r!.token))?.member.id === 'm1');
    ok('rotation is stamped', db.tables.member_cards[0].rotated_at === NOW.toISOString());

    // a changed secret: the member's next visit re-registers the new hash; the old card dies
    const healed = await ensureCard(db.sb, 'm1', 'brand-new-secret-0123456789');
    ok('after a secret change the account page re-registers the hash; the previous token no longer verifies', healed!.token !== r!.token && (await lookupCard(db.sb, r!.token)) === null && (await lookupCard(db.sb, healed!.token))?.member.id === 'm1');

    // lapse: the same token, the live rule
    db.tables.concierge_members[0].status = 'canceled';
    const lapsed = await lookupCard(db.sb, healed!.token);
    ok('lapsed membership: the token still resolves, but the verdict is NOT valid (revoked at the moment benefits stop)', !!lapsed && !verdictFor(lapsed.member, lapsed.displayName, NOW).valid);
    db.tables.concierge_members[0].status = 'active';
    ok('reinstated membership: the same card is valid again', verdictFor((await lookupCard(db.sb, healed!.token))!.member, null, NOW).valid);

    // a member deleted -> nothing to verify
    db.tables.concierge_members.length = 0;
    ok('member erased -> card useless', (await lookupCard(db.sb, healed!.token)) === null);
  }

  // ── offers: rules ───────────────────────────────────────────────────────
  {
    const base = { active: true, valid_from: null, valid_to: null };
    ok('active without dates is live', offerIsLive(base, NOW));
    ok('inactive is never live', !offerIsLive({ ...base, active: false }, NOW));
    eq('window is inclusive on the Cyprus calendar', [offerIsLive({ ...base, valid_from: '2026-10-20' }, NOW), offerIsLive({ ...base, valid_from: '2026-10-21' }, NOW), offerIsLive({ ...base, valid_to: '2026-10-20' }, NOW), offerIsLive({ ...base, valid_to: '2026-10-19' }, NOW)], [true, false, true, false]);
    eq('cyprus day rolls over at local midnight (UTC+3 in October)', [cyprusToday(new Date('2026-10-20T20:59:00Z')), cyprusToday(new Date('2026-10-20T21:01:00Z'))], ['2026-10-20', '2026-10-21']);
    const o = { offer_en: 'A glass of wine', translations: { el: 'Ένα ποτήρι κρασί', de: '   ' } as Record<string, string> };
    eq('offer text: own language, blank translation and missing language fall back to English', [offerText(o, 'el'), offerText(o, 'de'), offerText(o, 'ru'), offerText(o, 'en'), offerText({ offer_en: 'X', translations: null }, 'el')], ['Ένα ποτήρι κρασί', 'A glass of wine', 'A glass of wine', 'A glass of wine', 'X']);
    const good = checkOfferInput({ partner_name: ' Taverna  Mylos ', offer_en: 'A glass of wine\nwith a main', translations: { el: 'x', xx: 'ignored', ru: '  ' }, valid_from: '2026-11-01', valid_to: '2026-12-31' });
    eq('a good offer is cleaned', good, { ok: true, value: { partner_name: 'Taverna Mylos', offer_en: 'A glass of wine with a main', translations: { el: 'x' }, valid_from: '2026-11-01', valid_to: '2026-12-31', active: true } });
    const err = (b: Record<string, unknown>) => { const r = checkOfferInput(b); return r.ok ? '' : r.error; };
    ok('rejects: no partner, no text, too long, bad date, reversed dates', err({ offer_en: 'x' }) !== '' && err({ partner_name: 'P' }) !== '' && err({ partner_name: 'P', offer_en: 'x'.repeat(301) }) !== '' && err({ partner_name: 'P'.repeat(81), offer_en: 'x' }) !== ''
      && err({ partner_name: 'P', offer_en: 'x', valid_from: '2026-02-30' }) !== '' && err({ partner_name: 'P', offer_en: 'x', valid_from: '2026-12-01', valid_to: '2026-11-01' }) !== '');
    eq('active defaults to true, can be switched off', [(checkOfferInput({ partner_name: 'P', offer_en: 'x' }) as { value: { active: boolean } }).value.active, (checkOfferInput({ partner_name: 'P', offer_en: 'x', active: false }) as { value: { active: boolean } }).value.active], [true, false]);
  }

  // ── offers + redemptions in the store ───────────────────────────────────
  {
    const db = fakeDb({
      member_offers: [
        { id: OID, partner_name: 'Taverna Mylos', offer_en: 'A glass of wine', translations: {}, valid_from: null, valid_to: null, active: true, created_at: d(-5) },
        { id: '22222222-2222-4222-8222-222222222222', partner_name: 'Off', offer_en: 'x', translations: {}, valid_from: null, valid_to: null, active: false, created_at: d(-4) },
        { id: '33333333-3333-4333-8333-333333333333', partner_name: 'Expired', offer_en: 'x', translations: {}, valid_from: null, valid_to: '2026-09-01', active: true, created_at: d(-3) },
      ],
      member_redemptions: [],
    }, { member_redemptions: [['offer_id', 'member_id', 'redeemed_day']] });
    eq('only active offers inside their dates are shown', (await liveOffers(db.sb, NOW)).map((o) => o.partner_name), ['Taverna Mylos']);
    eq('no offers at all -> nothing is shown (the default)', (await liveOffers(fakeDb({ member_offers: [] }).sb, NOW)).length, 0);

    eq('first redemption', await redeemOffer(db.sb, 'm1', OID, NOW), 'ok');
    const row = db.tables.member_redemptions[0];
    eq('the log row holds the offer, the member id and the time only', Object.keys(row).filter((k) => k !== 'id').sort(), ['member_id', 'offer_id', 'redeemed_at', 'redeemed_day']);
    eq('second press the same day -> already', await redeemOffer(db.sb, 'm1', OID, new Date(NOW.getTime() + 3600_000)), 'already');
    eq('another member can still redeem', await redeemOffer(db.sb, 'm2', OID, NOW), 'ok');
    eq('next Cyprus day the same member can redeem again', await redeemOffer(db.sb, 'm1', OID, new Date(NOW.getTime() + 24 * 3600_000)), 'ok');
    eq('switched-off, expired and unknown offers cannot be redeemed', [await redeemOffer(db.sb, 'm1', '22222222-2222-4222-8222-222222222222', NOW), await redeemOffer(db.sb, 'm1', '33333333-3333-4333-8333-333333333333', NOW), await redeemOffer(db.sb, 'm1', '44444444-4444-4444-8444-444444444444', NOW), await redeemOffer(db.sb, 'm1', "x'; drop table", NOW)], ['unavailable', 'unavailable', 'unavailable', 'unavailable']);
    eq('rows written: 3 (nothing for the refused attempts)', db.tables.member_redemptions.length, 3);
    eq('"redeemed today" reflects the Cyprus day', [[...(await redeemedToday(db.sb, 'm1', [OID], NOW))], [...(await redeemedToday(db.sb, 'm1', [OID], new Date(NOW.getTime() + 48 * 3600_000)))]], [[OID], []]);
  }

  // ── copy parity (7 editions, same keys, no empties, same {placeholders}) ──
  {
    const en = cardCopyAll.en as unknown as Record<string, string>;
    const ph = (s: string) => (s.match(/\{\w+\}/g) || []).sort().join(',');
    let bad = '';
    for (const l of LOCALES) {
      const c = cardCopyAll[l] as unknown as Record<string, string>;
      if (Object.keys(c).sort().join() !== Object.keys(en).sort().join()) bad += ` ${l}:keys`;
      for (const k of Object.keys(en)) { if (!c[k] || !c[k].trim()) bad += ` ${l}.${k}:empty`; else if (ph(c[k]) !== ph(en[k])) bad += ` ${l}.${k}:placeholders`; }
    }
    eq('card copy: all 7 editions complete', bad, '');
    ok('with no offers the card says plainly it identifies the member, that there are none yet, and implies no discount (EN)', /identifies you/.test(en.cIntroNone) && /none yet/.test(en.cIntroNone) && /does not by itself entitle you to a discount/.test(en.cIntroNone) && !/exclusive|% off|save money|free /i.test(en.cIntroNone + en.cOffersNone));
  }

  // ── truth in the chatbot prompts ─────────────────────────────────────────
  {
    ok('house facts: priority lane is a TARGET of 4 working hours, signed-in only, no named human, no guaranteed time', /TARGET of 4 working hours/.test(MEMBERSHIP_FACTS) && /not a guarantee/.test(MEMBERSHIP_FACTS) && /signed in/.test(MEMBERSHIP_FACTS) && /named or dedicated human concierge/.test(MEMBERSHIP_FACTS) && /no response time is guaranteed/.test(MEMBERSHIP_FACTS));
    ok('the old false sentence is gone', !/does NOT include a human concierge, priority handling/.test(MEMBERSHIP_FACTS) && !/priority handling/.test(MEMBER_PROMPT));
    ok('the member prompt mentions the member card only via house facts and promises no discount / guaranteed time', /Do not promise a named or dedicated human concierge, a guaranteed response time, or any discount/.test(MEMBER_PROMPT));
    ok('house facts mention the card and that offers come over time', /member card/.test(MEMBERSHIP_FACTS) && /never promise a discount/.test(MEMBERSHIP_FACTS));
  }

  // ── static guarantees over the public surfaces ──────────────────────────
  {
    const page = readFileSync('app/[locale]/(site)/card/verify/[token]/page.tsx', 'utf8').replace(/\/\/.*$/gm, '');
    const api = readFileSync('app/api/card/redeem/route.ts', 'utf8').replace(/\/\/.*$/gm, '');
    ok('verify page never reads or prints an e-mail or phone, and uses the member id only to look up today\'s redemptions', !/email|phone/i.test(page) && (page.match(/member\.id/g) || []).length === 1 && /redeemedToday\(sb, found\.member\.id/.test(page));
    ok('verify page: noindex, never cached', /index: false/.test(page) && /force-dynamic/.test(page) && /revalidate = 0/.test(page) && /no-referrer/.test(page));
    ok('redeem route: same-origin, rate limited twice, no personal data in the response', /sameOrigin/.test(api) && (api.match(/rateLimit/g) || []).length >= 3 && !/email|phone/i.test(api));
  }
  report('member.card');
}
main();
