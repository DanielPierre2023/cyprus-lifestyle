# Complete every listing — photos, phone, email, website, hours, socials

The map popup shows everything a listing has: photo(s), rating ★ 4.7 (1,234), address,
opening hours ("open now"), phone, email, website, social links, amenities, description.
Most of the ~14.7k imported (`listed`) businesses only have a name, category and address.
This is how to complete them — cheapest and safest first.

## 1 · Automatic — Google Places (already built in)

The `enrich-directory` edge function looks every business up with the official Google
Places API and fills photo, website, phone, Google rating + review count and a short
description, then reads a public email from the business's website. It already runs for
published listings; for **all** of them:

```
https://<project>.supabase.co/functions/v1/enrich-directory?key=<ENRICH_SECRET>&entity=directory&status=all&limit=40
```

40 businesses per call (~40 s), continues where it stopped — repeat or schedule it until it
reports 0 rows. Google bills per lookup (Places API price list, October 2026: Text Search
Enterprise $35 / 1,000, Place Photos $7 / 1,000, first 1,000 a month free each) — roughly
$500–650 for all imported businesses once. `&reviews=1` also stores 5 review snippets
(Enterprise + Atmosphere, $40 / 1,000).

## 2 · Scraper — Ultimate Web Scraper on the businesses' own websites

**Admin → Directory → Complete listings** (`/admin/directory/complete`):

- **Download the list (Excel)** — a guide (step by step, exact settings), "Fill in" (one row
  per business that misses something, current values pre-filled, the gaps named, a Google
  Maps look-up link), "Websites to scan", Columns, Rules. Filter by what is missing,
  status, district, max rows.
- **Websites to scan (CSV)** — the scraper's input (slug, name, url; own websites only).
- **Upload results** — the "Fill in" sheet or the scraper's Excel/CSV export as it comes
  (Email Extractor, Page Extractor, Social Link Extractor; comma or semicolon CSV). **Check**
  shows what would be filled; **Apply** writes it.

The importer matches rows by slug, else exact website, else website domain (a domain shared
by several branches only contributes email + social links), cleans every value (own-domain
and info@ emails first, Cypriot phones first, logos skipped, profile links only,
schema.org opening hours understood) and **only fills empty fields** — re-checked at write
time. A template of the workbook (with the SQL to pull the list straight from Supabase) is
built by `npx tsx scripts/directory/enrichment-template.ts out.xlsx`.

## 3 · By hand / by the owner

Rows without a website: the "look up" link opens a Google Maps search — type what you see
into "Fill in" and upload it. Every popup of an unclaimed business links to
"Is this your business? Claim, update or remove it" (`/partner?listing=<slug>`).

## Rules (short)

Fine: the business's own website, the official Google Places API, OpenStreetMap (credit
"© OpenStreetMap contributors"), looking things up by hand, the owner. Not fine: pointing the
scraper at Google Maps, Tripadvisor, Booking, Facebook, Instagram etc. — their terms forbid
it, and their ratings/reviews are never copied. Photos stay the business's and are removed on
request; for one-person businesses an email can be personal data — remove on request.
Not legal advice.

## Files

```
lib/xlsx.ts                                  .xlsx writer + reader (no dependency), tested
lib/directory/enrichment.ts                  what is missing, export rows, import cleaning + matching (pure, tested)
lib/directory/enrichment-guide.ts            the workbook's guide sheets
lib/directory/enrichment-data.ts             Supabase reads / writes (server-only)
app/api/admin/directory/enrichment/route.ts  GET xlsx|csv · POST check (file) · POST apply (patches)
app/[locale]/admin/(panel)/directory/complete/page.tsx + components/admin/DirectoryCompleteListings.tsx
scripts/directory/enrichment-template.ts     the template workbook
scripts/tests/enrichment.test.ts             41 assertions
```
