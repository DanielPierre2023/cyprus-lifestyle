// Public one-click unsubscribe. Link format: /api/unsubscribe?c=<contactId>&t=<unsub_token>
// Verifies the token against the contact, adds them to the suppression list, and
// stops any active sequence for their business. Returns a simple confirmation page.
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function page(title: string, message: string): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;background:#F6F1E7;color:#16181C;font-family:Georgia,'Times New Roman',serif;display:flex;min-height:100vh;align-items:center;justify-content:center}
.card{background:#fff;border:1px solid #e7e0d2;max-width:460px;padding:36px;text-align:center;border-radius:4px}
h1{color:#0B0E11;font-size:22px;margin:0 0 12px}p{font-size:16px;line-height:1.6;color:#3a3a3a;margin:0}
.b{background:#0B0E11;color:#C9A24C;padding:16px;letter-spacing:3px;font-weight:700;margin:-36px -36px 24px;border-radius:4px 4px 0 0}</style></head>
<body><div class="card"><div class="b">CYPRUS&nbsp;LIFESTYLE</div><h1>${title}</h1><p>${message}</p></div></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const c = (url.searchParams.get('c') || '').trim();
  const t = (url.searchParams.get('t') || '').trim();
  if (!c || !t) return page('Link not valid', 'This unsubscribe link is incomplete. Please use the link from the bottom of the email.');

  const sb = supabaseAdmin();
  const { data: contact } = await sb.from('crm_contacts').select('id, org_id, email, unsub_token').eq('id', c).maybeSingle();
  if (!contact || String(contact.unsub_token) !== t) {
    return page('Link not valid', 'We couldn’t verify this unsubscribe link. If you keep hearing from us, just reply to any email and we’ll remove you.');
  }

  const email = contact.email ? String(contact.email).toLowerCase() : null;
  if (email) {
    // The suppression unique index is on lower(email) (a partial expression
    // index), which can't serve as an upsert target — so check, then insert.
    const { data: existing } = await sb.from('crm_suppression').select('id').eq('email', email).limit(1);
    if (!existing || !existing.length) {
      await sb.from('crm_suppression').insert({ email, reason: 'opt-out' }).select('id').maybeSingle();
    }
  }
  if (contact.org_id) {
    await sb.from('crm_enrollments').update({ status: 'unsubscribed' }).eq('org_id', contact.org_id);
  }
  return page('You’re unsubscribed', 'You won’t receive any more emails from Cyprus Lifestyle. Thank you — and our door stays open if you ever want to get in touch.');
}
