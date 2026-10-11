// lib/concierge/linkPolicy.ts — what a concierge answer may NAME and LINK. Pure (no I/O), unit-tested.
//
// House rule: the concierge speaks as Cyprus Lifestyle. It never names or links another website, portal, tourism board or
// publication as the origin of what it knows (the scraped knowledge pages are background it re-expresses in its own words),
// and every GetYourGuide link carries our partner id. The system prompt says so; this module enforces it on the text that
// actually leaves the building (web stream, WhatsApp, Telegram), because a prompt is a request and this is a guarantee.
//
//   • a URL (or bare domain) on a blocked host is removed together with what introduced it (": ", " - ", "and", "More info:",
//     the line break of a line that held only the link); in a markdown link the label stays, without the site's name;
//   • a parenthetical that names a blocked site is removed; an attribution phrase ("according to X", "laut X", "potrivit X",
//     "via X", "source: X") is deleted, except at the start of a sentence without a comma ("Laut X ist …"), where our own name
//     takes its place so the sentence stays grammatical; "on X", "bei X" and "X writes that" go with the name;
//   • a site name that still stands after that becomes our own name;
//   • a getyourguide.* URL is rewritten with our partner id and campaign (lib/gyg.ts);
//   • our own pages, official government / EU pages and a business's own website are untouched.
//
// "Visit Cyprus" is also an everyday phrase ("visit Cyprus in spring"), so that name counts only in its capitalised form —
// inside a parenthesis, an attribution phrase, a title suffix/prefix, a link, or capitalised in mid-sentence ("see Visit Cyprus").
import { gygLink } from '@/lib/gyg';

/** Sites the concierge must not name or link (the scraped knowledge sources, the tourism board, news portals, reference and review sites). */
export const BLOCKED_HOSTS = [
  'mycypruslife.com', 'mycyprustravel.com', 'imin-cyprus.com', 'cyprusbucketlist.com', 'cyprusfashion.com', 'cyprusdevelopers.com',
  'visitcyprus.com', 'cyprus-mail.com', 'in-cyprus.philenews.com', 'philenews.com', 'wikipedia.org', 'lonelyplanet.com',
];
const BLOCKED_HOST_RE = /(^|\.)tripadvisor\.[a-z.]+$/i;

/** Names that identify one of those sites in any capitalisation ("Cyprus Fashion" is also a generic phrase, so it is not here). */
export const BLOCKED_NAMES = [
  'My Cyprus Life', 'MyCyprusLife', 'My Cyprus Travel', 'Cyprus Bucket List', 'CyprusBucketList', 'iMin Cyprus', 'I Am In Cyprus',
  'Cyprus Mail', 'In-Cyprus', 'Philenews', 'TripAdvisor', 'Trip Advisor', 'Lonely Planet', 'Wikipedia',
];
/** Names that are also ordinary words: counted only in exactly this capitalisation. */
export const BLOCKED_NAMES_EXACT = ['Visit Cyprus', 'VisitCyprus'];
/** Publications named in attribution phrases only ("according to Reuters"); never touched as loose words. */
const OUTLETS = ['Reuters', 'Bloomberg', 'Financial Mirror', 'Stockwatch', 'The Guardian', 'Financial Times', 'Associated Press', 'Forbes', 'BBC', 'CNN'];

/** What replaces a site name that is still standing after every targeted removal. */
export const HOUSE_NAME = 'Cyprus Lifestyle';

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Case-insensitive without the `i` flag (so one pattern can mix exact and any-case parts): every letter becomes [xX]. */
const ci = (s: string) => [...s].map((c) => { const l = c.toLowerCase(), u = c.toUpperCase(); return l !== u && l.length === 1 && u.length === 1 ? `[${l}${u}]` : esc(c); }).join('');
const anyCase = (phrase: string) => phrase.split(/\s+/).map(ci).join('\\s+');
const exactCase = (phrase: string) => phrase.split(/\s+/).map(esc).join('\\s+');
const B = '(?<![\\p{L}\\p{N}])';
const E = '(?![\\p{L}\\p{N}])';

