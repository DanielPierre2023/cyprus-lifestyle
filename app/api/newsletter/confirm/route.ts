// Public double-opt-in confirmation link. GET ?token=...&l=<edition>
// The page is shown in the edition the reader subscribed from (`l`, added to the e-mail
// link), else their Accept-Language, else English.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { confirm } from '@/lib/newsletter';
import { localeOf } from '@/lib/i18n/resolveLocale';
import { confirmPageCopy } from '@/lib/i18n/notices';
import { dir } from '@/lib/locales';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const locale = localeOf(req, req.nextUrl.searchParams.get('l'));
  const r = await confirm(supabaseAdmin(), token);
  const site = process.env.NEXT_PUBLIC_SITE_URL || '';
  const c = confirmPageCopy(locale);
  const msg = r.ok ? c.ok : c.bad;
  const home = locale === 'en' ? (site || '/') : `${site}/${locale}`;
  const html = `<!doctype html><html lang="${locale}" dir="${dir(locale)}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Cyprus Lifestyle</title>
  <div style="font-family:Georgia,serif;background:#0B0E11;color:#F4EFE6;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px">
    <div><div style="color:#C9A24C;letter-spacing:3px;font-weight:700;font-size:20px">CYPRUS LIFESTYLE</div>
    <p style="font-size:18px;margin:24px 0">${msg}</p>
    <a href="${home}" style="color:#C9A24C">${c.home}</a></div>
  </div></html>`;
  return new NextResponse(html, { status: r.ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
