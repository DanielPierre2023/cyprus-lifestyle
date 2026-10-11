// Member lifecycle e-mails: who gets which notice, once per event, in their language; recovery resets; failures retry; copy parity.
import { noticeFor, graceEndsAt, graceMail, endedMail, runLifecycleNotices } from '@/lib/member/lifecycle';
import { lifecycleCopyAll } from '@/lib/member/lifecycleCopy';
import { reconcileMembers } from '@/lib/member/reconcile';
import { entitled, GRACE_DAYS, PROFILE_RETENTION_DAYS } from '@/lib/member/entitlement';
import { LOCALES } from '@/lib/locales';
import { recordMembershipCheckout } from '@/lib/concierge/membership';
import { fakeDb, type Row } from './_fakeDb';
import { eq, ok, report } from './_harness';

const NOW = new Date('2026-10-20T12:00:00Z');
const d = (days: number) => new Date(NOW.getTime() + days * 86400000).toISOString();
const SITE = 'https://cypruslifestyle.eu';
const mem = (o: Row = {}): Row => ({ id: 'm1', email: 'maria@example.com', locale: 'el', status: 'active', stripe_subscription_id: 'sub_1', current_period_end: d(10), updated_at: d(-1), lapsed_at: null, grace_notice_at: null, lapsed_notice_at: null, ...o });

