// Admin: refresh the public pages of an article RIGHT NOW (instead of waiting for the 5-minute ISR window).
//   POST { slug?, category? }   — requires a signed-in administrator.
// The editor and the Articles list have always called this URL, but it did not exist (404, swallowed by a try/catch),
// so "Published and live now" never appeared and readers saw changes only after the timer. The server-to-server
// variant for Supabase webhooks stays at /api/revalidate (secret header).
import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { isAdmin } from '@/lib/supabase/server';
import { pathsFor, tagsFor } from '@/lib/revalidatePaths';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { slug?: unknown; category?: unknown };
  const revalidated = pathsFor(body);
  for (const p of revalidated) revalidatePath(p);
  // Also by data tag (lib/cache/tags.ts): pages built from the cached reads refresh in every locale, not only the listed paths.
  const tags = tagsFor(body);
  for (const t of tags) revalidateTag(t);
  return NextResponse.json({ ok: true, revalidated, tags });
}
