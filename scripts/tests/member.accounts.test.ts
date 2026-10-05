// Member accounts: entitlement rules, sessions, sign-in links for ended members, the daily lapse check.
import {
  entitled, accountState, needsReconcile, profileExpired, canSignIn, keyDate, GRACE_DAYS, PROFILE_RETENTION_DAYS,
} from '@/lib/member/entitlement';
import { createSession, resolveSession, endSession, endAllSessions, cookieOptions, sameOrigin, SESSION_COOKIE } from '@/lib/member/session';
import { issueLoginToken, confirmLogin } from '@/lib/concierge/membership';
import { planUpdate, reconcileMembers } from '@/lib/member/reconcile';
import { hashRestoreToken } from '@/lib/concierge/restoreToken';
import { eq, ok, report } from './_harness';

const NOW = new Date('2026-10-20T12:00:00Z');
const d = (days: number) => new Date(NOW.getTime() + days * 86400000).toISOString();

// ── entitlement ──────────────────────────────────────────────────────────────
ok('active → benefits', entitled({ status: 'active' }, NOW));
ok('complimentary (active, no subscription) → benefits', entitled({ status: 'active', stripe_subscription_id: null }, NOW));
ok('canceled → none', !entitled({ status: 'canceled', current_period_end: d(5) }, NOW));
ok('payment problem: grace after the period end', entitled({ status: 'failed', current_period_end: d(-3) }, NOW));
ok('payment problem: grace over', !entitled({ status: 'failed', current_period_end: d(-GRACE_DAYS - 1) }, NOW));
ok('payment problem without a period: grace counts from the last update', entitled({ status: 'failed', updated_at: d(-2) }, NOW) && !entitled({ status: 'failed', updated_at: d(-30) }, NOW));
ok('payment problem with no dates at all → no benefits (fail closed)', !entitled({ status: 'failed' }, NOW));
ok('unknown status → none', !entitled({ status: 'whatever' }, NOW));
eq('who may sign in', ['active', 'failed', 'canceled', 'pending', 'expired'].map(canSignIn), [true, true, true, false, false]);

eq('states', [
  accountState({ status: 'active', stripe_subscription_id: 'sub_1', cancel_at_period_end: false }, NOW),
  accountState({ status: 'active', stripe_subscription_id: 'sub_1', cancel_at_period_end: true }, NOW),
  accountState({ status: 'active', stripe_subscription_id: null }, NOW),
  accountState({ status: 'failed', stripe_subscription_id: 'sub_1', current_period_end: d(-1) }, NOW),
  accountState({ status: 'failed', stripe_subscription_id: 'sub_1', current_period_end: d(-30) }, NOW),
  accountState({ status: 'canceled', stripe_subscription_id: 'sub_1' }, NOW),
], ['active', 'ending', 'complimentary', 'payment_problem', 'ended', 'ended']);
eq('key date: renewal for the living, lapse date for the ended', [keyDate({ status: 'active', current_period_end: '2026-11-01T00:00:00Z' }), keyDate({ status: 'canceled', lapsed_at: '2026-10-01T00:00:00Z', current_period_end: '2026-11-01T00:00:00Z' })], ['2026-11-01T00:00:00Z', '2026-10-01T00:00:00Z']);
ok('profile erased only after the retention period', !profileExpired(d(-PROFILE_RETENTION_DAYS + 1), NOW) && profileExpired(d(-PROFILE_RETENTION_DAYS - 1), NOW) && !profileExpired(null, NOW));
ok('reconcile: paid row whose period ended days ago', needsReconcile({ status: 'active', stripe_subscription_id: 'sub_1', current_period_end: d(-3) }, NOW));
ok('reconcile: not yet stale / complimentary / already canceled', !needsReconcile({ status: 'active', stripe_subscription_id: 'sub_1', current_period_end: d(-1) }, NOW)
  && !needsReconcile({ status: 'active', stripe_subscription_id: null, current_period_end: d(-30) }, NOW)
  && !needsReconcile({ status: 'canceled', stripe_subscription_id: 'sub_1', current_period_end: d(-30) }, NOW));
ok('reconcile: no period recorded for 40+ days', needsReconcile({ status: 'active', stripe_subscription_id: 'sub_1', updated_at: d(-41) }, NOW) && !needsReconcile({ status: 'active', stripe_subscription_id: 'sub_1', updated_at: d(-10) }, NOW));

