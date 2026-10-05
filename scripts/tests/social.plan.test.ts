// Facebook + Instagram auto-posting rules: hashtags, captions, limits, retries, settings.
import {
  toHashtag, buildHashtags, clip, cleanText, withUtm, buildFacebookPost, buildInstagramPost, parseGenerated, parseSettings, postingGate,
  backoffMs, classifyMetaError, isStale, igAspectOk, LIMITS, MAX_ATTEMPTS, CTA_IG, SPONSORED_LABEL, DEFAULT_SETTINGS, type ArticleFacts,
} from '@/lib/socialPlan';
import { LOCALES } from '@/lib/locales';
import { eq, ok, report } from './_harness';

// ── hashtags ─────────────────────────────────────────────────────────────────
eq('multi-word → CamelCase', toHashtag('limassol marina'), '#LimassolMarina');
eq('already capitalised stays', toHashtag('Paphos'), '#Paphos');
eq('Greek letters are kept', toHashtag('Λεμεσός'), '#Λεμεσός');
eq('Arabic letters are kept', toHashtag('قبرص'), '#قبرص');
eq('Cyrillic is kept', toHashtag('недвижимость на Кипре'), '#НедвижимостьНаКипре');
ok('punctuation is stripped', toHashtag('real-estate!') === '#RealEstate');
ok('a sentence is not a hashtag', toHashtag('the best places to eat in town this year') === null);
ok('too short / only digits / empty are refused', toHashtag('ab') === null && toHashtag('2026') === null && toHashtag('') === null && toHashtag('   ') === null);
{
  const h = buildHashtags({ tags: ['Limassol Marina', 'property', 'cyprus'], county: 'Limassol', category: 'property', count: 5 });
  eq('specific first, de-duplicated, generic "cyprus" tag not duplicated, brand last', h, ['#LimassolMarina', '#Property', '#Limassol', '#Cyprus', '#CyprusLifestyle']);
  eq('Facebook gets 3', buildHashtags({ tags: ['a long enough tag', 'second tag', 'third tag'], count: 3 }).length, 3);
  ok('brand tag survives even with many tags', buildHashtags({ tags: ['one tag', 'two tag', 'three tag', 'four tag', 'five tag', 'six tag'], count: 5 }).includes('#CyprusLifestyle'));
  ok('never more than asked, never more than 30', buildHashtags({ tags: Array.from({ length: 50 }, (_, i) => `tag number ${i}`), count: 99 }).length <= LIMITS.instagramHashtags);
  eq('no tags → place, section, brand', buildHashtags({ county: 'Paphos', category: 'food', count: 5 }), ['#Paphos', '#Food', '#Cyprus', '#CyprusLifestyle']);
}

// ── text helpers ─────────────────────────────────────────────────────────────
eq('html and dashes removed', cleanText('<p>Sun&nbsp;and sea – the best — ever</p>'), 'Sun and sea, the best, ever');
eq('short text unchanged', clip('Hello world.', 50), 'Hello world.');
{
  const long = 'The first sentence is here. The second sentence goes on and on for quite a while longer than the limit allows.';
  eq('clips at a sentence boundary', clip(long, 60), 'The first sentence is here.');
  const words = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda';
  const c = clip(words, 30);
  ok('clips at a word boundary with an ellipsis, never mid-word', c.endsWith('…') && c.length <= 30 && !/\bze…$/.test(c));
}
{
  const u = withUtm('https://cypruslifestyle.eu/article/x', 'instagram');
  ok('UTM added without losing the path', u === 'https://cypruslifestyle.eu/article/x?utm_source=instagram&utm_medium=social&utm_campaign=autopost');
  ok('existing query kept', withUtm('https://a.b/c?x=1', 'facebook').includes('x=1') && withUtm('https://a.b/c?x=1', 'facebook').includes('utm_source=facebook'));
}

