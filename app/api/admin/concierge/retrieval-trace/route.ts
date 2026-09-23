// POST /api/admin/concierge/retrieval-trace  { q, locale? }
// Observability for the concierge's retrieval. Returns, for a query, exactly what each
// layer found — raw keyword, LLM-normalised keyword, district-scoped semantic, global
// semantic — plus the LLM's understanding and the district it scoped to. This is how we
// diagnose "why did it return hotels for a gym query" concretely instead of guessing.
// Admin only. Costs one embedding + one small Haiku call per run (query understanding).
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { retrievalTrace, isConciergeLocale } from '@/lib/concierge/brain';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const q = String(body.q || '').trim();
  if (!q) return NextResponse.json({ ok: false, error: 'Provide { q } — the query to trace.' }, { status: 400 });
  const locale = isConciergeLocale(String(body.locale || '')) ? String(body.locale) : 'en';
  const trace = await retrievalTrace(locale, q);
  return NextResponse.json({ ok: true, ...trace });
}
