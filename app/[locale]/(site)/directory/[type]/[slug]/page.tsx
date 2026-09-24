import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { DIRECTORY_TYPES, getListing, getNearby, getPeers, getEventsByDistrict, getCollectionBySlug } from '@/lib/queries';
import { collectionSlug, slugifyDistrict, districtLabel } from '@/lib/collections';
import { pageMetadata } from '@/lib/seo';
import { JsonLd, localBusiness, breadcrumb } from '@/lib/seo/jsonld';
import DirectoryMap from '@/components/DirectoryMap';
import CoverImage from '@/components/CoverImage';
import TrackView from '@/components/TrackView';
import TrackedCTA from '@/components/TrackedCTA';
import EnquiryForm, { type EnquiryLabels } from '@/components/EnquiryForm';
import { TAXI_APPS } from '@/lib/mobility';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; type: string; slug: string }> }): Promise<Metadata> {
  const { locale, type, slug } = await params;
  if (!isLocale(locale)) return {};
  const listing = await getListing(locale as Locale, slug);
  if (!listing) return {};
  return pageMetadata({
    locale: locale as Locale, path: `/directory/${type}/${slug}`,
    title: listing.name, description: listing.summary, cover: listing.image, kicker: 'Cyprus Lifestyle',
  });
}

const TYPE_DOT: Record<string, string> = {
  restaurant: '#C0492E', winery: '#7B2D42', hotel: '#1F6F78',
  beach: '#2F86C4', development: '#8A6D3B', vendor: '#4E7A46',
};

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return <span aria-label={`${rating}/5`} style={{ color: '#C9A24C', letterSpacing: 1 }}>{'★'.repeat(full)}<span style={{ color: '#d9cfba' }}>{'★'.repeat(5 - full)}</span></span>;
}

