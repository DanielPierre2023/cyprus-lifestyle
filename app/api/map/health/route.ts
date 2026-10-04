// GET /api/map/health
// What the map is built from right now — open it in a browser to check the map:
// how many businesses (published / listed / with photo / with rating), how many
// events (exact pin / approximate area), how many experiences, which column set the
// database accepted, and any database errors. Counts only — no names, no contacts.
import { NextResponse } from 'next/server';
import { getExplorerIndex, mapBuildStats } from '@/lib/map/explorer-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ix = await getExplorerIndex();
    const stats = mapBuildStats();
    const ok = ix.n > 0 && !(stats?.errors.length);
    return NextResponse.json({
      ok, onMap: ix.n, version: ix.v, built: ix.built,
      ...(stats || {}),
      hint: ix.n === 0
        ? 'The map index is empty: see "errors" — usually a missing column or table in Supabase.'
        : stats?.errors.length ? 'The map works, with fallbacks: see "errors".' : 'All good.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
