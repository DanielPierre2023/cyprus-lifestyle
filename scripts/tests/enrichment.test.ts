// Complete-the-listings pipeline (lib/directory/enrichment.ts + lib/xlsx.ts): the Excel
// export round-trips, scraper exports are read as they come, every value is cleaned, rows
// are matched to the right listing, and NOTHING already on file is overwritten.
import { writeXlsx, readXlsx, gridToObjects, crc32, colName } from '@/lib/xlsx';
import {
  missingOf, exportRow, FILL_COLUMNS, parseDelimited, offerFrom, planImport, pickEmail, pickPhone, pickImage,
  classifySocial, parseOpeningHours, isOwnWebsite, priorityOf, type ListingRow,
} from '@/lib/directory/enrichment';
import { eq, ok, report } from './_harness';

// ── xlsx ─────────────────────────────────────────────────────────────────────────
eq('crc32 of "123456789"', crc32(Buffer.from('123456789')).toString(16), 'cbf43926');
eq('column names', [colName(0), colName(25), colName(26), colName(701), colName(702)], ['A', 'Z', 'AA', 'ZZ', 'AAA']);
{
  const buf = writeXlsx([
    { name: 'Guide', rows: [[{ text: 'Title', style: 'title' }], ['Line with <b> & "quotes"'], [{ text: 'link', link: 'https://ultimatewebscraper.com/' }]], wrap: true, widths: [90] },
    { name: 'Fill in', header: true, rows: [['slug', 'name', 'n'], ['a-b', 'Café Ωμέγα', 3], ['c', '  spaced ', ''], ['', '', '']] },
  ]);
  ok('xlsx is a zip', buf.readUInt32LE(0) === 0x04034b50);
  const back = readXlsx(buf);
  eq('sheet names', back.map((s) => s.name), ['Guide', 'Fill in']);
  eq('escaped text round-trips', back[0].rows[1][0], 'Line with <b> & "quotes"');
  const objs = gridToObjects(back[1].rows);
  eq('objects from header row', objs, [{ slug: 'a-b', name: 'Café Ωμέγα', n: '3' }, { slug: 'c', name: 'spaced', n: '' }]);
}
// A workbook as Excel / openpyxl write it: shared strings, rich-text runs, gaps, a number.
{
  const { zip } = require('@/lib/xlsx') as typeof import('@/lib/xlsx');
  const wb = `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const rels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x" Target="/xl/worksheets/sheet1.xml"/></Relationships>`;
  const sst = `<sst><si><t>URL</t></si><si><t>Emails</t></si><si><r><t>https://</t></r><r><t>meze.cy</t></r></si><si><t xml:space="preserve">info@meze.cy, x@gmail.com</t></si></sst>`;
  const sheet = `<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>7</v></c><c r="C2" t="s"><v>3</v></c></row></sheetData></worksheet>`;
  const buf = zip([{ name: 'xl/workbook.xml', data: wb }, { name: 'xl/_rels/workbook.xml.rels', data: rels }, { name: 'xl/sharedStrings.xml', data: sst }, { name: 'xl/worksheets/sheet1.xml', data: sheet }]);
  const objs = gridToObjects(readXlsx(buf)[0].rows);
  eq('shared strings, runs, gaps, absolute targets', objs, [{ URL: 'https://meze.cy', col2: '7', Emails: 'info@meze.cy, x@gmail.com' }]);
}

// ── What is missing / export rows ────────────────────────────────────────────────────
const L = (o: Partial<ListingRow>): ListingRow => ({ slug: 'x', status: 'listed', ...o });
eq('everything missing', missingOf(L({})), ['image', 'phone', 'email', 'website', 'hours', 'socials']);
eq('complete listing', missingOf(L({ image: 'https://a/b.jpg', phone: '+357 25 123456', email: 'a@b.cy', url: 'https://b.cy', hours: { mon: '9-5' }, socials: { instagram: 'https://instagram.com/b' } })), []);
eq('gallery counts as a photo, JSON text hours count', missingOf(L({ gallery: ['https://a/1.jpg'], hours: '{"tue":"10-14"}' })).includes('image'), false);
ok('published + popular first', priorityOf(L({ status: 'published' })) > priorityOf(L({ rating_count: 5000, url: 'https://a.cy' })));
{
  const r = exportRow(L({ slug: 'meze', name_en: 'Meze', type: 'restaurant', status: 'published', district: 'limassol', url: 'https://meze.cy', socials: { twitter: 'https://x.com/meze' }, hours: { mon: '12:00–23:00' } }));
  eq('every fill column present', Object.keys(r).sort(), [...FILL_COLUMNS].sort());
  eq('missing named (hours + socials on file)', r.missing, 'photo, phone, email');
  eq('twitter → x, hours pre-filled', [r.x, r.hours_mon], ['https://x.com/meze', '12:00–23:00']);
  eq('our page for published', r.our_page, 'https://cypruslifestyle.eu/directory/restaurant/meze');
  ok('look-up link', r.look_up.startsWith('https://www.google.com/maps/search/?api=1&query=Meze%2C%20limassol%2C%20Cyprus'));
}

