import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { dateFormatter } from '@/lib/i18n/format';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { type EventItem } from '@/lib/queries';
import { getRecurringEvents, getUpcomingEvents } from '@/lib/queries.cached';
import { AGENDA_COPY, sourceLabel } from '@/lib/events/copy';
import { EVENT_SOURCES } from '@/lib/events/sources';
import { nicosiaDayKey, nicosiaDayStartMs, nicosiaParts, TZ } from '@/lib/events/time';
import { breadcrumbJsonLd, eventJsonLd, ld, pageMetadata } from '@/lib/seo';
import NewsletterSignup from '@/components/NewsletterSignup';
import CoverImage from '@/components/CoverImage';
import { isOptimisableImage } from '@/lib/images';

// ISR 1 h: DB webhooks call /api/revalidate/tags on every edit (PERFORMANCE-SETUP.md 2b); this is only the safety net. Keep equal to TTL in lib/queries.cached.ts.
export const revalidate = 3600;

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
  const c = AGENDA_COPY[l];
  const [all, recurring] = await Promise.all([getUpcomingEvents(l, 200), getRecurringEvents(l, 12)]);

  const dl = l === 'ar' ? 'ar' : l;
  // Always format in Cyprus time: the server runs in UTC, and an all-day event starts at 00:00 Cyprus time (the evening before in UTC).
  const fmtDay = new Intl.DateTimeFormat(dl, { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'long' });
  const fmtShortDay = new Intl.DateTimeFormat(dl, { timeZone: TZ, day: 'numeric', month: 'short' });
  const fmtMonth = new Intl.DateTimeFormat(dl, { timeZone: TZ, month: 'long', year: 'numeric' });
  const fmtMonthOnly = new Intl.DateTimeFormat(dl, { timeZone: TZ, month: 'long' });
  const fmtDnum = new Intl.DateTimeFormat(dl, { timeZone: TZ, day: '2-digit' });
  const fmtMabbr = new Intl.DateTimeFormat(dl, { timeZone: TZ, month: 'short' });

  const names = Object.fromEntries(EVENT_SOURCES.map((s) => [s.slug, s.attribution]));
  const todayStart = nicosiaDayStartMs(Date.now());
  const isHoliday = (e: EventItem) => e.tags.includes('public-holiday');
  const holidays = all.filter(isHoliday);
  const real = all.filter((e) => !isHoliday(e));
  const ongoing = real.filter((e) => Date.parse(e.starts_at) < todayStart);
  const events = real.filter((e) => Date.parse(e.starts_at) >= todayStart);

  const meta = (e: EventItem) => {
    const day = e.date_confidence === 'approximate' ? `${c.expectedAround}: ${fmtShortDay.format(new Date(e.starts_at))}` : fmtDay.format(new Date(e.starts_at));
    return [day, e.venue || e.district || null, e.price || null].filter(Boolean).join(' · ');
  };
  const ongoingMeta = (e: EventItem) =>
    [e.ends_at ? `${c.until} ${fmtShortDay.format(new Date(e.ends_at))}` : c.onNow, e.venue || e.district || null, e.price || null].filter(Boolean).join(' · ');

  const crumbLd = breadcrumbJsonLd(l, [{ name: t('brand.name'), path: '/' }, { name: t('nav.agenda'), path: '/agenda' }]);

  const lead = events[0];
  const rest = events.slice(1);

  // Group the remaining events by calendar month (Cyprus calendar).
  const groups: { key: string; label: string; items: EventItem[] }[] = [];
  for (const e of rest) {
    const p = nicosiaParts(Date.parse(e.starts_at));
    const key = `${p.y}-${p.m}`;
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, label: fmtMonth.format(new Date(e.starts_at)), items: [] }; groups.push(g); }
    g.items.push(e);
  }

  const card: React.CSSProperties = { border: '1px solid var(--line, #e6e0d2)', borderRadius: 8, overflow: 'hidden', background: 'var(--paper, #fff)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' };
  const small: React.CSSProperties = { fontSize: 12, color: 'var(--ink-soft, #5b5647)', marginTop: 8 };

  function Placeholder({ e, tall }: { e: EventItem; tall?: boolean }) {
    return (
      <div style={{ height: tall ? '100%' : 170, minHeight: tall ? 300 : 170, background: 'linear-gradient(135deg, #12161b, #0B0E11)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--gold, #C9A24C)' }}>
        <div style={{ fontFamily: 'var(--disp, Georgia, serif)', fontSize: tall ? 68 : 40, lineHeight: 1, fontWeight: 600 }}>{fmtDnum.format(new Date(e.starts_at))}</div>
        <div style={{ textTransform: 'uppercase', letterSpacing: '.22em', fontSize: tall ? 14 : 11, marginTop: 6 }}>{fmtMabbr.format(new Date(e.starts_at))}</div>
      </div>
    );
  }

  // The original-language notice + the source credit: information stays visible even where no translation exists.
  const Credit = ({ e }: { e: EventItem }) => {
    const src = sourceLabel(e.source, e.source_url, names);
    if (!src && !e.untranslated && e.date_confidence !== 'approximate') return null;
    return (
      <div style={small}>
        {e.date_confidence === 'approximate' ? <strong style={{ color: 'var(--gold-deep, #a9832f)' }}>{c.dateTbc}</strong> : null}
        {e.date_confidence === 'approximate' && (src || e.untranslated) ? ' · ' : null}
        {src ? <>{c.source}: {src}</> : null}
        {e.untranslated ? <>{src ? ' · ' : ''}{c.englishOnly}</> : null}
      </div>
    );
  };

  function Card({ e, ongoingCard }: { e: EventItem; ongoingCard?: boolean }) {
    return (
      <Link href={`/agenda/${e.slug}`} style={card}>
        {e.image
          ? (isOptimisableImage(e.image)
            ? <div style={{ position: 'relative', height: 170 }}><CoverImage src={e.image} seed={e.slug} alt={e.title} className="ph-img" sizes="(max-width: 700px) 100vw, 330px" /></div>
            : <img src={e.image} alt={e.title} style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }} loading="lazy" /> /* third-party hot-link */)
          : <Placeholder e={e} />}
        <div style={{ padding: '14px 16px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <span style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--gold-deep, #a9832f)' }}>{ongoingCard ? ongoingMeta(e) : meta(e)}</span>
          <h3 style={{ fontFamily: 'var(--disp, Georgia, serif)', fontSize: 20, lineHeight: 1.15, margin: '6px 0 0', color: 'var(--ink, #171922)' }}>{e.title}</h3>
          {e.summary ? <p style={{ fontSize: 14, color: 'var(--ink-soft, #5b5647)', lineHeight: 1.5, margin: '8px 0 0' }}>{e.summary.slice(0, 130)}{e.summary.length > 130 ? '…' : ''}</p> : null}
          <Credit e={e} />
        </div>
      </Link>
    );
  }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 };
  const h2: React.CSSProperties = { fontSize: 20, borderBottom: '1px solid var(--line, #e6e0d2)', paddingBottom: 8, marginBottom: 18 };
  const nothing = !lead && !ongoing.length && !recurring.length && !holidays.length;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />
      {real.slice(0, 30).filter((e) => e.date_confidence !== 'approximate').map((e) => (
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
                ? (isOptimisableImage(lead.image)
                  ? <CoverImage src={lead.image} seed={lead.slug} alt={lead.title} className="ph-img" sizes="(max-width: 700px) 100vw, 50vw" priority />
                  : <img src={lead.image} alt={lead.title} style={{ width: '100%', height: '100%', minHeight: 300, objectFit: 'cover', display: 'block' }} /> /* third-party hot-link: not embeddable via next/image */)
                : <Placeholder e={lead} tall />}
            </div>
            <div style={{ flex: '1 1 320px', padding: '28px 30px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="kicker" style={{ color: 'var(--gold-deep, #a9832f)' }}>{meta(lead)}</span>
              <h2 style={{ fontFamily: 'var(--disp, Georgia, serif)', fontSize: 'clamp(26px, 3vw, 40px)', lineHeight: 1.08, margin: '10px 0 0', color: 'var(--ink, #171922)' }}>{lead.title}</h2>
              {lead.summary ? <p style={{ fontFamily: 'var(--body, Georgia, serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--ink-soft, #5b5647)', lineHeight: 1.5, margin: '14px 0 0' }}>{lead.summary}</p> : null}
              <Credit e={lead} />
              <span style={{ marginTop: 18, color: 'var(--gold-deep, #a9832f)', fontWeight: 600 }}>{t('common.readMore')} →</span>
            </div>
          </Link>
        ) : null}

        {ongoing.length ? (
          <div style={{ marginBottom: 34 }}>
            <h2 style={h2}>{c.onNow}</h2>
            <div style={grid}>{ongoing.map((e) => <Card key={e.id} e={e} ongoingCard />)}</div>
          </div>
        ) : null}

        {groups.length ? <h2 style={{ ...h2, borderBottom: 'none', marginBottom: 6 }}>{c.comingUp}</h2> : null}
        {groups.map((g) => (
          <div key={g.key} style={{ marginBottom: 34 }}>
            <h3 style={{ ...h2, fontSize: 18, textTransform: 'capitalize' }}>{g.label}</h3>
            <div style={grid}>{g.items.map((e) => <Card key={e.id} e={e} />)}</div>
          </div>
        ))}

        {recurring.length ? (
          <div style={{ marginBottom: 34 }}>
            <h2 style={h2}>{c.recurringTitle}</h2>
            <p style={{ color: 'var(--ink-soft, #5b5647)', margin: '0 0 16px' }}>{c.recurringIntro}</p>
            <div style={grid}>
              {recurring.map((e) => (
                <Link key={e.id} href={`/agenda/${e.slug}`} style={{ ...card, padding: '16px 18px' }}>
                  <span style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--gold-deep, #a9832f)' }}>
                    {c.usuallyIn}: {fmtMonthOnly.format(new Date(e.starts_at))}{e.district ? ` · ${e.district}` : ''}
                  </span>
                  <h3 style={{ fontFamily: 'var(--disp, Georgia, serif)', fontSize: 20, lineHeight: 1.15, margin: '6px 0 0', color: 'var(--ink, #171922)' }}>{e.title}</h3>
                  <div style={small}>{c.lastHeld}: {fmtDay.format(new Date(e.starts_at))} · <strong style={{ color: 'var(--gold-deep, #a9832f)' }}>{c.dateTbc}</strong></div>
                  <Credit e={e} />
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {holidays.length ? (
          <div style={{ marginBottom: 34 }}>
            <h2 style={h2}>{c.holidaysTitle}</h2>
            <p style={{ color: 'var(--ink-soft, #5b5647)', margin: '0 0 12px' }}>{c.holidaysIntro}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px 24px' }}>
              {holidays.slice(0, 8).map((e) => (
                <li key={e.id} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <time dateTime={nicosiaDayKey(Date.parse(e.starts_at))} style={{ minWidth: 110, fontWeight: 600, color: 'var(--gold-deep, #a9832f)' }}>{fmtDay.format(new Date(e.starts_at))}</time>
                  <span>{e.title.replace(/\s*\(public holiday in Cyprus\)$/i, '').replace(/\s*\(αργία\)$/, '')}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {nothing ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <h2 style={{ fontFamily: 'var(--disp, Georgia, serif)' }}>{c.emptyTitle}</h2>
            <p style={{ color: 'var(--ink-soft, #5b5647)' }}>{c.emptyText}</p>
          </div>
        ) : null}
      </div>

      <NewsletterSignup />
    </>
  );
}