export default async function ListingDetail({ params }: { params: Promise<{ locale: string; type: string; slug: string }> }) {
  const { locale, type, slug } = await params;
  if (!isLocale(locale) || !DIRECTORY_TYPES.includes(type as never)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const x = await getListing(l, slug);
  if (!x) notFound();

  const [nearby, peers, events, collection] = await Promise.all([
    x.lat != null && x.lng != null ? getNearby(l, x.lat, x.lng, x.slug) : Promise.resolve([]),
    getPeers(l, { type: x.type, subtype: x.subtype, category_group: x.category_group, district: x.district }, x.slug, 4),
    getEventsByDistrict(l, x.district, 3),
    x.district ? getCollectionBySlug(collectionSlug(x.type, slugifyDistrict(x.district))) : Promise.resolve(null),
  ]);

  const label = t(`directory.${x.type}`);
  const typeLabels: Record<string, string> = Object.fromEntries(DIRECTORY_TYPES.map((ty) => [ty, t(`directory.${ty}`)]));
  const listLd = localBusiness({
    locale: l, slug: x.slug, type: x.type, name: x.name, description: x.summary,
    url: x.url, image: x.image, address: x.address, lat: x.lat, lng: x.lng,
    district: x.district, priceRange: x.price_band, rating: x.rating, ratingCount: x.rating_count,
    phone: x.phone,
  });
  const crumbLd = breadcrumb(l, [
    { name: t('brand.name'), path: '/' },
    { name: t('directory.title'), path: '/directory' },
    { name: label, path: `/directory/${x.type}` },
    { name: x.name, path: `/directory/${x.type}/${x.slug}` },
  ]);
  const directions = (x.lat != null && x.lng != null) ? `https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lng}` : null;
  const points = (x.lat != null && x.lng != null)
    ? [{ lat: x.lat, lng: x.lng, name: x.name, type: x.type, image: x.image },
       ...nearby.filter((n) => n.lat != null && n.lng != null).map((n) => ({ lat: n.lat as number, lng: n.lng as number, name: n.name, type: n.type, image: n.image, href: `/${l}/directory/${n.type}/${n.slug}` }))]
    : [];
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(l, { day: 'numeric', month: 'short' });
  const enqLabels: EnquiryLabels = {
    title: t('enquiry.title'), intro: t('enquiry.intro'), name: t('enquiry.name'),
    email: t('enquiry.email'), message: t('enquiry.message'), send: t('enquiry.send'),
    sending: t('enquiry.sending'), success: t('enquiry.success'), error: t('enquiry.error'),
  };

  return (
    <>
      <TrackView slug={x.slug} type={x.type} name={x.name} image={x.image} district={x.district} />
      <JsonLd data={listLd} />
      <JsonLd data={crumbLd} />

      {/* ── Hero ── */}
      <div className="wrap" style={{ paddingTop: 22 }}>
        <span className="kicker"><Link href="/directory">{t('directory.title')}</Link> · <Link href={`/directory/${x.type}`}>{label}</Link>{x.district ? ` · ${x.district}` : ''}</span>
      </div>
      <div className="wrap" style={{ marginTop: 12 }}>
        <div className="lh-hero">
          <div className="lh-hero-img">
            <CoverImage src={x.image} seed={x.slug} alt={x.name} className="ph-img" sizes="(max-width: 1000px) 100vw, 1000px" priority fallbackKind="brand" />
          </div>
          <div className="lh-hero-cap">
            <h1 style={{ margin: 0 }}>{x.name}</h1>
            <div className="lh-badges">
              {x.rating != null ? <span className="lh-badge"><Stars rating={x.rating} /> <b>{x.rating.toFixed(1)}</b>{x.rating_count ? <span className="muted"> · {x.rating_count.toLocaleString(l)} {t('directory.reviews')}</span> : null}</span> : null}
              {x.price_band ? <span className="lh-badge">{x.price_band}</span> : null}
              {x.featured ? <span className="lh-badge featured">★ {t('enquiry.featured')}</span> : null}
              {x.verified ? <span className="lh-badge verified">✓ {t('directory.verified')}</span> : null}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body: description + facts/actions ── */}
      <div className="wrap lh-grid">
        <div className="lh-main">
          {x.summary ? <p className="lh-desc">{x.summary}</p> : null}

          {nearby.length ? (
            <section className="lh-sec">
              <h2 className="lh-h2">{t('directory.around')}</h2>
              <p className="lh-sub">{t('directory.aroundSub')}</p>
              <div className="grid g3 lh-around">
                {nearby.map((n) => (
                  <article key={n.id} className="card">
                    <Link href={`/directory/${n.type}/${n.slug}`} className="ph" aria-hidden="true" tabIndex={-1}>
                      <CoverImage src={n.image} seed={n.slug} alt={n.name} className="ph-img" sizes="(max-width: 900px) 50vw, 300px" fallbackKind="brand" />
                    </Link>
                    <span className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_DOT[n.type] || '#C9A24C', display: 'inline-block' }} />
                      {typeLabels[n.type] || n.type} · {n.distanceKm < 1 ? `${Math.round(n.distanceKm * 1000)} m` : `${n.distanceKm.toFixed(1)} km`}
                    </span>
                    <h3 style={{ fontSize: 19 }}><Link href={`/directory/${n.type}/${n.slug}`}>{n.name}</Link></h3>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {peers.length ? (
            <section className="lh-sec">
              <h2 className="lh-h2">{t('directory.compare')}</h2>
              <p className="lh-sub">{t('directory.compareSub')}</p>
              <div className="lh-cmp-wrap">
                <table className="lh-cmp">
                  <thead><tr><th>{label}</th><th>{t('directory.rating')}</th><th>{t('directory.price')}</th><th></th></tr></thead>
                  <tbody>
                    <tr className="me">
                      <td className="nm">{x.name}</td>
                      <td>{x.rating != null ? x.rating.toFixed(1) : '—'}</td>
                      <td>{x.price_band || '—'}</td>
                      <td></td>
                    </tr>
                    {peers.map((p) => (
                      <tr key={p.id}>
                        <td className="nm"><Link href={`/directory/${p.type}/${p.slug}`}>{p.name}</Link></td>
                        <td>{p.rating != null ? p.rating.toFixed(1) : '—'}</td>
                        <td>{p.price_band || '—'}</td>
                        <td><Link className="lh-view" href={`/directory/${p.type}/${p.slug}`}>{t('directory.view')} →</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {collection ? (
                <p className="lh-more"><Link href={`/best/${collection.slug}`}>{t('collections.heading', { type: label, place: districtLabel(x.district as string) })} →</Link></p>
              ) : null}
            </section>
          ) : null}

          {events.length ? (
            <section className="lh-sec">
              <h2 className="lh-h2">{t('directory.whatsOn')}</h2>
              <div className="lh-events">
                {events.map((e) => (
                  <Link key={e.id} href={`/agenda/${e.slug}`} className="lh-event">
                    <span className="d">{fmtDate(e.starts_at)}</span>
                    <span className="ti">{e.title}{e.venue ? <span className="muted"> · {e.venue}</span> : null}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* ── Sticky facts / actions ── */}
        <aside className="lh-side">
          <div className="lh-card">
            <div className="lh-facts">
              {x.address ? <div className="lh-fact"><span className="k">{t('directory.address')}</span><span className="v">{x.address}</span></div> : null}
              {x.district ? <div className="lh-fact"><span className="k">{t('directory.district')}</span><span className="v" style={{ textTransform: 'capitalize' }}>{x.district}</span></div> : null}
              {x.price_band ? <div className="lh-fact"><span className="k">{t('directory.price')}</span><span className="v">{x.price_band}</span></div> : null}
              {x.rating != null ? <div className="lh-fact"><span className="k">{t('directory.rating')}</span><span className="v">{x.rating.toFixed(1)} / 5{x.rating_count ? ` · ${x.rating_count.toLocaleString(l)}` : ''}</span></div> : null}
              {x.phone ? <div className="lh-fact"><span className="k">{t('directory.phone')}</span><span className="v"><TrackedCTA slug={x.slug} label="phone" href={`tel:${x.phone.replace(/\s+/g, '')}`}>{x.phone}</TrackedCTA></span></div> : null}
            </div>
            <div className="lh-actions">
              {x.url ? <TrackedCTA slug={x.slug} label="website" className="btn" href={x.url} target="_blank" rel="noopener nofollow">{t('directory.visit')}</TrackedCTA> : null}
              {directions ? <TrackedCTA slug={x.slug} label="directions" className="btn ghost" href={directions} target="_blank" rel="noopener noreferrer">{t('directory.directions')}</TrackedCTA> : null}
            </div>
            {directions ? (
              <div className="lh-ride">
                <span className="lh-ride-k">{t('directory.getARide')}</span>
                <span className="lh-ride-apps">{TAXI_APPS.map((a) => <a key={a.name} href={a.url} target="_blank" rel="noopener nofollow">{a.name}</a>)}</span>
              </div>
            ) : null}
          </div>
          {points.length ? <div className="lh-map"><DirectoryMap points={points} height={300} locale={l} typeLabels={typeLabels} viewLabel={t('directory.view')} placesLabel={t('directory.places')} ariaLabel={t('directory.mapAria')} /></div> : null}
          <EnquiryForm listingSlug={x.slug} listingType={x.type} listingName={x.name} locale={l} labels={enqLabels} />
          <p className="lh-trust">◆ {t('trust.independent')} <Link href="/standards">{t('trust.link')} →</Link></p>
        </aside>
      </div>

      <style>{`
        .lh-hero{position:relative;border-radius:6px;overflow:hidden;border:1px solid var(--line,#e0d6c1)}
        .lh-hero-img{position:relative;aspect-ratio:16/8;background:linear-gradient(135deg,#1c2b33,#0B0E11)}
        .lh-hero-img .ph-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .lh-hero-cap{position:absolute;left:0;right:0;bottom:0;padding:26px 28px 22px;color:#fff;background:linear-gradient(to top,rgba(6,8,10,.82),rgba(6,8,10,.25) 60%,transparent)}
        .lh-hero-cap h1{color:#fff;font-size:clamp(28px,4.6vw,46px);line-height:1.05}
        .lh-badges{display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:12px;font-family:var(--sans);font-size:14px;align-items:center}
        .lh-badge{display:inline-flex;align-items:center;gap:6px;color:#f3ecdd}
        .lh-badge.verified{color:#F1D592;border:1px solid rgba(241,213,146,.5);border-radius:999px;padding:1px 10px;font-size:12px;font-weight:600}
        .lh-badge.featured{color:#0B0E11;background:#F1D592;border-radius:999px;padding:1px 10px;font-size:12px;font-weight:700}
        .lh-badge .muted{color:#c9c0ad}
        .lh-grid{display:grid;grid-template-columns:1fr 340px;gap:40px;margin-top:34px;align-items:start}
        .lh-desc{font-family:var(--body);font-size:20px;line-height:1.55;color:var(--ink-soft,#5b5346)}
        .lh-sec{margin-top:40px}
        .lh-h2{font-family:var(--disp);font-weight:600;font-size:26px;margin:0 0 4px}
        .lh-sub{font-family:var(--body);font-style:italic;color:var(--ink-soft,#5b5346);margin:0 0 18px}
        .lh-around .card h3{margin-top:8px}
        .lh-cmp-wrap{overflow-x:auto;border:1px solid var(--line,#e0d6c1);border-radius:6px}
        table.lh-cmp{border-collapse:collapse;width:100%;min-width:420px;font-family:var(--sans);font-size:15px;background:#fff}
        table.lh-cmp th,table.lh-cmp td{text-align:left;padding:12px 16px;border-bottom:1px solid var(--line,#e0d6c1)}
        table.lh-cmp thead th{text-transform:uppercase;letter-spacing:.1em;font-size:11px;color:var(--ink-soft,#5b5346);background:var(--paper-2,#efe8d8)}
        table.lh-cmp tbody tr:last-child td{border-bottom:0}
        table.lh-cmp .nm{font-family:var(--disp);font-size:17px}
        table.lh-cmp tr.me{background:rgba(201,162,76,.12)}
        table.lh-cmp tr.me .nm::after{content:'THIS';font-family:var(--sans);font-size:9px;letter-spacing:.1em;color:#8a5b12;border:1px solid #C9A24C;border-radius:4px;padding:1px 5px;margin-left:8px;vertical-align:middle}
        .lh-view{font-size:13px;white-space:nowrap}
        .lh-more{margin-top:14px;font-family:var(--sans);font-size:15px}
        .lh-events{display:flex;flex-direction:column;border:1px solid var(--line,#e0d6c1);border-radius:6px;overflow:hidden}
        .lh-event{display:flex;gap:14px;align-items:baseline;padding:13px 16px;border-bottom:1px solid var(--line,#e0d6c1);background:#fff}
        .lh-event:last-child{border-bottom:0}
        .lh-event:hover{background:var(--paper-2,#efe8d8);text-decoration:none}
        .lh-event .d{font-family:var(--sans);text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:#8a5b12;font-weight:600;min-width:56px}
        .lh-event .ti{font-family:var(--disp);font-size:17px;color:var(--ink,#171310)}
        .lh-event .muted{color:var(--ink-soft,#5b5346);font-family:var(--body);font-size:14px}
        .lh-side{position:sticky;top:90px;display:flex;flex-direction:column;gap:16px}
        .lh-card{background:#fff;border:1px solid var(--line,#e0d6c1);border-radius:6px;padding:18px 20px}
        .lh-facts{display:flex;flex-direction:column;gap:12px;margin-bottom:16px}
        .lh-fact{display:flex;flex-direction:column;gap:2px}
        .lh-fact .k{font-family:var(--sans);text-transform:uppercase;letter-spacing:.12em;font-size:10.5px;color:var(--ink-soft,#5b5346)}
        .lh-fact .v{font-family:var(--body);font-size:16px;color:var(--ink,#171310)}
        .lh-actions{display:flex;flex-direction:column;gap:9px}
        .lh-actions .btn{text-align:center}
        .lh-ride{margin-top:14px;display:flex;flex-direction:column;gap:6px}
        .lh-ride-k{font-family:var(--sans);text-transform:uppercase;letter-spacing:.12em;font-size:10.5px;color:var(--ink-soft,#5b5346)}
        .lh-ride-apps{display:flex;flex-wrap:wrap;gap:8px}
        .lh-ride-apps a{font-family:var(--sans);font-size:13px;color:#8a5b12;font-weight:600;border:1px solid var(--line,#e0d6c1);border-radius:999px;padding:3px 11px}
        .lh-ride-apps a:hover{border-color:#C9A24C;text-decoration:none}
        .lh-map{border-radius:6px;overflow:hidden}
        .lh-trust{font-family:var(--sans);font-size:12px;color:var(--ink-soft,#5b5346);line-height:1.5;margin:2px 0 0}
        .lh-trust a{color:#8a5b12;font-weight:600}
        @media (max-width:900px){.lh-grid{grid-template-columns:1fr;gap:26px}.lh-side{position:static}}
      `}</style>
    </>
  );
}
