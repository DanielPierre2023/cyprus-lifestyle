import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { getEventBySlug, getListingsByDistrict } from '@/lib/queries';
import { breadcrumbJsonLd, eventJsonLd, ld, pageMetadata } from '@/lib/seo';
import DirectoryMap from '@/components/DirectoryMap';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const e = await getEventBySlug(locale as Locale, slug);
  if (!e) return {};
  return pageMetadata({ locale: locale as Locale, path: `/agenda/${slug}`, title: e.title, description: e.summary, cover: e.image, kicker: 'Agenda' });
}

export default async function EventDetail({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const e = await getEventBySlug(l, slug);
  if (!e) notFound();

  const dl = l === 'ar' ? 'ar' : l;
  const start = new Date(e.starts_at);
  const fmtFull = new Intl.DateTimeFormat(dl, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtTime = new Intl.DateTimeFormat(dl, { hour: '2-digit', minute: '2-digit' });
  const dateStr = fmtFull.format(start);
  const timeStr = fmtTime.format(start) + (e.ends_at ? `–${fmtTime.format(new Date(e.ends_at))}` : '');

  const nearby = e.district ? await getListingsByDistrict(l, e.district, 6) : [];
  const points = (e.lat != null && e.lng != null) ? [{ lat: e.lat, lng: e.lng, name: e.venue || e.title }] : [];

  const crumbLd = breadcrumbJsonLd(l, [
    { name: t('brand.name'), path: '/' },
    { name: t('nav.agenda'), path: '/agenda' },
    { name: e.title, path: `/agenda/${e.slug}` },
  ]);
  const evLd = eventJsonLd({
    locale: l, name: e.title, description: e.summary, startsAt: e.starts_at, endsAt: e.ends_at,
    venue: e.venue, district: e.district, url: e.url, image: e.image, lat: e.lat, lng: e.lng, price: e.price,
  });

  const card = { background: 'var(--paper, #fff)', border: '1px solid var(--line, #e3d9c4)', borderRadius: 6 };
  const facts: [string, string | null][] = [
    ['When', `${dateStr} · ${timeStr}`],
    ['Where', [e.venue, e.district].filter(Boolean).join(', ') || null],
    ['Price', e.price || null],
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(evLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />

      <div className="page wrap">
        <div className="page-head">
          <span className="kicker">
            <Link href="/agenda">{t('nav.agenda')}</Link>{e.district ? ` · ${e.district}` : ''}
          </span>
          <h1>{e.title}</h1>
          {e.summary ? <p className="dek">{e.summary}</p> : null}
          <div className="rule-orn orn"><span className="diamond" /></div>
        </div>

        {e.image ? (
          <img src={e.image} alt={e.title} style={{ width: '100%', maxHeight: 460, objectFit: 'cover', borderRadius: 6, marginBottom: 22 }} />
        ) : null}

        {/* Facts + tickets */}
        <div style={{ ...card, padding: 18, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ flex: '1 1 160px' }}>
                <div style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft, #8a8371)' }}>{k}</div>
                <div style={{ fontSize: 16, color: 'var(--ink, #171922)', marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>
          {e.url ? (
            <p style={{ marginTop: 16, marginBottom: 0 }}>
              <a className="btn" href={e.url} target="_blank" rel="noopener nofollow">Get tickets →</a>
            </p>
          ) : null}
        </div>

        {/* The place */}
        {(e.venue || points.length) ? (
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, marginBottom: 10 }}>The place</h2>
            {e.venue ? <p style={{ margin: '0 0 12px', color: 'var(--ink-soft, #5b5647)' }}><strong style={{ color: 'var(--ink, #171922)' }}>{e.venue}</strong>{e.district ? ` · ${e.district}` : ''}</p> : null}
            {points.length ? <DirectoryMap points={points} height={320} locale={l} /> : null}
          </section>
        ) : null}

        {/* While you're in the area */}
        {nearby.length ? (
          <section style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <h2 style={{ fontSize: 20, margin: 0 }}>While you&rsquo;re in {e.district}</h2>
              <Link href="/directory" style={{ fontSize: 14, color: 'var(--gold-deep, #a9832f)' }}>Explore the directory →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {nearby.map((n) => (
                <Link key={n.slug} href={`/directory/${n.type}/${n.slug}`} style={{ ...card, overflow: 'hidden', textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  {n.image ? <img src={n.image} alt={n.name} style={{ width: '100%', height: 120, objectFit: 'cover' }} /> : <div style={{ height: 120, background: 'var(--obsidian, #0B0E11)' }} />}
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--gold-deep, #a9832f)' }}>{t(`directory.${n.type}`)}</div>
                    <div style={{ fontWeight: 700, color: 'var(--ink, #171922)', margin: '2px 0 3px' }}>{n.name}</div>
                    {n.summary ? <div style={{ fontSize: 13, color: 'var(--ink-soft, #5b5647)', lineHeight: 1.4 }}>{n.summary.slice(0, 96)}{n.summary.length > 96 ? '…' : ''}</div> : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <p style={{ marginTop: 10 }}><Link href="/agenda" style={{ color: 'var(--gold-deep, #a9832f)' }}>← {t('nav.agenda')}</Link></p>
      </div>
    </>
  );
}
