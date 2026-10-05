# Booking engine and the member priority lane (Increment 2.2)

## What it does
1. A guest sends a concierge request (existing form). If they left an e-mail or phone, a **booking** is opened automatically (`bookings`), with a reference such as `CL-7KQ4MX`, a **lane** and a **first-reply deadline**.
2. **Lane.** `member` only if the request arrives with a valid `cl_member` session cookie (the member signed in at /account) whose membership passes `entitled()` (active, complimentary, or payment problem inside the 7-day grace). Everybody else is `standard`. The lane is decided once, on the server, and stored; the guest cannot influence it (an e-mail address typed into the form or a browser id does **not** count).
3. **SLA (a target, measured).** Working time in Cyprus, Mon–Fri 09:00–18:00 (`lib/booking/sla.ts`; Cyprus public holidays are excluded, see "Public holidays" below): member = **4 working hours**, standard = **1 working day (9 h)** to the first *personal* reply. The first reply is sending a message from the panel, or pressing "Mark first reply done" (phone/WhatsApp). The deadline is stamped on the booking; the admin queue shows a live timer; one e-mail alert per booking goes to the desk when the deadline passes (needs the sweep scheduled, below).
4. **Queue order (enforced in code, `lib/booking/queue.ts`).** Members first, always. Inside a lane: still waiting for a first reply first, then earliest deadline. The page also shows "standard requests overdue" so strict ordering cannot hide a neglected standard request.
5. **Partners by magic link.** In **Admin → Bookings → Work → Ask partner** the desk enters a partner (name, optional e-mail, e-mail language). The partner gets a private link (no login): *I can help / Send a price / Suggest an alternative / I can't help*. Opening the link changes nothing; only the form's POST does. Partners see the request text, never the guest's contact details. One automatic reminder after 24 h. Without an e-mail address, copy the link and send it by WhatsApp. Links last 14 days.
6. **Guest status page** `/booking/<private link>` (all 7 languages, never cached or indexed): reference, status, queue (member priority lane / standard), the first-reply target, and the partner answers the desk chose to **show to guest**. A partner who changes an answer after it was shown is hidden again until the desk re-approves.
7. **Commission ledger — record only.** Once a booking is confirmed the desk records gross, rate, and the commission is computed (half-up cents). Entries are *expected → confirmed*, or *void* with a reason; amounts can never be edited (database trigger) and rows are never deleted. Nothing invoices, collects or pays anyone.

## Public holidays (Increment 2.2b)
`lib/booking/holidays.ts` computes Greek Orthodox Easter (Meeus Julian algorithm, converted to Gregorian) and derives the movable holidays: Green Monday (Easter -48), Good Friday (-2), Easter Monday (+1), Easter Tuesday (+2, a *bank* holiday), Pentecost Monday / Kataklysmos (+50). Fixed: 1 Jan, 6 Jan, 25 Mar, 1 Apr, 1 May, 15 Aug, 1 Oct, 28 Oct, 25 Dec, 26 Dec. **Public** days stop the SLA clock; **optional** ones (Christmas Eve, Holy Saturday, Easter Sunday) do not (`isCyprusHoliday(date, includeOptional)`). A holiday on a weekend is **not** moved: the Central Bank's lists print none ("falls on a Saturday"). One-off closures go into `HOLIDAYS` in `sla.ts`. Sources: Central Bank of Cyprus bank-holiday lists 2025-2028 (reproduced in `scripts/tests/holidays.test.ts`), Office of the Financial Commissioner state-holiday list, Wikipedia / timeanddate cross-checks.

## E-mail correspondence in the booking history
Every e-mail the engine sends (guest acknowledgement, partner link and reminder, desk alerts, replies to the guest, failed sends too) is stored as a `booking_events` row `mail_out`; replies that arrive through the mail intake (`POST /api/email/inbound`) are matched to a booking by the reference `CL-XXXXXX` and stored as `mail_in` (`lib/booking/correspondence.ts`, wired in `lib/booking/inbound.ts`). The English admin detail has a **Correspondence** box. Rules: exactly one reference (subject first, then body); the same inbound mail is attached once; the sender is classified guest / partner / own domain / **unverified** (the reference is not a secret, so an unverified mail is shown with a warning and changes nothing); private links are redacted before storage. The guest acknowledgement subject now ends with the reference so a plain reply finds its booking.

## Scheduled sweep
`/api/cron/booking-sla` accepts GET and POST (pg_cron's `ops.cron_post` sends POST with `x-cron-secret`), is overlap-safe (each alert/reminder is claimed atomically before sending, released if the send fails) and time-boxed to 45 s. Job line for `supabase/pg_cron/install-jobs.sql`: `select ops.schedule_job('cl-booking-sla', '*/15 * * * *', $c$select ops.cron_post('site', '/api/cron/booking-sla')$c$, array['cl_site_url','cl_cron_secret']);`

## Truth in advertising — what public copy may and may not say
| Statement | Backed by |
|---|---|
| "Signed-in members' requests are handled before standard requests." | `compareQueue` (members first), `bookings.lane` set from the session |
| "Our target for a first personal reply is 4 working hours (members) / one working day." | `first_response_due_at`, admin timer, breach alert |
| "Cyprus Lifestyle may receive a commission from partners." | `commission_ledger` |
| NOT allowed: "guaranteed", "always first", "within 4 hours" without "target", "24/7", a named dedicated concierge | not enforced anywhere |
Guests only get the member lane if they are **signed in** when they send the request; say so wherever the priority lane is advertised.

## One-time set-up
1. Run `supabase/migrations/20261006100000_booking_engine.sql` in the Supabase SQL editor (4 new tables, 1 trigger function; no existing data touched). Do this **before** deploying.
2. Optional env var `BOOKING_LINK_SECRET` (any random string ≥ 16 chars). If absent the service-role key is used. Changing it later invalidates every outstanding guest/partner link.
3. Make sure a desk inbox exists (`CONCIERGE_INBOX`, else `DIRECTORY_INBOX`/`ADVERTISE_INBOX`) and `RESEND_API_KEY`/`EMAIL_FROM`, otherwise no e-mail leaves the system (the admin page tells you when a send failed, and shows copyable links).
4. Schedule the sweep: call `GET /api/cron/booking-sla` with `Authorization: Bearer $CRON_SECRET` every 15–30 minutes (pg_cron in Supabase, or a `vercel.json` cron on a plan that allows it; the Hobby daily cron is too coarse for a 4-hour target). Until scheduled, overdue bookings are still **visible** in the queue, but no e-mail alert and no partner reminder is sent.

## Privacy
Bookings hang off `concierge_requests` with `ON DELETE CASCADE`. Since migration `20261007100000_privacy_erase_bookings.sql` the erase report (`erase_personal_data`) lists bookings, partner requests and history rows explicitly, blanks the person's address where they appear as a partner, removes their e-mails from other bookings' histories, and removes the free-text note of ledger rows (which stay as accounting records: reference, partner, amounts).

## /account
A signed-in member sees their own requests (opened while signed in, or sent with their verified e-mail): reference, status, lane, number of partner answers the desk shared, and the private status link. Copy: `acct*` keys in `lib/booking/copy.ts` (7 editions; non-English wording needs native review).
