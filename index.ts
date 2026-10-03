// supabase/functions/kb-ingest/index.ts
// ============================================================================
// CYPRUS LIFESTYLE — Plan 2 knowledge ingestion + embedding (Deno edge function)
// v2 (2026-10-03): faster activation. Two changes vs v1, nothing else touched:
//   • ingest accepts a `sources` ARRAY  -> load all six sites in ONE call
//   • embed BATCHES the OpenAI calls (up to 128 inputs/request) and batch-upserts
//     -> embeds the whole backlog in one or two calls instead of ~10
// Behaviour, auth, schema and output shape are otherwise identical to v1.
// ----------------------------------------------------------------------------
// Modes, all gated by the service-role key (?key= or body.secret):
//
//   mode=ingest  — fetch CSV export(s) and upsert kb_docs (published=false).
//     single:  { csv_url, source }
//     batch:   { sources: [ { source, csv_url }, ... ] }
//
//   mode=embed   — drain kb_docs needing an embedding, batched to OpenAI.
//     body: { limit? }   (default 1000; processes within a ~40s budget)
//
//   mode=publish — flip published=true for a source (or "all").
//     body: { source }
//
// Secrets reused: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// OPENAI_API_KEY. Optional: EMBEDDING_MODEL (default text-embedding-3-small).
// Deploy with Verify JWT OFF; invoke from the dashboard with a JSON body.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const SUPABASE_URL = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const EMBED_MODEL = Deno.env.get("EMBEDDING_MODEL") || "text-embedding-3-small";
const EMBED_DIM = 1536;
const EMBED_CHUNK = 128; // inputs per OpenAI request (well under the array + token caps)

const j = (o: unknown, s = 200) => new Response(JSON.stringify(o, null, 2), { status: s, headers: CORS });
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

// ── PostgREST helpers ───────────────────────────────────────────────────────
function rest(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
}
async function rpc(fn: string, args: Record<string, unknown>): Promise<Record<string, unknown>[]> {
  const res = await rest(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
  if (!res.ok) return [];
  const d = await res.json().catch(() => []);
  return Array.isArray(d) ? d : [];
}

// ── tiny robust CSV parser (handles quotes, commas and newlines in fields) ───
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", i = 0, inQ = false;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Alias-based header mapping, so one function fits all six export shapes.
const ALIASES: Record<string, string[]> = {
  url: ["Page URL", "URL", "Canonical URL"],
  title: ["Page Title", "Meta Title", "Schema Name", "Organization Name", "Developer Name", "Item Name", "H1 Heading", "H1 Tag", "H1 Tag Content"],
  description: ["Meta Description", "Page Description", "Schema Description", "Organization Description", "Developer Description", "Item Description"],
  image: ["Meta Image URL", "Meta Image", "Page Image", "Schema Image URL", "Organization Image", "Developer Image", "Item Image", "Page Image URL"],
  h1: ["H1 Heading", "H1 Tag", "H1 Tag Content"],
  category: ["Content Type", "Page Type"],
};
function pick(headerIdx: Record<string, number>, cols: string[], field: string): string {
  for (const name of (ALIASES[field] || [])) {
    const k = name.toLowerCase();
    if (k in headerIdx) { const v = str(cols[headerIdx[k]]).trim(); if (v) return v; }
  }
  return "";
}

function langFromUrl(url: string): string {
  try {
    const p = new URL(url).pathname.toLowerCase();
    if (p.startsWith("/ro/") || p === "/ro") return "ro";
    if (p.startsWith("/ru/") || p === "/ru") return "ru";
  } catch { /* ignore */ }
  return "en";
}
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// ── ingest: CSV -> kb_docs ──────────────────────────────────────────────────
async function ingest(csvUrl: string, source: string): Promise<Record<string, unknown>> {
  if (!csvUrl || !source) return { ok: false, error: "csv_url and source are required" };
  const res = await fetch(csvUrl, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) return { ok: false, source, error: `fetch CSV ${res.status}` };
  const rows = parseCSV(await res.text());
  if (rows.length < 2) return { ok: false, source, error: "empty CSV" };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const headerIdx: Record<string, number> = {};
  header.forEach((h, i) => { if (!(h in headerIdx)) headerIdx[h] = i; });

  const docs: Record<string, unknown>[] = [];
  let skipped = 0;
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || !cols.length) continue;
    const url = pick(headerIdx, cols, "url");
    const title = pick(headerIdx, cols, "title");
    const description = pick(headerIdx, cols, "description");
    const h1 = pick(headerIdx, cols, "h1");
    if (!url || (!title && !description)) { skipped++; continue; } // skip empty/index rows
    const body = [...new Set([h1, title, description].filter(Boolean))].join(" — ").slice(0, 4000);
    const content_hash = await sha256Hex(`${title}|${description}|${pick(headerIdx, cols, "image")}`);
    docs.push({
      source, url, lang: langFromUrl(url),
      category: pick(headerIdx, cols, "category") || null,
      title: title || null, description: description || null, body,
      image: pick(headerIdx, cols, "image") || null,
      content_hash, updated_at: new Date().toISOString(),
    });
  }
  if (!docs.length) return { ok: true, source, ingested: 0, skipped, note: "no usable rows" };

  let upserted = 0;
  for (let i = 0; i < docs.length; i += 200) {
    const chunk = docs.slice(i, i + 200);
    const up = await rest(`kb_docs?on_conflict=url`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(chunk),
    });
    if (up.ok) upserted += chunk.length;
  }
  return { ok: true, source, ingested: upserted, skipped, total_rows: rows.length - 1 };
}

