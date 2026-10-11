// Admin — COMPLETE EVERY LISTING (photos, phone, email, website, opening hours, socials).
//
//   GET  ?format=xlsx            → the Excel list: guide + "Fill in" (one row per business
//                                  that misses something, current values pre-filled) +
//                                  "Websites to scan" + Columns + Rules
//   GET  ?format=csv             → "Websites to scan" only (the scraper's input: slug, name, url)
//        optional: &status=published|listed  &district=paphos  &need=image|phone|email|website|hours|socials  &limit=500
//   POST multipart  file=<.xlsx|.csv>   → CHECK: what the file would fill (nothing is written)
//   POST json { patches: [...] }        → APPLY (send the patches from CHECK in chunks of ≤300)
//
// Only empty fields are ever filled — each value is cleaned again and re-checked against
// the row as it is at write time. Auth: an admin session, or
// `Authorization: Bearer <CRON_SECRET>` for scripted use.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { buildEnrichmentWorkbook, buildWebsitesCsv, planUpload, applyPlan } from '@/lib/directory/enrichment-data';
import { NEED_KEYS, SOCIALS, DAYS, isOwnWebsite, type NeedKey, type Patch } from '@/lib/directory/enrichment';
import { cleanEmail, cleanPhone, safeUrl } from '@/lib/map/explorer-index';
import { auditAdminRequest } from '@/lib/auditRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function authed(req: NextRequest): Promise<boolean> {
  if (await isAdmin()) return true;
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get('authorization') === `Bearer ${secret}`;
}
const deny = () => NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

export async function GET(req: NextRequest) {
  if (!(await authed(req))) return deny();
  const sp = req.nextUrl.searchParams;
  const need = sp.get('need') as NeedKey | null;
  const opts = {
    status: sp.get('status') || undefined, district: sp.get('district') || undefined,
    need: need && (NEED_KEYS as readonly string[]).includes(need) ? need : ('any' as const),
    limit: Number(sp.get('limit')) || undefined,
    site: (process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu').replace(/\/$/, ''),
  };
  const stamp = new Date().toISOString().slice(0, 10);
  try {
    if (sp.get('format') === 'csv') {
      const { csv } = await buildWebsitesCsv(opts);
      return new NextResponse(csv, { headers: {
        'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="websites-to-scan-${stamp}.csv"`,
      } });
    }
    const { buf } = await buildEnrichmentWorkbook(opts);
    return new NextResponse(new Uint8Array(buf), { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="cyprus-lifestyle-complete-listings-${stamp}.xlsx"`,
    } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

/** Patches coming back from the browser are cleaned again — only known columns, only valid values. */
function sanitizePatch(p: unknown): Patch | null {
  if (!p || typeof p !== 'object') return null;
  const { slug, fields } = p as { slug?: unknown; fields?: unknown };
  if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,180}$/i.test(slug) || !fields || typeof fields !== 'object') return null;
  const f = fields as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const url = safeUrl(f.url); if (url && isOwnWebsite(url)) out.url = url;
  const email = cleanEmail(f.email); if (email) out.email = email;
  const phone = cleanPhone(f.phone); if (phone) out.phone = phone;
  const image = safeUrl(f.image); if (image) out.image = image;
  if (typeof f.address === 'string' && f.address.trim()) out.address = f.address.trim().slice(0, 200);
  if (f.hours && typeof f.hours === 'object') {
    const h: Record<string, string> = {};
    for (const d of DAYS) { const v = String((f.hours as Record<string, unknown>)[d] ?? '').trim().slice(0, 40); if (v) h[d] = v; }
    if (Object.keys(h).length) out.hours = h;
  }
  if (f.socials && typeof f.socials === 'object') {
    const so: Record<string, string> = {};
    for (const k of SOCIALS) { const u = safeUrl((f.socials as Record<string, unknown>)[k]); if (u) so[k] = u; }
    if (Object.keys(so).length) out.socials = so;
  }
  return Object.keys(out).length ? { slug, fields: out, filled: [] } : null;
}

export async function POST(req: NextRequest) {
  if (!(await authed(req))) return deny();
  auditAdminRequest(req, 'directory.enrichment');
  try {
    const type = req.headers.get('content-type') || '';
    if (type.includes('application/json')) {
      const body = await req.json().catch(() => ({})) as { patches?: unknown[] };
      const patches = (Array.isArray(body.patches) ? body.patches : []).slice(0, 300).map(sanitizePatch).filter((p): p is Patch => !!p);
      const res = await applyPlan(patches);
      return NextResponse.json({ ok: true, ...res });
    }
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') return NextResponse.json({ ok: false, error: 'Choose a .xlsx or .csv file.' }, { status: 400 });
    if (file.size > 4_000_000) return NextResponse.json({ ok: false, error: 'File too large (max 4 MB) — split it into batches.' }, { status: 413 });
    const buf = Buffer.from(await file.arrayBuffer());
    const plan = await planUpload(file.name || 'upload', buf);
    return NextResponse.json({ ok: true, ...plan, patches: plan.patches.map(({ slug, fields, filled }) => ({ slug, fields, filled })) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
