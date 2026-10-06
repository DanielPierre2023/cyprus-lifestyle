// Business Hub nightly cleanup (increment 4.2): expired sessions go, long-expired sign-in links go, nothing else.
import { purgeExpiredBusinessCredentials, LOGIN_TOKEN_GRACE_MS } from '@/lib/business/cleanup';
import { eq, ok, report } from './_harness';

type Row = Record<string, unknown>;
function fake(seed: Record<string, Row[]>, failOn?: string) {
  const tables = seed;
  const from = (name: string) => {
    const preds: ((r: Row) => boolean)[] = [];
    let del = false;
    const b: Record<string, unknown> = {
      delete: () => { del = true; return b; },
      lt: (c: string, v: string) => { preds.push((r) => String(r[c]) < v); return b; },
      select: () => b,
      then: (res: (v: unknown) => unknown) => {
        if (name === failOn) return res({ data: null, error: { message: 'boom' } });
        const rows = tables[name]; const hit = rows.filter((r) => preds.every((p) => p(r)));
        if (del) for (const r of hit) rows.splice(rows.indexOf(r), 1);
        return res({ data: hit.map((r) => ({ id: r.id })), error: null });
      },
    };
    return b;
  };
  return { from } as never;
}

const NOW = new Date('2026-10-20T12:00:00Z');
const iso = (ms: number) => new Date(NOW.getTime() + ms).toISOString();
const tables = () => ({
  business_sessions: [{ id: 's-old', expires_at: iso(-1000) }, { id: 's-live', expires_at: iso(86_400_000) }],
  business_login_tokens: [
    { id: 't-fresh', expires_at: iso(-60_000) },                       // expired a minute ago: kept (throttle window)
    { id: 't-old', expires_at: iso(-LOGIN_TOKEN_GRACE_MS - 1000) },   // expired more than a day ago: deleted
    { id: 't-live', expires_at: iso(1_800_000) },
  ],
});

async function main() {
  const t = tables();
  const r = await purgeExpiredBusinessCredentials(fake(t), NOW);
  eq('counts', r, { sessions: 1, loginTokens: 1, errors: 0 });
  eq('live session kept', t.business_sessions.map((x) => x.id), ['s-live']);
  eq('recent and live links kept', t.business_login_tokens.map((x) => x.id), ['t-fresh', 't-live']);
  const again = await purgeExpiredBusinessCredentials(fake(t), NOW);
  eq('idempotent', again, { sessions: 0, loginTokens: 0, errors: 0 });
  const bad = await purgeExpiredBusinessCredentials(fake(tables(), 'business_sessions'), NOW);
  ok('one failing table is counted and the other still runs', bad.errors === 1 && bad.sessions === 0 && bad.loginTokens === 1);
  report('business-cleanup');
}
main();
