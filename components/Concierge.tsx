'use client';
// "Ask the island" — the concierge search. Posts a natural-language request to
// /api/concierge and renders the grounded picks (real listings only). Purely
// additive: no data is stored, and it degrades to a normal search box if the
// endpoint is unavailable.
import { useState } from 'react';
import { Link } from '@/lib/i18n/routing';
import CoverImage from '@/components/CoverImage';
import type { Locale } from '@/lib/locales';

export interface ConciergeReqLabels {
  title: string; intro: string; emailPh: string; notePh: string;
  send: string; sending: string; sent: string; trust: string; trustLink: string;
}

export interface ConciergePick {
  slug: string; type: string; name: string; district: string | null;
  rating: number | null; rating_count: number | null; price_band: string | null;
  image: string | null; why: string;
}
export interface ConciergeLabels {
  placeholder: string; ask: string; thinking: string; error: string;
  examplesTitle: string; examples: string[]; picksTitle: string;
  req: ConciergeReqLabels;
}

const TYPE_DOT: Record<string, string> = {
  restaurant: '#C0492E', winery: '#7B2D42', hotel: '#1F6F78',
  beach: '#2F86C4', development: '#8A6D3B', vendor: '#4E7A46',
};

export default function Concierge({ locale, labels, autofocus = false }: { locale: Locale; labels: ConciergeLabels; autofocus?: boolean }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [picks, setPicks] = useState<ConciergePick[]>([]);
  const [error, setError] = useState('');
  const [asked, setAsked] = useState(false);
  const [reqEmail, setReqEmail] = useState('');
  const [reqNote, setReqNote] = useState('');
  const [reqState, setReqState] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function sendRequest() {
    if (reqState === 'sending' || reqState === 'sent') return;
    setReqState('sending');
    try {
      const res = await fetch('/api/concierge/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, answer, picks, email: reqEmail, note: reqNote, locale }),
      });
      const d = await res.json();
      setReqState(d.ok ? 'sent' : 'idle');
    } catch { setReqState('idle'); }
  }

  async function ask(question: string) {
    const query = question.trim();
    if (query.length < 3 || loading) return;
    setLoading(true); setError(''); setAsked(true); setReqState('idle');
    try {
      const res = await fetch('/api/concierge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, locale }),
      });
      const d = await res.json();
      if (!d.ok) { setError(d.error || labels.error); setAnswer(''); setPicks([]); }
      else { setAnswer(d.answer || ''); setPicks(Array.isArray(d.picks) ? d.picks : []); }
    } catch { setError(labels.error); setAnswer(''); setPicks([]); }
    finally { setLoading(false); }
  }

  return (
    <div className="cnc">
      <form className="cnc-bar" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <input
          className="cnc-input" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={labels.placeholder} aria-label={labels.placeholder} autoFocus={autofocus}
          enterKeyHint="search"
        />
        <button className="btn cnc-go" type="submit" disabled={loading || q.trim().length < 3}>
          {loading ? labels.thinking : labels.ask}
        </button>
      </form>

      {!asked ? (
        <div className="cnc-ex">
          <span className="cnc-ex-t">{labels.examplesTitle}</span>
          {labels.examples.map((ex) => (
            <button key={ex} type="button" className="cnc-chip" onClick={() => { setQ(ex); ask(ex); }}>{ex}</button>
          ))}
        </div>
      ) : null}

      {loading ? <div className="cnc-skel"><span /><span /><span /></div> : null}
      {error ? <p className="cnc-err">{error}</p> : null}

      {!loading && answer ? <p className="cnc-answer">{answer}</p> : null}

      {!loading && picks.length ? (
        <>
          <h3 className="cnc-picks-t">{labels.picksTitle}</h3>
          <div className="cnc-picks">
            {picks.map((p, i) => (
              <Link key={p.slug} href={`/directory/${p.type}/${p.slug}`} className="cnc-pick">
                <span className="cnc-pick-img">
                  <CoverImage src={p.image} seed={p.slug} alt={p.name} className="ph-img" sizes="120px" fallbackKind="brand" />
                  <span className="cnc-pick-rank">{i + 1}</span>
                </span>
                <span className="cnc-pick-body">
                  <span className="cnc-pick-meta">
                    <span className="d" style={{ background: TYPE_DOT[p.type] || '#C9A24C' }} />
                    {p.district ? <span className="cnc-cap">{p.district}</span> : null}
                    {p.rating != null ? <span className="cnc-rate">★ {p.rating.toFixed(1)}</span> : null}
                    {p.price_band ? <span>· {p.price_band}</span> : null}
                  </span>
                  <span className="cnc-pick-name">{p.name}</span>
                  <span className="cnc-pick-why">{p.why}</span>
                </span>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      {!loading && picks.length ? (
        <div className="cnc-req">
          {reqState === 'sent' ? (
            <p className="cnc-req-sent">✓ {labels.req.sent}</p>
          ) : (
            <>
              <div className="cnc-req-h">{labels.req.title}</div>
              <p className="cnc-req-i">{labels.req.intro}</p>
              <div className="cnc-req-row">
                <input className="cnc-req-in" type="email" placeholder={labels.req.emailPh} value={reqEmail} onChange={(e) => setReqEmail(e.target.value)} aria-label={labels.req.emailPh} />
                <button className="btn cnc-req-go" type="button" onClick={sendRequest} disabled={reqState === 'sending'}>{reqState === 'sending' ? labels.req.sending : labels.req.send}</button>
              </div>
              <input className="cnc-req-in cnc-req-note" placeholder={labels.req.notePh} value={reqNote} onChange={(e) => setReqNote(e.target.value)} aria-label={labels.req.notePh} />
            </>
          )}
          <p className="cnc-trust">◆ {labels.req.trust} <Link href="/standards">{labels.req.trustLink} →</Link></p>
        </div>
      ) : null}

      <style>{`
        .cnc{max-width:760px}
        .cnc-req{margin-top:22px;border:1px solid var(--line,#e0d6c1);border-radius:8px;background:var(--paper-2,#efe8d8);padding:18px 18px 16px}
        .cnc-req-h{font-family:var(--disp);font-size:19px;color:var(--ink,#171310)}
        .cnc-req-i{font-family:var(--body);font-size:14.5px;color:var(--ink-soft,#5b5346);margin:4px 0 12px}
        .cnc-req-row{display:flex;gap:10px}
        .cnc-req-in{flex:1;min-width:0;font-family:var(--body);font-size:15px;padding:10px 12px;border:1px solid var(--line,#e0d6c1);border-radius:6px;background:#fff;color:var(--ink,#171310)}
        .cnc-req-in:focus{outline:none;border-color:#C9A24C;box-shadow:0 0 0 3px rgba(201,162,76,.16)}
        .cnc-req-note{margin-top:10px;width:100%}
        .cnc-req-go{white-space:nowrap}
        .cnc-req-go:disabled{opacity:.55}
        .cnc-req-sent{font-family:var(--body);font-size:16px;color:#2f6b2f;margin:0}
        .cnc-trust{font-family:var(--sans);font-size:12.5px;color:var(--ink-soft,#5b5346);margin:14px 0 0;letter-spacing:.01em}
        .cnc-trust a{color:#8a5b12;font-weight:600}
        .cnc-bar{display:flex;gap:10px}
        .cnc-input{flex:1;min-width:0;font-family:var(--body);font-size:17px;padding:13px 16px;border:1px solid var(--line,#e0d6c1);border-radius:6px;background:#fff;color:var(--ink,#171310)}
        .cnc-input:focus{outline:none;border-color:#C9A24C;box-shadow:0 0 0 3px rgba(201,162,76,.18)}
        .cnc-go{white-space:nowrap}
        .cnc-go:disabled{opacity:.55;cursor:default}
        .cnc-ex{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}
        .cnc-ex-t{font-family:var(--sans);font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-soft,#5b5346)}
        .cnc-chip{font-family:var(--body);font-size:14px;padding:6px 12px;border:1px solid var(--line,#e0d6c1);border-radius:999px;background:#fff;color:var(--ink-soft,#5b5346);cursor:pointer}
        .cnc-chip:hover{border-color:#C9A24C;color:var(--ink,#171310)}
        .cnc-answer{font-family:var(--body);font-size:19px;line-height:1.55;color:var(--ink,#171310);margin:22px 0 6px}
        .cnc-picks-t{font-family:var(--sans);font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:var(--ink-soft,#5b5346);margin:18px 0 12px}
        .cnc-picks{display:flex;flex-direction:column;gap:12px}
        .cnc-pick{display:flex;gap:14px;align-items:stretch;border:1px solid var(--line,#e0d6c1);border-radius:8px;background:#fff;overflow:hidden}
        .cnc-pick:hover{border-color:#C9A24C;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.05)}
        .cnc-pick-img{position:relative;width:110px;flex:none;background:linear-gradient(135deg,#1c2b33,#0B0E11)}
        .cnc-pick-img .ph-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .cnc-pick-rank{position:absolute;top:6px;left:6px;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;background:rgba(11,14,17,.82);color:#F1D592;font-family:var(--sans);font-weight:700;font-size:12px}
        .cnc-pick-body{display:flex;flex-direction:column;gap:3px;padding:12px 14px 13px}
        .cnc-pick-meta{display:flex;align-items:center;gap:8px;font-family:var(--sans);font-size:12.5px;color:var(--ink-soft,#5b5346);text-transform:capitalize}
        .cnc-pick-meta .d{width:8px;height:8px;border-radius:50%;flex:none}
        .cnc-rate{color:#8a5b12;font-weight:600}
        .cnc-pick-name{font-family:var(--disp);font-size:19px;color:var(--ink,#171310);line-height:1.15}
        .cnc-pick-why{font-family:var(--body);font-size:15px;color:var(--ink-soft,#5b5346);line-height:1.5}
        .cnc-err{font-family:var(--body);color:#a3341f;margin-top:16px}
        .cnc-skel{display:flex;flex-direction:column;gap:12px;margin-top:22px}
        .cnc-skel span{height:72px;border-radius:8px;background:linear-gradient(90deg,#efe8d8,#f6f1e6,#efe8d8);background-size:200% 100%;animation:cncsh 1.2s infinite}
        @keyframes cncsh{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @media (max-width:560px){.cnc-bar{flex-direction:column}.cnc-go{width:100%}}
      `}</style>
    </div>
  );
}
