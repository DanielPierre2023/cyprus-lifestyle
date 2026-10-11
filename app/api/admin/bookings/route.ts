// Admin → Bookings (the request queue). Admin only.
//   GET                 → the queue (members first) + recent finished bookings + counters
//   GET ?id=<uuid>      → one booking: partners (with their magic links), events (incl. every e-mail in/out), ledger
//   GET ?requests=a,b   → which concierge requests already have a booking: { [requestId]: { id, ref } } (for the Requests page)
//   POST { action, … }  → assign · status · note · message_guest · first_reply · partner_add · share · commission · commission_confirm · commission_void
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { auditLog } from '@/lib/audit';
import { bookingDeps } from '@/lib/booking/runtime';
import { BOOKING_COLS, listEvents } from '@/lib/booking/store';
import { isQueueStatus, sortQueue, summarize } from '@/lib/booking/queue';
import { formatMinutes, slaState } from '@/lib/booking/sla';
import { ledgerTotals, eurosToCents, percentToBps } from '@/lib/booking/commission';
import {
  addNote, assign, confirmCommission, guestLink, markFirstReply, messageGuest, partnerLink, recordCommission, sendPartnerRequest, setStatus, shareWithGuest, voidCommission,
} from '@/lib/booking/engine';
import type { BookingRow } from '@/lib/booking/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const forbidden = () => NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
const view = (b: BookingRow, now: Date) => {
  const { status_token_hash: _h, ...rest } = b; void _h;
  const s = slaState(b, now);
  return { ...rest, sla_state: s.state, sla_left: formatMinutes(s.minutesLeft) };
};

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return forbidden();
  const sb = supabaseAdmin();
  const d = bookingDeps(sb);
  const now = new Date();
  const reqIds = req.nextUrl.searchParams.get('requests');
  if (reqIds) {
    const ids = reqIds.split(',').map((x) => x.trim()).filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 300);
    const { data } = ids.length ? await sb.from('bookings').select('id, ref, concierge_request_id').in('concierge_request_id', ids) : { data: [] };
    const map: Record<string, { id: string; ref: string }> = {};
    for (const r of (data as { id: string; ref: string; concierge_request_id: string }[]) || []) map[r.concierge_request_id] = { id: r.id, ref: r.ref };
    return NextResponse.json({ ok: true, map });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const b = await d.store.getBooking(id);
    if (!b) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    const [partners, ledger, events] = await Promise.all([d.store.listPartners(b.id), d.store.listLedger(b.id), listEvents(sb, b.id)]);
    return NextResponse.json({
      ok: true, booking: view(b, now), guestLink: guestLink(d, b), events, ledger, totals: ledgerTotals(ledger),
      partners: partners.map(({ token_hash: _t, ...p }) => { void _t; return { ...p, link: partnerLink(d, p) }; }),
    });
  }
  const queue = await d.store.listQueueBookings();
  const { data: rest } = await sb.from('bookings').select(BOOKING_COLS).not('status', 'in', '(new,in_progress,awaiting_partner,quote_ready)').order('created_at', { ascending: false }).limit(100);
  const q = sortQueue(queue).map((b) => view(b, now));
  const others = ((rest as BookingRow[]) || []).filter((b) => !isQueueStatus(b.status)).map((b) => view(b, now));
  return NextResponse.json({ ok: true, queue: q, others, summary: summarize(q), now: now.toISOString() });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return forbidden();
  const body = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();
  const d = bookingDeps(sb);
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  const actor = `admin:${user?.email || user?.id || 'unknown'}`;
  const action = String(body.action || '');
  const bid = String(body.id || '');
  type R = { ok: boolean; error?: string } & Record<string, unknown>;
  let r: R;
  try {
    switch (action) {
      case 'assign': r = await assign(d, actor, bid, body.assignee); break;
      case 'status': r = await setStatus(d, actor, bid, body.status); break;
      case 'note': r = await addNote(d, actor, bid, body.text); break;
      case 'message_guest': r = await messageGuest(d, actor, bid, body.message); break;
      case 'first_reply': r = await markFirstReply(d, actor, bid, body.channel); break;
      case 'partner_add': {
        const x = await sendPartnerRequest(d, actor, bid, body);
        r = x.ok ? { ok: true, replyUrl: x.replyUrl, emailed: x.emailed } : x; break;
      }
      case 'share': r = await shareWithGuest(d, actor, String(body.partnerId || ''), body.share === true); break;
      case 'commission': {
        const gross = body.gross === undefined || body.gross === '' ? undefined : eurosToCents(body.gross);
        const rate = percentToBps(body.ratePercent);
        if (gross === null) { r = { ok: false, error: 'Gross amount must look like 120 or 120.50.' }; break; }
        if (rate === null) { r = { ok: false, error: 'Rate must look like 10 or 12.5 (percent).' }; break; }
        const x = await recordCommission(d, actor, String(body.partnerId || ''), { grossCents: gross, rateBps: rate, note: body.note });
        r = x.ok ? { ok: true } : x; break;
      }
      case 'commission_confirm': r = await confirmCommission(d, actor, String(body.ledgerId || '')); break;
      case 'commission_void': r = await voidCommission(d, actor, String(body.ledgerId || ''), body.reason); break;
      default: return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 500 });
  }
  if (r.ok && (action.startsWith('commission') || action === 'status' || action === 'assign')) {
    await auditLog(sb, { actor: user?.id ?? null, actorEmail: user?.email ?? null, action: `booking.${action}`, table: 'bookings', rowId: bid || undefined, summary: action, changes: { status: body.status, assignee: body.assignee } });
  }
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
