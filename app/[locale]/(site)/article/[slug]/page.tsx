import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { getArticle, getByCategory, getLatest, getEventsByDistrict, getUpcomingEvents, type Card, type EventItem } from '@/lib/queries';
import { pageMetadata } from '@/lib/seo';
import { JsonLd, article, breadcrumb } from '@/lib/seo/jsonld';
import ArticleCard from '@/components/ArticleCard';
import CommentSection from '@/components/CommentSection';
import CoverImage from '@/components/CoverImage';
import NewsletterSignup from '@/components/NewsletterSignup';
import AskConcierge from '@/components/AskConcierge';

// Culture / events articles get an "In our Agenda" block linking to the real events.
const CULTURE_CATS = ['culture', 'arts', 'events', 'event', 'music', 'festival', 'entertainment', 'nightlife', 'agenda'];
const isCultureArticle = (category: string | null, tags: string[]): boolean =>
  (!!category && CULTURE_CATS.includes(category.toLowerCase())) ||
  (tags || []).some((tg) => /event|festival|concert|exhibition|agenda|culture|music|theatre|theater|art\b/i.test(tg));

// Localised copy for the two embedded blocks (all seven editions — no English fallback).
const ASK: Record<string, { heading: string; label: string; q: (t: string) => string }> = {
  en: { heading: 'Ask the Cyprus Lifestyle concierge', label: 'Ask about this', q: (t) => `I'm reading "${t}". Can you help me with this and suggest what to do next?` },
  el: { heading: 'Ρωτήστε τον concierge του Cyprus Lifestyle', label: 'Ρωτήστε σχετικά', q: (t) => `Διαβάζω «${t}». Μπορείτε να με βοηθήσετε και να μου προτείνετε τι να κάνω;` },
  ro: { heading: 'Întreabă concierge-ul Cyprus Lifestyle', label: 'Întreabă despre asta', q: (t) => `Citesc „${t}”. Mă poți ajuta și îmi poți sugera ce să fac mai departe?` },
  ar: { heading: 'اسأل كونسيرج Cyprus Lifestyle', label: 'اسأل عن هذا', q: (t) => `أقرأ "${t}". هل يمكنك مساعدتي واقتراح الخطوات التالية؟` },
  de: { heading: 'Fragen Sie den Cyprus-Lifestyle-Concierge', label: 'Dazu fragen', q: (t) => `Ich lese „${t}“. Können Sie mir helfen und vorschlagen, was ich als Nächstes tun sollte?` },
  pl: { heading: 'Zapytaj concierge Cyprus Lifestyle', label: 'Zapytaj o to', q: (t) => `Czytam „${t}”. Czy możesz mi pomóc i podpowiedzieć, co dalej?` },
  ru: { heading: 'Спросите консьержа Cyprus Lifestyle', label: 'Спросить об этом', q: (t) => `Я читаю «${t}». Помогите, пожалуйста, и подскажите, что делать дальше.` },
};
const AGENDA_LABEL: Record<string, string> = { en: 'In our Agenda', el: 'Στην Ατζέντα μας', ro: 'În Agenda noastră', ar: 'في أجندتنا', de: 'In unserem Kalender', pl: 'W naszej Agendzie', ru: 'В нашей Афише' };
const eventWhen = (iso: string, l: string) => { try { return new Date(iso).toLocaleDateString(l === 'ar' ? 'ar' : l, { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };

export const revalidate = 300;

// Article HTML is stored with root-relative links (/directory/g/…, /ask). next-intl
// serves non-English editions under a locale prefix, so rewrite internal links to the
// reader's locale — otherwise a click (e.g. from a specialist card) would drop them
// into the English edition instead of the proper localized category.
const LOCALE_SEGMENTS = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];
function localizeHtml(html: string, locale: Locale): string {
  if (locale === 'en') return html;
  return html.replace(/(href=)(["'])\/(?!\/)([^"']*)\2/g, (m, p1, q, path) => {
    const first = String(path).split('/')[0];
    if (LOCALE_SEGMENTS.includes(first)) return m; // already locale-prefixed
    return `${p1}${q}/${locale}/${path}${q}`;
  });
}

// Ad-disclosure label for sponsored features, per edition (legally conspicuous).
const SPONSORED: Record<string, { s: string; p: string }> = {
  en: { s: 'Sponsored', p: 'Presented by' },
  el: { s: 'Χορηγία', p: 'Σε συνεργασία με' },
  ro: { s: 'Sponsorizat', p: 'Prezentat de' },
  ar: { s: 'محتوى مموّل', p: 'برعاية' },
  de: { s: 'Anzeige', p: 'Präsentiert von' },
  pl: { s: 'Materiał sponsorowany', p: 'Prezentuje' },
  ru: { s: 'Спонсировано', p: 'При поддержке' },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const a = await getArticle(locale as Locale, slug);
  if (!a) return {};
  const t = await getTranslations({ locale });
  const kicker = a.category ? (t.has(`nav.${a.category}`) ? t(`nav.${a.category}`) : a.category) : undefined;
  return pageMetadata({
    locale: locale as Locale, path: `/article/${slug}`,
    title: a.seo_title, description: a.seo_description, type: 'article',
    ogTitle: a.title, kicker, cover: a.cover_image,
  });
}

export default async function ArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const a = await getArticle(l, slug);
  if (!a) notFound();

  const date = a.published_at
    ? new Date(a.published_at).toLocaleDateString(l === 'ar' ? 'ar' : l, { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const catLabel = a.category ? (t.has(`nav.${a.category}`) ? t(`nav.${a.category}`) : a.category) : '';
  const metaTail = [date, a.reading_time_min ? `${a.reading_time_min} ${t('common.minRead')}` : ''].filter(Boolean);

  // "More from the island": same section first, topped up with the latest.
  let more: Card[] = a.category ? (await getByCategory(l, a.category, 4)).filter((r) => r.slug !== a.slug) : [];
  if (more.length < 3) {
    const latest = await getLatest(l, 8);
    for (const c of latest) {
      if (more.length >= 3) break;
      if (c.slug !== a.slug && !more.some((m) => m.slug === c.slug)) more.push(c);
    }
  }
  more = more.slice(0, 3);

  // Article ↔ Agenda: for culture/events pieces, surface the real, dated events from
  // our agenda (the district's first, then island-wide) so the reader can act on them.
  let events: EventItem[] = [];
  if (isCultureArticle(a.category, a.tags)) {
    events = a.county ? await getEventsByDistrict(l, a.county, 3) : [];
    if (events.length < 2) {
      const upcoming = await getUpcomingEvents(l, 4);
      for (const e of upcoming) { if (events.length >= 3) break; if (!events.some((x) => x.slug === e.slug)) events.push(e); }
    }
    events = events.slice(0, 3);
  }
  const ask = ASK[l] || ASK.en;

  const artLd = article({
    locale: l, slug: a.slug, title: a.title, description: a.excerpt,
    image: a.cover_image, author: a.author_name, authorSlug: a.author_slug,
    publishedAt: a.published_at, updatedAt: a.updated_at, section: catLabel || a.category,
  });
  const crumbLd = breadcrumb(l, [
    { name: t('brand.name'), path: '/' },
    ...(a.category ? [{ name: catLabel, path: `/${a.category}` }] : []),
    { name: a.title, path: `/article/${a.slug}` },
  ]);

  return (
    <>
      <JsonLd data={artLd} />
      <JsonLd data={crumbLd} />
      <article>
        <header className="article-hero">
          <CoverImage src={a.cover_image} seed={a.slug} alt="" className="hero-media" sizes="100vw" priority />
          <div className="hero-scrim" />
          {a.cover_image_credit ? <span className="credit">{a.cover_image_credit}</span> : null}
          <div className="inner">
            {a.sponsored ? (
              <span className="kicker" style={{ display: 'inline-block', background: '#C9A24C', color: '#0B0E11', padding: '2px 10px', borderRadius: 999, fontWeight: 700 }}>
                {(SPONSORED[l] || SPONSORED.en).s}{a.sponsor_name ? ` · ${(SPONSORED[l] || SPONSORED.en).p} ${a.sponsor_name}` : ''}
              </span>
            ) : catLabel ? <span className="kicker">{catLabel}</span> : null}
            <h1>{a.title}</h1>
            {a.excerpt ? <p className="dek">{a.excerpt}</p> : null}
            <div className="byline">
              {a.author_name ? (
                a.author_slug
                  ? <Link href={`/author/${a.author_slug}`}>{t('common.byline')} {a.author_name}</Link>
                  : `${t('common.byline')} ${a.author_name}`
              ) : 'Cyprus Lifestyle'}
              {metaTail.map((s) => ` · ${s}`).join('')}
            </div>
          </div>
        </header>

        <div className="article wrap">
          <div className="rule-orn lead-orn"><span className="diamond" /></div>
          <div className="prose" dangerouslySetInnerHTML={{ __html: localizeHtml(a.content, l) }} />

          {a.tags?.length ? (
            <div className="tags">
              {a.tags.map((tag) => (
                <Link className="tag" key={tag} href={`/search?q=${encodeURIComponent(tag)}`}>{tag}</Link>
              ))}
            </div>
          ) : null}

          {a.source_url ? (
            <p className="source">
              {t('common.source')}: <a href={a.source_url} target="_blank" rel="noopener nofollow">{a.source_url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</a>
            </p>
          ) : null}

          <AskConcierge question={ask.q(a.title)} heading={ask.heading} label={ask.label} />
        </div>
      </article>

      {events.length ? (
        <section className="related wrap section">
          <div className="sec-head">
            <div className="rule-orn"><span className="diamond" /></div>
            <div className="lbl">{AGENDA_LABEL[l] || AGENDA_LABEL.en}</div>
          </div>
          <div className="grid g3">
            {events.map((e) => (
              <Link key={e.slug} href={`/agenda/${e.slug}`} className="card" style={{ display: 'block', padding: 16, border: '1px solid var(--line,#e3d9c4)', borderRadius: 8, textDecoration: 'none', color: 'inherit' }}>
                <div style={{ fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', color: '#C9A24C', marginBottom: 6 }}>
                  {eventWhen(e.starts_at, l)}{e.district ? ` · ${e.district}` : ''}
                </div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, lineHeight: 1.3, marginBottom: 6 }}>{e.title}</div>
                {e.venue ? <div style={{ fontSize: 13, opacity: .7 }}>{e.venue}</div> : null}
                {e.price ? <div style={{ fontSize: 13, opacity: .7, marginTop: 2 }}>{e.price}</div> : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {more.length ? (
        <section className="related wrap section">
          <div className="sec-head">
            <div className="rule-orn"><span className="diamond" /></div>
            <div className="lbl">{t('home.more')}</div>
          </div>
          <div className="grid g3">
            {more.map((c) => (
              <ArticleCard key={c.id} card={c}
                kicker={c.category && t.has(`nav.${c.category}`) ? t(`nav.${c.category}`) : c.category || ''}
                readLabel={t('common.minRead')} />
            ))}
          </div>
        </section>
      ) : null}

      <CommentSection postId={a.id} />
      <NewsletterSignup />
    </>
  );
}
