#!/usr/bin/env python3
# scripts/import/atlas-3-descriptions.py — extract the DESCRIPTION and IMAGE that the
# original clean_atlas.py deliberately dropped, keyed by the SAME slug the directory rows
# already use (from the cyprusatlas /company/<slug> PAGE URL). Output feeds atlas_descriptions
# staging → atlas-4-descriptions-merge.sql, which fills directory_listings.source_description /
# source_image on the rows we already imported. This is OUR provided data, not a web scrape:
# it makes the concierge classify + semantically match the whole directory instead of guessing
# from a bare name. Run:  python3 atlas-3-descriptions.py <source.csv> [out.csv]
import csv, re, sys, unicodedata
csv.field_size_limit(10_000_000)

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'atlas_descriptions.csv'

def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s or '') if unicodedata.category(c) != 'Mn')

def slug_of(page_url, name):
    m = re.search(r'/company/([a-z0-9\-]+)', page_url or '')
    if m:
        return m.group(1)
    base = re.sub(r'[^a-z0-9]+', '-', strip_accents((name or 'business').lower())).strip('-')[:60]
    return base or 'business'

def clean(t):
    return re.sub(r'\s+', ' ', (t or '').replace('\x00', '').strip())

rows, seen = [], set()
n = kept = with_desc = with_img = 0
with open(SRC, encoding='utf-8-sig', newline='') as fh:
    for row in csv.DictReader(fh):
        if (row.get('Type') or '').strip() != 'LocalBusiness':
            continue
        n += 1
        slug = slug_of(row.get('PAGE URL'), row.get('Name'))
        if slug in seen:
            continue
        seen.add(slug)
        desc = clean(row.get('Description'))
        img = clean(row.get('Image'))
        if not desc and not img:
            continue
        rows.append({'slug': slug, 'description': desc, 'image': img})
        kept += 1
        with_desc += 1 if desc else 0
        with_img += 1 if img else 0

with open(OUT, 'w', encoding='utf-8', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=['slug', 'description', 'image'])
    w.writeheader()
    w.writerows(rows)

print('=== DESCRIPTIONS EXTRACT ===')
print(f'  LocalBusiness rows scanned : {n}')
print(f'  unique slugs written       : {kept}')
print(f'  with description           : {with_desc}')
print(f'  with image                 : {with_img}')
print(f'  wrote {OUT}')
