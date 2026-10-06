// lib/concierge/channelLinks.ts
// ============================================================================
// The link lines WhatsApp and Telegram append under an answer (increment 2.1b). Pure and shared so the
// two routes cannot drift apart again. Rules (each has a test):
//   • a directory pick is linked ONLY when `linkable !== false` (a 'listed' business has no page → 404);
//   • events → /agenda/<slug>, articles → /article/<slug>, with the locale prefix; a knowledge page links to
//     its ORIGINAL url and names the site it came from; webcams → /live; /agenda is offered on an events question;
//   • experiences link to their public page /activities/<slug> first, the partner booking link second;
//   • only https external links; sponsored articles are labelled; at most MAX_LINES lines.
// ============================================================================
import { dateFmt, labelText, type SourceHit, type SourceNotes } from '@/lib/concierge/sources';
import { sourcesUi } from '@/lib/concierge/sourcesUi';
import { isActivitySlug } from '@/lib/activities/browse';
import { bookLabel } from '@/lib/activities/uiLabels';

export interface ChannelCtx {
  guides: { label: string; path: string }[];
  picks: { type: string; slug: string; name: string; linkable?: boolean }[];
  activities?: { title: string; url: string | null; slug?: string | null }[]; // slug: the experience has a public page /activities/<slug>
  sources?: SourceHit[];
  sourceNotes?: SourceNotes;
}
const PARTNER: Record<string, string> = { en: 'partner link', el: 'σύνδεσμος συνεργάτη', ro: 'link de partener', ar: 'رابط شريك', de: 'Partnerlink', pl: 'link partnerski', ru: 'партнёрская ссылка' };
export const MAX_LINES = 7;

export function buildChannelLines(ctx: ChannelCtx, locale: string, site: string): string[] {
  const prefix = locale && locale !== 'en' ? `/${locale}` : '';
  const ui = sourcesUi(locale);
  const lines: string[] = [];
  if (ctx.guides?.length) {
    const g = ctx.guides[0];
    lines.push(`${g.label}: ${site}${prefix}${g.path}`);
  } else {
    const p = (ctx.picks || []).find((x) => x.linkable !== false && x.type && x.slug);
    if (p) lines.push(`${p.name}: ${site}${prefix}/directory/${p.type}/${p.slug}`);
  }
  const hits = ctx.sources || [];
  const events = hits.filter((h) => h.kind === 'event' && h.href);
  for (const h of events.slice(0, 2)) {
    const when = h.when ? `, ${dateFmt(h.when.startsAt, locale, true)}` : '';
    lines.push(`${h.title}${when}: ${site}${prefix}${h.href}`);
  }
  if (ctx.sourceNotes?.eventsIntent || events.length) lines.push(`${ui.seeAgenda}: ${site}${prefix}/agenda`);
  const art = hits.find((h) => h.kind === 'article' && h.href);
  if (art) lines.push(`${art.title}${art.label === 'sponsored' ? ` (${labelText('sponsored', locale)})` : ''}: ${site}${prefix}${art.href}`);
  const kb = hits.find((h) => h.kind === 'kb_doc' && h.href && /^https:\/\//i.test(h.href));
  if (kb) lines.push(`${kb.title} (${ui.via} ${kb.sourceName || 'web'}): ${kb.href}`);
  const reg = hits.find((h) => h.kind === 'regulation' && h.href && /^https:\/\//i.test(h.href));
  if (reg) lines.push(`${reg.title} (${labelText('official', locale)}): ${reg.href}`);
  if (ctx.sourceNotes?.conditionsIntent || hits.some((h) => h.kind === 'webcam')) lines.push(`${ui.seeLive}: ${site}${prefix}/live`);
  // Up to two bookable experiences (GetYourGuide booking link, partner id applied, disclosed as a partner link).
  // An experience WITH a public page links to our page first (one line each); the partner booking link follows as the
  // secondary 'Book' line for the first one only (keeps the reply short; the page carries the booking link for the rest).
  // One WITHOUT a page keeps the old single partner-link line.
  const acts = (ctx.activities || []).slice(0, 2);
  acts.forEach((a, i) => {
    if (a.slug && isActivitySlug(a.slug)) {
      lines.push(`${a.title}: ${site}${prefix}/activities/${a.slug}`);
      if (i === 0 && a.url) lines.push(`${bookLabel(locale)} (GetYourGuide, ${PARTNER[locale] || PARTNER.en}): ${a.url}`);
    } else if (a.url) lines.push(`${a.title} (GetYourGuide, ${PARTNER[locale] || PARTNER.en}): ${a.url}`);
  });
  return lines.slice(0, MAX_LINES);
}

export function appendChannelLinks(reply: string, ctx: ChannelCtx, locale: string, site: string): string {
  const lines = buildChannelLines(ctx, locale, site);
  return lines.length ? `${reply}\n\n${lines.join('\n')}` : reply;
}
