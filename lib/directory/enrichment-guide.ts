// lib/directory/enrichment-guide.ts
// ============================================================================
// The "Complete every listing" workbook: guide sheets + the list itself. Shared by the
// admin download (/api/admin/directory/enrichment) and scripts/directory/
// enrichment-template.ts, so the guide people read is the one the importer understands.
// Pure: no I/O.
// ============================================================================
import type { Cell, Sheet } from '@/lib/xlsx';
import { FILL_COLUMNS, SOCIALS, DAYS } from './enrichment';

const T = (text: string): Cell => ({ text, style: 'title' });
const B = (text: string): Cell => ({ text, style: 'bold' });
const N = (text: string): Cell => ({ text, style: 'note' });
const LINK = (text: string, link: string): Cell => ({ text, link });

export interface GuideCounts {
  total: number; missingAny: number; withWebsite: number; built: string;
  byNeed: Record<string, number>;
}

export function startSheet(c: GuideCounts | null): Sheet {
  const rows: Cell[][] = [
    [T('Cyprus Lifestyle — complete every listing')],
    [N(c ? `List built ${c.built}: ${c.total.toLocaleString('en')} businesses on the map, ${c.missingAny.toLocaleString('en')} miss something, ${c.withWebsite.toLocaleString('en')} of those have their own website (the scraper can complete them).` : 'TEMPLATE — download the real list in Admin → Directory → Complete listings. It has exactly these sheets, filled with your businesses.')],
    [''],
    [B('What the map popup shows for every business')],
    ['Photo · rating ★ 4.7 (1,234) · address · opening hours (open now) · phone · email · website · social links · amenities · description. Whatever is missing below is simply not shown — nothing breaks.'],
    [''],
    [B('Three steps, cheapest first')],
    ['1. AUTOMATIC — Google Places (official API, already built in). Fills photo, website, phone, Google rating + number of reviews and a short description; then reads a public email from the website. Run the "enrich-directory" function with status=all (see the sheet "Scraper guide", part A). Google bills it per lookup: about $35 per 1,000 businesses + $7 per 1,000 photos, the first 1,000 a month free.'],
    ['2. SCRAPER — Ultimate Web Scraper (free Chrome extension) on the businesses\' OWN websites: email, phone, social links, photo, opening hours. Upload the sheet "Websites to scan", export the results, upload them back (part B).'],
    ['3. BY HAND / BY THE OWNER — rows with no website: open "look_up" (a Google Maps search) and type what you see into the sheet "Fill in", or let the business claim its listing (the "Is this your business?" link in every map popup).'],
    [''],
    [B('Upload what you found')],
    ['Admin → Directory → Complete listings → Upload results. Any of these files works as it is: this workbook\'s "Fill in" sheet, the scraper\'s Excel/CSV export, a CSV saved from Excel (comma or semicolon). Rows are matched by slug, else by website. "Check" first shows what would change; "Apply" writes it.'],
    ['Only EMPTY fields are filled. Nothing already on file is ever overwritten — a wrong value is fixed in Admin → Directory.'],
    [''],
    [B('Sheets in this workbook')],
    ['Scraper guide — step by step, with the exact settings.'],
    ['Fill in — one row per business that misses something; current values pre-filled, the gaps in "missing". Type into empty cells; leave "slug" as it is.'],
    ['Websites to scan — slug, name, url: the file you give the scraper.'],
    ['Columns — what goes in each column, with examples.'],
    ['Rules — which sources are fine and which are not.'],
  ];
  if (c) {
    rows.push([''], [B('What is missing right now (businesses)')]);
    for (const [k, n] of Object.entries(c.byNeed)) rows.push([`${k}: ${n.toLocaleString('en')}`]);
  }
  return { name: 'Start here', rows, widths: [120], wrap: true };
}

