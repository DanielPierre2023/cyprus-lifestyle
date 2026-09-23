// GET|POST /api/concierge/normalize-directory?key=<ENRICH_SECRET>[&redo=1]
// Phase-1 data foundation: give every listing a CLEAN canonical category from
// lib/directory/taxonomy.ts, so the raw import slugs stop driving filtering, ranking,
// selling and analytics. Classifies with a cheap model in batches (~25 businesses per
// call, a few calls in parallel), writes canonical_category / canonical_subtype / tags,
// and marks normalized_at. Re-runnable and chunked — call until "remaining":0. Zero
// fabrication: it only LABELS businesses you already have. Needs ENRICH_SECRET + a model
// key; `?redo=1` re-classifies everything.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callClaude, CLAUDE_HAIKU, parseAiJson } from '@/lib/ai';
import { classifyPromptList, coerceClassification } from '@/lib/directory/taxonomy';

export const runtime = 'nodejs';
export const maxDuration = 60;

const STATUSES = ['published', 'listed'];
const CHUNK = 25;          // businesses per model call
const CONCURRENCY = 5;     // model calls in flight

interface Row { id: string; name_en: string | null; subtype: string | null; type: string | null; category_group: string | null; district: string | null }

const SYSTEM =
  'You classify businesses in the Republic of Cyprus into a FIXED taxonomy. You are given a numbered ' +
  'list "index | name | raw category | district". Return ONLY JSON: {"results":[{"i":<index>,"category":' +
  '"<exactly one taxonomy key>","subtype":"<short specific type, or empty>","tags":["short","tags"]}]} — one ' +
  'entry per index. The category MUST be exactly one of these keys:\n' + classifyPromptList() +
  '\nJudge from the name and the raw category. If genuinely unclear, use general-vendor. Keep tags short ' +
  '(e.g. cuisine, speciality, service). Do not invent facts — classify only.';

async function classifyChunk(rows: Row[]): Promise<void> {
  const sb = supabaseAdmin();
  const lines = rows.map((r, i) => `${i} | ${(r.name_en || '').slice(0, 60)} | ${(r.subtype || r.type || '').slice(0, 40)}${r.category_group ? ' /' + r.category_group : ''} | ${r.district || ''}`).join('\n');
  let byIndex = new Map<number, ReturnType<typeof coerceClassification>>();
  try {
    const r = await callClaude({ systemInstruction: SYSTEM, userMessage: `Classify these ${rows.length} businesses:\n${lines}`, model: CLAUDE_HAIKU, jsonMode: true, maxTokens: 1500, timeoutMs: 20_000, fn: 'normalize-directory' });
    if (r.error || !r.text) return; // transient — leave rows unmarked, a later call retries
    const j = parseAiJson<{ results?: { i?: number; category?: string; subtype?: string; tags?: string[] }[] }>(r.text);
    if (!Array.isArray(j.results)) return;
    for (const x of j.results) if (typeof x?.i === 'number') byIndex.set(x.i, coerceClassification(x));
  } catch { return; }
  // Write each row (a parse-gap for one index falls back to general-vendor, still marked
  // so the queue advances — only a whole-call error leaves the chunk for a retry).
  await Promise.all(rows.map((row, i) => {
    const cls = byIndex.get(i) || coerceClassification({});
    return sb.from('directory_listings').update({
      canonical_category: cls.category,
      canonical_subtype: cls.subtype,
      tags: cls.tags.length ? cls.tags : null,
      normalized_at: new Date().toISOString(),
    }).eq('id', row.id).then(() => undefined, () => undefined);
  }));
}

async function run(redo: boolean): Promise<Record<string, unknown>> {
  const sb = supabaseAdmin();
  const started = Date.now();
  const BUDGET_MS = 45_000;
  const SELECT = 'id,name_en,subtype,type,category_group,district';
  let processed = 0, after = '';

  for (;;) {
    if (Date.now() - started > BUDGET_MS) break;
    let q = sb.from('directory_listings').select(SELECT).in('status', STATUSES).order('id').limit(CHUNK * CONCURRENCY);
    if (!redo) q = q.is('normalized_at', null);
    if (after) q = q.gt('id', after);
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message, processed };
    const rows = (data as Row[] | null) || [];
    if (!rows.length) break;
    after = rows[rows.length - 1].id;
    // split into chunks and classify them in parallel
    const chunks: Row[][] = [];
    for (let i = 0; i < rows.length; i += CHUNK) chunks.push(rows.slice(i, i + CHUNK));
    await Promise.all(chunks.map((c) => classifyChunk(c)));
    processed += rows.length;
  }

  let remaining: number | null = null;
  try {
    const { count } = await sb.from('directory_listings').select('id', { count: 'exact', head: true }).in('status', STATUSES).is('normalized_at', null);
    remaining = count ?? null;
  } catch { /* best-effort */ }

  return {
    ok: true, processed, remaining,
    note: remaining && remaining > 0 ? 'Time budget reached — call again to normalise the rest.' : 'Directory fully normalised.',
  };
}

function denyReason(req: NextRequest): string | null {
  if (!process.env.ENRICH_SECRET) return 'ENRICH_SECRET is not set on the server. Add it in Vercel → Settings → Environment Variables, redeploy, then call this URL with ?key=<that same value>.';
  if ((req.nextUrl.searchParams.get('key') || '') !== process.env.ENRICH_SECRET) return 'Unauthorized — the ?key= value does not match ENRICH_SECRET set on the server.';
  return null;
}

export async function GET(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run(req.nextUrl.searchParams.get('redo') === '1'));
}
export async function POST(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run(req.nextUrl.searchParams.get('redo') === '1'));
}
