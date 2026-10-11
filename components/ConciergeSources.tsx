'use client';
// Cards for everything the concierge found OUTSIDE the directory (events, articles, scraped knowledge
// pages, official notes, webcams), each with its trust label, plus /agenda and /live shortcuts where the
// question called for them. Used by the floating chat and the "Ask the island" box (increment 2.1b).
// Links: internal pages go through the locale-aware <Link>; external pages (knowledge pages' original URL,
// official sources, booking partner) open in a new tab with rel nofollow noopener. A card with no href
// (nothing public to open) renders as plain text. Strings come from lib/concierge/sourcesUi.ts.
import { Link } from '@/lib/i18n/routing';
import { sourcesUi, relFor } from '@/lib/concierge/sourcesUi';
import type { SourceCard } from '@/lib/concierge/sources';

export interface SourceHints { agenda: boolean; live: boolean; }

function whenText(iso: string | null, locale: string): string {
  if (!iso) return '';
  try { return new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Nicosia', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)); }
  catch { return ''; }
}

export default function ConciergeSources({ cards, hints, locale, dark = false, onNavigate }: {
  cards: SourceCard[]; hints?: SourceHints | null; locale: string; dark?: boolean; onNavigate?: () => void;
}) {
  const ui = sourcesUi(locale);
  const visible = (cards || []).filter((c) => c && c.title);
  const showAgenda = !!hints?.agenda; const showLive = !!hints?.live;
  if (!visible.length && !showAgenda && !showLive) return null;
  return (
    <div className={`csrc${dark ? ' csrc-dark' : ''}`}>
      {visible.length > 0 && <span className="csrc-t">{ui.title}</span>}
      <ul className="csrc-list">
        {visible.map((c) => {
          const meta = [c.kind === 'event' ? whenText(c.when, locale) : '', c.where || ''].filter(Boolean).join(' · ');
          const body = (
            <>
              <span className="csrc-top">
                <span className="csrc-kind">{ui.kind[c.kind]}</span>
                {c.labelText ? <span className={`csrc-chip csrc-${c.label || 'none'}`}>{c.labelText}</span> : null}
              </span>
              <span className="csrc-name">{c.title}{c.external ? ' ↗' : ''}</span>
              {meta ? <span className="csrc-meta">{meta}</span> : null}
            </>
          );
          const key = `${c.kind}:${c.id}`;
          if (!c.href) return <li key={key}><div className="csrc-card csrc-plain">{body}</div></li>;
          return (
            <li key={key}>
              {c.external
                ? <a href={c.href} className="csrc-card" target="_blank" rel={relFor(c.kind, true)}>{body}</a>
                : <Link href={c.href} className="csrc-card" onClick={onNavigate}>{body}</Link>}
            </li>
          );
        })}
      </ul>
      {(showAgenda || showLive) && (
        <div className="csrc-links">
          {showAgenda && <Link href="/agenda" className="csrc-pill" onClick={onNavigate}>{ui.seeAgenda} →</Link>}
          {showLive && <Link href="/live" className="csrc-pill" onClick={onNavigate}>{ui.seeLive} →</Link>}
        </div>
      )}
      <style>{`
        .csrc{margin-top:14px}
        .csrc-t{font-family:var(--sans,'Jost',sans-serif);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint,#938876);display:block;margin:0 0 8px}
        .csrc-dark .csrc-t{color:var(--ink-soft,#5b5346)}
        .csrc-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
        .csrc-card{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border:1px solid var(--line,#DDD2BB);border-radius:11px;background:var(--card,#FBF7EE);color:inherit;min-width:0}
        a.csrc-card:hover{border-color:#C9A24C;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.05)}
        .csrc-top{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
        .csrc-kind{font-family:var(--sans,'Jost',sans-serif);font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#8a5b12}
        .csrc-chip{font-family:var(--sans,'Jost',sans-serif);font-size:11px;line-height:1.3;padding:1px 8px;border-radius:999px;border:1px solid var(--line,#DDD2BB);color:var(--ink-soft,#6E6455)}
        .csrc-sponsored{border-color:#C9A24C;color:#8a5b12;font-weight:600}
        .csrc-official{border-color:#2f6b2f;color:#2f6b2f}
        .csrc-name{font-family:var(--disp,'Playfair Display',serif);font-size:15.5px;line-height:1.25;color:var(--ink,#1C1710);overflow-wrap:anywhere}
        .csrc-meta{font-family:var(--sans,'Jost',sans-serif);font-size:12px;color:var(--ink-soft,#6E6455)}
        .csrc-links{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
        .csrc-pill{font-family:var(--body,'Lora',serif);font-size:13.5px;padding:6px 12px;border:1px solid var(--line,#DDD2BB);border-radius:999px;background:var(--card,#FBF7EE);color:#8a5b12;font-weight:600}
        .csrc-pill:hover{border-color:#C9A24C;text-decoration:none}
      `}</style>
    </div>
  );
}
