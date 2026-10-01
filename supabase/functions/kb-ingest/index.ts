// supabase/functions/kb-ingest/index.ts
// ============================================================================
// CYPRUS LIFESTYLE — Plan 2 knowledge ingestion + embedding (Deno edge function)
// ----------------------------------------------------------------------------
// Two modes, both gated by the service-role key (?key= or body.secret):
//
//   mode=ingest  — fetches a CSV export (from Ultimate Web Scraper) and upserts
//                  one kb_docs row per page. Alias-based column mapping, so it
//                  works across all six source tables without per-site config.
//                  Rows land published=false for review. Empty rows are skipped.
//     body: { csv_url, source }           (source = mycypruslife | cyprusbucketlist | imin | cyprusfashion | cyprusdevelopers | mycyprustravel)
//
//   mode=embed   — drains kb_docs that still need an embedding (new or edited)
//                  and writes kb_embeddings via OPENAI_API_KEY + text-embedding-3-small.
//                  Time-budgeted + drain-forward: call repeatedly until remaining=0.
//     body: { limit? }                    (default 50 per call)
//
//   mode=publish — flips published=true for a source after you've reviewed it.
//     body: { source }  (or { source: "all" })
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
  if (!res.ok) return { ok: false, error: `fetch CSV ${res.status}` };
  const rows = parseCSV(await res.text());
  if (rows.length < 2) return { ok: false, error: "empty CSV" };

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

  // Upsert in chunks on the url unique key (merge duplicates). updated_at bumps so embed re-runs on change.
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

// ── embed: kb_docs -> kb_embeddings ─────────────────────────────────────────
async function embedOne(text: string): Promise<number[] | null> {
  if (!OPENAI_KEY || !text) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 2000) }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const v = d?.data?.[0]?.embedding;
    return Array.isArray(v) && v.length === EMBED_DIM ? (v as number[]) : null;
  } catch { return null; }
}
async function embed(limit: number): Promise<Record<string, unknown>> {
  if (!OPENAI_KEY) return { ok: false, error: "OPENAI_API_KEY not set" };
  const batch = await rpc("kb_docs_needing_embedding", { match_count: Math.min(Math.max(limit, 1), 100) });
  const deadline = Date.now() + 40000;
  let done = 0, failed = 0;
  for (const row of batch) {
    if (Date.now() > deadline) break;
    const id = str(row.id), text = str(row.text);
    const vec = await embedOne(text);
    if (!vec) { failed++; continue; }
    const up = await rest(`kb_embeddings?on_conflict=id`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id, embedding: JSON.stringify(vec), updated_at: new Date().toISOString() }),
    });
    if (up.ok) done++; else failed++;
  }
  // How many still need embedding after this pass?
  const remainingRows = await rpc("kb_docs_needing_embedding", { match_count: 100 });
  return { ok: true, embedded: done, failed, remaining_estimate: remainingRows.length, model: EMBED_MODEL };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const u = new URL(req.url);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const key = u.searchParams.get("key") || str(body.secret);
    if (!SERVICE_KEY || key !== SERVICE_KEY) return j({ ok: false, error: "unauthorized" }, 401);

    const mode = (u.searchParams.get("mode") || str(body.mode) || "").toLowerCase();
    if (mode === "ingest") return j(await ingest(str(body.csv_url), str(body.source)));
    if (mode === "embed") return j(await embed(Number(body.limit) || 50));
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
