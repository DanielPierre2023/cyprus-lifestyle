// Email-verified membership restore (replaces the unverified email→cid link).
// Security properties locked down here: tokens are high-entropy and only hashed at rest;
// consumption is single-use and expiring; the membership binds to the cid of the
// CONFIRMING browser, never one supplied when the email was requested.
import {
  generateRestoreToken, hashRestoreToken, restoreExpiry, isPlausibleRestoreToken, normalizeEmail,
  isPlausibleEmail, escapeLike, RESTORE_TTL_MS,
} from '@/lib/concierge/restoreToken';
import { issueRestoreToken, confirmRestore } from '@/lib/concierge/membership';
import { isValidCid } from '@/lib/concierge/memory';
import { eq, ok, report } from './_harness';

// ── pure helpers ─────────────────────────────────────────────────────────────────
const t1 = generateRestoreToken(), t2 = generateRestoreToken();
ok('token is 43 base64url chars (32 bytes)', /^[A-Za-z0-9_-]{43}$/.test(t1));
ok('tokens differ', t1 !== t2);
ok('plausible token accepted', isPlausibleRestoreToken(t1));
ok('short token rejected', !isPlausibleRestoreToken('abc'));
ok('non-string rejected', !isPlausibleRestoreToken(undefined));
eq('hash is 64 hex', /^[0-9a-f]{64}$/.test(hashRestoreToken(t1)), true);
ok('hash is deterministic', hashRestoreToken(t1) === hashRestoreToken(t1));
ok('hash differs from token', hashRestoreToken(t1) !== t1);
const n = new Date('2026-10-04T12:00:00Z');
eq('expiry = now + 30min', restoreExpiry(n).getTime() - n.getTime(), RESTORE_TTL_MS);
eq('30 minutes', RESTORE_TTL_MS, 1800000);
eq('email normalised', normalizeEmail('  Foo@Bar.COM '), 'foo@bar.com');
ok('email shape', isPlausibleEmail('a@b.co') && !isPlausibleEmail('nope') && !isPlausibleEmail('%'));
eq('LIKE wildcards escaped', escapeLike('a_b%c\\'), 'a\\_b\\%c\\\\');
// cid is a bearer secret now: short/guessable ids are refused; what the client generates passes.
ok('uuid cid valid', isValidCid('3f2b8c1e-9a4d-4c55-8e0a-1b2c3d4e5f60'));
ok('48-hex cid valid', isValidCid('a'.repeat(48)));
ok('8-char cid now rejected', !isValidCid('abcd1234'));
ok('31-char cid rejected', !isValidCid('a'.repeat(31)));
ok('cid with slash rejected', !isValidCid('a'.repeat(31) + '/'));

