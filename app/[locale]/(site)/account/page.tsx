import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SESSION_COOKIE, resolveSession } from '@/lib/member/session';
import { accountState, keyDate, GRACE_DAYS } from '@/lib/member/entitlement';
import { AccountActions, AccountConfirm, AccountSignIn, type AccountLabels } from '@/components/account/AccountClient';

// Private and personal: never cached, never indexed.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return { title: t('account.title'), robots: { index: false, follow: false } };
}

const fmt = (iso: string | null, l: Locale) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(l === 'ar' ? 'ar' : l, { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return ''; }
};

export default async function AccountPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ restore?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const sp = await searchParams;

  const labels: AccountLabels = {
    emailPh: t('account.emailPh'), send: t('account.send'), sending: t('account.sending'), sent: t('account.sent'), invalid: t('account.invalid'), error: t('account.error'),
    confirming: t('account.confirming'), confirmExpired: t('account.confirmExpired'), confirmInvalid: t('account.confirmInvalid'), confirmError: t('account.confirmError'),
    manageBilling: t('account.manageBilling'), billingOpening: t('account.billingOpening'), billingError: t('account.billingError'), noBilling: t('account.noBilling'), rejoin: t('account.rejoin'),
    forget: t('account.forget'), forgetConfirm: t('account.forgetConfirm'), forgetDone: t('account.forgetDone'), signOut: t('account.signOut'), signOutAll: t('account.signOutAll'),
  };

  const head = (
    <div className="page-head">
      <span className="kicker">{t('account.kicker')}</span>
      <h1>{t('account.title')}</h1>
      <div className="rule-orn orn"><span className="diamond" /></div>
    </div>
  );

  // Opened from the e-mailed link.
  const token = typeof sp.restore === 'string' ? sp.restore : '';
  if (token) {
    return <div className="page wrap">{head}<AccountConfirm token={token} labels={labels} locale={locale} /></div>;
  }

  const session = await resolveSession(supabaseAdmin(), (await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) {
    return (
      <div className="page wrap">
        {head}
        <div className="prose" style={{ marginBottom: 18 }}><p>{t('account.intro')}</p></div>
        <AccountSignIn labels={labels} locale={locale} />
      </div>
    );
  }

  const m = session.member;
  const state = accountState(m);
  const date = fmt(keyDate(m), l);
  const features = t.raw('membership.concierge.features') as string[];
  const stateLabel = { active: t('account.stateActive'), complimentary: t('account.stateComplimentary'), ending: t('account.stateEnding'), payment_problem: t('account.stateProblem'), ended: t('account.stateEnded') }[state];
  const dateLine =
    state === 'active' ? (date ? t('account.renews', { date }) : '')
    : state === 'ending' ? t('account.endsOn', { date })
    : state === 'ended' ? (date ? t('account.endedOn', { date }) : '')
    : state === 'payment_problem' ? ''
    : '';
  const problemDate = state === 'payment_problem' ? fmt(new Date(Date.parse(m.current_period_end || m.updated_at || new Date().toISOString()) + GRACE_DAYS * 86_400_000).toISOString(), l) : '';
  const tone = state === 'payment_problem' ? '#9a5a12' : state === 'ended' ? '#8a8371' : '#1c6b34';

  return (
    <div className="page wrap">
      {head}
      <div style={{ maxWidth: 560 }}>
        <p style={{ margin: '0 0 14px', fontSize: 14, color: '#6b6555' }}>{t('account.signedInAs', { email: m.email || '' })}</p>
        <div style={{ border: '1px solid #e6e0d2', borderRadius: 6, padding: '20px 22px', background: '#fff', marginBottom: 20 }}>
          <div className="kicker">{t('membership.concierge.name')}</div>
          <div style={{ margin: '6px 0 4px', fontSize: 22, color: tone }}><b>{stateLabel}</b></div>
          {dateLine ? <div style={{ fontSize: 15, color: '#4a463d' }}>{dateLine}</div> : null}
          {state === 'payment_problem' ? <p style={{ fontSize: 14.5, margin: '10px 0 0' }}>{t('account.problemBody', { date: problemDate })}</p> : null}
          {state === 'ended' ? <p style={{ fontSize: 14.5, margin: '10px 0 0' }}>{t('account.endedBody')}</p> : null}
          {state !== 'ended' ? (
            <>
              <div className="kicker" style={{ marginTop: 18 }}>{t('account.benefits')}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
                {features.map((f, i) => <li key={i} style={{ padding: '5px 0', fontSize: 15 }}>◆&nbsp;&nbsp;{f}</li>)}
              </ul>
            </>
          ) : null}
        </div>
        <AccountActions labels={labels} locale={locale} hasBilling={!!m.stripe_customer_id} ended={state === 'ended'} />
        <p style={{ marginTop: 22, fontSize: 13.5 }}><Link href="/privacy" style={{ color: '#8a7a4a' }}>{t('account.privacy')}</Link></p>
      </div>
    </div>
  );
}
