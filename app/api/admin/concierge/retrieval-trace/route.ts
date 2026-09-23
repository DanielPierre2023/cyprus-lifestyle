// POST /api/admin/concierge/retrieval-trace
//   { q, locale? }            → trace one query (all retrieval legs)
//   { queries: [{q,locale}] } → trace a custom batch
//   { sweep: true }           → trace a built-in diverse-category sweep (the "does it
//                               generalise to all categories?" proof)
// Observability for the concierge's retrieval: for each query it shows what every layer
// returned — raw keyword, LLM-normalised keyword, district-scoped semantic, global
// semantic — plus the LLM understanding and the district it scoped to. This is how we
// answer "why did it return hotels for a gym query" (and "does semantic cover every
// category, not just gyms") with evidence instead of assertion. Admin only. Each query
// costs one embedding + one small Haiku call.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { retrievalTrace, isConciergeLocale, type RetrievalTrace } from '@/lib/concierge/brain';

export const runtime = 'nodejs';
export const maxDuration = 60;

// A deliberately diverse spread — niche categories nobody hand-coded, across all seven
// languages and every district — so a passing sweep means the SsEMANTIC path generalises,
// not that a few probes were added. (q, locale) pairs; locale is only a hint for name
// localisation — retrieval itself is language-agnostic.
const SWEEP: { q: string; locale: string }[] = [
  { q: 'un lăcătuș în Larnaca', locale: 'ro' },              // locksmith
  { q: 'notary in Limassol', locale: 'en' },                 // notary
  { q: 'veterinar în Nicosia', locale: 'ro' },               // vet
  { q: 'tattoo studio in Ayia Napa', locale: 'en' },         // tattoo
  { q: 'σιδεράς στη Λεμεσό', locale: 'el' },                  // welder/metalworker
  { q: 'sushi in Limassol', locale: 'en' },                  // sushi
  { q: 'καθαριστήριο ρούχων στη Λάρνακα', locale: 'el' },     // dry cleaner
  { q: 'optician in Paphos', locale: 'en' },                 // optician
  { q: 'детский сад в Лимассоле', locale: 'ru' },            // nursery/kindergarten
  { q: 'driving school in Larnaca', locale: 'en' },          // driving school
  { q: 'vulcanizare anvelope Nicosia', locale: 'ro' },       // tyre shop
  { q: 'brutărie în Larnaca', locale: 'ro' },                // bakery
  { q: 'butcher in Limassol', locale: 'en' },                // butcher
  { q: 'toaletare câini Paphos', locale: 'ro' },             // dog grooming
  { q: 'φυσιοθεραπευτής στη Λεμεσό', locale: 'el' },          // physiotherapist
  { q: 'Klimaanlage Reparatur in Larnaca', locale: 'de' },   // AC repair (DE)
  { q: 'hydraulik w Larnace', locale: 'pl' },                // plumber (PL)
  { q: 'panouri solare în Larnaca', locale: 'ro' },          // solar panels (RO)
  { q: 'o sală de gimnastică în Larnaca', locale: 'ro' },     // gym (RO)
  { q: 'مصفف شعر في ليماسول', locale: 'ar' },                 // hairdresser (AR)
];

function compact(t: RetrievalTrace) {
  const leg = (name: string) => t.legs.find((l) => l.name === name);
  const top = (name: string) => (leg(name)?.sample || []).slice(0, 3).map((s) => `${s.name}${s.subtype ? ` [${s.subtype}]` : ''}${s.district ? ` (${s.district})` : ''}`);
  return {
    q: t.query,
    district: t.intentDistrict,
    keywords: t.understanding?.keywords || [],
    counts: {
      kw_raw: leg('keyword(raw)')?.count ?? 0,
      kw_aug: leg('keyword(augmented)')?.count ?? 0,
      sem_district: leg('semantic(district)')?.count ?? 0,
      sem_global: leg('semantic(global)')?.count ?? 0,
    },
    // What the semantic-district leg (the primary fix) actually returned — eyeball these
    // against the query to see whether the category matched.
    semantic_district_top: top('semantic(district)'),
    semantic_global_top: top('semantic(global)'),
  };
}

async function runMany(items: { q: string; locale: string }[], concurrency = 5) {
  const out: ReturnType<typeof compact>[] = [];
  let i = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
    while (i < items.length) {
      const idx = i++;
      const it = items[idx];
      try { out[idx] = compact(await retrievalTrace(it.locale, it.q)); }
      catch (e) { out[idx] = { q: it.q, district: null, keywords: [], counts: { kw_raw: 0, kw_aug: 0, sem_district: 0, sem_global: 0 }, semantic_district_top: [`error: ${String(e).slice(0, 80)}`], semantic_global_top: [] }; }
    }
  });
  await Promise.all(workers);
  return out;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));

  if (body.sweep) {
    const results = await runMany(SWEEP, 5);
    const withDistrictHits = results.filter((r) => r.counts.sem_district > 0).length;
    return NextResponse.json({
      ok: true, mode: 'sweep', n: results.length,
      semantic_district_hit_rate: `${withDistrictHits}/${results.length}`,
      results,
    });
  }

  if (Array.isArray(body.queries) && body.queries.length) {
    const items = body.queries.slice(0, 30).map((x: { q?: string; locale?: string }) => ({ q: String(x.q || ''), locale: isConciergeLocale(String(x.locale || '')) ? String(x.locale) : 'en' })).filter((x: { q: string }) => x.q);
    return NextResponse.json({ ok: true, mode: 'batch', n: items.length, results: await runMany(items, 5) });
  }

  const q = String(body.q || '').trim();
  if (!q) return NextResponse.json({ ok: false, error: 'Provide { q }, { queries:[...] } or { sweep:true }.' }, { status: 400 });
  const locale = isConciergeLocale(String(body.locale || '')) ? String(body.locale) : 'en';
  return NextResponse.json({ ok: true, mode: 'single', ...(await retrievalTrace(locale, q)) });
}
