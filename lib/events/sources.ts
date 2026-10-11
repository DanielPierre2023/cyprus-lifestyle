// lib/events/sources.ts — the registry of FREE, machine-readable Cyprus event sources, with the robots.txt / terms finding
// recorded for each (checked 2026-10-05). Prefer structured data (REST/JSON, iCal, JSON-LD) over HTML scraping. Nothing here
// needs an API key or costs money. A source is included only when robots.txt allows the path AND no term forbids reuse of facts.
// Sources that forbid scraping, are bot-blocked, JS-only, dead or need money live in EXCLUDED so the decision is on record.
import type { EventSource, ExcludedSource } from './types';

export const USER_AGENT = 'CyprusLifestyleBot/1.0 (+https://cypruslifestyle.eu/en/agenda; events aggregator, links back to every source)';

export const EVENT_SOURCES: EventSource[] = [
  {
    slug: 'limassol-tourism',
    name: 'Limassol Tourism (Limassol Tourism Development & Promotion Co.)',
    kind: 'official',
    homepage: 'https://www.limassoltourism.com/events',
    feedUrl: 'https://www.limassoltourism.com/events/feed/',
    format: 'rss-jsonld',
    enabled: true, autoPublish: true, factsOnly: false, images: false,
    minIntervalMin: 170, maxDetailPerRun: 8, lang: 'en', districtHint: 'limassol',
    robots: 'robots.txt: only /wp-admin/ and /wp-content/uploads/wpforms/ are disallowed; /events/ and /events/feed/ are allowed.',
    terms: 'Privacy-policy/terms page has no clause about copying, scraping or reuse (checked); the events RSS feed is published in the page head for readers/aggregators. Event pages publish schema.org Event JSON-LD. We keep a short excerpt, no photo hot-linking, and link every event back to the page.',
    checkedOn: '2026-10-05',
    attribution: 'Limassol Tourism',
  },
  {
    slug: 'cy-public-holidays',
    name: 'Public holidays of the Republic of Cyprus',
    kind: 'public-data',
    homepage: 'https://cypruslifestyle.eu/en/agenda',
    feedUrl: 'builtin:public-holidays',
    format: 'computed',
    enabled: true, autoPublish: true, factsOnly: true, images: false,
    minIntervalMin: 60 * 24, maxDetailPerRun: 0, lang: 'en', tags: ['public-holiday'],
    robots: 'No network access: computed locally (fixed dates + Orthodox Easter). Nager.Date\'s open data was used only to validate the computation; its live API is NOT called because its robots.txt says "Disallow: /api/v".',
    terms: 'Statutory public holidays are plain facts. The computation is checked against the captured Nager.Date 2026 and 2027 data in the test suite. Guarantees the Agenda always has dated entries, even when every web source is down.',
    checkedOn: '2026-10-05',
    attribution: 'Cyprus public holidays',
  },
  {
    slug: 'visitcyprus',
    name: 'Visit Cyprus - Deputy Ministry of Tourism (events calendar)',
    kind: 'official',
    homepage: 'https://www.visitcyprus.com/events/',
    feedUrl: 'https://www.visitcyprus.com/wp-json/tribe/events/v1/events?per_page=50&start_date={today}',
    format: 'tribe',
    // OFF until the Deputy Ministry's written consent is obtained (see terms). One click in Admin -> Events sources turns it on.
    enabled: false, autoPublish: true, factsOnly: true, images: false,
    minIntervalMin: 170, maxDetailPerRun: 0, lang: 'en',
    robots: 'robots.txt: User-agent * disallows only /wp-content/uploads/wp-import-export-lite/; /wp-json/ and /events/ are allowed. The calendar also publishes an iCal subscription feed (/events/?ical=1, X-PUBLISHED-TTL PT1H).',
    terms: 'Terms of use (visitcyprus.com/uncategorised/terms-of-use/): site content "may not be the subject of any sale, copy, modification, reproduction, republication ... without the prior written consent of the Deputy Ministry of Tourism". The public REST/iCal feeds are deliberately machine-readable, and event facts (title, date, venue, link) are not protected expression, but we ask for consent before switching it on. Facts only: no descriptions, no photos.',
    checkedOn: '2026-10-05',
    attribution: 'Deputy Ministry of Tourism - visitcyprus.com',
  },
];

