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

  // Group upcoming events by calendar month.
  const groups: { key: string; label: string; items: typeof events }[] = [];
  for (const e of events) {
    const d = new Date(e.starts_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, label: fmtMonth.format(d), items: [] }; groups.push(g); }
    g.items.push(e);
  }

  const crumbLd = breadcrumbJsonLd(l, [{ name: t('brand.name'), path: '/' }, { name: t('nav.agenda'), path: '/agenda' }]);

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
        {groups.length ? groups.map((g) => (
          <div key={g.key} style={{ marginBottom: 26 }}>
            <h2 style={{ fontSize: 20, borderBottom: '1px solid #e6e0d2', paddingBottom: 6 }}>{g.label}</h2>
            {g.items.map((e) => (
              <article key={e.id} className="agenda-row" style={{ padding: '12px 0', borderBottom: '1px solid #f0ece0' }}>
                <div className="meta" style={{ color: '#8a8371' }}>
                  {fmtDay.format(new Date(e.starts_at))}
                  {e.venue ? ` · ${e.venue}` : e.district ? ` · ${e.district}` : ''}
                  {e.price ? ` · ${e.price}` : ''}
                </div>
                <h3 style={{ margin: '2px 0 4px' }}>
                  <Link href={`/agenda/${e.slug}`}>{e.title}</Link>
                </h3>
                {e.summary ? <p className="dek" style={{ margin: 0 }}>{e.summary}</p> : null}
              </article>
            ))}
          </div>
        )) : <p>{t('common.noResults')}</p>}
      </div>

      <NewsletterSignup />
    </>
  );
}
