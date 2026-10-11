import type { LegalDoc } from '@/lib/legal/types';

export const noticeEn: LegalDoc = {
  title: 'Legal Notice',
  dek: 'Who operates Cyprus Lifestyle and how to reach us.',
  sections: [
    { h: 'Service provider', p: [
      'Cyprus Lifestyle ({site}) is operated by {company}, a company registered in the Republic of Cyprus (Registrar of Companies) under registration number {reg}, based in {town}, Cyprus.',
    ] },
    { h: 'Contact', li: [
      'General and reader enquiries: {mail}',
      'Data protection and privacy requests: {privacy_mail}',
      'Advertising and partnerships: {ads_mail}',
    ] },
    { h: 'Content and intellectual property', p: [
      'The texts, images, graphics, logos and the compilation of this site are protected by copyright and related rights and belong to {company} or its licensors. You may read, share links and quote short extracts with attribution; any other reproduction, scraping or commercial reuse requires our written permission. Content labelled as sponsored or partner content is identified as such.',
    ] },
    { h: 'Links and liability', p: [
      'We take care to keep the information accurate and current, but we do not guarantee completeness. Information about property, taxation, residency, law or health is general and is not professional advice. Our site links to third-party sites and embeds third-party content; we are not responsible for their content. Nothing in this notice limits liability that cannot be limited by law, including towards consumers.',
    ] },
    { h: 'Consumer complaints and dispute resolution', p: [
      'Please contact us first at {mail}; we will try to solve the matter quickly. The European Commission’s online dispute resolution (ODR) platform was discontinued on 20 July 2025, so we do not link to it. Consumers may also contact the competent consumer-protection authorities in Cyprus or in their own country. We are not obliged or committed to take part in out-of-court dispute resolution procedures before consumer ADR bodies, unless the law requires it.',
    ] },
    { h: 'Related documents', p: ['See also our Privacy Policy, Terms of Service and Cookie Policy.'] },
  ],
};
