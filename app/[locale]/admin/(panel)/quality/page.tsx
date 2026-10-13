import { supabaseServer } from '@/lib/supabase/server';
import {
  LANGS, EDITION_NAMES, SCAN_COLS, WORST_CAP,
  scanPosts, rankWorst,
  type RawPost, type Edition, type Level,
} from '@/lib/editorial/qualityScan';
import { MAX_SCORE } from '@/lib/voice/gate';
import { langProfile } from '@/lib/antiAiLang';
import type { Lang } from '@/lib/antiAi';
import RepairActions from '@/components/admin/RepairActions';
import QualityBulkClean from '@/components/admin/QualityBulkClean';

// An edition needs Clean when its style score is above the publish bar (MAX_SCORE, the same bar the automatic worker uses) or it carries a
// machine signature. An edition that is only out of line with the others (too short or too long) needs Rewrite, not Clean: editing the
// words cannot give back a lost half of the text. A very heavy style score (this or more) is also better re-reported than edited.
const HEAVY = 25;

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
function profile(l: Edition) { return langProfile(l as Lang); }
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

  // Editions a one-click clean can actually improve: translated (not English-served) and above the style bar. An edition that is only
  // too short or too long is left out: Clean cannot repair it, and calling it would spend a model pass on a text that cannot get better.
  const repairTargets = worst
    .filter((f) => f.needsClean && f.id)
    .map((f) => ({ id: f.id, locale: f.lang }));

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
      <p className="sub">
        Scores are advisory: nothing here blocks or delays publishing. The German, Greek, Polish, Romanian, Russian and Arabic detector word lists
        were written without a native editor and are marked <em>needs native review</em>; treat a high score as a prompt to read the piece, not a verdict.
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
                {' · '}{s.scored} scored{s.high ? ` · ${s.high} high` : ''}{s.flagged ? ` · ${s.flagged} flagged` : ''}
              </div>
              <div className="sub" style={{ margin: '4px 0 0', fontSize: 12 }}>
                {profile(l).lexicalDefs} language detectors + {profile(l).structural} structural checks
                {profile(l).nativeReview ? <span style={{ color: '#8a6d1f' }}> · needs native review</span> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #C9A24C', paddingBottom: 6, marginTop: 22, gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Worst offenders</h1>
        <QualityBulkClean targets={repairTargets} />
      </div>
      <p className="sub" style={{ marginTop: 8 }}>
        Untranslated first, then by score — up to {WORST_CAP}. The <strong>style</strong> score is what the publish bar measures (at most {MAX_SCORE},
        no machine signature); <strong>Clean</strong> edits the edition in its own language (sources named, equal-size paragraphs, stock
        phrases) and is offered only where the style is above the bar. <strong>Rewrite</strong> re-reports the edition natively from the source
        edition, for editions that are far too short, too long or poorly translated (shown under <em>Length</em>). Either is saved only if the
        text really gets better and keeps every figure, and the previous text stays in the admin log. The automatic worker repairs the rest in the
        background, one edition every ten minutes.
      </p>
      <table className="adm-t" style={{ marginTop: 10 }}>
        <thead><tr><th>Article</th><th>Edition</th><th>Status</th><th>Fix</th></tr></thead>
        <tbody>
          {worst.map((f, i) => {
            // Colour follows what needs doing: the style level when the style fails the bar, red for a length problem, green when only the style passes.
            const color = f.untranslated ? '#9a2020' : f.needsClean ? (f.voiceLevel === 'high' ? '#9a2020' : '#C9A24C') : f.parity ? '#9a2020' : '#1f7a3f';
            const styleTells = f.tells.filter((t) => !t.key.startsWith('parity_'));
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
                    : <>Style {f.voice} · {f.needsClean ? `above the bar of ${MAX_SCORE}` : 'passes the bar'}</>}
                  {!f.untranslated && f.parity
                    ? <div className="sub" style={{ margin: '3px 0 0', fontWeight: 400, whiteSpace: 'normal', maxWidth: 380, color: '#9a2020' }}>
                        Length: {f.parity}
                      </div>
                    : null}
                  {!f.untranslated && styleTells.length
                    ? <div className="sub" style={{ margin: '3px 0 0', fontWeight: 400, whiteSpace: 'normal', maxWidth: 380 }}>
                        {styleTells.map((t, k) => (
                          <div key={k} style={{ marginTop: k ? 3 : 0 }}>
                            {t.label}{t.count > 1 ? ` ×${t.count}` : ''}
                            {t.sample ? <span style={{ color: '#8a8470' }}> — “{t.sample.slice(0, 120)}”</span> : null}
                          </div>
                        ))}
                      </div>
                    : null}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {f.untranslated
                    ? <span className="sub" style={{ margin: 0 }}>run backfill</span>
                    : f.id && (f.needsClean || f.parity)
                      ? <RepairActions id={f.id} locale={f.lang} clean={f.needsClean} rewrite={!!f.parity || f.voice >= HEAVY} />
                      : <span className="sub" style={{ margin: 0, color: '#1f7a3f' }}>ok</span>}
                </td>
              </tr>
            );
          })}
          {worst.length === 0
            ? <tr><td colSpan={4} className="sub" style={{ margin: 0 }}>{scanned ? 'Every edition is translated, passes the style bar and is in line with the others.' : 'No published articles to scan yet.'}</td></tr>
            : null}
        </tbody>
      </table>
    </>
  );
}
