// Tag-based on-demand revalidation (Phase 6.1). Refreshes ONLY the pages that read the
// changed item - every locale, or just the locales named - instead of path lists.
//
//   POST /api/revalidate/tags
//   auth:  header `x-revalidate-secret: <REVALIDATE_SECRET>` (or `Authorization: Bearer`),
//          or a signed-in admin session. No secret in the URL.
//   body:  { "kind": "article", "slug": "x", "category": "property", "locales": ["de"] }
//          { "kind": "listing", "slug": "x", "type": "restaurant" }
//          { "kind": "event",   "slug": "x" }
//          or a Supabase Database Webhook payload ({ type, table, record, old_record })
//          for blog_posts / directory_listings / events.
//   `locales` is optional; omitted = all 7 locales.
//
// Works on Vercel Hobby: revalidateTag is a platform-neutral Next call (no paid feature).
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isAdmin } from '@/lib/supabase/server';
import { extractKeys, safeEqual } from '@/lib/auth/secretMatch';
import { changesFromWebhook, parseChange, tagsForChange, MAX_TAGS_PER_CALL, type Change } from '@/lib/cache/tags';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function authorised(req: Request): Promise<boolean> {
  const secret = (process.env.REVALIDATE_SECRET || '').trim();
  if (secret) {
    const keys = extractKeys(
      { header: req.headers.get('x-revalidate-secret'), authorization: req.headers.get('authorization') },
      false,
    );
    if (keys.some((k) => safeEqual(secret, k))) return true;
  }
  try { return await isAdmin(); } catch { return false; }
}

export async function POST(req: Request) {
  if (!(await authorised(req))) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const direct = parseChange(body);
  const changes: Change[] = direct ? [direct] : changesFromWebhook(body);
  if (!changes.length) return NextResponse.json({ ok: false, error: 'unrecognised change' }, { status: 400 });

  const tags = [...new Set(changes.flatMap(tagsForChange))].slice(0, MAX_TAGS_PER_CALL);
  for (const t of tags) revalidateTag(t);
  return NextResponse.json({ ok: true, tags });
}
