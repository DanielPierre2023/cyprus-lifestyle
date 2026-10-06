# 173 Cyprus experience operators → `crm_orgs`

One file: `supabase/migrations/20261008110000_crm_load_experience_operators.sql`
Run it in the **Supabase Dashboard → SQL Editor**. I am not running it.

## What it does
Inserts the companies that actually run the 566 experiences in `public.activities`.
GetYourGuide does not publish the operator in its structured data — the name sits
only in each page's `og:brand` meta tag, which is where these came from.

**173 operators · 100 with email · 115 with website · 29 with phone.**

## Why not in `public.activities`
`20261004120000_activities.sql` deliberately drops `supplier` so no third-party
supplier data lives in the catalogue table. The CRM is the correct home. This is
the same reasoning that made my earlier `operator_name` column wrong.

## Conventions, matched to your existing 17,982 rows
| field | value | why |
|---|---|---|
| `status` | `prospect` | every existing row is `prospect` |
| `tier` | `C` | 17,829 of your rows are C |
| `category` | `tour-activity` | mirrors `directory_listings.canonical_category` and your hyphenated-slug convention (`law-relocation`, `art-culture`, `car-rental-prestige`) |

**Note:** your own `crm_upsert_account()` would have written `status='contacted'`,
which would have been wrong — nobody has been contacted. That is why this file
inserts directly rather than calling it.

## Deduplication
Three checks, mirroring how `crm_upsert_account()` already dedupes. An operator
that already exists is **skipped, never overwritten**:
1. exact `lower(trim(name))`
2. website domain
3. email domain — free-mail providers excluded, plus `cytanet.com.cy`, which is a
   Cyprus ISP and would otherwise collapse unrelated businesses together

Expect **~144 inserted, ~29 skipped**. Those 29 already match a
`directory_listings` record. Re-running adds nothing.

## Provenance
Every row carries it in `notes`: how many activities the operator runs, which
directory listing it matches, where the email came from (`your database` or
`scraped <domain>`), and a warning where the website match was only MEDIUM
confidence. `source_url` is the GetYourGuide Cyprus page on all rows.

A blank field means not found. Nothing is guessed.

## Worth knowing before you email anyone
- **The big names are intermediaries, not suppliers.** MTS Globe (43 activities)
  and TUI Cyprus (23) are destination management companies reselling other
  people's tours, and both returned no usable email. A partnership conversation,
  not a supplier pitch.
- **59 of the 100 emails are role addresses** (`info@`, `bookings@`,
  `reservations@`), not people. No named contacts exist — `crm_contacts` stays
  empty until you have real names.
- **27 websites are MEDIUM confidence** — domain and content matched but the site
  never named the legal entity. Flagged individually in `notes`.
- **58 operators have no website at all** — mostly single-boat and single-jeep
  sole traders who sell only through GetYourGuide. They are in the file with a
  name and nothing else, so they do not silently disappear from your count.

## Also in the files, if you want it later
`cyprus-activities-with-operators.csv` maps each of the 573 activities to its
operator, so you can see exactly which experiences each company runs.