// ── embed: kb_docs -> kb_embeddings (BATCHED) ───────────────────────────────
// Returns one embedding per input text, aligned by index; null where it failed.
async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  if (!OPENAI_KEY || !texts.length) return texts.map(() => null);
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: texts.map((t) => (t || " ").slice(0, 2000)) }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return texts.map(() => null);
    const d = await res.json();
    const out: (number[] | null)[] = texts.map(() => null);
    for (const item of (d?.data || [])) {
      const i = item?.index;
      const v = item?.embedding;
      if (typeof i === "number" && Array.isArray(v) && v.length === EMBED_DIM) out[i] = v as number[];
    }
    return out;
  } catch { return texts.map(() => null); }
}

async function embed(limit: number): Promise<Record<string, unknown>> {
  if (!OPENAI_KEY) return { ok: false, error: "OPENAI_API_KEY not set" };
  const want = Math.min(Math.max(limit, 1), 1000);
  const batch = await rpc("kb_docs_needing_embedding", { match_count: want });
  const deadline = Date.now() + 40000;
  let done = 0, failed = 0;

  for (let i = 0; i < batch.length && Date.now() < deadline; i += EMBED_CHUNK) {
    const slice = batch.slice(i, i + EMBED_CHUNK);
    const vecs = await embedBatch(slice.map((r) => str(r.text)));
    const rows: Record<string, unknown>[] = [];
    for (let k = 0; k < slice.length; k++) {
      const v = vecs[k];
      if (!v) { failed++; continue; }
      rows.push({ id: str(slice[k].id), embedding: JSON.stringify(v), updated_at: new Date().toISOString() });
    }
    if (rows.length) {
      const up = await rest(`kb_embeddings?on_conflict=id`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(rows),
      });
      if (up.ok) done += rows.length; else failed += rows.length;
    }
  }

  const remaining = (await rpc("kb_docs_needing_embedding", { match_count: 1000 })).length;
  return { ok: true, embedded: done, failed, remaining_estimate: remaining, model: EMBED_MODEL };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const u = new URL(req.url);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const key = u.searchParams.get("key") || str(body.secret);
    if (!SERVICE_KEY || key !== SERVICE_KEY) return j({ ok: false, error: "unauthorized" }, 401);

    const mode = (u.searchParams.get("mode") || str(body.mode) || "").toLowerCase();

    if (mode === "ingest") {
      // batch: { sources: [ { source, csv_url }, ... ] }
      if (Array.isArray(body.sources)) {
        const results: Record<string, unknown>[] = [];
        for (const s of (body.sources as Record<string, unknown>[])) {
          results.push(await ingest(str(s.csv_url), str(s.source)));
        }
        const ingested = results.reduce((n, r) => n + (Number(r.ingested) || 0), 0);
        return j({ ok: true, sources: results.length, ingested_total: ingested, results });
      }
      // single: { source, csv_url }
      return j(await ingest(str(body.csv_url), str(body.source)));
    }

    if (mode === "embed") return j(await embed(Number(body.limit) || 1000));

    if (mode === "publish") {
      const source = str(body.source);
      if (!source) return j({ ok: false, error: "source required (or 'all')" }, 400);
      const filter = source === "all" ? "published=eq.false" : `source=eq.${encodeURIComponent(source)}`;
      const up = await rest(`kb_docs?${filter}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ published: true }) });
      return j({ ok: up.ok, published_source: source });
    }

    return j({ ok: false, error: "mode must be ingest | embed | publish" }, 400);
  } catch (e) {
    return j({ ok: false, error: (e as Error).message }, 500);
  }
});
