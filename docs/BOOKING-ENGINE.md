# Booking engine and the member priority lane (Increment 2.2)

## What it does
1. A guest sends a concierge request (existing form). If they left an e-mail or phone, a **booking** is opened automatically (`bookings`), with a reference such as `CL-7KQ4MX`, a **lane** and a **first-reply deadline**.
2. **Lane.** `member` only if the request arrives with a valid `cl_member` session cookie (the member signed in at /account) whose membership passes `entitled()` (active, complimentary, or payment problem inside the 7-day grace). Everybody else is `standard`. The lane is decided once, on the server, and stored; the guest cannot influence it (an e-mail address typed into the form or a browser id does **not** count).
3. **SLA (a target, measured).** Working time in Cyprus, Mon–Fri 09:00–18:00 (`lib/booking/sla.ts`; public holidays are not modelled): member = **4 working hours**, standard = **1 working day (9 h)** to the first *personal* reply. The first reply is sending a message from the panel, or pressing "Mark first reply done" (phone/WhatsApp). The deadline is stamped on the booking; the admin queue shows a live timer; one e-mail alert per booking goes to the desk when the deadline passes (needs the sweep scheduled, below).
4. **Queue order (enforced in code, `lib/booking/queue.ts`).** Members first, always. Inside a lane: still waiting for a first reply first, then earliest deadline. The page also shows "standard requests overdue" so strict ordering cannot hide a neglected standard request.
5. **Partners by magic link.** In **Admin → Bookings → Work → Ask partner** the desk enters a partner (name, optional e-mail, e-mail language). The partner gets a private link (no login): *I can help / Send a price / Suggest an alternative / I can't help*. Opening the link changes nothing; only the form's POST does. Partners see the request text, never the guest's contact details. One automatic reminder after 24 h. Without an e-mail address, copy the link and send it by WhatsApp. Links last 14 days.
6. **Guest status page** `/booking/<private link>` (all 7 languages, never cached or indexed): reference, status, queue (member priority lane / standard), the first-reply target, and the partner answers the desk chose to **show to guest**. A partner who changes an answer after it was shown is hidden again until the desk re-approves.
7. **Commission ledger — record only.** Once a booking is confirmed the desk records gross, rate, and the commission is computed (half-up cents). Entries are *expected → confirmed*, or *void* with a reason; amounts can never be edited (database trigger) and rows are never deleted. Nothing invoices, collects or pays anyone.

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
Bookings hang off `concierge_requests` with `ON DELETE CASCADE`, so the existing erase-by-e-mail also removes the booking, partner replies and events. Ledger rows keep only the reference, partner and amounts.
