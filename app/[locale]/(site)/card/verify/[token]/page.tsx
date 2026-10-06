// /card/verify/<token> — what venue staff see when they scan a member card. Public (no login), never cached, never indexed.
// It shows ONLY: valid / not valid, "Member", the first name or initials the member chose (if any), and the year they joined.
// No e-mail, no phone, no member id. Offers (if the owner added any) can be marked "Redeemed" by the staff.
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/ratelimit';
import { isPlausibleRestoreToken } from '@/lib/concierge/restoreToken';
import { verdictFor } from '@/lib/member/card';
import { liveOffers, lookupCard, redeemedToday } from '@/lib/member/cardStore';
import { offerText } from '@/lib/member/offers';
import { cardCopy, fillCard } from '@/lib/member/cardCopy';
import { RedeemButton } from '@/components/card/RedeemButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: cardCopy(locale).vTitle, robots: { index: false, follow: false, nocache: true }, referrer: 'no-referrer' };
}

export default async function VerifyCardPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const c = cardCopy(l);
  const head = (
    <div className="page-head">
      <span className="kicker">{c.vKicker}</span>
      <h1>{c.vTitle}</h1>
      <div className="rule-orn orn"><span className="diamond" /></div>
    </div>
  );
  const shell = (body: React.ReactNode) => <div className="page wrap">{head}<div style={{ maxWidth: 520 }}>{body}</div></div>;
  const invalid = shell(
    <div role="status" style={{ border: '1px solid #d9b8b0', borderRadius: 6, padding: '22px', background: '#fff' }}>
      <div style={{ fontSize: 26, color: '#a3341f' }}><b>✕ {c.vInvalid}</b></div>
      <p style={{ margin: '10px 0 0', fontSize: 15 }}>{c.vInvalidNote}</p>
    </div>,
  );
  if (!isPlausibleRestoreToken(token)) return invalid;

  // Per-address brake on lookups (tokens are 256-bit, so this only stops scripted noise).
  const req = new Request('https://card.invalid/verify', { headers: await headers() });
  if (!(await rateLimit(req, 'card-verify', 60, 60))) return shell(<p style={{ fontSize: 15 }}>{c.vBusy}</p>);

  const sb = supabaseAdmin();
  const found = await lookupCard(sb, token);
  const verdict = found ? verdictFor(found.member, found.displayName) : { valid: false as const };
  if (!found || !verdict.valid) return invalid;

  const offers = await liveOffers(sb);
  const done = await redeemedToday(sb, found.member.id, offers.map((o) => o.id));

  return shell(
    <>
      <div role="status" style={{ border: '1px solid #b9d6c2', borderRadius: 6, padding: '22px', background: '#fff', marginBottom: 18 }}>
        <div style={{ fontSize: 28, color: '#1c6b34' }}><b>✓ {c.vValid}</b></div>
        <div style={{ margin: '10px 0 2px', fontSize: 22 }}><b>{c.vMember}</b></div>
        {verdict.name ? <div style={{ fontSize: 19 }}>{verdict.name}</div> : null}
        {verdict.sinceYear ? <div style={{ fontSize: 15, color: '#4a463d', marginTop: 2 }}>{fillCard(c.vSince, { year: verdict.sinceYear })}</div> : null}
      </div>
      {offers.length > 0 ? (
        <section aria-labelledby="vo" style={{ border: '1px solid #e6e0d2', borderRadius: 6, padding: '18px 20px', background: '#fff', marginBottom: 14 }}>
          <div className="kicker" id="vo">{c.vOffersTitle}</div>
          {offers.map((o) => (
            <div key={o.id} style={{ padding: '12px 0', borderTop: '1px solid #f0ece0' }}>
              <div style={{ fontSize: 16 }}><b>{o.partner_name}</b></div>
              <div style={{ fontSize: 15, margin: '2px 0 0' }}>{offerText(o, l)}</div>
              <RedeemButton token={token} offerId={o.id} done={done.has(o.id)} labels={{ redeem: c.vRedeem, redeeming: c.vRedeeming, redeemed: c.vRedeemed, already: c.vAlready, unavailable: c.vUnavailable, rateLimited: c.vRateLimited, error: c.vError }} />
            </div>
          ))}
          <p style={{ margin: '10px 0 0', fontSize: 13, color: '#6b6555' }}>{c.vRedeemNote}</p>
        </section>
      ) : null}
      <p style={{ fontSize: 13, color: '#8a8371' }}>{c.vScope}</p>
    </>,
  );
}
