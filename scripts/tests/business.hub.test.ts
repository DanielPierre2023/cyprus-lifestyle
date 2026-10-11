// Business Hub (increment 4.1): validation, submission lifecycle, sign-in links and sessions, tenant scoping, desk decisions.
import {
  validateSubmission, canTransition, isEditable, normalizeDeskAction, noteRequired, cleanNote, appliesToListing, rollUp, normEmail, isLeadStatus,
  MAX_OPEN_PER_LISTING, LOGIN_MAX_PER_HOUR, SESSION_TTL_DAYS,
} from '@/lib/business/rules';
import {
  requestBusinessLogin, confirmBusinessLogin, createBusinessSession, resolveBusinessSession, endBusinessSession, endAllBusinessSessions, cookieOptions, SESSION_COOKIE,
} from '@/lib/business/auth';
import {
  managedListings, listLeads, setLeadStatus, listingStats, createSubmission, reviseSubmission, withdrawSubmission, listQueue, decideSubmission,
} from '@/lib/business/data';
import { businessLoginCopy, businessLoginUrl } from '@/lib/business/loginEmail';
import { hashRestoreToken } from '@/lib/concierge/restoreToken';
import { LOCALES } from '@/lib/locales';
import { eq, ok, report } from './_harness';

const NOW = new Date('2026-10-20T12:00:00Z');
const at = (min: number) => new Date(NOW.getTime() + min * 60000);

// ── a tiny in-memory PostgREST (adds insert-returning and unique violations) ─────────────
type Row = Record<string, unknown>;
const UNIQUE: Record<string, string[][]> = {
  business_accounts: [['email']], business_listings: [['account_id', 'listing_slug']], business_login_tokens: [['token_hash']], business_sessions: [['token_hash']],
};
function fakeDb(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = {
    directory_listings: [], directory_leads: [], directory_reviews: [], cta_by_listing: [], listing_attribution: [],
    business_accounts: [], business_listings: [], business_login_tokens: [], business_sessions: [], business_submissions: [], ...seed,
  };
  let idc = 0;
  const from = (name: string) => {
    const rows = tables[name];
    if (!rows) throw new Error('no table ' + name);
    const preds: ((r: Row) => boolean)[] = [];
    let mode: 'select' | 'update' | 'insert' | 'delete' = 'select';
    let patch: Row = {}; let limit = Infinity; let ins: Row | null = null;
    const run = (): { data: Row[]; error: { code: string; message: string } | null } => {
      if (mode === 'insert') {
        for (const cols of UNIQUE[name] || []) if (rows.some((r) => cols.every((c) => r[c] === ins![c]))) return { data: [], error: { code: '23505', message: 'duplicate' } };
        const row = { id: `${name}-${++idc}`, created_at: NOW.toISOString(), used_at: null, last_seen_at: NOW.toISOString(), status: name === 'business_submissions' ? 'submitted' : 'active', ...ins! };
        rows.push(row); return { data: [row], error: null };
      }
      const hit = rows.filter((r) => preds.every((p) => p(r)));
      if (mode === 'update') for (const r of hit) Object.assign(r, patch);
      if (mode === 'delete') for (const r of hit) rows.splice(rows.indexOf(r), 1);
      return { data: hit.slice(0, limit), error: null };
    };
    const b: Record<string, unknown> = {
      select: () => b,
      update: (p: Row) => { mode = 'update'; patch = p; return b; },
      insert: (r: Row) => { mode = 'insert'; ins = r; return b; },
      delete: () => { mode = 'delete'; return b; },
      eq: (c: string, v: unknown) => { preds.push((r) => r[c] === v); return b; },
      is: (c: string, v: unknown) => { preds.push((r) => (r[c] ?? null) === v); return b; },
      in: (c: string, vs: unknown[]) => { preds.push((r) => vs.includes(r[c])); return b; },
      gt: (c: string, v: string) => { preds.push((r) => String(r[c]) > v); return b; },
      gte: (c: string, v: string) => { preds.push((r) => String(r[c]) >= v); return b; },
      ilike: (c: string, v: string) => { preds.push((r) => String(r[c] || '').toLowerCase() === v.replace(/\\(.)/g, '$1').toLowerCase()); return b; },
      order: () => b,
      limit: (n: number) => { limit = n; return b; },
      maybeSingle: async () => { const x = run(); return { data: x.data[0] ?? null, error: x.error }; },
      then: (res: (v: unknown) => unknown) => res(run()),
    };
    return b;
  };
  return { sb: { from } as never, tables };
}

