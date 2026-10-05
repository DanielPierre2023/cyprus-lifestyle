# Phase 1 · Increment 1.3 — audit log, members, Friday newsletter, publishing fixes

Applied on top of `main` (`bdb7928`). Admin stays English; the only public text added is the unsubscribe page and the
unsubscribe word in the e-mail footer — both in all 7 languages.
Verified on a clean copy: secrets ✔ migration rules ✔ translation parity ✔ `tsc` ✔ ESLint 0 errors ✔ 53 test suites ✔ `next build` ✔ and the
database restore drill ✔ (now 8 steps, incl. an audit-trail test and a newsletter-tables test).

## 1. Run in Supabase → SQL Editor (in this order; idempotent; change no existing data)
| # | File | What it does |
|---|---|---|
| 1 | `supabase/migrations/20261005140000_admin_audit_log.sql` | The audit trail table + triggers on 20 admin-edited tables |
| 2 | `supabase/migrations/20261005140100_newsletter_workflow.sql` | Draft/approve columns, one-campaign-per-week rule, delivery log |

## 2. Server settings (Vercel → Environment Variables) — optional but recommended
* `NEWSLETTER_APPROVER_EMAIL` — gets "drafts are ready" on Friday mornings.
* `NEWSLETTER_UNSUB_SECRET` — signs the unsubscribe links. If you leave it empty `CRON_SECRET` is used (already set). If both are empty **nothing is sent**.

## 3. What you get
**Audit log** (Admin → *Audit log*). Every edit an administrator makes in the admin screens (articles, listings, prices, orders, roles, settings, CRM, …) is recorded
by the database itself: who, when, which row and — for updates — only the fields that changed. Server actions (approving a newsletter, granting a
membership) are recorded too. Background jobs are not. Nobody can edit or delete entries from the app.

**Members** (Admin → *Members*). All Concierge members, paying and complimentary: counts, monthly revenue (gross, VAT included), people cancelling, new in 30 days, CSV export.
*Grant* a complimentary membership with just an e-mail address (the person then uses “Email me a link” on /membership); *End* / *Reinstate* complimentary ones.
Paying members link to their Stripe subscription — cancel there.

**Friday newsletter** (Admin → *Newsletter*).
1. Every Friday ≈ 09:00 Cyprus time the daily job prepares one **draft per language** (skips a language with no new articles or no confirmed readers) and e-mails you.
2. You **Preview** it, **Send me a test**, and press **Approve & send**. Nothing is ever sent without that click.
3. Sending is resumable and can never mail one person twice (an address is claimed before it is mailed); large lists finish automatically within minutes.
4. Every e-mail has a **personal, signed unsubscribe link** and the mail programs' one-click “Unsubscribe” button.

First-time check: press *Prepare this week's drafts* → *Send me a test* → open the test, look at the layout and click “Unsubscribe” (it asks for confirmation) → *Approve & send* for one edition.

**Publishing fixes.** (a) The editor and the Articles list called `/api/admin/revalidate`, which did not exist — so “Published and live now” never appeared and readers saw changes only after up to 5 minutes. It exists now. (b) Saving an already-published article moved its publication date to “now” (re-posting it to the top of the home page and the newsletter); the original date is kept now.

## 4. Problems found on the way (all fixed here)
* The newsletter's unsubscribe link was the literal text `{{unsubscribe}}` — a dead link in an ordinary e-mail — and no page handled newsletter opt-outs. A working opt-out is a legal requirement for a mailing list.
* Nothing scheduled the newsletter (the admin page said “Mondays 06:00”, the subscriber e-mail said “every Friday”), and `/api/cron/newsletter-weekly` mailed **every subscriber immediately** if it was ever called, with no protection against sending twice. It now only prepares drafts.

## 5. Decisions for you
1. **The newsletter's name.** It is delivered on Fridays but called “Saturday Letter” in the 7-language copy: home-page title, membership page, privacy policy, advertising page, the concierge's instructions, the ad product “Saturday Letter — sole sponsor” and the fulfilment checklist. Options: rename to **“Friday Letter”** everywhere (I prepare the package), or keep the brand name. I did not touch it.
2. **Social posts** are still not scheduled — automatic posting belongs to the parked auto-publishing topic.

## 6. Existing files that changed (small)
`lib/email.ts` (+ localized “Unsubscribe”, optional headers, batch sending), `lib/newsletter.ts` (old send-now code removed; moved to `lib/newsletterDigest.ts`),
`app/api/admin/newsletter/route.ts` and `…/cron/newsletter-weekly/route.ts` (rewritten), `…/cron/tick` (+Friday prepare), `…/cron/worker` (+finish approved sends),
`editor/page.tsx` and `articles/page.tsx` (publication date), `AdminNav.tsx` (+2 links), `newsletter/page.tsx` (rewritten), `.env.example` (appended), `scripts/db/restore-drill.sh` (+2 steps).
