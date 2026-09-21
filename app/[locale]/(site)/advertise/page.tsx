import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { pageMetadata, faqJsonLd, ld } from '@/lib/seo';
import { supabaseAdmin } from '@/lib/supabase/admin';
import AdvertiseFunnel, { type RateItem } from '@/components/AdvertiseFunnel';

export const revalidate = 300;

// FAQ structured data (en edition) — targets "advertise in Cyprus" search intent.
// Kept in step with the live rate card (ad_pricing): Listed €490/yr, Featured
// €850/mo, Partner bespoke, plus à-la-carte placements.
const ADVERTISE_FAQ: { q: string; a: string }[] = [
  { q: 'How much does it cost to advertise in Cyprus with Cyprus Lifestyle?', a: 'A verified Listed profile is €490 per year and a Featured placement is €850 per month, both running across all seven language editions. Bespoke Partner packages and à-la-carte placements — banners, sponsored features and newsletter slots — are quoted on request. Prices exclude VAT.' },
  { q: 'What languages will my advertisement appear in?', a: 'Every placement runs across all seven editions — English, Greek, Russian, Arabic, Romanian, Polish and German — with translation included at no extra cost.' },
  { q: 'Who reads Cyprus Lifestyle?', a: 'Residents, relocators, property buyers and high-spending visitors. Nearly a quarter of people living in Cyprus were born abroad, and Cyprus Lifestyle reaches them in their own language.' },
  { q: 'Is paid placement labelled?', a: 'Yes. Listed and Featured profiles and any sponsored feature are always clearly labelled as a partner placement. Editorial coverage is never for sale — the two stay separate — but any business can place its own profile in the directory.' },
  { q: 'Can I pay for advertising online?', a: 'Yes — a Listed profile can be purchased instantly by card. Featured placements and bespoke Partner packages are arranged with our team so we can tailor the creative, category exclusivity and concierge routing.' },
  { q: 'What is the Partner tier?', a: 'Partner is a bespoke annual package for businesses that want category exclusivity, editorial-grade features and priority concierge routing across all seven editions. It is tailored to your goals and quoted individually.' },
];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return pageMetadata({ locale: locale as Locale, path: '/advertise', title: t('pages.advertise.title'), description: t('pages.advertise.dek'), kicker: t('pages.advertise.kicker') });
}

async function loadRateCard(locale: Locale): Promise<RateItem[]> {
  const { data } = await supabaseAdmin().from('ad_pricing')
    .select(`slot, format, unit, price_from, price_to, list_price, kind, blurb_en, self_serve, sort, label_${locale}, label_en`)
    .not('price_from', 'is', null).order('sort', { ascending: true });
  return ((data || []) as Record<string, unknown>[]).map((r) => ({
    slot: String(r.slot),
    label: String(r[`label_${locale}`] || r.label_en || r.slot),
    format: (r.format as string) ?? null,
    unit: (r.unit as string) ?? null,
    price_from: r.price_from == null ? null : Number(r.price_from),
    price_to: r.price_to == null ? null : Number(r.price_to),
    list_price: r.list_price == null ? null : Number(r.list_price),
    kind: String(r.kind || 'alacarte'),
    blurb: (r.blurb_en as string) ?? null,
    self_serve: r.self_serve === true,
  }));
}

export default async function AdvertisePage({
  params, searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status } = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const body = t.raw('pages.advertise.body') as string[];
  const items = await loadRateCard(l);

  return (
    <div className="page wrap" style={{ maxWidth: 1040 }}>
      <div className="page-head">
        <span className="kicker">{t('pages.advertise.kicker')}</span>
        <h1>{t('pages.advertise.title')}</h1>
        <p className="dek">{t('pages.advertise.dek')}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>

      <div className="prose" style={{ maxWidth: 640, margin: '0 auto 34px' }}>
        {body.map((p, i) => <p key={i}>{p}</p>)}
      </div>

      <AdvertiseFunnel items={items} locale={l} status={status} />

      {l === 'en' ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(faqJsonLd(ADVERTISE_FAQ)) }} />
      ) : null}
    </div>
  );
}
