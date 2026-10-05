// /booking/<token> — the guest's private status page. The token (in the link e-mailed to the guest) is the only credential;
// the page is never cached or indexed. It shows ONLY what the code enforces: the queue the request is in, the first-reply target,
// and partner replies that a person on the desk chose to share.
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isPlausibleRestoreToken, hashRestoreToken } from '@/lib/concierge/restoreToken';
import { supabaseStore } from '@/lib/booking/store';
import { bookingCopy, fill, type BookingCopy } from '@/lib/booking/copy';
import { formatWhen } from '@/lib/booking/mail';
import { formatCents } from '@/lib/booking/commission';
import { isTerminal } from '@/lib/booking/queue';
import { shareable } from '@/lib/booking/partnerFlow';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: bookingCopy(locale).pageTitle, robots: { index: false, follow: false }, referrer: 'no-referrer' };
}

export default async function GuestStatusPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const c = bookingCopy(l);
  const head = (
    <div className="page-head">
      <span className="kicker">{c.kicker}</span>
      <h1>{c.pageTitle}</h1>
      <div className="rule-orn orn"><span className="diamond" /></div>
    </div>
  );
  if (!isPlausibleRestoreToken(token)) return <div className="page wrap">{head}<p>{c.invalidLink}</p></div>;

  const store = supabaseStore(supabaseAdmin());
  const b = await store.getBookingByTokenHash(hashRestoreToken(token));
  if (!b) return <div className="page wrap">{head}<p>{c.invalidLink}</p></div>;
  const partners = (await store.listPartners(b.id)).filter((p) => p.shared_with_guest && shareable(p.status));

  const statusLabel = c[`st_${b.status}` as keyof BookingCopy] as string | undefined;
  const replyLine = b.first_response_at ? c.replyDone : isTerminal(b.status) ? '' : fill(c.replyTarget, { when: formatWhen(b.first_response_due_at, l) });

  return (
    <div className="page wrap">
      {head}
      <div style={{ maxWidth: 600 }}>
        <div style={{ border: '1px solid #e6e0d2', borderRadius: 6, padding: '20px 22px', background: '#fff', marginBottom: 20 }}>
          <div className="kicker">{c.reference}</div>
          <div style={{ margin: '4px 0 12px', fontSize: 22, letterSpacing: 1 }}><b>{b.ref}</b></div>
          <p style={{ margin: '0 0 6px', fontSize: 15 }}><b>{c.statusLabel}:</b> {statusLabel || b.status}</p>
          <p style={{ margin: '0 0 6px', fontSize: 15 }}><b>{c.queueLabel}:</b> {b.lane === 'member' ? c.queueMember : c.queueStandard}</p>
          {replyLine ? <p style={{ margin: '0 0 6px', fontSize: 15 }}>{replyLine}</p> : null}
          <p style={{ margin: '10px 0 0', fontSize: 13.5, color: '#6b6555' }}>{c.received}: {formatWhen(b.created_at, l)} · {c.hoursNote}</p>
          <p style={{ margin: '14px 0 0', fontSize: 15, fontStyle: 'italic', color: '#4a463d' }}>&ldquo;{b.query}&rdquo;</p>
        </div>

        <h2 style={{ fontSize: 20, margin: '0 0 8px' }}>{c.optionsTitle}</h2>
        {partners.length === 0 ? <p style={{ fontSize: 15 }}>{c.noOptions}</p> : (
          <>
            <p style={{ fontSize: 14, color: '#6b6555', margin: '0 0 10px' }}>{c.optionsIntro}</p>
            {partners.map((p) => (
              <div key={p.id} style={{ border: '1px solid #e6e0d2', borderRadius: 6, padding: '14px 18px', background: '#fff', marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: '#8a7a4a' }}>{c.partnerLabel}</div>
                <div style={{ fontSize: 17 }}><b>{p.partner_name}</b></div>
                {p.quote_amount_cents ? <div style={{ fontSize: 15, marginTop: 4 }}>{c.priceLabel}: <b>{formatCents(p.quote_amount_cents)}</b></div> : null}
                {p.response_note ? <div style={{ fontSize: 14.5, marginTop: 6, whiteSpace: 'pre-wrap' }}>{p.response_note}</div> : null}
              </div>
            ))}
            <p style={{ fontSize: 13.5, color: '#6b6555' }}>{c.disclosure}</p>
          </>
        )}
        <p style={{ marginTop: 22, fontSize: 13, color: '#8a8371' }}>{c.keepPrivate}</p>
      </div>
    </div>
  );
}