export function scraperSheet(): Sheet {
  const rows: Cell[][] = [
    [T('Scraper guide — Ultimate Web Scraper (Chrome)')],
    [N('Free for local use, runs in your own Chrome, no account needed. Exports to Excel, CSV or Google Sheets. The settings below are the extension\'s defaults unless noted.')],
    [LINK('Chrome Web Store — Ultimate Web Scraper', 'https://chromewebstore.google.com/detail/ultimate-web-scraper/pdeldjlcnhallaapdggcmhpailpnnkmg'), LINK('Documentation', 'https://ultimatewebscraper.com/docs/extension')],
    [''],
    [B('A · First the automatic part (Google Places — already built in)')],
    ['A1. Supabase → Edge Functions → enrich-directory must have the secrets GOOGLE_PLACES_API_KEY and ENRICH_SECRET (it already runs for the published listings).'],
    ['A2. Open in a browser:  https://<your-project>.supabase.co/functions/v1/enrich-directory?key=<ENRICH_SECRET>&entity=directory&status=all&limit=40'],
    ['     Each call completes up to 40 businesses in ~40 seconds and continues where it stopped. Repeat it (or schedule it every few minutes with Supabase cron) until it reports 0 rows.'],
    ['A3. Add &reviews=1 only if you also want up to 5 Google review snippets per business (pricier: Google\'s "Atmosphere" tier).'],
    ['A4. Then download this list again — what is still missing is what the scraper does next.'],
    [''],
    [B('B · Install the scraper')],
    ['B1. Chrome Web Store → "Ultimate Web Scraper" → Add to Chrome → pin it (puzzle icon → pin). Clicking it opens a side panel with the tools.'],
    ['B2. Admin → Directory → Complete listings → "Websites to scan (CSV)". Columns: slug, name, url. Only businesses with their OWN website are in it (no Facebook / Instagram / booking pages).'],
    ['     Big list? Work in batches of 300–500 rows: download with the "limit" box, or split the CSV in Excel.'],
    [''],
    [B('C · Emails + social links — "Email Extractor"')],
    ['C1. Side panel → Email Extractor → Upload CSV → choose the file → pick the column "url".'],
    ['C2. Deep scan: Depth 1 (default — follows the homepage\'s links, which reaches the Contact page), Max links per page 10, Stay on domain ON, Delay 1500 ms.'],
    ['C3. Turn ON social link collection (adds one column per network: Instagram, Facebook, TikTok, YouTube, X …).'],
    ['C4. Start. Results land in the Data Table: one row per website — URL, Emails, Email Count + the social columns.'],
    ['C5. Data Table → Export → Excel (.xlsx). Name it e.g. emails-batch-1.xlsx. Don\'t delete or rename the URL column — it is how rows are matched back.'],
    [N('Alternative: "Social Link Extractor" does the social part alone (same upload, same output style).')],
    [''],
    [B('D · Photo, phone, opening hours — "Page Extractor"')],
    ['D1. Side panel → Page Extractor → URL source: Upload CSV → same file → column "url". The first website opens in your tab.'],
    ['D2. Add these steps: "Page Metadata" (title, description, IMAGE = the photo the site shows when shared), "Phone Numbers" (finds numbers and tel: links), and "Automatic Extract" (reads the structured data many sites publish: address, telephone, openingHours).'],
    ['D3. Settings: Concurrent tabs 1, Delay 1000 ms, Page timeout 30 s (defaults). Keep them — it is polite to the businesses\' websites.'],
    ['D4. Run → Data Table → Export → Excel (.xlsx), e.g. pages-batch-1.xlsx.'],
    [''],
    [B('E · Upload')],
    ['E1. Admin → Directory → Complete listings → Upload results → choose emails-batch-1.xlsx → "Check". You see how many rows matched and what would be filled (e.g. 412 emails, 230 Instagram links).'],
    ['E2. "Apply". Then the pages file. Then the next batch. The map shows the new details within ~10 minutes.'],
    ['E3. What the importer does with each value: emails — the business\'s own domain and info@/contact@ first, junk dropped; phones — Cypriot numbers first; photos — logos/icons skipped; social links — profile pages only (share buttons and single posts dropped); hours — "Mo-Fr 09:00-18:00" style is understood.'],
    [''],
    [B('F · Rows without a website (by hand)')],
    ['F1. Sheet "Fill in" → filter "website" = empty. Click "look_up" (opens a Google Maps search for the business) and type what you can see — phone, website, hours — into the row. Looking it up by hand is fine; scraping Google Maps is not (see Rules).'],
    ['F2. Upload the saved workbook (Upload results). Only the cells you filled are used; empty fields on file are completed, nothing is overwritten.'],
  ];
  return { name: 'Scraper guide', rows, widths: [120, 30], wrap: true };
}

