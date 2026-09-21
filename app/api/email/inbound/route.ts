// POST /api/email/inbound — Resend inbound-email webhook (event: email.received).
// Resend receives mail for cypruslifestyle.eu (root MX → Resend), and POSTs a
// Svix-signed webhook here. IMPORTANT: Resend's webhook carries only METADATA
// (from/to/subject/ids) — not the body — so we then call Resend's Retrieve
// Received Email API (GET /emails/receiving/{id}) to pull the full text/html/
// headers, and store the complete message in inbound_emails. That makes the whole
// of @cypruslifestyle.eu administrable from Admin → Mail (read + reply via Resend).
// Idempotent on Message-ID. Secure by default: refuses without RESEND_INBOUND_SECRET.
import { NextRequest, NextResponse, after } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { runInboundAssist } from '@/lib/mail/assist';

export const runtime = 'nodejs';
// We respond to the webhook immediately (Resend/Svix want a fast 200) and let the
// AI draft-on-arrival + guarded auto-acknowledge run in the background via after().
export const maxDuration = 60;

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
function joinAddrs(v: unknown): string | null {
  if (!v) return null;
  const arr = Array.isArray(v) ? v : [v];
  const out = arr.map((x) => parseAddr(x).email).filter(Boolean);
  return out.length ? out.join(', ') : null;
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

// Pull the full received email (body + headers) that the webhook omits.
async function retrieveReceived(emailId: string): Promise<Record<string, unknown> | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !emailId) return null;
  try {
    const r = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
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
  const tsSec = Number(ts);
  if (Number.isFinite(tsSec) && Math.abs(Date.now() / 1000 - tsSec) > 300) {
    return NextResponse.json({ ok: false, error: 'stale timestamp' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }); }
  // Only inbound mail matters here; acknowledge (200) and ignore any other event
  // this endpoint might be subscribed to.
  const type = String(payload.type || '');
  if (type && type !== 'email.received') return NextResponse.json({ ok: true, ignored: type });

  const meta = (payload.data as Record<string, unknown>) || payload;
  const emailId = String(meta.email_id || meta.id || '');
  // The webhook is metadata-only; fetch the full message. Fall back to metadata
  // if the API call can't be made (e.g. RESEND_API_KEY missing).
  const full = await retrieveReceived(emailId);
  const src = full || meta;

  const from = parseAddr(src.from);
  if (!from.email) return NextResponse.json({ ok: true }); // nothing actionable

  const headers = src.headers;
  const messageId = String(src.message_id || meta.message_id || headerValue(headers, 'message-id') || '') || null;
  const row = {
    received_at: (src.created_at as string) || (meta.created_at as string) || new Date().toISOString(),
    message_id: messageId,
    in_reply_to: headerValue(headers, 'in-reply-to'),
    from_email: from.email,
    from_name: from.name,
    to_email: firstTo(src.to),
    cc: joinAddrs(src.cc),
    subject: (src.subject as string) || '(no subject)',
    text_body: (src.text as string) || null,
    html_body: (src.html as string) || null,
    headers: headers ?? null,
    attachments: (src.attachments as unknown) ?? (meta.attachments as unknown) ?? null,
    spam_score: typeof src.spam_score === 'number' ? (src.spam_score as number) : null,
    status: 'new',
  };

  const { data: inserted, error } = await supabaseAdmin()
    .from('inbound_emails')
    .insert(row)
    .select('id, from_email, from_name, to_email, subject, text_body, html_body, in_reply_to, message_id')
    .single();
  if (error) {
    // Duplicate Message-ID (a Resend/Svix re-delivery) is a success — and NOT a new
    // arrival, so it must never re-draft or re-acknowledge. Only a genuinely new row
    // triggers the mailroom assist.
    if (error.code === '23505') return NextResponse.json({ ok: true, duplicate: true });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Draft-on-arrival: the moment mail lands, prepare a suggested reply (and, if the
  // opt-in auto-acknowledge switch is on and the strict guardrails pass, send a
  // narrow branded receipt). Runs after the 200 so the webhook stays fast.
  if (inserted?.id) {
    after(async () => {
      try { await runInboundAssist(inserted); } catch { /* best-effort; the mail is safely stored either way */ }
    });
  }
  return NextResponse.json({ ok: true });
}
