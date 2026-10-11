// POST /api/business/login { email, locale } → ALWAYS { ok: true } for a plausible address. If the address is the verified
// claim contact of a listing (or already has a business account), a single-use sign-in link to the Business Hub is e-mailed
// in the visitor's language. The response never reveals whether the address is known.
import { NextRequest, NextResponse, after } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { brandedEmail, sendEmail } from '@/lib/email';
import { isLocale, type Locale } from '@/lib/locales';
import { requestBusinessLogin } from '@/lib/business/auth';
import { businessLoginCopy, businessLoginUrl } from '@/lib/business/loginEmail';
import { normEmail } from '@/lib/business/rules';
import { sameOrigin } from '@/lib/member/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 403 });
  if (!(await rateLimit(req, 'business-login', 5, 600)) || !(await rateLimit(req, 'business-login-min', 3, 60))) {
    return NextResponse.json({ ok: false, error: 'busy' }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const email = normEmail(body?.email);
  const locale: Locale = isLocale(String(body?.locale || '')) ? (body.locale as Locale) : 'en';
  if (!email) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  const site = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin || 'https://cypruslifestyle.eu').replace(/\/$/, '');

  // Lookup + mail happen after the response so timing does not reveal whether the address is known.
  after(async () => {
    try {
      const r = await requestBusinessLogin(supabaseAdmin(), email, locale);
      if (!r.ok) {
        if (r.reason === 'error') console.error('[business/login] could not issue a link (is migration 20261006120000_business_hub applied?)');
        return;
      }
      const c = businessLoginCopy(locale);
      const sent = await sendEmail({
        to: email, subject: c.subject,
        html: brandedEmail({ locale, heading: c.heading, bodyHtml: `<p>${c.body}</p><p style="font-size:13px;color:#6b6555">${c.footnote}</p>`, ctaLabel: c.cta, ctaUrl: businessLoginUrl(site, locale, r.token), preheader: c.subject }),
      });
      if (!sent.ok) console.error('[business/login] email not sent:', sent.error);
    } catch (e) { console.error('[business/login] failed:', (e as Error).message); }
  });
  return NextResponse.json({ ok: true });
}
