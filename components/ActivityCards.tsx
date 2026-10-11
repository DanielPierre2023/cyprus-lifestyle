'use client';
// ============================================================================
// Bookable-experience cards for the concierge (chat panel + directory Ask box).
// Content is our own catalogue (title, kind, area, duration, price level); each card
// links out to book with our booking partner (partner id applied server-side), opens
// in a new tab, is marked rel="sponsored" and carries a partner-link note.
// Self-contained styles.
// ============================================================================
import { Link } from '@/lib/i18n/routing';
import { kindOf } from '@/lib/activities/classify';

export interface ActivityCardItem {
  id: string; title: string; kind: string; kindLabel: string; town: string | null; area: string | null;
  priceBand: string | null; priceBasis: string | null; duration: string | null; url: string | null;
  pageHref?: string | null; // our own public page /activities/<slug> (locale-free): the card's main link; `url` (partner booking link) becomes the secondary 'Book' action
}

const T: Record<string, { title: string; book: string; note: string }> = {
  en: { title: 'Bookable experiences', book: 'Book', note: 'Partner links — we may earn a commission, at no extra cost to you.' },
  el: { title: 'Εμπειρίες με άμεση κράτηση', book: 'Κράτηση', note: 'Σύνδεσμοι συνεργατών — ενδέχεται να λάβουμε προμήθεια, χωρίς επιπλέον κόστος για εσάς.' },
  ro: { title: 'Experiențe de rezervat', book: 'Rezervă', note: 'Linkuri de partener — putem primi un comision, fără costuri suplimentare pentru tine.' },
  ar: { title: 'تجارب قابلة للحجز', book: 'احجز', note: 'روابط شركاء — قد نحصل على عمولة دون أي تكلفة إضافية عليك.' },
  de: { title: 'Buchbare Erlebnisse', book: 'Buchen', note: 'Partnerlinks – wir erhalten ggf. eine Provision, für Sie ohne Mehrkosten.' },
  pl: { title: 'Atrakcje do zarezerwowania', book: 'Rezerwuj', note: 'Linki partnerskie — możemy otrzymać prowizję, bez dodatkowych kosztów dla Ciebie.' },
  ru: { title: 'Впечатления с бронированием', book: 'Забронировать', note: 'Партнёрские ссылки — мы можем получить комиссию без доплаты с вашей стороны.' },
};

export default function ActivityCards({ items, locale = 'en', dark = false, onOpen, onNavigate }: {
  items: ActivityCardItem[]; locale?: string; dark?: boolean; onOpen?: (id: string) => void; onNavigate?: () => void;
}) {
  if (!items || !items.length) return null;
  const t = T[locale] || T.en;
  return (
    <div className={`ac-wrap${dark ? ' ac-dark' : ''}`}>
      <style>{`
        .ac-wrap{margin-top:10px}
        .ac-h{display:block;font-family:var(--sans,'Jost',system-ui,sans-serif);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft,#6E6455);margin:2px 0 8px}
        .ac-dark .ac-h,.ac-dark .ac-note{color:#cdc4af}
        .ac-list{display:flex;flex-direction:column;gap:8px}
        .ac-card{display:flex;gap:10px;align-items:stretch;padding:8px;border:1px solid rgba(201,162,76,.35);border-radius:12px;background:#fff;color:#171922;text-decoration:none}
        .ac-card:hover{border-color:#C9A24C;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.08)}
        .ac-ic{flex:none;width:56px;height:56px;border-radius:10px;background:#f4eedf;color:#8a5b12;display:flex;align-items:center;justify-content:center}
        .ac-b{display:flex;flex-direction:column;min-width:0;flex:1;font-family:var(--sans,'Jost',system-ui,sans-serif)}
        .ac-k{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8a5b12;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ac-t{font-size:14px;font-weight:600;line-height:1.25;margin:2px 0 4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .ac-m{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin-top:auto;font-size:12px;color:#5b5647}
        .ac-m b{color:#171922;letter-spacing:.02em}
        .ac-go{margin-inline-start:auto;font-weight:700;color:#123A4A;white-space:nowrap}
        .ac-split{flex-direction:column;gap:6px}
        .ac-main{display:flex;gap:10px;align-items:stretch;color:inherit;text-decoration:none}
        .ac-main:hover{text-decoration:none}
        .ac-bookbtn{align-self:flex-end;font-size:12px;font-weight:700;color:#123A4A;border:1px solid rgba(18,58,74,.35);border-radius:999px;padding:3px 12px;text-decoration:none;white-space:nowrap}
        .ac-bookbtn:hover{background:#123A4A;color:#fff;text-decoration:none}
        .ac-note{display:block;margin-top:6px;font-family:var(--sans,'Jost',system-ui,sans-serif);font-size:11px;color:#6E6455}
      `}</style>
      <span className="ac-h">◆ {t.title}</span>
      <div className="ac-list">
        {items.map((a) => {
          const inner = (
            <>
              <span className="ac-ic" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
                  dangerouslySetInnerHTML={{ __html: kindOf(a.kind).icon }} />
              </span>
              <span className="ac-b">
                <span className="ac-k">{[a.kindLabel, a.town].filter(Boolean).join(' · ')}</span>
                <span className="ac-t">{a.title}</span>
                <span className="ac-m">
                  {a.area && a.area !== a.town ? <span>{a.area}</span> : null}
                  {a.duration ? <span>{a.duration}</span> : null}
                  {a.priceBand ? <span><b>{a.priceBand}</b>{a.priceBasis ? ` ${a.priceBasis}` : ''}</span> : null}
                  {a.pageHref ? null : <span className="ac-go">{t.book} ↗</span>}
                </span>
              </span>
            </>
          );
          // With a public page: the card opens OUR page; the partner link is a separate, secondary "Book" action.
          if (a.pageHref) {
            return (
              <div key={a.id} className="ac-card ac-split">
                <Link href={a.pageHref} className="ac-main" onClick={() => onNavigate?.()}>{inner}</Link>
                {a.url ? <a className="ac-bookbtn" href={a.url} target="_blank" rel="sponsored nofollow noopener" onClick={() => onOpen?.(a.id)}>{t.book} ↗</a> : null}
              </div>
            );
          }
          return (
            <a key={a.id} className="ac-card" href={a.url || '#'} target="_blank" rel="sponsored noopener" onClick={() => onOpen?.(a.id)}>{inner}</a>
          );
        })}
      </div>
      <span className="ac-note">{t.note}</span>
    </div>
  );
}