// ── Cleaning scraper values ─────────────────────────────────────────────────────────
eq('email: own domain + generic inbox first', pickEmail('x@gmail.com, chef@meze.cy, info@meze.cy', 'https://www.meze.cy'), 'info@meze.cy');
eq('email: junk dropped', pickEmail('logo@2x.png, user@example.com, noreply@meze.cy'), null);
eq('phone: Cypriot first', pickPhone('+44 20 7946 0958, +357 25 123456'), '+357 25 123456');
eq('phone: 8-digit local', pickPhone('99 123456'), '99 123456');
eq('image: logos skipped', pickImage('https://meze.cy/logo.png https://meze.cy/hero.jpg'), 'https://meze.cy/hero.jpg');
eq('social: profile kept, tracking dropped', classifySocial('https://www.instagram.com/meze.cy/?hl=en'), { k: 'instagram', url: 'https://www.instagram.com/meze.cy' });
eq('social: share button rejected', classifySocial('https://www.facebook.com/sharer/sharer.php?u=x'), null);
eq('social: a post is not a profile', classifySocial('https://www.instagram.com/p/Cx123/'), null);
eq('social: twitter → x', classifySocial('https://twitter.com/meze')?.k, 'x');
eq('schema.org hours', parseOpeningHours('Mo-Fr 09:00-18:00, Sa 10:00-14:00'), { mon: '09:00–18:00', tue: '09:00–18:00', wed: '09:00–18:00', thu: '09:00–18:00', fri: '09:00–18:00', sat: '10:00–14:00' });
eq('schema.org wrap-around + list', parseOpeningHours('Fr-Su 18:00-02:00; We,Th 18:00-23:00').sun, '18:00–02:00');
eq('Google-style lines', parseOpeningHours('Monday: 9 AM – 5 PM; Sunday: Closed'), { mon: '9 AM – 5 PM', sun: 'Closed' });
eq('platforms are not own websites', [isOwnWebsite('https://facebook.com/meze'), isOwnWebsite('https://meze.cy'), isOwnWebsite('linktr.ee/x')], [false, true, false]);

// ── Reading the scraper's exports as they come ───────────────────────────────────────
{
  const email = parseDelimited('URL,Emails,Email Count,Instagram,Facebook\nhttps://www.meze.cy/,"info@meze.cy, chef@meze.cy",2,https://instagram.com/meze.cy,\n');
  const o = offerFrom(email[0]);
  eq('email extractor row', [o.site, o.email, o.socials.instagram, o.phone], ['https://www.meze.cy/', 'info@meze.cy', 'https://instagram.com/meze.cy', null]);
  const semi = parseDelimited('slug;phone;hours_mon\r\nmeze;+357 25 111111;12:00–23:00\r\n');
  eq('semicolon CSV (Excel DE/GR)', semi, [{ slug: 'meze', phone: '+357 25 111111', hours_mon: '12:00–23:00' }]);
  const page = offerFrom({ 'URL': 'https://meze.cy', 'Page Metadata - Image': 'https://meze.cy/og.jpg', 'Phone Numbers': '+357 25 123456', 'openingHours': 'Mo-Su 12:00-23:00', 'Social Links': 'https://facebook.com/meze https://tiktok.com/@meze' });
  eq('page extractor row', [page.image, page.phone, page.hours.sun, page.socials.facebook, page.socials.tiktok], ['https://meze.cy/og.jpg', '+357 25 123456', '12:00–23:00', 'https://facebook.com/meze', 'https://tiktok.com/@meze']);
  const fb = offerFrom({ website: 'https://www.facebook.com/somebar' });
  eq('a Facebook page is a social link, not a website', [fb.website, fb.socials.facebook], [null, 'https://www.facebook.com/somebar']);
}

// ── Planning: fill only empty fields, match safely ───────────────────────────────────
{
  const listings: ListingRow[] = [
    { slug: 'meze', status: 'published', url: 'https://www.meze.cy/', phone: '+357 25 000000', email: null, image: null, socials: { facebook: 'https://facebook.com/old' } },
    { slug: 'chain-a', status: 'listed', url: 'https://chain.cy/limassol' },
    { slug: 'chain-b', status: 'listed', url: 'https://chain.cy/paphos' },
    { slug: 'fbonly', status: 'listed', url: 'https://facebook.com/fbonly' },
    { slug: 'fbother', status: 'listed', url: 'https://facebook.com/other' },
  ];
  const plan = planImport([
    offerFrom({ URL: 'https://meze.cy', Emails: 'info@meze.cy', 'Phone Numbers': '+357 25 999999', Facebook: 'https://facebook.com/new', Instagram: 'https://instagram.com/meze' }),
    offerFrom({ URL: 'https://chain.cy', Emails: 'hello@chain.cy', 'Phone Numbers': '+357 22 123456' }),
    offerFrom({ URL: 'https://chain.cy/paphos', 'Page Metadata - Image': 'https://chain.cy/paphos.jpg' }),
    offerFrom({ URL: 'https://facebook.com', Emails: 'a@b.cy' }),
    offerFrom({ slug: 'nope', email: 'x@y.cy' }),
    offerFrom({ slug: 'meze', email: 'other@meze.cy' }),
  ], listings);
  const meze = plan.patches.find((p) => p.slug === 'meze')!;
  eq('meze: email filled, phone kept (already on file)', [meze.fields.email, meze.fields.phone], ['info@meze.cy', undefined]);
  eq('socials merged without overwriting', meze.fields.socials, { facebook: 'https://facebook.com/old', instagram: 'https://instagram.com/meze' });
  eq('a later row cannot overwrite what an earlier row filled', meze.fields.email, 'info@meze.cy');
  const a = plan.patches.find((p) => p.slug === 'chain-a')!; const b = plan.patches.find((p) => p.slug === 'chain-b')!;
  eq('chain domain → email to all branches, not one branch\'s phone', [a.fields.email, a.fields.phone, b.fields.email], ['hello@chain.cy', undefined, 'hello@chain.cy']);
  eq('exact branch URL → its own photo', b.fields.image, 'https://chain.cy/paphos.jpg');
  ok('facebook.com never matched by domain', !plan.patches.some((p) => p.slug === 'fbonly' || p.slug === 'fbother'));
  eq('counts', [plan.rows, plan.matched, plan.unmatched], [6, 4, 2]);
  eq('filled summary', plan.filled.email, 3);
}

report('directory.enrichment');
