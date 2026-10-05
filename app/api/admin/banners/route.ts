// Admin: manage sponsor banners and section sponsors from the Banner Editor.
// Session-gated (admin only) — no secret in the browser; the service role does the
// writes so RLS is bypassed only after the admin check passes.
//
//   GET                              → { ok, banners[], sectionSponsors[] }
//   POST { ...bannerFields }         → create (no id) or update (with id) a banner
//   POST { action:'delete', id }     → delete a banner
//   POST { kind:'section-sponsor', section_key, sponsor_name, sponsor_logo,
//          sponsor_url, is_active }   → upsert a section sponsor (on section_key)
//   POST { kind:'section-sponsor', action:'delete', id }  → delete a section sponsor
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { auditAdminRequest } from '@/lib/auditRequest';

export const runtime = 'nodejs';

const LOCALES = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'] as const;
const SLOTS = ['sidebar-homepage', 'in-article', 'section-sponsorship'] as const;

const str = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

// Build the whitelisted banner column payload from the posted body.
function bannerPayload(body: Record<string, unknown>): Record<string, unknown> {
  const p: Record<string, unknown> = {
    advertiser_name: str(body.advertiser_name),
    contact_email: str(body.contact_email),
    url: str(body.url),
    image_url: str(body.image_url),
    bg_color: str(body.bg_color) || '#0B0E11',
    accent_color: str(body.accent_color) || '#C9A24C',
    slot: SLOTS.includes(String(body.slot) as (typeof SLOTS)[number]) ? String(body.slot) : 'sidebar-homepage',
    weight: Number.isFinite(Number(body.weight)) ? Math.trunc(Number(body.weight)) : 1,
    is_active: Boolean(body.is_active),
    start_date: str(body.start_date),
    end_date: str(body.end_date),
    updated_at: new Date().toISOString(),
  };
  for (const base of ['headline', 'body', 'cta']) {
    for (const l of LOCALES) p[`${base}_${l}`] = str(body[`${base}_${l}`]);
  }
  return p;
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 403 });
  const sb = supabaseAdmin();
  const [{ data: banners }, { data: sectionSponsors }] = await Promise.all([
    sb.from('sponsor_banners').select('*').order('created_at', { ascending: false }),
    sb.from('section_sponsors').select('*').order('section_key', { ascending: true }),
  ]);
  return NextResponse.json({ ok: true, banners: banners || [], sectionSponsors: sectionSponsors || [] });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 403 });
  auditAdminRequest(req, 'banners');
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const sb = supabaseAdmin();
  const action = typeof body.action === 'string' ? body.action : '';

  // ── Section sponsors (the "Presented by …" mapping) ──────────────────────────
  if (body.kind === 'section-sponsor') {
    if (action === 'delete') {
      const id = str(body.id);
      if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
      const { error } = await sb.from('section_sponsors').delete().eq('id', id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    const section_key = str(body.section_key);
    if (!section_key) return NextResponse.json({ ok: false, error: 'section_key required' }, { status: 400 });
    const payload = {
      section_key,
      sponsor_name: str(body.sponsor_name),
      sponsor_logo: str(body.sponsor_logo),
      sponsor_url: str(body.sponsor_url),
      is_active: body.is_active == null ? true : Boolean(body.is_active),
    };
    const { data, error } = await sb.from('section_sponsors')
      .upsert(payload, { onConflict: 'section_key' }).select().maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, sectionSponsor: data });
  }

  // ── Banners ──────────────────────────────────────────────────────────────────
  if (action === 'delete') {
    const id = str(body.id);
    if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
    const { error } = await sb.from('sponsor_banners').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const payload = bannerPayload(body);
  const id = str(body.id);
  if (id) {
    const { data, error } = await sb.from('sponsor_banners').update(payload).eq('id', id).select().maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, banner: data });
  }
  const { data, error } = await sb.from('sponsor_banners').insert(payload).select().maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, banner: data });
}
