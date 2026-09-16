import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { getUpcomingEvents } from '@/lib/queries';
import { breadcrumbJsonLd, eventJsonLd, ld, pageMetadata } from '@/lib/seo';
import NewsletterSignup from '@/components/NewsletterSignup';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return pageMetadata({ locale: locale as Locale, path: '/agenda', title: t('nav.agenda'), description: t('sections.agenda'), kicker: 'Cyprus Lifestyle' });
}

export default async function AgendaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const events = await getUpcomingEvents(l, 120);

  const dl = l === 'ar' ? 'ar' : l;
  const fmtDay = new Intl.DateTimeFormat(dl, { weekday: 'short', day: 'numeric', month: 'long' });
  const fmtMonth = new Intl.DateTimeFormat(dl, { month: 'long', year: 'numeric' });
  const fmtDnum = new Intl.DateTimeFormat(dl, { day: '2-digit' });
  const fmtMabbr = new Intl.DateTimeFormat(dl, { month: 'short' });

  const meta = (e: typeof events[number]) =>
    [fmtDay.format(new Date(e.starts_at)), e.venue || e.district || null, e.price || null].filter(Boolean).join(' · ');

  const crumbLd = breadcrumbJsonLd(l, [{ name: t('brand.name'), path: '/' }, { name: t('nav.agenda'), path: '/agenda' }]);

  const lead = events[0];
  const rest = events.slice(1);

  // Group the remaining events by calendar month.
  const groups: { key: string; label: string; items: typeof events }[] = [];
  for (const e of rest) {
    const d = new Date(e.starts_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, label: fmtMonth.format(d), items: [] }; groups.push(g); }
    g.items.push(e);
  }

  const card: React.CSSProperties = { border: '1px solid var(--line, #e6e0d2)', borderRadius: 8, overflow: 'hidden', background: 'var(--paper, #fff)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' };

  function Placeholder({ e, tall }: { e: typeof events[number]; tall?: boolean }) {
    return (
      <div style={{ height: tall ? '100%' : 170, minHeight: tall ? 300 : 170, background: 'linear-gradient(135deg, #12161b, #0B0E11)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--gold, #C9A24C)' }}>
        <div style={{ fontFamily: 'var(--disp, Georgia, serif)', fontSize: tall ? 68 : 40, lineHeight: 1, fontWeight: 600 }}>{fmtDnum.format(new Date(e.starts_at))}</div>
        <div style={{ textTransform: 'uppercase', letterSpacing: '.22em', fontSize: tall ? 14 : 11, marginTop: 6 }}>{fmtMabbr.format(new Date(e.starts_at))}</div>
      </div>
    );
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />
      {events.slice(0, 30).map((e) => (
        <script key={e.id} type="application/ld+json" dangerouslySetInnerHTML={{
          __html: ld(eventJsonLd({
            locale: l, name: e.title, description: e.summary, startsAt: e.starts_at, endsAt: e.ends_at,
            venue: e.venue, district: e.district, url: e.url, image: e.image, lat: e.lat, lng: e.lng, price: e.price,
          })),
        }} />
      ))}

      <div className="wrap dept">
        <span className="kicker">{t('brand.name')}</span>
        <h1>{t('nav.agenda')}</h1>
        <p className="desc">{t('sections.agenda')}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>

      <div className="wrap section">
        {lead ? (
          <Link href={`/agenda/${lead.slug}`} style={{ ...card, flexDirection: 'row', flexWrap: 'wrap', marginBottom: 34 }}>
            <div style={{ flex: '1 1 320px', minHeight: 300, position: 'relative' }}>
              {lead.image
                ? <img src={lead.image} alt={lead.title} style={{ width: '100%', height: '100%', minHeight: 300, objectFit: 'cover', display: 'block' }} />
                : <Placeholder e={lead} tall />}
            </div>
            <div style={{ flex: '1 1 320px', padding: '28px 30px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="kicker" style={{ color: 'var(--gold-deep, #a9832f)' }}>{meta(lead)}</span>
              <h2 style={{ fontFamily: 'var(--disp, Georgia, serif)', fontSize: 'clamp(26px, 3vw, 40px)', lineHeight: 1.08, margin: '10px 0 0', color: 'var(--ink, #171922)' }}>{lead.title}</h2>
              {lead.summary ? <p style={{ fontFamily: 'var(--body, Georgia, serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--ink-soft, #5b5647)', lineHeight: 1.5, margin: '14px 0 0' }}>{lead.summary}</p> : null}
              <span style={{ marginTop: 18, color: 'var(--gold-deep, #a9832f)', fontWeight: 600 }}>{t('common.readMore')} →</span>
            </div>
          </Link>
        ) : <p>{t('common.noResults')}</p>}

        {groups.map((g) => (
          <div key={g.key} style={{ marginBottom: 34 }}>
            <h2 style={{ fontSize: 20, borderBottom: '1px solid var(--line, #e6e0d2)', paddingBottom: 8, marginBottom: 18, textTransform: 'capitalize' }}>{g.label}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {g.items.map((e) => (
                <Link key={e.id} href={`/agenda/${e.slug}`} style={card}>
                  {e.image ? <img src={e.image} alt={e.title} style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }} /> : <Placeholder e={e} />}
                  <div style={{ padding: '14px 16px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--gold-deep, #a9832f)' }}>{meta(e)}</span>
                    <h3 style={{ fontFamily: 'var(--disp, Georgia, serif)', fontSize: 20, lineHeight: 1.15, margin: '6px 0 0', color: 'var(--ink, #171922)' }}>{e.title}</h3>
                    {e.summary ? <p style={{ fontSize: 14, color: 'var(--ink-soft, #5b5647)', lineHeight: 1.5, margin: '8px 0 0' }}>{e.summary.slice(0, 130)}{e.summary.length > 130 ? '…' : ''}</p> : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <NewsletterSignup />
    </>
  );
}