export const EXCLUDED_SOURCES: ExcludedSource[] = [
  { name: 'Eventbrite', url: 'https://www.eventbrite.com', verdict: 'excluded', reason: 'Terms of Service section 13 "Scraping or Commercial Use of Site Content is Prohibited"; robots.txt also disallows /rss/, /events/rss/, /directory/. The public search API was withdrawn in 2020.' },
  { name: 'CyprusNow.app (aggregator)', url: 'https://cyprusnow.app', verdict: 'excluded', reason: 'Terms: "Please do not scrape, copy, or republish the site wholesale"; "Taking the catalogue is not [welcome]". It has JSON-LD for ~100 events/day, but we respect the term; go to its primary sources instead.' },
  { name: 'AllEvents.in', url: 'https://allevents.in', verdict: 'needs-decision', reason: 'The legacy events-ingest edge function scrapes it. robots.txt allows event pages (crawl-delay for some bots) but its terms could not be retrieved to confirm reuse is allowed. Not included in the new registry; decide whether to keep the old function (see EVENTS-INGEST-SETUP.md).' },
  { name: 'EventOr (eventor.com.cy)', url: 'https://eventor.com.cy/events', verdict: 'needs-decision', reason: 'robots.txt allows /events (Disallow /admin/ only) and the page embeds a __NEXT_DATA__ JSON of ~all Cyprus events, but no terms page could be found and it is a private aggregator. Ask the operator for permission / a feed before use.' },
  { name: 'CyprusEvents.net', url: 'https://www.cyprusevents.net/erss', verdict: 'inactive', reason: 'Publishes RSS + iCal feeds (robots allow) but on 2026-10-05 every feed and every day page was empty ("No events are scheduled") - the site is no longer maintained.' },
  { name: 'Larnaka Tourism Board (larnakaregion.com)', url: 'https://larnakaregion.com/events', verdict: 'not-structured', reason: 'robots.txt has no Disallow, but the calendar is a JavaScript (Angular) widget with no feed, no JSON-LD and no iCal. Needs a headless browser or a feed from the board.' },
  { name: 'Ticketbox.com.cy', url: 'https://ticketbox.com.cy', verdict: 'not-structured', reason: 'robots.txt allows crawling, but the site is a JavaScript app: no sitemap, no Event JSON-LD, no feed. Ask for an affiliate/partner feed.' },
  { name: 'SoldOut Ticketbox', url: 'https://www.soldoutticketbox.com', verdict: 'excluded', reason: 'Returns 403 to automated clients including robots.txt - it actively blocks bots.' },
  { name: 'Pafos Regional Board of Tourism (visitpafos.org.cy)', url: 'https://www.visitpafos.org.cy', verdict: 'excluded', reason: 'Behind a CAPTCHA challenge for automated clients (robots.txt itself is not retrievable).' },
  { name: 'Limassol Municipality (limassol.org.cy)', url: 'https://www.limassol.org.cy', verdict: 'excluded', reason: '403 Forbidden to automated clients, including robots.txt.' },
  { name: 'Nicosia Municipality (nicosia.org.cy)', url: 'https://www.nicosia.org.cy', verdict: 'not-structured', reason: 'robots.txt allows crawling, but the events pages have no feed or JSON-LD (Kentico CMS, HTML only; the old /discover/events/ URL returns 410).' },
  { name: 'Ayia Napa Municipality (agianapa.org.cy)', url: 'https://www.agianapa.org.cy/en/events', verdict: 'not-structured', reason: 'robots.txt allows /en/events; HTML cards and PDF programmes only (no JSON-LD/iCal/RSS) and the host answered HTTP 500 to our test. Ask the municipality for a feed.' },
  { name: 'Culture ministry / Cyprus Presidency programme (culture.gov.cy, cyculture2026.eu)', url: 'https://www.culture.gov.cy', verdict: 'excluded', reason: 'culture.gov.cy robots.txt: "User-agent: * Disallow: /" and 403 to bots; cyculture2026.eu returns 403.' },
  { name: 'Resident Advisor (ra.co)', url: 'https://ra.co/events/cy/all', verdict: 'excluded', reason: 'Terms prohibit scraping; no public API without a partnership.' },
  { name: 'Ticketmaster Discovery API', url: 'https://developer.ticketmaster.com', verdict: 'needs-decision', reason: 'Free API key (5,000 calls/day) and clean JSON, but Ticketmaster has almost no Cyprus inventory. Cost: EUR 0. Needs a key (TICKETMASTER_KEY) and an adapter if wanted.', cost: 'EUR 0 (free key)' },
  { name: 'Bandsintown / Songkick APIs', url: 'https://www.bandsintown.com', verdict: 'needs-decision', reason: 'Artist-centric APIs that require an approved app key (artist-side); not suitable for a regional listing.', cost: 'EUR 0 but approval required' },
  { name: 'PredictHQ / SerpApi Google Events / Eventbrite partner feeds', url: 'https://www.predicthq.com', verdict: 'needs-decision', reason: 'Good Cyprus coverage but paid APIs.', cost: 'from about USD 50-250 / month' },
];

export const sourceBySlug = (slug: string): EventSource | undefined => EVENT_SOURCES.find((s) => s.slug === slug);
