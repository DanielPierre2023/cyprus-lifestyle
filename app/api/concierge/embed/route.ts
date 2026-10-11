// GET|POST /api/concierge/embed?key=<ENRICH_SECRET>
// One-off (re-runnable) job: embed the knowledge base into kb_embeddings so the
// concierge can do semantic recall. Safe to run repeatedly (upsert). Needs
// OPENAI_API_KEY. Gated by ENRICH_SECRET.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ALL_INTENTS } from '@/lib/knowledge/qa';
import { embedBatch, hasEmbeddings, EMBED_MODEL } from '@/lib/concierge/embed';
import { keyGateDeny as denyReason } from '@/lib/auth/keyGate';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function run(): Promise<Record<string, unknown>> {
  if (!hasEmbeddings()) return { ok: false, error: 'OPENAI_API_KEY not configured' };
  const items = ALL_INTENTS.map((h) => ({ id: h.item.id, text: `${h.item.q}\n${h.item.a}` }));
  const vecs = await embedBatch(items.map((i) => i.text));
  const rows = items
    .map((it, i) => (vecs[i] ? { id: it.id, embedding: vecs[i], updated_at: new Date().toISOString() } : null))
    .filter(Boolean) as { id: string; embedding: number[]; updated_at: string }[];
  if (!rows.length) return { ok: false, error: 'no embeddings produced (check OPENAI_API_KEY / quota)' };
  const { error } = await supabaseAdmin().from('kb_embeddings').upsert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true, model: EMBED_MODEL, embedded: rows.length, total: items.length };
}

export async function GET(req: NextRequest) {
  const deny = await denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run());
}
export async function POST(req: NextRequest) {
  const deny = await denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run());
}
