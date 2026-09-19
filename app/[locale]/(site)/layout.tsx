import { getTranslations, setRequestLocale } from 'next-intl/server';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ConciergeChat, { type ConciergeChatLabels } from '@/components/ConciergeChat';
import { isLocale, type Locale } from '@/lib/locales';

// Opt this subtree into static rendering (next-intl needs the locale set in the
// segment before getTranslations runs, e.g. in the Footer).
export default async function SiteLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const conciergeLabels: ConciergeChatLabels = {
    open: t('concierge.chat.open'), title: t('concierge.chat.title'), greeting: t('concierge.chat.greeting'),
    placeholder: t('concierge.placeholder'), send: t('concierge.ask'),
    searching: t('concierge.chat.searching'), composing: t('concierge.chat.composing'), error: t('concierge.error'),
    examplesTitle: t('concierge.examplesTitle'), examples: (t.raw('concierge.examples') as string[]) || [],
    picksTitle: t('concierge.picksTitle'), guidesTitle: t('concierge.guidesTitle'),
    arrange: t('concierge.chat.arrange'), human: t('concierge.chat.human'),
    newChat: t('concierge.chat.newChat'), close: t('concierge.chat.close'),
    reqEmailPh: t('concierge.req.emailPh'), reqNotePh: t('concierge.req.notePh'),
    reqSend: t('concierge.req.send'), reqSending: t('concierge.req.sending'), reqSent: t('concierge.req.sent'),
    trust: t('concierge.req.trust'), trustLink: t('concierge.req.trustLink'),
    mem: {
      welcome: t('concierge.chat.mem.welcome'), title: t('concierge.chat.mem.title'), note: t('concierge.chat.mem.note'), forget: t('concierge.chat.mem.forget'),
      name: t('concierge.chat.mem.name'), base: t('concierge.chat.mem.base'), party: t('concierge.chat.mem.party'), dates: t('concierge.chat.mem.dates'),
      interests: t('concierge.chat.mem.interests'), dietary: t('concierge.chat.mem.dietary'), status: t('concierge.chat.mem.status'),
    },
    voice: {
      speak: t('concierge.chat.voice.speak'), listening: t('concierge.chat.voice.listening'), readAloud: t('concierge.chat.voice.readAloud'),
    },
  };

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      {isLocale(locale) && <ConciergeChat locale={locale as Locale} labels={conciergeLabels} />}
    </>
  );
}