// ── minimal in-memory fake of the PostgREST calls the flow uses ────────────────────
type Row = Record<string, unknown>;
function fakeDb(seed: { concierge_members: Row[]; membership_restore_tokens?: Row[] }) {
  const tables: Record<string, Row[]> = { concierge_members: seed.concierge_members, membership_restore_tokens: seed.membership_restore_tokens || [] };
  let idc = 0;
  const from = (name: string) => {
    const rows = tables[name];
    const preds: ((r: Row) => boolean)[] = [];
    let mode: 'select' | 'update' | 'insert' = 'select';
    let patch: Row = {}; let limit = Infinity;
    const run = () => {
      const hit = rows.filter((r) => preds.every((p) => p(r)));
      if (mode === 'update') { for (const r of hit) Object.assign(r, patch); }
      return hit.slice(0, limit);
    };
    const b: Record<string, unknown> = {
      select: () => b,
      update: (p: Row) => { mode = 'update'; patch = p; return b; },
      insert: async (r: Row) => { rows.push({ id: `row${++idc}`, created_at: new Date().toISOString(), used_at: null, ...r }); return { data: null, error: null }; },
      eq: (c: string, v: unknown) => { preds.push((r) => r[c] === v); return b; },
      neq: (c: string, v: unknown) => { preds.push((r) => r[c] !== v); return b; },
      is: (c: string, v: unknown) => { preds.push((r) => (r[c] ?? null) === v); return b; },
      gt: (c: string, v: string) => { preds.push((r) => String(r[c]) > v); return b; },
      gte: (c: string, v: string) => { preds.push((r) => String(r[c]) >= v); return b; },
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

const VICTIM_CID = 'victim-cid-' + 'v'.repeat(30);
const ATTACKER_CID = 'attacker-cid-' + 'x'.repeat(30);
const OWNER_NEW_CID = 'owner-new-device-' + 'n'.repeat(30);
const mkMember = () => ({ id: 'm1', email: 'Member@Example.com', cid: VICTIM_CID, status: 'active', tier: 'concierge', created_at: '2026-01-01T00:00:00Z' });

async function main() {
  // Unknown / inactive email → no token, and nothing written.
  {
    const db = fakeDb({ concierge_members: [{ ...mkMember(), status: 'canceled' }] });
    const r = await issueRestoreToken(db.sb, 'member@example.com', n);
    ok('inactive member gets no token', !r.ok && r.reason === 'no_member');
    eq('nothing stored', db.tables.membership_restore_tokens.length, 0);
    const r2 = await issueRestoreToken(db.sb, '%', n);
    ok('wildcard email matches nobody', !r2.ok);
  }

  // Happy path: stored value is the HASH, never the token; email match is case-insensitive.
  const db = fakeDb({ concierge_members: [mkMember()] });
  const issued = await issueRestoreToken(db.sb, '  MEMBER@example.com ', n);
  ok('active member gets a token', issued.ok);
  const token = issued.ok ? issued.token : '';
  const stored = db.tables.membership_restore_tokens[0];
  eq('stores the sha256 hash', stored.token_hash, hashRestoreToken(token));
  ok('raw token not stored anywhere', !JSON.stringify(db.tables.membership_restore_tokens).includes(token));
  eq('expires in 30 min', new Date(String(stored.expires_at)).getTime() - n.getTime(), RESTORE_TTL_MS);

  // Requesting again invalidates the older unused token (only the newest link works).
  const issued2 = await issueRestoreToken(db.sb, 'member@example.com', n);
  ok('second request issues a token', issued2.ok);
  eq('older token invalidated', stored.used_at !== null, true);
  const oldTry = await confirmRestore(db.sb, token, ATTACKER_CID, n);
  eq('invalidated token cannot be used', oldTry, 'expired');
  eq('victim cid untouched', db.tables.concierge_members[0].cid, VICTIM_CID);

  // Per-member cap: silently throttles after 3 in an hour.
  await issueRestoreToken(db.sb, 'member@example.com', n);
  const capped = await issueRestoreToken(db.sb, 'member@example.com', n);
  ok('4th request in an hour is throttled', !capped.ok && capped.reason === 'throttled');

  // Guard rails on confirm.
  eq('garbage token → invalid', await confirmRestore(db.sb, 'nope', OWNER_NEW_CID, n), 'invalid');
  eq('weak cid → invalid', await confirmRestore(db.sb, issued2.ok ? issued2.token : '', 'abcd1234', n), 'invalid');
  eq('unknown valid-looking token → invalid', await confirmRestore(db.sb, generateRestoreToken(), OWNER_NEW_CID, n), 'invalid');

  // Expiry.
  const later = new Date(n.getTime() + RESTORE_TTL_MS + 1000);
  eq('expired token refused', await confirmRestore(db.sb, issued2.ok ? issued2.token : '', OWNER_NEW_CID, later), 'expired');
  eq('cid still untouched after expiry', db.tables.concierge_members[0].cid, VICTIM_CID);

  // SECURITY: the bound cid is the CONFIRMING browser's. A fresh, separate flow:
  const db2 = fakeDb({ concierge_members: [mkMember(), { id: 'm2', email: 'other@example.com', cid: OWNER_NEW_CID, status: 'active', tier: 'concierge', created_at: '2026-01-02T00:00:00Z' }] });
  // (the attacker asks for the link knowing only the email — they cannot supply a cid at all;
  //  the link lands in the real owner's inbox, and the owner confirms from their own browser)
  const req = await issueRestoreToken(db2.sb, 'member@example.com', n);
  const tok = req.ok ? req.token : '';
  eq('owner confirms from new device', await confirmRestore(db2.sb, tok, OWNER_NEW_CID, n), 'restored');
  const m1 = db2.tables.concierge_members.find((r) => r.id === 'm1')!;
  eq('membership is bound to the CONFIRMING browser cid', m1.cid, OWNER_NEW_CID);
  ok('…and not the attacker cid', m1.cid !== ATTACKER_CID);
  const m2 = db2.tables.concierge_members.find((r) => r.id === 'm2')!;
  eq('that browser is released from any other membership', m2.cid, null);

  // Single use: replay by anyone (e.g. scanner or attacker who saw the URL later) fails.
  eq('replay refused (single-use)', await confirmRestore(db2.sb, tok, ATTACKER_CID, n), 'expired');
  eq('replay did not re-point membership', m1.cid, OWNER_NEW_CID);

  // Membership cancelled between request and confirm → refused, token still consumed.
  const db3 = fakeDb({ concierge_members: [mkMember()] });
  const r3 = await issueRestoreToken(db3.sb, 'member@example.com', n);
  db3.tables.concierge_members[0].status = 'canceled';
  eq('cancelled member cannot be restored', await confirmRestore(db3.sb, r3.ok ? r3.token : '', OWNER_NEW_CID, n), 'invalid');

  report('membership.restore');
}
main().catch((e) => { console.error(e); process.exit(1); });