const listing = (slug: string, o: Row = {}): Row => ({ slug, name_en: slug.toUpperCase(), type: 'restaurant', district: 'Limassol', status: 'published', provenance: 'owner-verified', claim_contact: 'owner@biz.example', summary_en: 'old', owned_photos: [], ...o });
const TOK = /^[A-Za-z0-9_-]{43}$/;

async function main() {
  // ── pure rules ────────────────────────────────────────────────────────────
  {
    const long = 'x'.repeat(30);
    ok('description: accepted and trimmed', (() => { const v = validateSubmission('description', { text: `  ${long}  ` }); return v.ok && (v.payload as { text: string }).text === long; })());
    eq('description: too short', validateSubmission('description', { text: 'short' }), { ok: false, error: 'empty' });
    eq('description: too long', validateSubmission('description', { text: 'y'.repeat(4001) }), { ok: false, error: 'too_long' });
    eq('unknown kind', validateSubmission('banner', {}), { ok: false, error: 'kind' });
    eq('garbage payload', validateSubmission('news', 'oops'), { ok: false, error: 'title' });
    eq('photos need the rights declaration', validateSubmission('photos', { urls: ['https://a.example/1.jpg'] }), { ok: false, error: 'rights' });
    eq('photos: javascript: URL refused', validateSubmission('photos', { urls: 'javascript:alert(1)', rights: true }), { ok: false, error: 'invalid_url' });
    eq('photos: one bad link spoils the batch', validateSubmission('photos', { urls: ['https://a.example/1.jpg', 'nope'], rights: true }), { ok: false, error: 'invalid_url' });
    eq('photos: empty', validateSubmission('photos', { urls: '  \n ', rights: true }), { ok: false, error: 'empty' });
    eq('photos: more than 12', validateSubmission('photos', { urls: Array.from({ length: 13 }, (_, i) => `https://a.example/${i}.jpg`), rights: true }), { ok: false, error: 'too_long' });
    eq('photos: newline list, de-duplicated', validateSubmission('photos', { urls: 'https://a.example/1.jpg\nhttps://a.example/1.jpg\nhttps://b.example/2.jpg', rights: true }),
      { ok: true, payload: { urls: ['https://a.example/1.jpg', 'https://b.example/2.jpg'], rights: true } });
    eq('news: title + body', validateSubmission('news', { title: ' New  menu ', body: 'Autumn tasting menu.' }), { ok: true, payload: { title: 'New menu', body: 'Autumn tasting menu.' } });
    eq('news: bad link refused', validateSubmission('news', { title: 'T', body: 'B', url: 'ftp://x' }), { ok: false, error: 'invalid_url' });
    ok('news: good link kept', (() => { const v = validateSubmission('news', { title: 'T', body: 'B', url: 'https://x.example/p' }); return v.ok && (v.payload as { url: string }).url === 'https://x.example/p'; })());
    eq('news: over-long title', validateSubmission('news', { title: 't'.repeat(141), body: 'b' }), { ok: false, error: 'too_long' });

    ok('desk may approve/reject/ask for changes only from submitted', ['approved', 'rejected', 'changes_requested'].every((to) => canTransition('submitted', to, 'desk')) && !canTransition('approved', 'rejected', 'desk') && !canTransition('withdrawn', 'approved', 'desk') && !canTransition('changes_requested', 'approved', 'desk'));
    ok('business may withdraw, and resubmit only after changes were requested', canTransition('submitted', 'withdrawn', 'business') && canTransition('changes_requested', 'submitted', 'business') && !canTransition('submitted', 'approved', 'business') && !canTransition('approved', 'submitted', 'business') && !canTransition('rejected', 'submitted', 'business'));
    ok('only changes_requested is editable', isEditable('changes_requested') && !isEditable('submitted') && !isEditable('approved'));
    eq('desk actions', [normalizeDeskAction('approve'), normalizeDeskAction('request_changes'), normalizeDeskAction('x'), noteRequired('approve'), noteRequired('reject'), noteRequired('request_changes')], ['approve', 'request_changes', null, false, true, true]);
    eq('notes collapse whitespace and are capped', [cleanNote('  a \n b '), cleanNote('z'.repeat(600)).length], ['a b', 500]);
    ok('only description/photos touch a listing', appliesToListing('description') && appliesToListing('photos') && !appliesToListing('news'));
    ok('lead statuses', ['new', 'seen', 'replied', 'closed'].every(isLeadStatus) && !isLeadStatus('deleted') && !isLeadStatus(undefined));
    eq('e-mail normalisation', [normEmail('  A@B.Example '), normEmail('nope'), normEmail(5)], ['a@b.example', '', '']);
  }
  {
    const leads = [
      { listing_slug: 'a', status: 'new', created_at: at(-60).toISOString() },
      { listing_slug: 'a', status: 'replied', created_at: new Date(NOW.getTime() - 40 * 86400000).toISOString() },
      { listing_slug: 'b', status: 'new', created_at: at(-5).toISOString() },
    ];
    const cta = [{ slug: 'a', cta: 'phone', clicks: '3' }, { slug: 'a', cta: 'website', clicks: 7 }, { slug: 'b', cta: 'email', clicks: 1 }];
    const attr = [{ slug: 'a', impressions: 12, clicks: '4' }];
    const rev = [{ listing_slug: 'a', rating: 5 }, { listing_slug: 'a', rating: 4 }, { listing_slug: 'a', rating: 9 }, { listing_slug: 'a', rating: null }];
    const [A, B, C] = rollUp(['a', 'b', 'c'], leads, cta, attr, rev, NOW);
    eq('enquiry counters', A.enquiries, { total: 2, last30d: 1, new: 1 });
    eq('CTA clicks sorted, numeric strings coerced', [A.cta, A.ctaTotal], [[{ label: 'website', clicks: 7 }, { label: 'phone', clicks: 3 }], 10]);
    eq('recommendations from listing_attribution', [A.recommended, A.recommendedClicks], [12, 4]);
    eq('reviews: out-of-range and null ratings ignored', A.reviews, { count: 2, average: 4.5 });
    eq('other listings are not mixed in', [B.enquiries.total, B.ctaTotal, B.recommended, B.reviews], [1, 1, 0, { count: 0, average: null }]);
    eq('a listing with no data is all zeros', [C.enquiries, C.cta, C.recommended], [{ total: 0, last30d: 0, new: 0 }, [], 0]);
  }

  // ── sign-in links ─────────────────────────────────────────────────────────
  {
    const db = fakeDb({ directory_listings: [listing('a'), listing('x', { provenance: 'reference', claim_contact: 'ref@biz.example' })] });
    const r0 = await requestBusinessLogin(db.sb, 'nobody@biz.example', 'en', NOW);
    ok('unknown address: nothing written', !r0.ok && r0.reason === 'not_eligible' && db.tables.business_accounts.length === 0 && db.tables.business_login_tokens.length === 0);
    const r1 = await requestBusinessLogin(db.sb, 'ref@biz.example', 'en', NOW);
    ok('contact of a NON-verified listing gets nothing', !r1.ok && db.tables.business_accounts.length === 0);
    const r2 = await requestBusinessLogin(db.sb, 'not-an-email', 'en', NOW);
    ok('malformed address gets nothing', !r2.ok);
    const r = await requestBusinessLogin(db.sb, '  Owner@Biz.example ', 'de', NOW);
    ok('verified claim contact gets a link and an account (lower-cased)', r.ok && TOK.test(r.token) && db.tables.business_accounts.length === 1 && db.tables.business_accounts[0].email === 'owner@biz.example');
    ok('only the hash of the link is stored', r.ok && db.tables.business_login_tokens[0].token_hash === hashRestoreToken(r.token) && !JSON.stringify(db.tables.business_login_tokens).includes(r.token));
    ok('link lives 30 minutes', Date.parse(String(db.tables.business_login_tokens[0].expires_at)) - NOW.getTime() === 30 * 60000);
    const r3 = await requestBusinessLogin(db.sb, 'owner@biz.example', 'en', at(1));
    ok('a new link voids the previous one', r3.ok && db.tables.business_login_tokens.filter((t) => t.used_at === null).length === 1 && db.tables.business_accounts.length === 1);
    for (let i = 0; i < LOGIN_MAX_PER_HOUR; i++) await requestBusinessLogin(db.sb, 'owner@biz.example', 'en', at(2 + i));
    const thr = await requestBusinessLogin(db.sb, 'owner@biz.example', 'en', at(10));
    ok('at most 3 links per hour', !thr.ok && thr.reason === 'throttled');
    const later = await requestBusinessLogin(db.sb, 'owner@biz.example', 'en', at(75));
    ok('…and again after the hour', later.ok);
  }
  {
    const db = fakeDb({ directory_listings: [listing('a'), listing('b'), listing('c', { claim_contact: 'someone@else.example' })] });
    const r = await requestBusinessLogin(db.sb, 'owner@biz.example', 'en', NOW);
    if (!r.ok) throw new Error('setup');
    ok('garbage token → invalid', (await confirmBusinessLogin(db.sb, 'nope', NOW)).outcome === 'invalid' && (await confirmBusinessLogin(db.sb, 'A'.repeat(43), NOW)).outcome === 'invalid');
    eq('expired link is reported as expired and signs nobody in', (await confirmBusinessLogin(db.sb, r.token, at(31))).outcome, 'expired');
    const ok1 = await confirmBusinessLogin(db.sb, r.token, at(5));
    ok('…even though it was refused above, the link is still valid in time', ok1.outcome === 'signed_in');
    eq('the link works exactly once', (await confirmBusinessLogin(db.sb, r.token, at(6))).outcome, 'expired');
    eq('listings the address verifiably owns are linked, others are not', db.tables.business_listings.map((l) => l.listing_slug).sort(), ['a', 'b']);
    await confirmBusinessLogin(db.sb, (await requestBusinessLogin(db.sb, 'owner@biz.example', 'en', at(70)) as { token: string }).token, at(71));
    eq('confirming again does not duplicate links', db.tables.business_listings.length, 2);
    // a disabled account is locked out
    db.tables.business_accounts[0].status = 'disabled';
    const d = await requestBusinessLogin(db.sb, 'owner@biz.example', 'en', at(200));
    ok('disabled account gets no link', !d.ok && d.reason === 'disabled');
  }
  {
    // the verified contact changed after a link was issued → sign-in fails closed
    const db = fakeDb({ directory_listings: [listing('a')] });
    const r = await requestBusinessLogin(db.sb, 'owner@biz.example', 'en', NOW) as { token: string };
    db.tables.directory_listings[0].claim_contact = 'new@biz.example';
    eq('link for an address that no longer owns anything signs nobody in', (await confirmBusinessLogin(db.sb, r.token, at(1))).outcome, 'invalid');
  }

  // ── sessions ──────────────────────────────────────────────────────────────
  {
    const db = fakeDb({ directory_listings: [listing('a')], business_accounts: [{ id: 'acc1', email: 'owner@biz.example', status: 'active', name: null, locale: null }] });
    const tok = await createBusinessSession(db.sb, 'acc1', 'UA/' + 'x'.repeat(300), 'ru', NOW);
    ok('token issued, only the hash stored, UA clipped', TOK.test(tok!) && db.tables.business_sessions[0].token_hash === hashRestoreToken(tok!) && !JSON.stringify(db.tables.business_sessions).includes(tok!) && String(db.tables.business_sessions[0].user_agent).length === 160);
    ok('last sign-in and locale stamped', db.tables.business_accounts[0].last_login_at === NOW.toISOString() && db.tables.business_accounts[0].locale === 'ru');
    eq('cookie resolves to the account', (await resolveBusinessSession(db.sb, tok!, NOW))?.account.id, 'acc1');
    ok('missing / garbage / unknown cookie → signed out', (await resolveBusinessSession(db.sb, undefined, NOW)) === null && (await resolveBusinessSession(db.sb, 'x', NOW)) === null && (await resolveBusinessSession(db.sb, 'A'.repeat(43), NOW)) === null);
    ok('expires after the TTL', (await resolveBusinessSession(db.sb, tok!, new Date(NOW.getTime() + (SESSION_TTL_DAYS + 1) * 86400000))) === null);
    const before = String(db.tables.business_sessions[0].expires_at);
    await resolveBusinessSession(db.sb, tok!, at(10));
    ok('sliding expiry only after an hour', db.tables.business_sessions[0].expires_at === before);
    await resolveBusinessSession(db.sb, tok!, at(120));
    ok('…then it slides', String(db.tables.business_sessions[0].expires_at) > before);
    db.tables.business_accounts[0].status = 'disabled';
    ok('disabling the account kills its sessions at once', (await resolveBusinessSession(db.sb, tok!, NOW)) === null);
    db.tables.business_accounts[0].status = 'active';
    await endBusinessSession(db.sb, tok!);
    ok('sign out', db.tables.business_sessions.length === 0);
    const a = await createBusinessSession(db.sb, 'acc1', null, null, NOW), b = await createBusinessSession(db.sb, 'acc1', null, null, NOW);
    await endAllBusinessSessions(db.sb, 'acc1');
    ok('sign out everywhere', (await resolveBusinessSession(db.sb, a!, NOW)) === null && (await resolveBusinessSession(db.sb, b!, NOW)) === null);
    const o = cookieOptions(true);
    eq('cookie: HttpOnly, Secure, SameSite=Lax, site-wide, 14 days', [o.httpOnly, o.secure, o.sameSite, o.path, o.maxAge, SESSION_COOKIE], [true, true, 'lax', '/', 14 * 86400, 'cl_business']);
  }

  // ── tenant scoping, leads, analytics ────────────────────────────────────────
  const A = { id: 'acc1', email: 'owner@biz.example' }, Z = { id: 'acc2', email: 'other@biz.example' };
  const world = () => fakeDb({
    directory_listings: [listing('a'), listing('b', { claim_contact: 'other@biz.example' }), listing('c', { provenance: 'reference' }), listing('d', { claim_contact: 'OWNER@biz.example' })],
    business_accounts: [{ id: 'acc1', email: 'owner@biz.example', status: 'active' }, { id: 'acc2', email: 'other@biz.example', status: 'active' }],
    business_listings: [
      { account_id: 'acc1', listing_slug: 'a' }, { account_id: 'acc1', listing_slug: 'b' }, { account_id: 'acc1', listing_slug: 'c' }, { account_id: 'acc1', listing_slug: 'd' }, { account_id: 'acc2', listing_slug: 'b' },
    ],
    directory_leads: [
      { id: 'l1', listing_slug: 'a', listing_name: 'A', name: 'N1', email: 'n1@x.example', message: 'hi', status: 'new', created_at: at(-10).toISOString() },
      { id: 'l2', listing_slug: 'b', listing_name: 'B', name: 'N2', email: 'n2@x.example', message: 'yo', status: 'new', created_at: at(-10).toISOString() },
    ],
  });
  {
    const db = world();
    eq('a business sees only listings it still verifiably owns (link + verified + same address, case-insensitive)', (await managedListings(db.sb, A)).map((l) => l.slug), ['a', 'd']);
    eq('the other business', (await managedListings(db.sb, Z)).map((l) => l.slug), ['b']);
    eq('no links → nothing', (await managedListings(db.sb, { id: 'nobody', email: 'n@x.example' })), []);
    db.tables.directory_listings[0].claim_contact = 'sold@biz.example';
    eq('ownership change takes effect at once', (await managedListings(db.sb, A)).map((l) => l.slug), ['d']);
    db.tables.directory_listings[0].claim_contact = 'owner@biz.example';

    eq('leads inbox is scoped to the given slugs', (await listLeads(db.sb, ['a'])).map((l) => l.id), ['l1']);
    eq('no slugs → no leads', await listLeads(db.sb, []), []);
    ok('status change on own lead', await setLeadStatus(db.sb, ['a'], 'l1', 'replied') && db.tables.directory_leads[0].status === 'replied');
    ok('cannot touch another business’s lead', !(await setLeadStatus(db.sb, ['a'], 'l2', 'closed')) && db.tables.directory_leads[1].status === 'new');
    ok('invalid status / id refused', !(await setLeadStatus(db.sb, ['a'], 'l1', 'deleted')) && !(await setLeadStatus(db.sb, ['a'], 5, 'new')) && !(await setLeadStatus(db.sb, [], 'l1', 'new')));
    const st = await listingStats(db.sb, ['a'], NOW);
    eq('stats come from the existing tables', [st[0].slug, st[0].enquiries.total], ['a', 1]);
  }

  // ── submissions (business side) ─────────────────────────────────────────────
  {
    const db = world();
    const good = { listingSlug: 'a', kind: 'description', payload: { text: 'A lovely new description of the place.' } };
    const r = await createSubmission(db.sb, A, good, NOW);
    ok('own listing: accepted, queued as submitted, nothing written to the listing', r.ok && db.tables.business_submissions[0].status === 'submitted' && db.tables.directory_listings[0].summary_en === 'old');
    eq('someone else’s listing → forbidden', (await createSubmission(db.sb, A, { ...good, listingSlug: 'b' }, NOW)), { ok: false, error: 'forbidden' });
    eq('a listing that is not verified → forbidden', (await createSubmission(db.sb, A, { ...good, listingSlug: 'c' }, NOW)), { ok: false, error: 'forbidden' });
    eq('unknown slug / missing slug → forbidden', [(await createSubmission(db.sb, A, { ...good, listingSlug: 'zzz' }, NOW)).ok, (await createSubmission(db.sb, A, { ...good, listingSlug: undefined }, NOW)).ok], [false, false]);
    const bad = await createSubmission(db.sb, A, { listingSlug: 'a', kind: 'description', payload: { text: 'x' } }, NOW);
    ok('invalid payload → invalid', !bad.ok && bad.error === 'invalid');
    for (let i = 1; i < MAX_OPEN_PER_LISTING; i++) await createSubmission(db.sb, A, good, NOW);
    const lim = await createSubmission(db.sb, A, good, NOW);
    ok(`at most ${MAX_OPEN_PER_LISTING} open proposals per listing`, !lim.ok && lim.error === 'limit');
    const other = await createSubmission(db.sb, A, { ...good, listingSlug: 'd' }, NOW);
    ok('…per listing, not per account', other.ok);
    const id = db.tables.business_submissions[0].id as string;
    ok('withdraw own open proposal', await withdrawSubmission(db.sb, 'acc1', id, NOW) && db.tables.business_submissions[0].status === 'withdrawn');
    ok('…a second time does nothing', !(await withdrawSubmission(db.sb, 'acc1', id, NOW)));
    const id2 = db.tables.business_submissions[1].id as string;
    ok('cannot withdraw another account’s proposal', !(await withdrawSubmission(db.sb, 'acc2', id2, NOW)) && db.tables.business_submissions[1].status === 'submitted');
    // revise
    eq('cannot revise a proposal that is not awaiting changes', (await reviseSubmission(db.sb, A, id2, { text: 'z'.repeat(30) }, NOW)), { ok: false, error: 'forbidden' });
    db.tables.business_submissions[1].status = 'changes_requested';
    eq('cannot revise someone else’s', (await reviseSubmission(db.sb, Z, id2, { text: 'z'.repeat(30) }, NOW)), { ok: false, error: 'forbidden' });
    const bad2 = await reviseSubmission(db.sb, A, id2, { text: 'short' }, NOW);
    ok('revision is validated', !bad2.ok && bad2.error === 'invalid' && db.tables.business_submissions[1].status === 'changes_requested');
    ok('revise → back in the queue with the new text', (await reviseSubmission(db.sb, A, id2, { text: 'z'.repeat(30) }, NOW)).ok && db.tables.business_submissions[1].status === 'submitted' && (db.tables.business_submissions[1].payload as { text: string }).text === 'z'.repeat(30));
  }

  // ── desk decisions ──────────────────────────────────────────────────────────
  {
    const db = world();
    const mk = async (listingSlug: string, kind: string, payload: unknown) => { await createSubmission(db.sb, A, { listingSlug, kind, payload }, NOW); return db.tables.business_submissions[db.tables.business_submissions.length - 1].id as string; };
    const d1 = await mk('a', 'description', { text: 'Fresh description of the restaurant, written by the owner.' });
    const p1 = await mk('a', 'photos', { urls: ['https://a.example/1.jpg', 'https://a.example/2.jpg'], rights: true });
    const n1 = await mk('a', 'news', { title: 'New terrace', body: 'We opened a terrace.' });
    const L = () => db.tables.directory_listings[0];

    const q = await listQueue(db.sb, ['submitted']);
    eq('queue lists proposals with author and live values', [q.length, q[0].account_email, q[0].listing_name, q[0].current_description, q[0].owner_still_verified], [3, 'owner@biz.example', 'A', 'old', true]);

    eq('rejecting needs a note', await decideSubmission(db.sb, n1, 'reject', '  ', 'ed@cl.example', { textStatusColumn: true }, NOW), { ok: false, error: 'Please write a short note: the business sees it.' });
    eq('unknown id', (await decideSubmission(db.sb, 'nope', 'approve', '', null, { textStatusColumn: true }, NOW)).ok, false);

    const a1 = await decideSubmission(db.sb, d1, 'approve', '', 'ed@cl.example', { textStatusColumn: true }, NOW);
    ok('approving a description writes it to the listing and marks it owned', a1.ok && a1.applied === 'description' && L().summary_en === 'Fresh description of the restaurant, written by the owner.' && L().text_status === 'owned');
    const s1 = db.tables.business_submissions.find((s) => s.id === d1)!;
    ok('proposal closed with reviewer and timestamps', s1.status === 'approved' && s1.reviewed_by === 'ed@cl.example' && s1.applied_at === NOW.toISOString());
    eq('a decided proposal cannot be decided again', (await decideSubmission(db.sb, d1, 'reject', 'oops', null, { textStatusColumn: true }, NOW)).ok, false);

    const a2 = await decideSubmission(db.sb, p1, 'approve', '', 'ed@cl.example', { textStatusColumn: false }, NOW);
    ok('approving photos replaces owned_photos', a2.ok && a2.applied === 'photos' && eqJson(L().owned_photos, ['https://a.example/1.jpg', 'https://a.example/2.jpg']));

    const a3 = await decideSubmission(db.sb, n1, 'approve', 'We will call you.', 'ed@cl.example', { textStatusColumn: true }, NOW);
    ok('approving news publishes nothing', a3.ok && a3.applied === null && L().summary_en !== 'We opened a terrace.' && !JSON.stringify(L()).includes('terrace'));

    const d2 = await mk('a', 'description', { text: 'Another description that is long enough.' });
    const c = await decideSubmission(db.sb, d2, 'request_changes', 'Please mention opening hours.', 'ed@cl.example', { textStatusColumn: true }, NOW);
    const s2 = db.tables.business_submissions.find((s) => s.id === d2)!;
    ok('request changes: status + note, listing untouched', c.ok && s2.status === 'changes_requested' && s2.desk_note === 'Please mention opening hours.' && L().summary_en !== 'Another description that is long enough.');
    eq('desk cannot approve a proposal that is waiting for the business', (await decideSubmission(db.sb, d2, 'approve', '', null, { textStatusColumn: true }, NOW)).ok, false);

    // stale / revoked
    const d3 = await mk('a', 'description', { text: 'Third description which is long enough.' });
    L().claim_contact = 'sold@biz.example';
    const lost = await decideSubmission(db.sb, d3, 'approve', '', null, { textStatusColumn: true }, NOW);
    ok('author no longer owns the listing → approval refused, listing untouched', !lost.ok && L().summary_en !== 'Third description which is long enough.' && db.tables.business_submissions.find((s) => s.id === d3)!.status === 'submitted');
    ok('…but it can be rejected', (await decideSubmission(db.sb, d3, 'reject', 'Ownership changed.', null, { textStatusColumn: true }, NOW)).ok);
    L().claim_contact = 'owner@biz.example';
    const d4 = await mk('a', 'description', { text: 'Fourth description which is long enough.' });
    await withdrawSubmission(db.sb, 'acc1', d4, NOW);
    eq('a withdrawn proposal cannot be approved', (await decideSubmission(db.sb, d4, 'approve', '', null, { textStatusColumn: true }, NOW)).ok, false);
    const d5 = await mk('a', 'description', { text: 'Fifth description which is long enough.' });
    db.tables.business_accounts[0].status = 'disabled';
    ok('a disabled account’s proposal cannot be applied', !(await decideSubmission(db.sb, d5, 'approve', '', null, { textStatusColumn: true }, NOW)).ok);
  }

  // ── the sign-in e-mail ──────────────────────────────────────────────────────
  {
    ok('every edition has a complete, distinct sign-in e-mail', LOCALES.every((l) => { const c = businessLoginCopy(l); return Object.values(c).every((v) => v.trim().length > 2); }) && new Set(LOCALES.map((l) => businessLoginCopy(l).subject)).size === LOCALES.length);
    eq('link: English unprefixed, others prefixed, token encoded', [businessLoginUrl('https://x.eu/', 'en', 'a_b-c'), businessLoginUrl('https://x.eu', 'el', 'a b')], ['https://x.eu/account/business?token=a_b-c', 'https://x.eu/el/account/business?token=a%20b']);
  }
  report('business hub');
}
const eqJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
main().catch((e) => { console.error(e); process.exit(1); });
