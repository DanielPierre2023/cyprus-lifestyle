// Public sponsor-banner tracking. POST { id, type: 'impression' | 'click' }
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '');
  const type = body.type === 'click' ? 'click' : 'impression';
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  const fn = type === 'click' ? 'increment_banner_clicks' : 'increment_banner_impressions';
  const { error } = await supabaseAdmin().rpc(fn, { banner_id: id });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