export function columnsSheet(): Sheet {
  const rows: Cell[][] = [
    ['column', 'what to put', 'example', 'read by the importer?'],
    ['slug', 'Our id — do not change. Rows are matched on it.', 'meze-bar-limassol', 'yes (matching)'],
    ['name / category / district / status', 'For your orientation.', 'Meze Bar · restaurant · limassol · listed', 'no'],
    ['missing', 'What the listing lacks today.', 'photo, email, opening hours', 'no'],
    ['website', 'The business\'s own site (not a Facebook page — put that under facebook).', 'https://www.mezebar.cy', 'yes'],
    ['phone', 'One number, as dialled.', '+357 25 123456', 'yes'],
    ['email', 'One public business address.', 'info@mezebar.cy', 'yes'],
    ['image_url', 'A photo of the place (not a logo), full https link.', 'https://www.mezebar.cy/img/terrace.jpg', 'yes'],
    [SOCIALS.join(' / '), 'Profile links (not posts).', 'https://www.instagram.com/mezebar.cy', 'yes'],
    [DAYS.map((d) => `hours_${d}`).join(' / '), 'Opening hours per day: 09:00–18:00, two shifts 10:00–14:00, 17:00–23:00, or Closed.', '12:00–23:00', 'yes'],
    ['address', 'Street address, if missing.', '12 Anexartisias, Limassol 3036', 'yes'],
    ['source_url', 'Where you found it (for your records).', 'https://www.mezebar.cy/contact', 'no'],
    ['our_page / look_up', 'Links: our profile (published only) / a Google Maps search to check by eye.', '', 'no'],
    [''],
    [N('The importer also reads the scraper\'s own column names: URL, Emails, Phone Numbers, Page Metadata image, openingHours, Social Links, Instagram, Facebook … — no renaming needed.')],
  ];
  return { name: 'Columns', rows, header: true, widths: [34, 70, 44, 22], wrap: true };
}

export function rulesSheet(): Sheet {
  const rows: Cell[][] = [
    [T('Rules — sources that are fine, and the ones that are not')],
    [N('Not legal advice. Short version: the business\'s own website and the official APIs are fine; other platforms\' pages are not.')],
    [''],
    [B('Fine')],
    ['• The business\'s OWN website (what it publishes so customers can contact it): email, phone, social links, opening hours, the photo it shows when shared (og:image).'],
    ['• Google Places through the official API (step A) — that is how ratings and review counts are obtained. Google requires its attribution where its data is shown.'],
    ['• OpenStreetMap (ODbL licence): free to use with the credit "© OpenStreetMap contributors".'],
    ['• Looking something up by hand and typing it in; the owner filling in their own listing (claim link).'],
    [''],
    [B('Not fine — don\'t point the scraper at')],
    ['• Google Maps / Google Search result pages, Tripadvisor, Booking.com, Facebook, Instagram, TikTok, Yelp, Wolt, Foody … — their terms forbid automated extraction. Their ratings and reviews are never copied; ratings come from step A or from our own guest reviews.'],
    ['• Logins, contact forms, pages behind cookies walls. Keep the default delays (1–1.5 s) and one tab.'],
    [''],
    [B('Photos and contact details')],
    ['• A photo stays the business\'s; it is shown to represent the business on its own listing and removed or replaced on request (or by the owner after claiming).'],
    ['• Business contact details are fine to show; for a one-person business an email can be personal data (GDPR): show only addresses published for customers, and remove on request. The "Is this your business? Claim, update or remove it" link in every popup is the way to ask.'],
  ];
  return { name: 'Rules', rows, widths: [120], wrap: true };
}

export const FILL_WIDTHS = [26, 30, 18, 12, 10, 30, 30, 18, 28, 34, ...SOCIALS.map(() => 26), ...DAYS.map(() => 14), 30, 28, 34, 30];
export { FILL_COLUMNS };
