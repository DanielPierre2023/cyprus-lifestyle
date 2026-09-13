// On-demand ISR: call from a Supabase database webhook when an article is
// published/updated so the reader pages refresh instantly instead of waiting
// for the time-based revalidate window.
//
//   POST /api/revalidate            header: x-revalidate-secret: <REVALIDATE_SECRET>
//   body: { "slug": "limassol-marina-towers", "category": "property" }   (both optional)
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { LOCALES, DEFAULT_LOCALE } from '@/lib/locales';

export const runtime = 'nodejs';
export const maxDuration = 60;

function localized(path: string): string[] {
  return LOCALES.map((l) => (l === DEFAULT_LOCALE ? path : `/${l}${path === '/' ? '' : path}`));
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = req.headers.get('x-revalidate-secret') || url.searchParams.get('secret');
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { slug?: unknown; category?: unknown };
  const paths = new Set<string>(['/']);
  if (typeof body.category === 'string') paths.add(`/${body.category}`);
  if (typeof body.slug === 'string') paths.add(`/article/${body.slug}`);

  const revalidated: string[] = [];
  for (const p of paths) {
    for (const lp of localized(p)) { revalidatePath(lp); revalidated.push(lp); }
  }
  return NextResponse.json({ ok: true, revalidated });
}
