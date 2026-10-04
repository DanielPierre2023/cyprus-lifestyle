// GET /api/map/index
// The map explorer's compact index: every geocoded business (published + listed,
// occupied north excluded) and upcoming event — coordinates, category, district,
// rating, paid tier and flags, dictionary-encoded and columnar. No names and no
// contact data (see lib/map/explorer-index.ts). Shared by every locale, so it is
// one CDN object; 10 min fresh, served stale for 30 min while it refreshes.
import { NextResponse } from 'next/server';
import { getExplorerIndex } from '@/lib/map/explorer-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // never prerendered at build; the CDN header below does the caching

export async function GET() {
  try {
    const ix = await getExplorerIndex();
    return NextResponse.json(ix, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' },
    });
  } catch {
    return NextResponse.json({ error: 'index unavailable' }, { status: 503 });
  }
}
