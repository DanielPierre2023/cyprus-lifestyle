// POST /api/email/inbound — Resend inbound-email webhook.
// Resend receives mail for cypruslifestyle.eu (root MX points to Resend), parses
// it, and POSTs it here (signed with Svix). We verify the signature, then store
// the message in inbound_emails so the whole of @cypruslifestyle.eu is administered
// from the admin panel (Admin → Mail): read there, reply via Resend. Idempotent on
// Message-ID. Secure by default: without RESEND_INBOUND_SECRET set, it refuses.
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// Verify a Svix-signed webhook (Resend uses Svix). signedContent is
// `${id}.${timestamp}.${rawBody}`, HMAC-SHA256 with the base64 secret after
// "whsec_", compared (base64) against any v1 signature in the header.
function svixVerify(secret: string, id: string, ts: string, raw: string, header: string): boolean {
  try {
    const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const expected = createHmac('sha256', key).update(`${id}.${ts}.${raw}`).digest('base64');
    const exp = Buffer.from(expected);
    for (const part of header.split(' ')) {
      const sig = part.includes(',') ? part.split(',')[1] : part;
      const got = Buffer.from(sig);
      if (got.length === exp.length && timingSafeEqual(got, exp)) return true;
    }
  } catch { /* fall through to false */ }
  return false;
}

// from can be "Name <email>", a bare address, or an object {name,email}.
function parseAddr(v: unknown): { email: string; name: string | null } {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return { email: String(o.email || o.address || '').toLowerCase(), name: (o.name as string) || null };
  }
  const s = String(v || '');
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { email: m[2].trim().toLowerCase(), name: m[1].trim() || null };
  return { email: s.trim().toLowerCase(), name: null };
}
function firstTo(v: unknown): string | null {
  const one = Array.isArray(v) ? v[0] : v;
  const a = parseAddr(one);
  return a.email || null;
}
function headerValue(headers: unknown, name: string): string | null {
  const n = name.toLowerCase();
  if (Array.isArray(headers)) {
    for (const h of headers) {
      const o = h as Record<string, unknown>;
      if (String(o.name || o.key || '').toLowerCase() === n) return String(o.value || '');
    }
  } else if (headers && typeof headers === 'object') {
    for (const [k, val] of Object.entries(headers as Record<string, unknown>)) {
      if (k.toLowerCase() === n) return String(val);
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_INBOUND_SECRET || process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'RESEND_INBOUND_SECRET not configured' }, { status: 401 });
  }
  const raw = await req.text();
  const id = req.headers.get('svix-id') || '';
  const ts = req.headers.get('svix-timestamp') || '';
  const sig = req.headers.get('svix-signature') || '';
  if (!id || !ts || !sig || !svixVerify(secret, id, ts, raw, sig)) {
    return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 });
  }
  // Reject stale deliveries (replay guard): 5-minute tolerance.
  const tsSec = Number(ts);
  if (Number.isFinite(tsSec) && Math.abs(Date.now() / 1000 - tsSec) > 300) {
    return NextResponse.json({ ok: false, error: 'stale timestamp' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }); }
  const data = (payload.data as Record<string, unknown>) || payload;

  const from = parseAddr(data.from);
  if (!from.email) return NextResponse.json({ ok: true }); // nothing actionable

  const headers = data.headers;
  const messageId = String(data.message_id || data.messageId || headerValue(headers, 'message-id') || '') || null;
  const row = {
    received_at: (data.date as string) || (data.created_at as string) || new Date().toISOString(),
    message_id: messageId,
    in_reply_to: headerValue(headers, 'in-reply-to'),
    from_email: from.email,
    from_name: from.name,
    to_email: firstTo(data.to),
    cc: Array.isArray(data.cc) ? (data.cc as unknown[]).map((c) => parseAddr(c).email).filter(Boolean).join(', ') : (data.cc ? String(data.cc) : null),
    subject: (data.subject as string) || '(no subject)',
    text_body: (data.text as string) || null,
    html_body: (data.html as string) || null,
    headers: headers ?? null,
    attachments: (data.attachments as unknown) ?? null,
    spam_score: typeof data.spam_score === 'number' ? (data.spam_score as number) : null,
    status: 'new',
  };

  const { error } = await supabaseAdmin().from('inbound_emails').insert(row);
  // Duplicate Message-ID (re-delivery) is success, not an error.
  if (error && error.code !== '23505') {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
