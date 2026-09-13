// Public double-opt-in confirmation link. GET ?token=...
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { confirm } from '@/lib/newsletter';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const r = await confirm(supabaseAdmin(), token);
  const site = process.env.NEXT_PUBLIC_SITE_URL || '';
  const msg = r.ok ? 'Your subscription is confirmed. Welcome to Cyprus Lifestyle.' : 'This confirmation link is invalid or has expired.';
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Cyprus Lifestyle</title>
  <div style="font-family:Georgia,serif;background:#0B0E11;color:#F4EFE6;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px">
    <div><div style="color:#C9A24C;letter-spacing:3px;font-weight:700;font-size:20px">CYPRUS LIFESTYLE</div>
    <p style="font-size:18px;margin:24px 0">${msg}</p>
    <a href="${site || '/'}" style="color:#C9A24C">Go to the homepage →</a></div>
  </div>`;
  return new NextResponse(html, { status: r.ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
