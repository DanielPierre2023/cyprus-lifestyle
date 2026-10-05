// GET  /api/membership/status?cid=...        → { member, tier }
// POST /api/membership/status { email, locale } → ALWAYS { ok: true }. If an active member
//   has that address, a single-use restore link is emailed to it (see lib/concierge/membership
//   issueRestoreToken). The response never reveals whether the address is a member, and
//   no cid is accepted here: the membership is bound to the browser that later CONFIRMS the
//   link (POST /api/membership/restore), never to whoever merely knew the email.
import { NextRequest, NextResponse, after } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { brandedEmail, sendEmail } from '@/lib/email';
import { isLocale, type Locale } from '@/lib/locales';
import { memberStatus, issueRestoreToken } from '@/lib/concierge/membership';
import { isPlausibleEmail, normalizeEmail } from '@/lib/concierge/restoreToken';
import { restoreEmailCopy } from '@/lib/concierge/restoreEmail';

export const runtime = 'nodejs';

const GENERIC = () => NextResponse.json({ ok: true });

function site(req: NextRequest): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin || 'https://cypruslifestyle.eu').replace(/\/$/, '');
}

export async function GET(req: NextRequest) {
  if (!(await rateLimit(req, 'membership-status-read', 60, 60))) return NextResponse.json({ member: false, tier: null }, { status: 429 });
  const cid = String(req.nextUrl.searchParams.get('cid') || '');
  return NextResponse.json(await memberStatus(cid));
}

export async function POST(req: NextRequest) {
  // Per-IP limits (the per-address cap lives in issueRestoreToken). Throttled callers get
  // the same generic answer's shape but 429, which reveals nothing about any address.
  if (!(await rateLimit(req, 'membership-restore', 5, 600)) || !(await rateLimit(req, 'membership-restore-min', 3, 60))) {
    return NextResponse.json({ ok: false, error: 'busy' }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body?.email);
  const locale: Locale = isLocale(String(body?.locale || '')) ? (body.locale as Locale) : 'en';
  if (!isPlausibleEmail(email)) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });

  const base = site(req);
  // Do the lookup + mail after responding so response time doesn't leak membership either.
  after(async () => {
    try {
      const r = await issueRestoreToken(supabaseAdmin(), email);
      if (!r.ok) {
        if (r.reason === 'error') console.error('[membership/restore] could not issue token (is migration 20261004130100 applied?)');
        return;
      }
      const c = restoreEmailCopy(locale);
      const url = `${base}${locale === 'en' ? '' : `/${locale}`}/membership?restore=${r.token}`; // localePrefix: as-needed
      const sent = await sendEmail({
        to: email, subject: c.subject,
        html: brandedEmail({ locale, heading: c.heading, bodyHtml: `<p>${c.body}</p><p style="font-size:13px;color:#6b6555">${c.footnote}</p>`, ctaLabel: c.cta, ctaUrl: url, preheader: c.subject }),
      });
      if (!sent.ok) console.error('[membership/restore] email not sent:', sent.error);
    } catch (e) {
      console.error('[membership/restore] failed:', (e as Error).message);
    }
  });
  return GENERIC();
}