// ── the posts ────────────────────────────────────────────────────────────────
const facts = (o: Partial<ArticleFacts> = {}): ArticleFacts => ({
  title: 'Limassol Marina reopens its waterfront promenade', description: 'After two years of works the promenade welcomes walkers again, with new cafés, a market and a sunset terrace facing the harbour.',
  tags: ['limassol marina', 'waterfront'], county: 'Limassol', category: 'property', locale: 'en', ...o,
});
{
  const fb = buildFacebookPost(facts(), null);
  ok('Facebook: starts with the headline, ends with 3 hashtags', fb.text.startsWith('Limassol Marina reopens') && fb.hashtags.length === 3 && fb.text.endsWith(fb.hashtags.join(' ')));
  ok('Facebook: within its length budget', fb.text.length <= LIMITS.facebookMessage);
  ok('Facebook: fallback marked as not AI', fb.usedAi === false);
  const ig = buildInstagramPost(facts(), null);
  ok('Instagram: hook first, then description, "link in bio", 5 hashtags', ig.text.startsWith('Limassol Marina reopens') && ig.text.includes(CTA_IG.en) && ig.hashtags.length === 5 && ig.text.endsWith(ig.hashtags.join(' ')));
  ok('Instagram: within 2,200 characters and 30 hashtags', ig.text.length <= LIMITS.instagramCaption && (ig.text.match(/#/g) || []).length <= 30);
  ok('Instagram: alt text present and short', !!ig.altText && ig.altText.length <= LIMITS.altText);
  const g = parseGenerated('Here you go: {"hook":"A promenade reborn – at last","body":"Cafés, a market and a sunset terrace.","altText":"The harbour at sunset"}');
  eq('model reply parsed and cleaned', g, { hook: 'A promenade reborn, at last', body: 'Cafés, a market and a sunset terrace.', altText: 'The harbour at sunset' });
  const ai = buildInstagramPost(facts(), g);
  ok('AI copy is used and marked', ai.usedAi && ai.text.startsWith('A promenade reborn') && ai.altText === 'The harbour at sunset');
  ok('unusable model replies are ignored', parseGenerated('sorry') === null && parseGenerated('{"hook":""}') === null && parseGenerated('{bad json}') === null);
  const huge = buildInstagramPost(facts({ description: 'word '.repeat(2000) }), { hook: 'h'.repeat(300), body: 'b'.repeat(5000) });
  ok('absurdly long input is still within limits', huge.text.length <= LIMITS.instagramCaption);
  const sp = buildFacebookPost(facts({ sponsored: true, sponsorName: 'Acme Villas', locale: 'de' }), null);
  ok('sponsored content is labelled in the reader\'s language', sp.text.startsWith(`${SPONSORED_LABEL.de} · Acme Villas`));
}
ok('every edition has a "link in bio" line and a sponsored label', LOCALES.every((l) => !!CTA_IG[l] && !!SPONSORED_LABEL[l]));

// ── settings / gate ──────────────────────────────────────────────────────────
{
  eq('missing settings → defaults', parseSettings(undefined), DEFAULT_SETTINGS);
  const s = parseSettings({ enabled: false, instagram: false, max_per_day: { facebook: 3, instagram: 999 }, min_gap_minutes: 'x', max_age_hours: 0 });
  eq('stored shape parsed, bad values clamped', [s.enabled, s.facebook, s.instagram, s.maxPerDay, s.minGapMinutes, s.maxAgeHours], [false, true, false, { facebook: 3, instagram: 25 }, 30, 1]);
  const now = new Date('2026-10-09T10:00:00Z');
  const S = DEFAULT_SETTINGS;
  eq('free to post', postingGate(S, 'facebook', { countLast24h: 0, lastPostedAt: null }, now), { ok: true });
  eq('daily limit reached', postingGate(S, 'instagram', { countLast24h: 4, lastPostedAt: null }, now), { ok: false, reason: 'daily_limit' });
  const gap = postingGate(S, 'facebook', { countLast24h: 1, lastPostedAt: new Date('2026-10-09T09:50:00Z') }, now);
  ok('gap not yet over → retry at last + 30 min', !gap.ok && gap.reason === 'gap' && gap.retryAt!.toISOString() === '2026-10-09T10:20:00.000Z');
  eq('gap over', postingGate(S, 'facebook', { countLast24h: 1, lastPostedAt: new Date('2026-10-09T09:20:00Z') }, now), { ok: true });
  eq('master switch off', postingGate({ ...S, enabled: false }, 'facebook', { countLast24h: 0, lastPostedAt: null }, now), { ok: false, reason: 'off' });
  eq('platform switch off', postingGate({ ...S, instagram: false }, 'instagram', { countLast24h: 0, lastPostedAt: null }, now), { ok: false, reason: 'off' });
  eq('limit 0 means never', postingGate({ ...S, maxPerDay: { facebook: 0, instagram: 4 } }, 'facebook', { countLast24h: 0, lastPostedAt: null }, now), { ok: false, reason: 'daily_limit' });
}

// ── retries / errors / freshness ─────────────────────────────────────────────
eq('back-off doubles from 10 minutes and caps at 6 h', [1, 2, 3, 4, 5, 20].map((a) => backoffMs(a) / 60000), [10, 20, 40, 80, 160, 360]);
ok('five attempts', MAX_ATTEMPTS === 5);
eq('expired token → auth', classifyMetaError(190, 'Error validating access token: Session has expired'), 'auth');
eq('missing permission → auth', classifyMetaError(200, '(#200) Requires pages_manage_posts permission'), 'auth');
eq('rate limit → transient', classifyMetaError(4, 'Application request limit reached'), 'transient');
eq('"try again" → transient', classifyMetaError(undefined, 'An unexpected error has occurred. Please retry your request later.'), 'transient');
eq('image still processing → transient', classifyMetaError(9007, 'Media ID is not available'), 'transient');
eq('anything else → permanent', classifyMetaError(100, 'Invalid parameter'), 'permanent');
{
  const now = new Date('2026-10-09T12:00:00Z');
  ok('fresh article is not stale', !isStale('2026-10-09T06:00:00Z', 36, now, false));
  ok('old article is stale', isStale('2026-10-07T06:00:00Z', 36, now, false));
  ok('queued-on-purpose older articles are never stale', !isStale('2025-01-01T00:00:00Z', 36, now, true));
}
ok('Instagram aspect range 4:5 … 1.91:1', igAspectOk(1080, 1350) && igAspectOk(1200, 630) && igAspectOk(1080, 1080) && !igAspectOk(1000, 2000) && !igAspectOk(2000, 500) && !igAspectOk(0, 10));

report('social.plan');
