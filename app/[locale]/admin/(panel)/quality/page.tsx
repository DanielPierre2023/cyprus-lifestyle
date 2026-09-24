import { supabaseServer } from '@/lib/supabase/server';
import {
  LANGS, EDITION_NAMES, SCAN_COLS, WORST_CAP,
  scanPosts, rankWorst,
  type RawPost, type Edition, type Level,
} from '@/app/api/admin/editorial/quality-scan/route';

export const dynamic = 'force-dynamic';

// Quality — the cross-edition health check. For every recent published article it
// shows which editions are still serving English instead of the local language, and
// which local-language drafts still read as AI. Read-only: the desk uses this to
// pick the pieces × languages that need a human pass. It runs the exact same scan
// as /api/admin/editorial/quality-scan (shared pure helpers), reading here with the
// signed-in admin's client.

const SCAN_LIMIT = 150;

function toneForLevel(level: Level): string {
  return level === 'high' ? '#9a2020' : level === 'medium' ? '#C9A24C' : '#1f7a3f';
}
function levelFromScore(score: number): Level {
  return score === 0 ? 'clean' : score <= 15 ? 'low' : score <= 40 ? 'medium' : 'high';
}
function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: color, marginInlineEnd: 8, verticalAlign: 'middle' }}
    />
  );
}

export default async function QualityTab() {
  const sb = await supabaseServer();
  const { data } = await sb
    .from('blog_posts')
    .select(SCAN_COLS)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(SCAN_LIMIT);

  const { scanned, perLang, editions } = scanPosts((data as RawPost[] | null) || []);
  const worst = rankWorst(editions, WORST_CAP);

  const totalEditions = LANGS.reduce((a, l) => a + perLang[l].total, 0);
  const totalUntranslated = LANGS.reduce((a, l) => a + perLang[l].untranslated, 0);
  const totalHigh = LANGS.reduce((a, l) => a + perLang[l].high, 0);

  return (
    <>
      <h1>Quality</h1>
      <p className="sub">
        Every recent published article, checked across all seven editions — which are still serving <strong>English</strong> instead
        of the local language, and which local drafts still read as <strong>AI</strong>. Read-only; use it to pick the pieces and languages that need a human pass.
        Scanning the {scanned.toLocaleString('en-GB')} most recent published stories.
      </p>

      <div className="cards">
        <div className="stat"><div className="n">{scanned.toLocaleString('en-GB')}</div><div className="k">Articles scanned</div></div>
        <div className="stat"><div className="n">{totalEditions.toLocaleString('en-GB')}</div><div className="k">Editions checked</div></div>
        <div className="stat"><div className="n" style={{ color: totalUntranslated ? '#9a2020' : '#1f7a3f' }}>{totalUntranslated.toLocaleString('en-GB')}</div><div className="k">Untranslated editions</div></div>
        <div className="stat"><div className="n" style={{ color: totalHigh ? '#9a2020' : '#1f7a3f' }}>{totalHigh.toLocaleString('en-GB')}</div><div className="k">Editions reading as AI (high)</div></div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #C9A24C', paddingBottom: 6, marginTop: 6 }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>By edition</h1>
        <span className="sub" style={{ margin: 0 }}>Average AI-tell score of the translated drafts, and how many editions are missing.</span>
      </div>
      <div className="cards" style={{ marginTop: 12 }}>
        {LANGS.map((l: Edition) => {
          const s = perLang[l];
          const hasScored = s.scored > 0;
          return (
            <div className="stat" key={l}>
              <div className="n" style={{ color: hasScored ? toneForLevel(levelFromScore(s.avgScore)) : '#8a8371' }}>
                {hasScored ? s.avgScore : '—'}
              </div>
              <div className="k">{l.toUpperCase()} · {EDITION_NAMES[l]}</div>
              <div className="sub" style={{ margin: '6px 0 0' }}>
                <span style={{ color: s.untranslated ? '#9a2020' : '#6b6552' }}>{s.untranslated} untranslated</span>
                {' · '}{s.scored} scored{s.high ? ` · ${s.high} high` : ''}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #C9A24C', paddingBottom: 6, marginTop: 22 }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Worst offenders</h1>
        <span className="sub" style={{ margin: 0 }}>Untranslated first, then by AI score — up to {WORST_CAP}.</span>
      </div>
      <table className="adm-t" style={{ marginTop: 10 }}>
        <thead><tr><th>Article</th><th>Edition</th><th>Status</th></tr></thead>
        <tbody>
          {worst.map((f, i) => {
            const color = f.untranslated ? '#9a2020' : toneForLevel(f.level);
            return (
              <tr key={`${f.id || f.slug}-${f.lang}-${i}`}>
                <td style={{ fontWeight: 600 }}>
                  {f.id
                    ? <a href={`/admin/editor?id=${f.id}`} style={{ color: '#0B0E11' }}>{f.title}</a>
                    : f.title}
                  {f.slug ? <div className="sub" style={{ margin: '2px 0 0', fontWeight: 400 }}>{f.slug}</div> : null}
                </td>
                <td className="sub" style={{ margin: 0, whiteSpace: 'nowrap' }}>{f.lang.toUpperCase()} · {EDITION_NAMES[f.lang]}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <Dot color={color} />
                  {f.untranslated
                    ? <>Untranslated <span className="sub" style={{ margin: 0 }}>(serving English)</span></>
                    : <>AI: {f.level} · {f.score}</>}
                </td>
              </tr>
            );
          })}
          {worst.length === 0
            ? <tr><td colSpan={3} className="sub" style={{ margin: 0 }}>{scanned ? 'Every edition is translated and reading clean.' : 'No published articles to scan yet.'}</td></tr>
            : null}
        </tbody>
      </table>
    </>
  );
}