const SAFE_ALT = BLOCKED_NAMES.map(anyCase).join('|');
const NAME_ALT = [SAFE_ALT, ...BLOCKED_NAMES_EXACT.map(exactCase)].join('|');          // every site name
const CITED_ALT = [NAME_ALT, ...OUTLETS.map(anyCase)].join('|');                          // + publications, for attribution phrases
const SAFE_NAME_RE = new RegExp(`${B}(?:${SAFE_ALT})${E}`, 'gu');

export const hostOf = (url: string): string => { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
export function isBlockedHost(host: string, extra: string[] = []): boolean {
  const h = String(host || '').toLowerCase().replace(/^www\./, '');
  if (!h) return false;
  if (BLOCKED_HOST_RE.test(h)) return true;
  return [...BLOCKED_HOSTS, ...extra].some((b) => h === b || h.endsWith(`.${b}`));
}
/** Government and EU authority pages: the one kind of outside page that may be cited (regulatory facts). */
export const isOfficialAuthorityHost = (host: string): boolean => {
  const h = String(host || '').toLowerCase();
  return h === 'gov.cy' || h.endsWith('.gov.cy') || h === 'europa.eu' || h.endsWith('.europa.eu');
};
export const isOfficialAuthorityUrl = (url: string): boolean => isOfficialAuthorityHost(hostOf(url));

const SEP = '[-–—|:·]';
const TITLE_SUFFIX_RE = new RegExp(`\\s*${SEP}\\s*(?:${NAME_ALT})${E}`, 'gu');
const TITLE_PREFIX_RE = new RegExp(`^\\s*(?:${NAME_ALT})${E}\\s*${SEP}\\s*`, 'u');
/** Remove site names from a title or snippet taken from a scraped page (a " - Name" / " | Name" suffix or prefix, loose names). */
export function scrubSourceNames(text: string): string {
  return String(text || '')
    .replace(TITLE_SUFFIX_RE, '')
    .replace(TITLE_PREFIX_RE, '')
    .replace(SAFE_NAME_RE, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

export interface PolicyOptions { campaign?: string; partnerId?: string | null; extraBlockedHosts?: string[] }
export interface PolicyResult { text: string; removedUrls: number; taggedGyg: number; residualNames: string[] }

const MD_LINK_RE = /\[([^\]\n]{1,200})\]\((https?:\/\/[^)\s]+)\)/g;
const HOSTS_ALT = [...BLOCKED_HOSTS.map(esc), 'tripadvisor\\.[a-z.]+'].join('|');
const EMPH = '[*_]{0,3}';
const alt = (words: string[]) => words.map(anyCase).join('|');

// What can stand right before a URL that is about to disappear and must go with it, or it would be left hanging: the line break
// when the URL had a line of its own, a ": " / " - " / "→" lead, an "and" / "or", or a "More info:" / "Source:" lead-in.
const LEAD_INS = alt([
  'more info', 'more information', 'more details', 'details', 'read more', 'learn more', 'find out more', 'see also', 'read the guide', 'source', 'sources',
  'mehr infos', 'mehr informationen', 'weitere infos', 'weitere informationen', 'mehr dazu', 'weiterlesen', 'quelle', 'quellen',
  'mai multe detalii', 'mai multe informații', 'mai multe informatii', 'detalii', 'citește mai mult', 'citeste mai mult', 'vezi și', 'vezi si', 'sursa', 'sursă',
  'więcej informacji', 'szczegóły', 'zobacz też', 'czytaj więcej', 'źródło',
  'подробнее', 'больше информации', 'подробности', 'читать далее', 'источник',
  'περισσότερα', 'λεπτομέρειες', 'διαβάστε περισσότερα', 'περισσότερες πληροφορίες', 'πηγή',
  'المزيد', 'تفاصيل', 'اقرأ المزيد', 'مزيد من المعلومات', 'المصدر',
]);
const CONJ = alt(['and', 'or', 'und', 'oder', 'și', 'si', 'sau', 'i', 'oraz', 'lub', 'и', 'или', 'και', 'ή', 'و', 'أو', '&']);
const URL_LEAD = `(?:\\n[ \\t]*)?(?:${B}(?:${LEAD_INS})${EMPH}\\s*[:\\-–—→]*${EMPH}\\s*|\\s*[:\\-–—→]\\s*|\\s+(?:${CONJ})\\s+)?`;
const BARE_URL_RE = new RegExp(`(${URL_LEAD})?(https?:\\/\\/[^\\s<>"'\`]+)`, 'giu');
const BARE_HOST_RE = new RegExp(`(${URL_LEAD})?(?<![\\p{L}\\p{N}@./-])((?:www\\.)?(?:${HOSTS_ALT})(?:/[^\\s<>"'\`]*)?)`, 'giu');

// "according to", "laut", "potrivit", "według", "по данным", "σύμφωνα με", "بحسب" … followed by a site name (and "website", "Seite" …)
const ATTRIBUTION_WORDS = alt([
  'according to', 'as reported by', 'as reported in', 'as noted by', 'as noted in', 'as stated by', 'as stated in', 'as described by', 'as described in', 'as mentioned by',
  'as mentioned in', 'as explained by', 'as published by', 'as published in', 'as listed on', 'as per', 'per', 'source:', 'sources:', 'via', 'courtesy of', 'as seen on', 'as featured on',
  'laut', 'nach angaben von', 'nach angaben der', 'quelle:', 'gemäß', 'sursa:', 'sursă:', 'potrivit', 'conform', 'według', 'wg', 'źródło:',
  'по данным', 'по информации', 'согласно', 'источник:', 'σύμφωνα με', 'πηγή:', 'وفقًا لـ', 'وفقا لـ', 'وفقًا ل', 'وفقا ل', 'بحسب', 'حسب', 'المصدر:',
]);
const SITE_NOUN = '(?:\\s+(?:website|web\\s+site|site|page|portal|blog|guide|article|webseite|seite|artikel|страниц\\w*|сайт\\w*))?';
const DETERMINERS = ['the', 'der', 'die', 'das', 'dem', 'den', 'το', 'τη', 'την', 'τον', 'του', 'της', 'ο', 'η'].map((w) => `${ci(w)}\\s+`).join('|');
const PAREN_NAME_RE = new RegExp(`\\s*[\\(\\[][^()\\[\\]]*?${B}(?:${NAME_ALT})${E}[^()\\[\\]]*?[\\)\\]](?!\\()`, 'gu');
const ATTRIBUTION_RE = new RegExp(`${B}${EMPH}(${ATTRIBUTION_WORDS})${EMPH}\\s*(?:${DETERMINERS})?(?:${CITED_ALT})${E}${SITE_NOUN}(\\s*)([,،:;])?`, 'gu');
// "on My Cyprus Life", "bei Cyprus Mail", "pe My Cyprus Life": the preposition goes with the name
const PREPS = alt(['on', 'in', 'at', 'from', 'by', 'bei', 'auf', 'von', 'pe', 'de pe', 'din', 'în', 'na', 'w', 'z', 'на', 'в', 'στο', 'στον', 'από', 'في', 'على', 'عبر']);
const PREP_NAME_RE = new RegExp(`\\s*${B}(?:${PREPS})\\s+(?:${DETERMINERS})?(?:${NAME_ALT})${E}${SITE_NOUN}`, 'gu');
// "My Cyprus Life writes that …" → "…" (English only: in German the verb position of the clause would break)
const FRAME_VERBS = alt(['writes', 'says', 'notes', 'reports', 'recommends', 'suggests', 'lists', 'calls', 'describes', 'explains', 'states', 'mentions', 'advises', 'rates']);
const SUBJECT_FRAME_RE = new RegExp(`${B}(?:${NAME_ALT})\\s+(?:${FRAME_VERBS})(?:\\s+${ci('that')})?\\s*[,:]?\\s*`, 'gu');
const SENTENCE_START = /(?:^|[.!?…؟]["')\]»”]*\s+|\n\s*(?:[-*•]\s+)?)$/;
const TRAIL = /[.,;:!?)\]}'”’»]+$/;
const SEE_WORDS = '(?:see|siehe|vezi|zobacz|смотри|δες|انظر)';
const CAPITALISE = '\u0002';
const ALL_NAME_RE = new RegExp(`${B}(?:${NAME_ALT})${E}`, 'gu');
// "see Visit Cyprus for …": capitalised in the middle of a sentence it is the tourism board, not the verb ("visit Cyprus in spring")
const MID_SENTENCE_BRAND_RE = /(?<=\p{Ll}[ \t])(?:Visit\s+Cyprus|VisitCyprus)(?![\p{L}\p{N}])/gu;

export function applyLinkPolicy(input: string, opts: PolicyOptions = {}): PolicyResult {
  let removedUrls = 0; let taggedGyg = 0;
  let text = String(input || '');

  // The replacement for a URL, or null when it is removed (the caller keeps the closing punctuation).
  const handleUrl = (raw: string): { url: string | null; trail: string } => {
    const trail = (raw.match(TRAIL) || [''])[0];
    const url = trail ? raw.slice(0, raw.length - trail.length) : raw;
    const host = hostOf(url);
    if (isBlockedHost(host, opts.extraBlockedHosts)) { removedUrls++; return { url: null, trail }; }
    if (/(^|\.)getyourguide\.[a-z.]+$/i.test(host)) {
      const tagged = gygLink(url, { campaign: opts.campaign ?? 'cl-concierge', ...(opts.partnerId !== undefined ? { partnerId: opts.partnerId } : {}) });
      if (tagged && tagged !== url) taggedGyg++;
      return { url: tagged || url, trail };
    }
    return { url, trail };
  };

  // markdown links first: keep the label (without the site's name; nothing if only the name is left), drop the blocked target, tag GetYourGuide targets
  text = text.replace(MD_LINK_RE, (_m, label: string, url: string) => {
    const r = handleUrl(url);
    if (r.url === null) {
      const lab = label.replace(PREP_NAME_RE, '').replace(ALL_NAME_RE, '').replace(/\s{2,}/g, ' ').trim();
      return isBlockedHost(label.trim().replace(/^https?:\/\//i, '').split('/')[0], opts.extraBlockedHosts) || !lab.replace(/[\s\p{P}]+/gu, '') ? '' : lab;
    }
    return `[${label}](${r.url}${r.trail})`;
  });
  // bare URLs (not those already inside a markdown target); a removed URL takes its lead (": ", " - ", "and", "More info:") with it
  text = text.replace(BARE_URL_RE, (m, lead: string | undefined, raw: string, offset: number, whole: string) => {
    const start = offset + (lead ? lead.length : 0);
    if (whole[start - 1] === '(' && whole[start - 2] === ']') return m;
    const r = handleUrl(raw);
    return r.url === null ? r.trail : (lead || '') + r.url + r.trail;
  });
  // a domain written without a scheme ("visitcyprus.com/events")
  text = text.replace(BARE_HOST_RE, (_m, _lead: string | undefined, raw: string) => { removedUrls++; return (raw.match(TRAIL) || [''])[0]; });

  // parentheticals that name a blocked site
  text = text.replace(PAREN_NAME_RE, '');
  // attribution phrases: deleted; a sentence that BEGINS with one ("Laut Visit Cyprus ist …") keeps its grammar with our name instead
  text = text.replace(ATTRIBUTION_RE, (_m, attr: string, space: string, punct: string | undefined, offset: number, whole: string) => {
    const atStart = SENTENCE_START.test(whole.slice(0, offset));
    if (atStart && !punct && !/:$/.test(attr)) return `${attr} ${HOUSE_NAME}${space}`;
    return atStart ? CAPITALISE : '';
  });
  text = text.replace(PREP_NAME_RE, '');
  text = text.replace(SUBJECT_FRAME_RE, (_m, offset: number, whole: string) => (SENTENCE_START.test(whole.slice(0, offset)) ? CAPITALISE : ''));
  // a name that is still standing becomes our own name (the knowledge pages are re-expressed as ours)
  const residual = [...new Set((text.match(SAFE_NAME_RE) || []).map((x) => x.toLowerCase().replace(/\s+/g, ' ')))];
  text = text.replace(SAFE_NAME_RE, HOUSE_NAME).replace(MID_SENTENCE_BRAND_RE, HOUSE_NAME);

  // tidy what the removals left behind ("(see )", "()", ", .", doubled spaces, a space before punctuation, a lower-case sentence start)
  text = text
    .replace(new RegExp(`${CAPITALISE}(\\s*)(\\p{Ll})`, 'gu'), (_m, sp: string, ch: string) => sp + ch.toUpperCase())
    .replace(new RegExp(CAPITALISE, 'g'), '')
    .replace(new RegExp(`\\(\\s*${SEE_WORDS}?\\s*${SEP}?\\s*\\)`, 'giu'), '')
    .replace(/(\*\*|__)\s*\1/g, '')
    .replace(/[ \t]*[,،][ \t]*([.;:!?؟])/g, '$1')
    .replace(/[ \t]+([,،.;:!?؟])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n');
  return { text: text.trim(), removedUrls, taggedGyg, residualNames: residual };
}

/**
 * Streaming wrapper: a reply arrives in small pieces, so a URL, a "(via …)" or a two-word site name can be cut in half. push()
 * therefore releases whole sentences / lines only: the text up to the last sentence end or line break that does not leave a
 * bracket open or end in a ":" / "-" / "," (which may be the lead of a URL or an attribution that is about to be removed).
 * flush() releases the rest. The pieces joined equal applyLinkPolicy of the whole text; the whitespace between two pieces
 * belongs to the later one and is dropped together with a piece that disappears.
 */
const BOUNDARY_RE = /[.!?;…؟؛۔](?:["'”’»)\]]*)(?=\s)|\n/g;
const LEAD_END_RE = /[:\-–—,،]\s*$/;
export class LinkPolicyStream {
  private buf = '';
  private started = false;
  private carry = '';   // whitespace that belonged to blank pieces: it still separates what comes next
  constructor(private readonly opts: PolicyOptions = {}) {}
  push(chunk: string): string {
    this.buf += chunk;
    const end = this.releasable();
    if (end > 0) return this.take(end);
    // no sentence end for a long stretch (a list without punctuation): release up to the last whitespace
    if (this.buf.length > 600) { const ws = this.buf.search(/\s\S*$/); return this.take(ws > 0 ? ws : this.buf.length); }
    return '';
  }
  flush(): string { const out = this.take(this.buf.length); this.carry = ''; return out; }
  /** End (exclusive) of the longest prefix that is safe to judge on its own, or 0. */
  private releasable(): number {
    const ends: number[] = [];
    for (const m of this.buf.matchAll(BOUNDARY_RE)) ends.push(m[0] === '\n' ? m.index! : m.index! + m[0].length);
    for (let k = ends.length - 1; k >= 0; k--) {
      let end = ends[k];
      while (end > 0 && /\s/.test(this.buf[end - 1])) end--;   // a piece never ends in whitespace: that belongs to the next one
      if (end <= 0) continue;
      const piece = this.buf.slice(0, end);
      if (LEAD_END_RE.test(piece)) continue;
      const open = Math.max(piece.lastIndexOf('('), piece.lastIndexOf('['));
      if (open >= 0 && end - open < 240 && piece.slice(open).search(/[)\]]/) < 0) continue;
      return end;
    }
    return 0;
  }
  private take(n: number): string {
    const part = this.buf.slice(0, n); this.buf = this.buf.slice(n);
    if (!part) return '';
    const body = part.trim();
    if (!body) { this.carry += part; return ''; }
    const done = applyLinkPolicy(body, this.opts).text;
    if (!done) return '';   // the piece disappeared, and the whitespace in front of it with it
    const lead = (part.match(/^\s*/) || [''])[0];
    const gap = (this.carry + lead).replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n');
    this.carry = '';
    // the space before a piece that now starts with punctuation belonged to the removed text; the very first piece starts flush left
    const sep = !this.started || (/^ $/.test(gap) && /^[,،.;:!?؟]/.test(done)) ? '' : gap;
    this.started = true;
    return sep + done;
  }
}