async function main() {
  // ── who gets what (pure) ────────────────────────────────────────────────
  const n = (o: Row) => noticeFor(mem(o) as never, NOW);
  eq('healthy -> nothing', n({}), null);
  eq('payment problem inside the grace -> grace notice', n({ status: 'failed', current_period_end: d(-2) }), 'grace');
  eq('payment problem, grace already sent -> nothing', n({ status: 'failed', current_period_end: d(-2), grace_notice_at: d(-1) }), null);
  eq('payment problem past the grace -> ended notice (benefits have stopped)', n({ status: 'failed', current_period_end: d(-GRACE_DAYS - 2) }), 'ended');
  eq('canceled -> ended notice', n({ status: 'canceled' }), 'ended');
  eq('canceled, already told -> nothing', n({ status: 'canceled', lapsed_notice_at: d(-3) }), null);
  eq('canceled without ever having had the grace mail -> only the ended mail', n({ status: 'canceled', grace_notice_at: null }), 'ended');
  eq('complimentary (no Stripe subscription) ended by the owner -> no automatic mail', n({ status: 'canceled', stripe_subscription_id: null }), null);
  eq('no address -> nothing', n({ status: 'canceled', email: null }), null);
  eq('anything else -> nothing', n({ status: 'pending' }), null);
  // the grace date in the mail is exactly when entitled() flips
  const row = mem({ status: 'failed', current_period_end: d(-2) }) as never;
  const until = graceEndsAt(row)!;
  ok('grace end = the instant entitlement stops (e-mail and account page agree)', entitled(row, new Date(until.getTime() - 1000)) && !entitled(row, new Date(until.getTime() + 1000)));
  eq('grace end falls back to the last update, like entitled()', graceEndsAt({ current_period_end: null, updated_at: '2026-10-01T00:00:00Z' })?.toISOString(), `2026-10-${String(1 + GRACE_DAYS).padStart(2, '0')}T00:00:00.000Z`);

  // ── the mails themselves ────────────────────────────────────────────────
  {
    const g = graceMail('de', { until, siteUrl: SITE + '/' });
    ok('grace mail: German subject, date, link to the German account page, plain-text-safe', g.subject.includes('Zahlungsproblem') && g.html.includes('lang="de"') && g.html.includes(`${SITE}/de/account`) && /\d{4}/.test(g.html) && !g.html.includes('{date}'));
    const e = endedMail('ar', { siteUrl: SITE });
    ok('ended mail: Arabic is right-to-left, links to the membership page, names the retention days', e.html.includes('dir="rtl"') && e.html.includes(`${SITE}/ar/membership`) && e.html.includes(String(PROFILE_RETENTION_DAYS)) && !e.html.includes('{days}'));
    ok('English is the fallback for a missing or unknown locale, with unprefixed links', graceMail(null, { until, siteUrl: SITE }).html.includes(`${SITE}/account`) && endedMail('xx', { siteUrl: SITE }).html.includes(`${SITE}/membership`) && endedMail(undefined, { siteUrl: SITE }).subject === 'Your Cyprus Lifestyle membership has ended');
    ok('the ended mail promises nothing it cannot do (no refund / discount / guaranteed words)', !/refund|discount|guarantee/i.test(endedMail('en', { siteUrl: SITE }).html));
  }

  // ── run: once per event ────────────────────────────────────────────────
  {
    const sent: { to: string; subject: string }[] = [];
    const send = async (m: { to: string; subject: string; html: string }) => { sent.push({ to: m.to, subject: m.subject }); return { ok: true }; };
    const db = fakeDb({ concierge_members: [
      mem({ id: 'p', status: 'failed', current_period_end: d(-2), email: 'p@example.com', locale: 'pl' }),
      mem({ id: 'c', status: 'canceled', email: 'c@example.com', locale: null }),
      mem({ id: 'ok' }),
      mem({ id: 'comp', status: 'canceled', stripe_subscription_id: null, email: 'comp@example.com' }),
      mem({ id: 'old', status: 'canceled', lapsed_notice_at: d(-200), email: 'old@example.com' }),
    ] });
    const by = (id: string) => db.tables.concierge_members.find((m) => m.id === id)!;
    const r1 = await runLifecycleNotices(db.sb, NOW, send, SITE);
    eq('first run: one grace, one ended', [r1.graceSent, r1.endedSent, r1.failed], [1, 1, 0]);
    eq('to the right people, in their language', sent.map((s) => [s.to, s.subject]), [['p@example.com', 'Problem z płatnością za członkostwo w Cyprus Lifestyle'], ['c@example.com', 'Your Cyprus Lifestyle membership has ended']]);
    ok('stamps are set', by('p').grace_notice_at === NOW.toISOString() && by('c').lapsed_notice_at === NOW.toISOString());
    const r2 = await runLifecycleNotices(db.sb, new Date(NOW.getTime() + 86400000), send, SITE);
    eq('second run (next day): nobody is mailed again', [r2.graceSent, r2.endedSent, sent.length], [0, 0, 2]);

    // the payment problem ends the membership: the ended notice follows exactly once
    by('p').status = 'canceled';
    const r3 = await runLifecycleNotices(db.sb, new Date(NOW.getTime() + 2 * 86400000), send, SITE);
    const r4 = await runLifecycleNotices(db.sb, new Date(NOW.getTime() + 3 * 86400000), send, SITE);
    eq('grace -> ended: one more mail, then silence', [r3.endedSent, r4.endedSent, sent.length], [1, 0, 3]);

    // recovery: stamps cleared; a later problem is a NEW event
    by('p').status = 'active';
    const r5 = await runLifecycleNotices(db.sb, new Date(NOW.getTime() + 4 * 86400000), send, SITE);
    ok('a recovered member has clean stamps', r5.cleared >= 2 && by('p').grace_notice_at === null && by('p').lapsed_notice_at === null);
    by('p').status = 'failed'; by('p').current_period_end = d(3);
    const r6 = await runLifecycleNotices(db.sb, new Date(NOW.getTime() + 5 * 86400000), send, SITE);
    eq('the next payment problem is announced again', [r6.graceSent, sent.length], [1, 4]);
  }

  // ── a failing send is retried (claim released), never stamped as done ───
  {
    let fail = true; let calls = 0;
    const send = async () => { calls++; return fail ? { ok: false, error: 'resend down' } : { ok: true }; };
    const db = fakeDb({ concierge_members: [mem({ id: 'c', status: 'canceled' })] });
    const r1 = await runLifecycleNotices(db.sb, NOW, send, SITE);
    ok('failed send: counted, stamp released', r1.failed === 1 && r1.endedSent === 0 && db.tables.concierge_members[0].lapsed_notice_at === null);
    fail = false;
    const r2 = await runLifecycleNotices(db.sb, new Date(NOW.getTime() + 86400000), send, SITE);
    ok('tomorrow it goes out, once', r2.endedSent === 1 && calls === 2);
    const throwing = fakeDb({ concierge_members: [mem({ id: 'c', status: 'canceled' })] });
    const r3 = await runLifecycleNotices(throwing.sb, NOW, async () => { throw new Error('boom'); }, SITE);
    ok('a throwing sender is treated as a failed send', r3.failed === 1 && throwing.tables.concierge_members[0].lapsed_notice_at === null);
  }

  // ── two overlapping runs cannot both send (atomic claim) ────────────────
  {
    const sent: string[] = [];
    const send = async (m: { to: string }) => { sent.push(m.to); return { ok: true }; };
    const db = fakeDb({ concierge_members: [mem({ id: 'c', status: 'canceled' })] });
    await Promise.all([runLifecycleNotices(db.sb, NOW, send, SITE), runLifecycleNotices(db.sb, NOW, send, SITE)]);
    eq('exactly one mail', sent.length, 1);
  }

  // ── wired into the daily reconcile ──────────────────────────────────────
  {
    const sent: string[] = [];
    const send = async (m: { to: string }) => { sent.push(m.to); return { ok: true }; };
    const db = fakeDb({ concierge_members: [mem({ id: 'stale', current_period_end: d(-5), email: 's@example.com', locale: 'ro' })], member_sessions: [], membership_restore_tokens: [] });
    const sum = await reconcileMembers(db.sb, NOW, async () => ({ found: true, status: 'canceled', subscription: {} }), send);
    eq('Stripe says canceled -> the row is ended AND the member is told in the same daily run', [db.tables.concierge_members[0].status, sum.endedNotices, sent], ['canceled', 1, ['s@example.com']]);
    const again = await reconcileMembers(db.sb, new Date(NOW.getTime() + 86400000), async () => ({ found: true, status: 'canceled', subscription: {} }), send);
    eq('next day: nothing more', [again.endedNotices, sent.length], [0, 1]);
  }

  // ── the member's edition is captured at checkout (so the e-mails can use it) ──
  {
    const db = fakeDb({ concierge_members: [] });
    const base = { sessionId: 'cs_1', subscriptionId: 'sub_9', customerId: 'cus_1', cid: null, email: 'x@example.com', tier: 'concierge' };
    await recordMembershipCheckout(db.sb, { ...base, locale: 'ro' }, NOW.toISOString());
    eq('locale stored from the checkout', db.tables.concierge_members[0].locale, 'ro');
    await recordMembershipCheckout(db.sb, { ...base, locale: 'klingon' }, NOW.toISOString());
    eq('an unknown locale never overwrites a good one', db.tables.concierge_members[0].locale, 'ro');
    const db2 = fakeDb({ concierge_members: [] });
    await recordMembershipCheckout(db2.sb, { ...base }, NOW.toISOString());
    ok('no locale supplied -> column untouched (null -> English e-mails)', !('locale' in db2.tables.concierge_members[0]));
  }

  // ── copy parity ─────────────────────────────────────────────────────────
  {
    const en = lifecycleCopyAll.en as unknown as Record<string, string>;
    const ph = (s: string) => (s.match(/\{\w+\}/g) || []).sort().join(',');
    let bad = '';
    for (const l of LOCALES) {
      const c = lifecycleCopyAll[l] as unknown as Record<string, string>;
      if (Object.keys(c).sort().join() !== Object.keys(en).sort().join()) bad += ` ${l}:keys`;
      for (const k of Object.keys(en)) { if (!c[k] || !c[k].trim()) bad += ` ${l}.${k}:empty`; else if (ph(c[k]) !== ph(en[k])) bad += ` ${l}.${k}:placeholders`; }
    }
    eq('lifecycle copy: all 7 editions complete', bad, '');
  }
  report('member.lifecycle');
}
main();
