import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { getFeatured, getLatest, getByCategory, getBanner, type Card } from '@/lib/queries';
import { pageMetadata, SITE_NAME } from '@/lib/seo';
import ArticleCard from '@/components/ArticleCard';
import CoverImage from '@/components/CoverImage';
import NewsletterSignup from '@/components/NewsletterSignup';
import SponsorBanner from '@/components/SponsorBanner';

// ISR: served static and fast, refreshed every 5 minutes (and on-demand via /api/revalidate).
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return pageMetadata({
    locale: locale as Locale, path: '/', title: SITE_NAME, absoluteTitle: true,
    description: t('brand.tagline'), ogTitle: t('brand.tagline'), kicker: 'Cyprus Lifestyle',
  });
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();

  const [featured, latest, propertyRaw, cultureRaw, escapesRaw, cyprusRaw, banner] = await Promise.all([
    getFeatured(l),
    getLatest(l, 14),
    getByCategory(l, 'property', 6),
    getByCategory(l, 'culture', 6),
    getByCategory(l, 'escapes', 6),
    getByCategory(l, 'cyprus', 6),
    getBanner(l),
  ]);

  const hero = featured;
  const used = new Set<string>();
  if (hero) used.add(hero.slug);
  const take = (list: Card[], n: number) => {
    const out: Card[] = [];
    for (const c of list) {
      if (out.length >= n) break;
      if (used.has(c.slug)) continue;
      out.push(c); used.add(c.slug);
    }
    return out;
  };

  // Claim the marquee sections first, then let "The Edit" take what's left.
  const property = take(propertyRaw, 2);
  const culture = take(cultureRaw, 3);
  const escapes = take([...escapesRaw, ...cyprusRaw], 2);
  const editLead = take(latest, 1)[0];
  const editList = take(latest, 3);

  const catLabel = (c: string | null) =>
    c ? (t.has(`nav.${c}`) ? t(`nav.${c}`) : c) : '';
  const byline = (c: Card) => {
    const parts: string[] = [];
    if (c.author_name) parts.push(`${t('common.byline')} ${c.author_name}`);
    if (c.reading_time_min) parts.push(`${c.reading_time_min} ${t('common.minRead')}`);
    return parts.join(' · ');
  };
  const metaLine = (c: Card) => c.author_name || catLabel(c.category);

  return (
    <>
      {hero ? (
        <section className="hero">
          <CoverImage src={hero.cover_image} seed={hero.slug} alt={hero.title} className="hero-media" sizes="100vw" priority />
          <div className="hero-scrim" />
          <span className="badge">{t('home.issue')}</span>
          <div className="wrap inner">
            <div className="kicker"><span className="b">{catLabel(hero.category)}</span> · {t('home.coverStory')}</div>
            <h1>{hero.title}</h1>
            {hero.excerpt ? <p className="stand">{hero.excerpt}</p> : null}
            <div className="herometa">
              <Link className="read" href={`/article/${hero.slug}`}>{t('home.readStory')}</Link>
              {byline(hero) ? <span className="by">{byline(hero)}</span> : null}
            </div>
          </div>
        </section>
      ) : null}

      {editLead ? (
        <section className="section wrap">
          <div className="sec-head">
            <div className="rule-orn"><span className="diamond" /></div>
            <div className="lbl">{t('home.edit')}</div>
            <div className="sub">{t('home.editSub')}</div>
          </div>
          <div className="edit">
            <article className="lead">
              <Link className="ph" href={`/article/${editLead.slug}`} aria-hidden="true" tabIndex={-1}>
                <CoverImage src={editLead.cover_image} seed={editLead.slug} alt={editLead.title} className="ph-img" sizes="(max-width: 900px) 100vw, 60vw" />
              </Link>
              <span className="kicker">{catLabel(editLead.category)}</span>
              <h3><Link href={`/article/${editLead.slug}`}>{editLead.title}</Link></h3>
              {editLead.excerpt ? <p className="stand">{editLead.excerpt}</p> : null}
              {byline(editLead) ? <div className="meta">{byline(editLead)}</div> : null}
            </article>
            {editList.length ? (
              <div className="edit-list">
                {editList.map((c, i) => (
                  <article className="eitem" key={c.id}>
                    <div className="no">{String(i + 1).padStart(2, '0')}</div>
                    <div>
                      <span className="kicker">{catLabel(c.category)}</span>
                      <h4><Link href={`/article/${c.slug}`}>{c.title}</Link></h4>
                      {c.excerpt ? <p>{c.excerpt}</p> : null}
                      {metaLine(c) ? <div className="m">{metaLine(c)}</div> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {banner ? <div className="wrap" style={{ marginBottom: 40 }}><SponsorBanner banner={banner} /></div> : null}

      {property.length >= 2 ? (
        <>
          <hr className="divider" />
          <section className="section wrap">
            <div className="sec-head">
              <div className="rule-orn"><span className="diamond" /></div>
              <div className="lbl">{t('home.property')}</div>
              <div className="sub">{t('home.propertySub')}</div>
            </div>
            <div className="grid g2">
              {property.map((c) => <ArticleCard key={c.id} card={c} wide kicker={catLabel(c.category)} readLabel={t('common.minRead')} />)}
            </div>
          </section>
        </>
      ) : null}

      <section className="manifesto">
        <div className="rule-orn"><span className="diamond" /></div>
        <p className="q">{t('home.manifestoLead')} <span className="g">{t('home.manifestoAccent')}</span></p>
        <div className="attr">{t('home.manifestoAttr')}</div>
      </section>

      {culture.length >= 2 ? (
        <section className="section wrap">
          <div className="sec-head">
            <div className="rule-orn"><span className="diamond" /></div>
            <div className="lbl">{t('home.culture')}</div>
            <div className="sub">{t('home.cultureSub')}</div>
          </div>
          <div className="grid g3">
            {culture.map((c) => <ArticleCard key={c.id} card={c} kicker={catLabel(c.category)} readLabel={t('common.minRead')} />)}
          </div>
        </section>
      ) : null}

      {escapes.length >= 2 ? (
        <>
          <hr className="divider" />
          <section className="section wrap">
            <div className="sec-head">
              <div className="rule-orn"><span className="diamond" /></div>
              <div className="lbl">{t('home.escapes')}</div>
              <div className="sub">{t('home.escapesSub')}</div>
            </div>
            <div className="grid g2">
              {escapes.map((c) => <ArticleCard key={c.id} card={c} wide kicker={catLabel(c.category)} readLabel={t('common.minRead')} />)}
            </div>
          </section>
        </>
      ) : null}

      <NewsletterSignup />
    </>
  );
}
