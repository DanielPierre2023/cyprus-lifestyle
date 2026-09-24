// GET|POST /api/admin/editorial/settings   (admin session-gated)
//   GET  → the current editorial engine settings.
//   POST → update them. Body (all optional): { autonomy, webSearch, ideasPerSection,
//          sectionsPerRun, autoCover, imageSource }
// This is where the desk flips the planner from suggest-only to auto-draft.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { getEditorialSettings, setEditorialSettings, type EditorialSettings } from '@/lib/editorial/settings';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ ok: true, settings: await getEditorialSettings() });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Partial<EditorialSettings> = {};
  if (b.autonomy === 'suggest' || b.autonomy === 'auto-draft') patch.autonomy = b.autonomy;
  if (typeof b.webSearch === 'boolean') patch.webSearch = b.webSearch;
  if (Number.isFinite(b.ideasPerSection as number)) patch.ideasPerSection = Number(b.ideasPerSection);
  if (Number.isFinite(b.sectionsPerRun as number)) patch.sectionsPerRun = Number(b.sectionsPerRun);
  if (typeof b.autoCover === 'boolean') patch.autoCover = b.autoCover;
  if (['off', 'stock', 'ai', 'stock-then-ai'].includes(b.imageSource as string)) {
    patch.imageSource = b.imageSource as EditorialSettings['imageSource'];
  }
  const settings = await setEditorialSettings(patch);
  return NextResponse.json({ ok: true, settings });
}
