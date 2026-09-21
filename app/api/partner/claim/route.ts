// POST /api/partner/claim  { slug, email } — start an ownership claim (roadmap item 09).
// If the email matches what's on file for the listing (same address, email domain, or the
// site's domain), we email a one-time verification link. To avoid revealing on-file
// addresses, the response is ALWAYS the same generic success — a mismatch simply sends nothing.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { brandedEmail, sendEmail } from '@/lib/email';
import { emailMatchesListing, newToken } from '@/lib/partners/claims';

export const runtime = 'nodejs';

const GENERIC = { ok: true, message: 'If that email is on file for this listing, we’ve sent a verification link. Please check your inbox.' };

export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, 'partner-claim', 8, 60))) return NextResponse.json(GENERIC);
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || '').trim().slice(0, 200);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 160);
  if (!slug || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json(GENERIC);

  const sb = supabaseAdmin();
  const { data: listing } = await sb.from('directory_listings')
    .select('slug, name_en, email, url, status').eq('slug', slug).eq('status', 'published').maybeSingle();
  const l = listing as { slug: string; name_en: string | null; email: string | null; url: string | null } | null;
  if (!l || !emailMatchesListing(email, l.email, l.url)) return NextResponse.json(GENERIC); // silent no-op

  const token = newToken();
  const expires = new Date(Date.now() + 48 * 3600_000).toISOString();
  try {
    await sb.from('listing_claims').insert({ slug, email, token, token_expires: expires, status: 'pending' });
    const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu').replace(/\/$/, '');
    const link = `${site}/partner?token=${encodeURIComponent(token)}`;
    const html = brandedEmail({
      locale: 'en',
      heading: 'Confirm your listing',
      bodyHtml: `<p>Hello,</p><p>Someone (hopefully you) asked to manage the Cyprus Lifestyle listing for <strong>${(l.name_en || slug).replace(/[<>&]/g, '')}</strong>.</p><p>To confirm you represent this business and edit your listing, use the link below within 48 hours:</p><p><a href="${link}">Confirm and manage my listing →</a></p><p>If this wasn’t you, you can ignore this email — nothing will change.</p>`,
      preheader: 'Confirm your Cyprus Lifestyle listing',
    });
    await sendEmail({ to: email, subject: 'Confirm your Cyprus Lifestyle listing', html });
  } catch { /* generic response regardless */ }
  return NextResponse.json(GENERIC);
}
