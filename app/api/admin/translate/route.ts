// Admin/editor on-demand translation. Body:
//   { html, source, target }  → structure-preserving HTML translation
//   { text, source, target, kind } → short string translation
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { translateHtml, translateText } from '@/lib/translate';
import { isLocale } from '@/lib/locales';

export const runtime = 'nodejs';
export const maxDuration = 60; // Hobby cap; raise to 300 on Vercel Pro

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const source = String(body.source || '');
  const target = String(body.target || '');
  if (!isLocale(source) || !isLocale(target)) {
    return NextResponse.json({ ok: false, error: 'source/target must be en|el|ro|ar' }, { status: 400 });
  }
  if (typeof body.html === 'string') {
    const r = await translateHtml(body.html, source, target);
    return NextResponse.json(r, { status: r.ok ? 200 : 502 });
  }
  if (typeof body.text === 'string') {
    const out = await translateText(body.text, source, target, body.kind || 'text');
    return NextResponse.json({ ok: true, text: out });
  }
  return NextResponse.json({ ok: false, error: 'html or text required' }, { status: 400 });
}
