'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

type Plat = 'facebook' | 'instagram';
type Settings = { enabled: boolean; facebook: boolean; instagram: boolean; maxPerDay: Record<Plat, number>; minGapMinutes: number; maxAgeHours: number };
type Stats = { byStatus: Record<string, Record<string, number>>; postedLast24h: Record<Plat, number> };
type Article = { id: string; slug: string; title_en: string | null; published_at: string | null; skip_facebook: boolean | null };
type OutboxRow = { id: string; article_id: string; platform: Plat; status: string; backlog: boolean; attempts: number; error: string | null; permalink: string | null; next_attempt_at: string; posted_at: string | null };

const PLATS: Plat[] = ['facebook', 'instagram'];
const PILL: Record<string, string> = { posted: 'ok', pending: 'draft', processing: 'info', failed: 'failed', skipped: 'warn' };

async function api(body?: Record<string, unknown>) {
  const res = await fetch('/api/admin/social', body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  return res.json().catch(() => ({ ok: false, error: 'Network error' }));
}

export default function SocialTab() {
  const sb = supabaseBrowser();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [configured, setConfigured] = useState<Record<Plat, boolean>>({ facebook: false, instagram: false });
  const [stats, setStats] = useState<Stats | null>(null);
  const [migrated, setMigrated] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [outbox, setOutbox] = useState<OutboxRow[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [log, setLog] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [conn, setConn] = useState<Record<Plat, { ok: boolean; detail: string }> | null>(null);
  const [bfPlats, setBfPlats] = useState<Record<Plat, boolean>>({ facebook: true, instagram: true });
  const [bfLimit, setBfLimit] = useState(200);

  const load = useCallback(async () => {
    const s = await api();
    if (s.ok) { setSettings(s.settings); setConfigured(s.configured); setStats(s.stats); setMigrated(s.migrated); }
    let aq = sb.from('blog_posts').select('id, slug, title_en, published_at, skip_facebook').eq('status', 'published').order('published_at', { ascending: false }).limit(40);
    if (q.trim().length >= 2) aq = aq.ilike('title_en', `%${q.trim().replace(/[%_]/g, '')}%`);
    const [{ data: a }, { data: l }, { data: o }] = await Promise.all([
      aq,
      sb.from('social_posts').select('id, platform, lang, status, permalink, error, created_at, article_id').order('created_at', { ascending: false }).limit(25),
      sb.from('social_outbox').select('id, article_id, platform, status, backlog, attempts, error, permalink, next_attempt_at, posted_at').order('updated_at', { ascending: false }).limit(300),
    ]);
    setArticles((a as Article[]) || []); setLog(l || []); setOutbox((o as OutboxRow[]) || []);
    const ids = Array.from(new Set(((o as OutboxRow[]) || []).filter((r) => ['failed', 'pending', 'processing'].includes(r.status)).map((r) => r.article_id)));
    if (ids.length) {
      const { data: t } = await sb.from('blog_posts').select('id, title_en').in('id', ids.slice(0, 100));
      setTitles(Object.fromEntries(((t as { id: string; title_en: string | null }[]) || []).map((x) => [x.id, x.title_en || x.id])));
    }
  }, [sb, q]);
  useEffect(() => { load(); }, [load]);

  async function act(key: string, body: Record<string, unknown>, done?: (r: any) => string) {
    setBusy(key); setMsg(''); setErr('');
    const r = await api(body);
    setBusy('');
    if (!r.ok) setErr(r.error || 'Failed.'); else if (done) setMsg(done(r));
    await load();
    return r;
  }

  const statusOf = (articleId: string, p: Plat) => outbox.find((r) => r.article_id === articleId && r.platform === p);
  const waiting = outbox.filter((r) => r.status === 'pending');
  const failed = outbox.filter((r) => r.status === 'failed');

  return (
    <>
      <h1>Social · Facebook &amp; Instagram</h1>
      <p className="sub">Every article that gets published — written in the editor, an interview, a scraped story, anything — is queued automatically and posted to Facebook and Instagram with a hook, a short description, relevant hashtags and (Instagram) alt text. Posts are spread out within the daily limits below. You can also post any earlier article yourself.</p>
      {!migrated ? <p style={{ color: '#9a2020' }}>⚠ The queue is not in the database yet. Run <code>supabase/migrations/20261005150000_social_autopost.sql</code> in the Supabase SQL editor, then reload.</p> : null}
      {msg ? <p style={{ color: '#1c6b34' }}>{msg}</p> : null}
      {err ? <p style={{ color: '#9a2020' }}>⚠ {err}</p> : null}

      {/* ── switches & limits ── */}
      {settings ? (
        <div className="toggle" style={{ flexWrap: 'wrap', gap: 18 }}>
          <label><input type="checkbox" checked={settings.enabled} style={{ width: 'auto', margin: '0 6px 0 0' }} onChange={() => act('s', { action: 'settings', patch: { enabled: !settings.enabled } }, () => `Auto-posting is now ${settings.enabled ? 'OFF' : 'ON'}.`)} /><b>Auto-post new articles</b></label>
          {PLATS.map((p) => (
            <label key={p}><input type="checkbox" checked={settings[p]} style={{ width: 'auto', margin: '0 6px 0 0' }} onChange={() => act('s', { action: 'settings', patch: { [p]: !settings[p] } })} />{p === 'facebook' ? 'Facebook' : 'Instagram'}
              <span style={{ marginInlineStart: 6, opacity: .7 }}>{configured[p] ? '· connected keys set' : '· NOT connected'}</span></label>
          ))}
          {PLATS.map((p) => (
            <label key={`m${p}`} style={{ fontSize: 13 }}>max/day {p === 'facebook' ? 'FB' : 'IG'}{' '}
              <input type="number" min={0} max={50} defaultValue={settings.maxPerDay[p]} style={{ width: 56 }}
                onBlur={(e) => Number(e.target.value) !== settings.maxPerDay[p] && act('s', { action: 'settings', patch: { max_per_day: { ...settings.maxPerDay, [p]: Number(e.target.value) } } })} /></label>
          ))}
          <label style={{ fontSize: 13 }}>gap (min){' '}
            <input type="number" min={0} max={720} defaultValue={settings.minGapMinutes} style={{ width: 60 }}
              onBlur={(e) => Number(e.target.value) !== settings.minGapMinutes && act('s', { action: 'settings', patch: { min_gap_minutes: Number(e.target.value) } })} /></label>
        </div>
      ) : null}

      <div className="row" style={{ margin: '10px 0 4px' }}>
        <button className="abtn ghost" disabled={!!busy} onClick={async () => { setBusy('t'); const r = await api({ action: 'test' }); setBusy(''); if (r.ok) setConn(r.connection); }}>{busy === 't' ? 'Checking…' : 'Test the connection'}</button>
        <button className="abtn ghost" disabled={!!busy} onClick={() => act('run', { action: 'run' }, (r) => `Queue worked: ${r.posted} posted, ${r.failed} failed, ${r.skipped} skipped, ${r.deferred} waiting.${(r.notes || []).length ? ' ' + r.notes.join('; ') : ''}`)}>{busy === 'run' ? 'Working…' : 'Work the queue now'}</button>
      </div>
      {conn ? (
        <div style={{ fontSize: 13.5, margin: '6px 0 14px' }}>
          {PLATS.map((p) => <div key={p}>{conn[p].ok ? '✅' : '⚠️'} <b>{p === 'facebook' ? 'Facebook' : 'Instagram'}</b>: {conn[p].detail}</div>)}
        </div>
      ) : null}

      {/* ── statistics ── */}
      {stats ? (
        <div className="cards" style={{ marginTop: 10 }}>
          {PLATS.map((p) => (
            <div className="stat" key={p}><div className="n">{stats.postedLast24h[p]}</div><div className="k">{p === 'facebook' ? 'Facebook' : 'Instagram'} · last 24 h</div>
              <div style={{ fontSize: 11.5, opacity: .65, marginTop: 6 }}>{stats.byStatus[p].pending} waiting · {stats.byStatus[p].posted} posted · {stats.byStatus[p].failed} failed · {stats.byStatus[p].skipped} skipped</div></div>
          ))}
        </div>
      ) : null}

      {/* ── earlier articles ── */}
      <h1 style={{ fontSize: 18, marginTop: 22 }}>Post earlier articles</h1>
      <p className="sub">Queues articles that were published before auto-posting existed (newest first, never an article already posted). They go out gradually, within the daily limits above — you do not need to do anything else.</p>
      <div className="row" style={{ marginBottom: 6 }}>
        {PLATS.map((p) => <label key={p}><input type="checkbox" checked={bfPlats[p]} style={{ width: 'auto', margin: '0 6px 0 0' }} onChange={() => setBfPlats({ ...bfPlats, [p]: !bfPlats[p] })} />{p === 'facebook' ? 'Facebook' : 'Instagram'}</label>)}
        <label style={{ fontSize: 13 }}>how many posts{' '}<input type="number" min={1} max={2000} value={bfLimit} onChange={(e) => setBfLimit(Number(e.target.value) || 1)} style={{ width: 80 }} /></label>
        <button className="abtn gold" disabled={!!busy || !PLATS.some((p) => bfPlats[p])} onClick={() => act('bf', { action: 'backlog', platforms: PLATS.filter((p) => bfPlats[p]), limit: bfLimit }, (r) => (r.queued ? `${r.queued} posts queued. They will be published gradually (about ${settings ? settings.maxPerDay.facebook : 8} a day on Facebook, ${settings ? settings.maxPerDay.instagram : 4} on Instagram).` : 'Nothing to queue — every published article is already queued or posted.'))}>{busy === 'bf' ? 'Queuing…' : 'Queue earlier articles'}</button>
      </div>
      {waiting.length ? <p className="sub">⏳ {waiting.length} post(s) waiting in the queue.</p> : null}

      {/* ── problems ── */}
      {failed.length ? (
        <>
          <h1 style={{ fontSize: 18, marginTop: 18, color: '#9a2020' }}>Failed posts ({failed.length})</h1>
          <button className="abtn ghost" disabled={!!busy} onClick={() => act('rf', { action: 'retry_failed' }, (r) => `${r.retried} queued again.`)}>Retry all failed</button>
          <table className="adm-t" style={{ marginTop: 8 }}>
            <thead><tr><th>Article</th><th>Platform</th><th>Problem</th><th></th></tr></thead>
            <tbody>
              {failed.slice(0, 40).map((r) => (
                <tr key={r.id}><td>{titles[r.article_id] || r.article_id.slice(0, 8)}</td><td>{r.platform}</td><td style={{ fontSize: 12.5, color: '#9a2020', maxWidth: 420 }}>{r.error}</td>
                  <td><button className="abtn ghost" onClick={() => act('r' + r.id, { action: 'retry', id: r.id })}>Retry</button><button className="abtn ghost" onClick={() => act('k' + r.id, { action: 'skip', id: r.id })}>Skip</button></td></tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {/* ── post one article ── */}
      <h1 style={{ fontSize: 18, marginTop: 24 }}>Post a specific article</h1>
      <div className="row" style={{ marginBottom: 8 }}>
        <input placeholder="Search any published article by title…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: '1 1 320px' }} />
      </div>
      <table className="adm-t">
        <thead><tr><th>Article</th><th>Published</th><th>Facebook</th><th>Instagram</th><th></th></tr></thead>
        <tbody>
          {articles.map((a) => (
            <tr key={a.id}>
              <td>{a.title_en}{a.skip_facebook ? <span className="pill warn" style={{ marginInlineStart: 6 }}>no social</span> : null}</td>
              <td style={{ whiteSpace: 'nowrap' }}>{a.published_at ? new Date(a.published_at).toLocaleDateString('en-GB') : '—'}</td>
              {PLATS.map((p) => {
                const s = statusOf(a.id, p);
                return <td key={p}>{s ? <span className={`pill ${PILL[s.status] || 'draft'}`} title={s.error || ''}>{s.status}</span> : <span style={{ opacity: .5 }}>—</span>}{s?.permalink ? <> <a href={s.permalink} target="_blank" rel="noopener">↗</a></> : null}</td>;
              })}
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="abtn gold" disabled={!!busy} onClick={() => {
                  const again = PLATS.some((p) => statusOf(a.id, p)?.status === 'posted');
                  if (again && !confirm('This article was already posted. Post it again?')) return;
                  act('p' + a.id, { post_id: a.id, platforms: PLATS, repost: again }, (r) => {
                    const m = r.results?.meta; return m ? `Posted: ${m.run?.posted ?? 0}, failed: ${m.run?.failed ?? 0}${m.alreadyPosted?.length ? `, already posted: ${m.alreadyPosted.join(', ')}` : ''}${m.run?.notes?.length ? ' — ' + m.run.notes.join('; ') : ''}.` : 'Done.';
                  });
                }}>{busy === 'p' + a.id ? 'Posting…' : 'Post now'}</button>
              </td>
            </tr>
          ))}
          {articles.length === 0 ? <tr><td colSpan={5}>No published articles found.</td></tr> : null}
        </tbody>
      </table>

      <h1 style={{ fontSize: 18, marginTop: 22 }}>Recent posts</h1>
      <table className="adm-t">
        <thead><tr><th>When</th><th>Platform</th><th>Lang</th><th>Status</th><th>Link</th></tr></thead>
        <tbody>
          {log.map((s) => (
            <tr key={s.id}><td>{new Date(s.created_at).toLocaleString('en-GB')}</td><td>{s.platform}</td><td>{s.lang}</td>
              <td><span className={`pill ${s.status === 'published' ? 'ok' : 'failed'}`}>{s.status}</span>{s.error ? <div style={{ fontSize: 11, color: '#9a2020' }}>{s.error}</div> : null}</td>
              <td>{s.permalink ? <a href={s.permalink} target="_blank" rel="noopener">open</a> : '—'}</td></tr>
          ))}
          {log.length === 0 ? <tr><td colSpan={5}>No posts yet.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
