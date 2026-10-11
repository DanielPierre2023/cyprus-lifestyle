// /booking/reply/<token> — the partner's magic-link page. Opening it (GET) changes nothing; the form POSTs to /api/bookings/partner.
// No guest contact details are shown; the desk relays everything.
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/locales';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isPlausibleRestoreToken } from '@/lib/concierge/restoreToken';
import { bookingDeps } from '@/lib/booking/runtime';
import { loadPartnerLink } from '@/lib/booking/engine';
import { bookingCopy } from '@/lib/booking/copy';
import PartnerReplyForm from '@/components/booking/PartnerReplyForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: bookingCopy(locale).ppTitle, robots: { index: false, follow: false }, referrer: 'no-referrer' };
}

export default async function PartnerReplyPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const c = bookingCopy(locale);
  const head = (
    <div className="page-head">
      <span className="kicker">Cyprus Lifestyle</span>
      <h1>{c.ppTitle}</h1>
      <div className="rule-orn orn"><span className="diamond" /></div>
    </div>
  );
  const link = isPlausibleRestoreToken(token) ? await loadPartnerLink(bookingDeps(supabaseAdmin()), token) : null;
  if (!link) return <div className="page wrap">{head}<p>{c.ppInvalid}</p></div>;
  if (link.state === 'closed') return <div className="page wrap">{head}<p>{c.ppClosed}</p></div>;
  if (link.state === 'expired') return <div className="page wrap">{head}<p>{c.ppExpired}</p></div>;
  const { booking: b, partner: p } = link;
  const request = [b.query, b.note, [b.category, b.district].filter(Boolean).join(' · ')].filter(Boolean).join('\n');

  const labels = {
    accept: c.ppAccept, quote: c.ppQuote, decline: c.ppDecline, alt: c.ppAlt, amount: c.ppAmount, note: c.ppNote, noteAlt: c.ppNoteAlt,
    send: c.ppSend, sending: c.ppSending, thanks: c.ppThanks, error: c.ppError, badAmount: c.ppBadAmount, needAlt: c.ppNeedAlt, expired: c.ppExpired, closed: c.ppClosed, noCommit: c.ppNoCommit,
    current: c.ppCurrent, statuses: { sent: c.pps_sent, accepted: c.pps_accepted, quoted: c.pps_quoted, declined: c.pps_declined, alternative: c.pps_alternative },
  };
  return (
    <div className="page wrap">
      {head}
      <div style={{ maxWidth: 600 }}>
        <p style={{ fontSize: 15 }}>{c.ppIntro}</p>
        <div style={{ border: '1px solid #e6e0d2', borderRadius: 6, padding: '16px 20px', background: '#fff', margin: '14px 0 20px' }}>
          <div className="kicker">{c.pRequestLabel} · {b.ref}</div>
          <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', fontSize: 15.5 }}>{request}</p>
        </div>
        <p style={{ fontSize: 13.5, color: '#6b6555' }}>{c.pPrivacy}</p>
        <PartnerReplyForm token={token} labels={labels} currentStatus={p.status} />
      </div>
    </div>
  );
}