// ── a tiny in-memory PostgREST ───────────────────────────────────────────────
type Row = Record<string, unknown>;
function fakeDb(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = { concierge_members: [], member_sessions: [], membership_restore_tokens: [], ...seed };
  let idc = 0;
  const from = (name: string) => {
    const rows = tables[name];
    const preds: ((r: Row) => boolean)[] = [];
    let mode: 'select' | 'update' | 'insert' | 'delete' = 'select';
    let patch: Row = {}; let limit = Infinity; let ins: Row | null = null;
    const run = () => {
      if (mode === 'insert') { rows.push({ id: `row${++idc}`, created_at: NOW.toISOString(), used_at: null, ...ins! }); return []; }
      const hit = rows.filter((r) => preds.every((p) => p(r)));
      if (mode === 'update') for (const r of hit) Object.assign(r, patch);
      if (mode === 'delete') for (const r of hit) rows.splice(rows.indexOf(r), 1);
      return hit.slice(0, limit);
    };
    const b: Record<string, unknown> = {
      select: () => b,
      update: (p: Row) => { mode = 'update'; patch = p; return b; },
      insert: (r: Row) => { mode = 'insert'; ins = r; return b; },
      delete: () => { mode = 'delete'; return b; },
      eq: (c: string, v: unknown) => { preds.push((r) => r[c] === v); return b; },
      neq: (c: string, v: unknown) => { preds.push((r) => r[c] !== v); return b; },
      is: (c: string, v: unknown) => { preds.push((r) => (r[c] ?? null) === v); return b; },
      not: (c: string, op: string, v: unknown) => { preds.push((r) => (op === 'is' && v === null ? r[c] != null : true)); return b; },
      in: (c: string, vs: unknown[]) => { preds.push((r) => vs.includes(r[c])); return b; },
      gt: (c: string, v: string) => { preds.push((r) => String(r[c]) > v); return b; },
      gte: (c: string, v: string) => { preds.push((r) => String(r[c]) >= v); return b; },
      lt: (c: string, v: string) => { preds.push((r) => r[c] != null && String(r[c]) < v); return b; },
      filter: (c: string, op: string, v: string) => { preds.push((r) => (op === 'neq' && v === '{}' ? JSON.stringify(r[c] ?? {}) !== '{}' : true)); return b; },
      ilike: (c: string, v: string) => { preds.push((r) => String(r[c] || '').toLowerCase() === v.replace(/\\(.)/g, '$1').toLowerCase()); return b; },
      order: () => b,
      limit: (n: number) => { limit = n; return b; },
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      then: (res: (v: unknown) => unknown) => res({ data: run(), error: null }),
    };
    return b;
  };
  return { sb: { from } as never, tables };
}
const member = (o: Row = {}): Row => ({ id: 'm1', email: 'Member@Example.com', cid: null, status: 'active', tier: 'concierge', created_at: '2026-01-01T00:00:00Z', current_period_end: d(10), cancel_at_period_end: false, stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', updated_at: '2026-10-01T00:00:00Z', lapsed_at: null, ...o });
const CID = 'browser-cid-' + 'c'.repeat(30);

async function main() {
  // ── sessions ───────────────────────────────────────────────────────────────
  {
    const db = fakeDb({ concierge_members: [member()] });
    const tok = await createSession(db.sb, 'm1', 'Mozilla/5.0 ' + 'x'.repeat(300), NOW);
    ok('a session token is issued', typeof tok === 'string' && /^[A-Za-z0-9_-]{43}$/.test(tok!));
    const stored = db.tables.member_sessions[0];
    ok('only the hash is stored, never the cookie value', stored.token_hash === hashRestoreToken(tok!) && !JSON.stringify(stored).includes(tok!));
    ok('user agent clipped, last sign-in stamped', String(stored.user_agent).length === 160 && db.tables.concierge_members[0].last_login_at === NOW.toISOString());

    const r = await resolveSession(db.sb, tok!, NOW);
    eq('cookie value resolves to its member', r?.member.id, 'm1');
    ok('garbage / missing cookie → signed out', (await resolveSession(db.sb, 'nope', NOW)) === null && (await resolveSession(db.sb, undefined, NOW)) === null);
    ok('a well-formed but unknown token → signed out', (await resolveSession(db.sb, 'A'.repeat(43), NOW)) === null);
    ok('an expired session → signed out', (await resolveSession(db.sb, tok!, new Date(NOW.getTime() + 31 * 86400000))) === null);

    // sliding expiry only after an hour
    const before = String(stored.expires_at);
    await resolveSession(db.sb, tok!, new Date(NOW.getTime() + 10 * 60000));
    ok('seen again within the hour → not rewritten', stored.expires_at === before);
    await resolveSession(db.sb, tok!, new Date(NOW.getTime() + 2 * 3600000));
    ok('seen again later → expiry slides forward', String(stored.expires_at) > before);

    await endSession(db.sb, tok!);
    ok('sign out ends that session', (await resolveSession(db.sb, tok!, NOW)) === null && db.tables.member_sessions.length === 0);
    const a = await createSession(db.sb, 'm1', null, NOW), b = await createSession(db.sb, 'm1', null, NOW);
    await endAllSessions(db.sb, 'm1');
    ok('sign out everywhere ends all of them', (await resolveSession(db.sb, a!, NOW)) === null && (await resolveSession(db.sb, b!, NOW)) === null);
    const gone = fakeDb({ concierge_members: [] });
    ok('a session whose member no longer exists is useless', (await resolveSession(gone.sb, 'A'.repeat(43), NOW)) === null);
  }
  {
    const o = cookieOptions(true);
    eq('cookie is HttpOnly, Secure, SameSite=Lax, site-wide, 30 days', [o.httpOnly, o.secure, o.sameSite, o.path, o.maxAge], [true, true, 'lax', '/', 30 * 86400]);
    eq('cookie name', SESSION_COOKIE, 'cl_member');
    const req = (origin?: string) => new Request('https://cypruslifestyle.eu/api/account/logout', { method: 'POST', headers: origin ? { origin } : {} });
    ok('same-origin POST accepted', sameOrigin(req('https://cypruslifestyle.eu'), 'https://cypruslifestyle.eu'));
    ok('request without Origin accepted (non-browser)', sameOrigin(req(), 'https://cypruslifestyle.eu'));
    ok('foreign Origin refused', !sameOrigin(req('https://evil.example'), 'https://cypruslifestyle.eu'));
    ok('malformed Origin refused', !sameOrigin(req('not a url'), 'https://cypruslifestyle.eu'));
  }

  // ── sign-in links (ended members too) ──────────────────────────────────────
  {
    for (const status of ['active', 'failed', 'canceled']) {
      const db = fakeDb({ concierge_members: [member({ status })] });
      const r = await issueLoginToken(db.sb, 'member@example.com', NOW);
      ok(`a ${status} member gets a sign-in link`, r.ok && db.tables.membership_restore_tokens.length === 1);
    }
    const none = fakeDb({ concierge_members: [member({ status: 'pending' })] });
    const r0 = await issueLoginToken(none.sb, 'member@example.com', NOW);
    ok('an unknown / never-activated address gets nothing, and nothing is written', !r0.ok && r0.reason === 'no_member' && none.tables.membership_restore_tokens.length === 0);
    const db = fakeDb({ concierge_members: [member()] });
    const t = await issueLoginToken(db.sb, 'member@example.com', NOW);
    await issueLoginToken(db.sb, 'member@example.com', NOW); await issueLoginToken(db.sb, 'member@example.com', NOW);
    const thr = await issueLoginToken(db.sb, 'member@example.com', NOW);
    ok('at most 3 links per member per hour', t.ok && !thr.ok && thr.reason === 'throttled');
  }
  {
    // an entitled member: the browser is bound to the membership
    const db = fakeDb({ concierge_members: [member(), member({ id: 'm2', email: 'other@example.com', cid: CID })] });
    const t = await issueLoginToken(db.sb, 'member@example.com', NOW);
    const r = await confirmLogin(db.sb, t.ok ? t.token : '', CID, NOW);
    eq('signed in and entitled', r, { outcome: 'signed_in', memberId: 'm1', entitled: true });
    eq('this browser now belongs to m1 and was released from m2', [db.tables.concierge_members[0].cid, db.tables.concierge_members[1].cid], [CID, null]);
    eq('the link works once', (await confirmLogin(db.sb, t.ok ? t.token : '', CID, NOW)).outcome, 'expired');
  }
  {
    // an ended member: signs in, but the browser is NOT bound and benefits stay off
    const db = fakeDb({ concierge_members: [member({ status: 'canceled' })] });
    const t = await issueLoginToken(db.sb, 'member@example.com', NOW);
    const r = await confirmLogin(db.sb, t.ok ? t.token : '', CID, NOW);
    eq('ended member: signed in, not entitled', r, { outcome: 'signed_in', memberId: 'm1', entitled: false });
    eq('…and no browser is bound to the ended membership', db.tables.concierge_members[0].cid, null);
    eq('bad / unknown / expired tokens', [(await confirmLogin(db.sb, 'x', CID, NOW)).outcome, (await confirmLogin(db.sb, 'B'.repeat(43), CID, NOW)).outcome], ['invalid', 'invalid']);
    const t2 = await issueLoginToken(db.sb, 'member@example.com', NOW);
    eq('a link older than 30 minutes is expired', (await confirmLogin(db.sb, t2.ok ? t2.token : '', CID, new Date(NOW.getTime() + 31 * 60000))).outcome, 'expired');
    const noCid = fakeDb({ concierge_members: [member()] });
    const t3 = await issueLoginToken(noCid.sb, 'member@example.com', NOW);
    eq('a browser without a usable id still signs in (no binding)', [(await confirmLogin(noCid.sb, t3.ok ? t3.token : '', 'short', NOW)).outcome, noCid.tables.concierge_members[0].cid], ['signed_in', null]);
  }

  // ── the daily lapse check ──────────────────────────────────────────────────
  {
    const row = (o: Row = {}) => member({ current_period_end: d(-5), ...o }) as never;
    eq('Stripe says canceled → we cancel and start the retention clock', planUpdate(row(), { found: true, status: 'canceled', subscription: {} }, NOW.toISOString()), { status: 'canceled', lapsed_at: NOW.toISOString(), updated_at: NOW.toISOString() });
    eq('Stripe has no such subscription → canceled', (planUpdate(row(), { found: false, reason: 'missing' }, 'T') as Row).status, 'canceled');
    eq('Stripe unreachable → nothing changes', planUpdate(row(), { found: false, reason: 'error', message: 'x' }, 'T'), null);
    const renewed = planUpdate(row(), { found: true, status: 'active', subscription: { current_period_end: Math.floor(Date.parse(d(25)) / 1000), cancel_at_period_end: false } }, 'T') as Row;
    eq('Stripe says it renewed → only the dates move', [renewed.status, renewed.current_period_end], [undefined, d(25).replace('.000Z', '.000Z')]);
    eq('payment problem recorded', (planUpdate(row(), { found: true, status: 'past_due', subscription: { current_period_end: Math.floor(Date.parse(d(-5)) / 1000) } }, 'T') as Row).status, 'failed');
    eq('already in line → no write', planUpdate(row({ cancel_at_period_end: false, current_period_end: d(25) }), { found: true, status: 'active', subscription: { current_period_end: Math.floor(Date.parse(d(25)) / 1000), cancel_at_period_end: false } }, 'T'), null);
  }
  {
    const db = fakeDb({
      concierge_members: [
        member({ id: 'stale-canceled-in-stripe', current_period_end: d(-5) }),
        member({ id: 'fresh', current_period_end: d(5), stripe_subscription_id: 'sub_fresh' }),
        member({ id: 'comp', stripe_subscription_id: null, current_period_end: null }),
        member({ id: 'ended-no-stamp', status: 'canceled', lapsed_at: null, profile: { interests: ['wine'] } }),
        member({ id: 'ended-long-ago', status: 'canceled', lapsed_at: d(-PROFILE_RETENTION_DAYS - 5), profile: { interests: ['golf'] } }),
        member({ id: 'unreachable', current_period_end: d(-9), stripe_subscription_id: 'sub_down' }),
      ],
      member_sessions: [{ id: 's1', expires_at: d(-1), member_id: 'comp' }, { id: 's2', expires_at: d(10), member_id: 'comp' }],
    });
    const asked: string[] = [];
    const sum = await reconcileMembers(db.sb, NOW, async (id) => { asked.push(id); return id === 'sub_down' ? { found: false, reason: 'error', message: 'down' } : { found: true, status: 'canceled', subscription: {} }; });
    const by = (id: string) => db.tables.concierge_members.find((m) => m.id === id)!;
    eq('only stale paid rows were checked with Stripe', asked.sort(), ['sub_1', 'sub_down']);
    eq('the cancelled-in-Stripe member lost the benefits', [by('stale-canceled-in-stripe').status, by('fresh').status, by('comp').status], ['canceled', 'active', 'active']);
    eq('an unreachable Stripe changes nothing (retried tomorrow)', by('unreachable').status, 'active');
    ok('every ended membership has its retention clock started', by('ended-no-stamp').lapsed_at === NOW.toISOString());
    eq('the profile of the long-lapsed member is erased; a recent one is kept', [by('ended-long-ago').profile, (by('ended-no-stamp').profile as Row).interests], [{}, ['wine']]);
    eq('expired sessions deleted, live ones kept', db.tables.member_sessions.map((s) => s.id), ['s2']);
    eq('summary', [sum.checked, sum.changed, sum.errors], [2, 1, 1]);
  }
}

main().then(() => report('member.accounts'));
