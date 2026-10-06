import type { LegalDoc } from '@/lib/legal/types';

export const cookiesEn: LegalDoc = {
  title: 'Cookie Policy',
  dek: 'Which cookies and similar browser storage Cyprus Lifestyle uses, why, for how long, and how you stay in control.',
  sections: [
    { h: '1. What this policy covers', p: [
      'This policy explains the cookies, browser storage (such as localStorage) and similar technologies used on {site}. It is based on the ePrivacy Directive 2002/58/EC as implemented in Cyprus by the Regulation of Electronic Communications and Postal Services Law 112(I)/2004, and on the GDPR. How we process personal data in general is described in the Privacy Policy.',
    ] },
    { h: '2. How consent works on this site', p: [
      'When you first visit, a notice asks you to Accept or Decline. Until you choose, and if you decline, we load no optional analytics and no partner tracking script. Your choice is stored in your browser (entry cl-consent) and the notice does not return. Strictly necessary and functional items listed in sections 3 and 4 do not need consent because they are used only to provide something you asked for (for example the language you picked, or signing in as a member).',
    ] },
    { h: '3. Cookies we set', p: ['These are not used for advertising or cross-site tracking.'], li: [
      'NEXT_LOCALE: remembers the language you pick with the language switcher. Set by your browser when you choose a language; 1 year.',
      'cl_member: keeps you signed in as a member (and gives you the member priority lane). HttpOnly, Secure, SameSite=Lax; set only when you sign in or restore your membership; up to 30 days, renewed while you use the site; removed when you sign out.',
      'cl_business: keeps a business owner signed in to the business account area. HttpOnly, Secure, SameSite=Lax; 14 days.',
      'cl_owner_sess: a short editing session for a directory listing owner who opened an e-mailed management link. HttpOnly, Secure, SameSite=Lax; 60 minutes.',
      'Staff sign-in cookies (Supabase) are set only for our editorial staff in the administration area, never for ordinary readers.',
    ] },
    { h: '4. Browser storage (localStorage) we use', p: ['Stored only on your device; not used to track you across other sites.'], li: [
      'cl-consent: your Accept/Decline choice. Kept until you clear it.',
      'cl_cid: an anonymous random browser identifier, created when you use the concierge, the membership page or your account. It lets the concierge remember your preferences, recognises your membership on this device and counts clicks on our call-to-action buttons. Kept until you clear it; members can erase the memory linked to it.',
      'cl_voiceout: whether you switched on read-aloud for the concierge.',
      'cl:recent: the last articles and listings you viewed (up to 12), shown to you as "recently viewed". Never sent to us.',
      'cl:saved-places: places you saved on the map. Never sent to us.',
    ] },
    { h: '5. Optional items, only after you accept', li: [
      'Vercel Web Analytics: counts page views, referrers and coarse country/device, without advertising profiles. According to Vercel it works without cookies. Loaded only after you accept.',
      'Vercel Speed Insights: measures page-load performance so we can keep the site fast. According to Vercel it works without cookies. Loaded only after you accept.',
      'GetYourGuide partner script (widget.getyourguide.com): required to show GetYourGuide experience widgets and to credit bookings made through them. GetYourGuide may set its own cookies or identifiers. Loaded only after you accept; before that, a plain partner link is shown instead.',
    ] },
    { h: '6. Third-party content that loads without the banner', p: ['Some features load content directly from other companies when the page needs it. Those companies receive your IP address and technical details and may set or read their own cookies, under their own policies. You can avoid them by not opening the relevant page or feature.'], li: [
      'Live page: weather and webcam players from Windy and YouTube (youtube-nocookie.com, Google) embedded in the page.',
      'Maps: the map library (jsDelivr) and map tiles (CARTO) when you open a map.',
      'Payment and billing pages: Stripe-hosted checkout and customer portal, when you subscribe or manage billing.',
      'Outbound links (for example Google Maps directions, GetYourGuide, partner sites) only when you click them.',
    ] },
    { h: '7. Changing your choice and browser controls', p: [
      'You can reopen the choice at any time with the "Cookie settings" link in the footer, or by clearing this site’s data in your browser, after which the notice appears again. You can also block or delete cookies and site storage in your browser settings; blocking necessary items may stop sign-in, language memory or the concierge’s memory from working.',
    ] },
    { h: '8. Updates and contact', p: ['We update this policy when we add or remove cookies or tools, and show the date at the top. Questions: {privacy_mail}.'] },
  ],
};
