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
import { classifyPromptList, coerceClassification, mapToCanonical } from '@/lib/directory/taxonomy';

export const runtime = 'nodejs';
export const maxDuration = 60;

const STATUSES = ['published', 'listed'];
const PAGE = 1500;         // rows scanned per DB page (most classified deterministically)
const CHUNK = 30;          // businesses per model call (the tail only)
const CONCURRENCY = 4;     // model calls in flight (low, to avoid 429 throttling)

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
  let mapped = 0, llmDone = 0, after = '';

  for (;;) {
    if (Date.now() - started > BUDGET_MS) break;
    let q = sb.from('directory_listings').select(SELECT).in('status', STATUSES).order('id').limit(PAGE);
    if (!redo) q = q.is('normalized_at', null);
    if (after) q = q.gt('id', after);
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message, mapped, llmClassified: llmDone };
    const rows = (data as Row[] | null) || [];
    if (!rows.length) break;
    after = rows[rows.length - 1].id;

    // 1) Deterministic bulk — group by canonical key, one grouped UPDATE per key (no model
    //    calls). This clears the great majority of the directory almost instantly.
    const groups = new Map<string, string[]>();
    const llmRows: Row[] = [];
    for (const r of rows) {
      const det = mapToCanonical(`${r.subtype || ''} ${r.type || ''} ${r.category_group || ''} ${r.name_en || ''}`);
      if (det) { const a = groups.get(det) || []; a.push(r.id); groups.set(det, a); }
      else llmRows.push(r);
    }
    const nowIso = new Date().toISOString();
    for (const [cat, ids] of groups) {
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const { error: ue } = await sb.from('directory_listings').update({ canonical_category: cat, normalized_at: nowIso }).in('id', chunk);
        if (!ue) mapped += chunk.length;
      }
    }

    // 2) LLM tail — only what the mapper couldn't place, at low concurrency to avoid 429s.
    for (let i = 0; i < llmRows.length && Date.now() - started <= BUDGET_MS; i += CHUNK * CONCURRENCY) {
      const slice = llmRows.slice(i, i + CHUNK * CONCURRENCY);
      const chunks: Row[][] = [];
      for (let j = 0; j < slice.length; j += CHUNK) chunks.push(slice.slice(j, j + CHUNK));
      await Promise.all(chunks.map((c) => classifyChunk(c)));
      llmDone += slice.length;
    }
  }

  let remaining: number | null = null;
  try {
    const { count } = await sb.from('directory_listings').select('id', { count: 'exact', head: true }).in('status', STATUSES).is('normalized_at', null);
    remaining = count ?? null;
  } catch { /* best-effort */ }

  return {
    ok: true, mapped, llmClassified: llmDone, remaining,
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
