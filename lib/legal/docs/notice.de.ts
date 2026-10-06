import type { LegalDoc } from '@/lib/legal/types';

export const noticeDe: LegalDoc = {
  title: 'Impressum',
  dek: 'Wer Cyprus Lifestyle betreibt und wie Sie uns erreichen.',
  sections: [
    { h: 'Diensteanbieter', p: [
      'Cyprus Lifestyle ({site}) wird betrieben von {company}, einer in der Republik Zypern (Registrar of Companies) unter der Registernummer {reg} eingetragenen Gesellschaft mit Sitz in {town}, Zypern.',
    ] },
    { h: 'Kontakt', li: [
      'Allgemeine Leseranfragen: {mail}',
      'Datenschutz und Anfragen zu Ihren Daten: {privacy_mail}',
      'Werbung und Partnerschaften: {ads_mail}',
    ] },
    { h: 'Inhalte und geistiges Eigentum', p: [
      'Texte, Bilder, Grafiken, Logos und die Zusammenstellung dieser Website sind urheberrechtlich und durch verwandte Rechte geschützt und gehören {company} oder deren Lizenzgebern. Sie dürfen lesen, Links teilen und kurze Auszüge mit Quellenangabe zitieren; jede andere Vervielfältigung, jedes Scraping und jede kommerzielle Weiterverwendung bedarf unserer schriftlichen Erlaubnis. Als gesponsert oder Partnerinhalt gekennzeichnete Inhalte sind entsprechend ausgewiesen.',
    ] },
    { h: 'Links und Haftung', p: [
      'Wir bemühen uns um richtige und aktuelle Informationen, übernehmen aber keine Gewähr für Vollständigkeit. Angaben zu Immobilien, Steuern, Aufenthalt, Recht oder Gesundheit sind allgemein und keine Fachberatung. Unsere Website verlinkt auf Seiten Dritter und bettet Inhalte Dritter ein; für deren Inhalte sind wir nicht verantwortlich. Nichts in diesem Impressum beschränkt eine Haftung, die gesetzlich nicht beschränkt werden kann, auch gegenüber Verbrauchern.',
    ] },
    { h: 'Verbraucherbeschwerden und Streitbeilegung', p: [
      'Bitte wenden Sie sich zuerst an {mail}; wir bemühen uns um eine schnelle Lösung. Die Online-Streitbeilegungsplattform (ODR/OS-Plattform) der Europäischen Kommission wurde am 20. Juli 2025 eingestellt; wir verlinken sie daher nicht. Verbraucher können sich außerdem an die zuständigen Verbraucherschutzbehörden in Zypern oder ihrem Heimatland wenden. Wir sind nicht verpflichtet und nicht bereit, an außergerichtlichen Streitbeilegungsverfahren vor Verbraucherschlichtungsstellen teilzunehmen, sofern das Gesetz dies nicht verlangt.',
    ] },
    { h: 'Weitere Dokumente', p: ['Siehe auch unsere Datenschutzerklärung, Nutzungsbedingungen und Cookie-Richtlinie.'] },
  ],
};
