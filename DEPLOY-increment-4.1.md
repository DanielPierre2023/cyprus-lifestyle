# Increment 4.1 — Business Hub (first slice)

## Run first (Supabase → SQL Editor), before deploying
1. `supabase/migrations/20261006120000_business_hub.sql` (5 new server-only tables, RLS on, no policies, idempotent; changes no existing data).

## What it is
* `/account/business` (all 7 editions, noindex): a business signs in with the e-mail address that **verified its listing claim** (`directory_listings.provenance = 'owner-verified'`, `claim_contact`). One-time 30-minute link, then an HttpOnly cookie session (`cl_business`, 14 days sliding). Not Supabase Auth. Ownership is re-checked from the listing on every request.
* **Overview**: its listing(s) and the counters that already exist: enquiries (`directory_leads`), CTA clicks and concierge recommendations (last 90 days: `cta_by_listing`, `listing_attribution`), approved reviews. Page views are not measured and not shown.
* **Proposals**: new description, photo links (with a rights declaration) or news for the desk. Lifecycle: submitted -> approved / rejected / changes requested (business edits and resubmits) / withdrawn. Max 5 open per listing.
* **Enquiries**: the leads sent to its listing(s), with a status the business sets (new / seen / replied / closed). Replies happen in the business's own mailbox.
* **Admin -> Business Hub** (English): the queue. Approve writes a description to `summary_en` (+ `text_status='owned'`) or photos to `owned_photos`, exactly like Admin -> Moderation -> owner edits; approving **news publishes nothing**. Reject / request changes need a note, which the business sees. Every decision is written to the audit log; the desk is e-mailed when a proposal arrives.

## Honest limits
* No plans, quotas, billing, teams/roles, VAT invoices or entitlements: nothing here is tied to a paid tier. Every verified owner gets the same hub.
* Photos are links, not uploads (Supabase Storage uploads are a later increment). The desk should look at each link before approving.
* The proposal queue is separate from the older owner-edit queue (`directory_listing_edits`); both write the same listing columns.
* Descriptions are English (`summary_en`); the translation of an approved description into the other six editions is not part of this increment.
* Leads that exist only in the older tables (`ad_leads`, concierge hand-offs) are not shown: only `directory_leads`.
* The hub is not linked from any public page yet (see the proposed edits in the hand-over notes).
