import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SESSION_COOKIE, resolveBusinessSession } from '@/lib/business/auth';
import { listLeads, listSubmissions, listingStats, managedListings } from '@/lib/business/data';
import { BizConfirm, BizSignIn, BizSignOut, LeadList, ProposalForm, SubmissionList, type L, type Sub } from '@/components/business/BusinessClient';

// Private and personal: never cached, never indexed.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return { title: t('business.title'), robots: { index: false, follow: false } };
}

const TABS = ['overview', 'proposals', 'enquiries'] as const;

export default async function BusinessHubPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string; tab?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const L = t.raw('business') as L;
  const sp = await searchParams;
  const fmt = (iso: string) => { try { return new Date(iso).toLocaleDateString(l, { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return ''; } };

  const head = (
    <div className="page-head">
      <span className="kicker">{L.kicker}</span>
      <h1>{L.title}</h1>
      <div className="rule-orn orn"><span className="diamond" /></div>
    </div>
  );

  const token = typeof sp.token === 'string' ? sp.token : '';
  if (token) return <div className="page wrap">{head}<BizConfirm token={token} L={L} locale={locale} /></div>;

  const sb = supabaseAdmin();
  const session = await resolveBusinessSession(sb, (await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) {
    return (
      <div className="page wrap">
        {head}
        <div className="prose" style={{ marginBottom: 18 }}><p>{L.intro}</p></div>
        <BizSignIn L={L} locale={locale} />
      </div>
    );
  }

  const account = session.account;
  const listings = await managedListings(sb, account);
  const slugs = listings.map((x) => x.slug);
  const tab = (TABS as readonly string[]).includes(String(sp.tab)) ? String(sp.tab) : 'overview';
  const opts = listings.map((x) => ({ slug: x.slug, name: x.name }));
  const nameOf = new Map(listings.map((x) => [x.slug, x.name]));

  const nav = (
    <nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap', margin: '0 0 22px', fontSize: 15 }} aria-label={L.title}>
      {TABS.map((k) => (
        <Link key={k} href={k === 'overview' ? '/account/business' : `/account/business?tab=${k}`}
          style={{ color: tab === k ? '#0B0E11' : '#8a7a4a', borderBottom: tab === k ? '2px solid #C9A24C' : '2px solid transparent', paddingBottom: 3, textDecoration: 'none' }}>
          {k === 'overview' ? L.tabOverview : k === 'proposals' ? L.tabSubmissions : L.tabLeads}
        </Link>
      ))}
    </nav>
  );
  const card = { border: '1px solid #e6e0d2', borderRadius: 6, padding: '18px 20px', background: '#fff', marginBottom: 16 } as const;
  const ctaName = (c: string) => ({ website: L.ctaWebsite, phone: L.ctaPhone, directions: L.ctaDirections, email: L.ctaEmail } as Record<string, string>)[c] || L.ctaOther;

  let body: React.ReactNode;
  if (listings.length === 0) {
    body = <p style={{ color: '#6b6555' }}>{L.noListings}</p>;
  } else if (tab === 'proposals') {
    const subs = await listSubmissions(sb, account.id);
    const items: Sub[] = subs.map((s) => ({
      id: s.id, listing_slug: s.listing_slug, listing_name: nameOf.get(s.listing_slug) || s.listing_slug, kind: s.kind, payload: s.payload, status: s.status,
      desk_note: s.desk_note, created_at: s.created_at, applied: !!s.applied_at,
    }));
    body = (
      <>
        <h2 style={{ fontSize: 20 }}>{L.subHeading}</h2>
        <p style={{ maxWidth: 620 }}>{L.subIntro}</p>
        <ProposalForm L={L} locale={locale} listings={opts} />
        <div style={{ height: 28 }} />
        <SubmissionList L={L} locale={locale} subs={items} listings={opts} dateFmt={Object.fromEntries(items.map((s) => [s.id, fmt(s.created_at)]))} />
      </>
    );
  } else if (tab === 'enquiries') {
    const leads = await listLeads(sb, slugs);
    body = (
      <>
        <h2 style={{ fontSize: 20 }}>{L.leadsHeading}</h2>
        <p style={{ maxWidth: 620 }}>{L.leadsIntro}</p>
        <LeadList L={L} leads={leads.map((x) => ({ id: x.id, listing_name: x.listing_name, listing_slug: x.listing_slug, name: x.name, email: x.email, message: x.message, status: x.status, date: fmt(x.created_at) }))} />
      </>
    );
  } else {
    const stats = await listingStats(sb, slugs);
    body = (
      <>
        <h2 style={{ fontSize: 20 }}>{L.listingsHeading}</h2>
        {listings.map((x) => {
          const s = stats.find((y) => y.slug === x.slug)!;
          return (
            <div key={x.slug} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <b style={{ fontSize: 18 }}>{x.name}</b>
                {x.type ? <Link href={`/directory/${x.type}/${x.slug}`} style={{ color: '#8a7a4a', fontSize: 14 }}>{L.openListing}</Link> : null}
              </div>
              <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, margin: '14px 0 0' }}>
                <div><dt style={{ fontSize: 13, color: '#6b6555' }}>{L.enquiries}</dt><dd style={{ margin: 0, fontSize: 22 }}>{s.enquiries.total}</dd>
                  <dd style={{ margin: 0, fontSize: 13, color: '#6b6555' }}>{s.enquiries.last30d} {L.enquiries30}<br />{s.enquiries.new} {L.enquiriesNew}</dd></div>
                <div><dt style={{ fontSize: 13, color: '#6b6555' }}>{L.ctaClicks}</dt><dd style={{ margin: 0, fontSize: 22 }}>{s.ctaTotal}</dd>
                  <dd style={{ margin: 0, fontSize: 13, color: '#6b6555' }}>{s.cta.length ? s.cta.map((c) => `${ctaName(c.label)} ${c.clicks}`).join(' · ') : L.ctaNone}</dd></div>
                <div><dt style={{ fontSize: 13, color: '#6b6555' }}>{L.recommended}</dt><dd style={{ margin: 0, fontSize: 22 }}>{s.recommended}</dd>
                  <dd style={{ margin: 0, fontSize: 13, color: '#6b6555' }}>{s.recommendedClicks} {L.recommendedClicks}</dd></div>
                <div><dt style={{ fontSize: 13, color: '#6b6555' }}>{L.reviews}</dt><dd style={{ margin: 0, fontSize: 22 }}>{s.reviews.count}{s.reviews.average !== null ? ` · ${s.reviews.average.toFixed(1)}/5` : ''}</dd>
                  {s.reviews.count === 0 ? <dd style={{ margin: 0, fontSize: 13, color: '#6b6555' }}>{L.noReviews}</dd> : null}</div>
              </dl>
            </div>
          );
        })}
        <p style={{ fontSize: 13.5, color: '#6b6555', maxWidth: 620 }}>{L.statsNote}</p>
      </>
    );
  }

  return (
    <div className="page wrap">
      {head}
      <p style={{ margin: '0 0 14px', fontSize: 14, color: '#6b6555' }}>{t('business.signedInAs', { email: account.email })}</p>
      {nav}
      {body}
      <BizSignOut L={L} locale={locale} />
    </div>
  );
}
