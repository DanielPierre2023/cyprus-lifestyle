// supabase/functions/concierge/index.ts
// ============================================================================
// ⚠️ DEPRECATED (2026-10-01) — NO LONGER CALLED BY THE APP.
// ----------------------------------------------------------------------------
// The public "Ask the island" box (app/api/concierge/route.ts) now answers via the
// SHARED concierge brain (lib/concierge/brain.ts) directly — the same grounded,
// multilingual core that powers the streaming web chat, Telegram and WhatsApp. The
// streaming chat's resilience fallback no longer calls this function either. So
// nothing in the Next app invokes this edge function anymore.
//
// It is retained ONLY as a historical Supabase deploy artifact so any stray external
// caller does not hit a surprise 404 during the transition. It can be removed from
// the Supabase dashboard (Edge Functions → `concierge`) at a later clean-up. No
// behaviour below has changed.
// ============================================================================
// CYPRUS LIFESTYLE — "Ask the island" concierge  (grounded, structured output)
// ----------------------------------------------------------------------------
// A visitor asks in plain language ("a quiet beachfront dinner in Paphos for an
// anniversary", "family hotel near a sandy beach", "who builds new apartments in
// Limassol?", "tell me about Zya Cafe"). We RETRIEVE real candidates from the
// published directory, then ask the model to PICK from those candidates and
// explain why — it can only choose from what we hand it, so it can never invent
// a place that doesn't exist.
//
// PLAN 1 — HYBRID RETRIEVAL (this version). retrieve() now blends three signals
// instead of the old ILIKE-only pass:
//   1) NAME   — match_directory_name RPC: exact / partial / MISSPELLED names
//               (pg_trgm word similarity). Highest priority, not rating-capped.
//               This is what fixes "the concierge can't find <named place>".
//   2) SEMANTIC — match_directory RPC: pgvector cosine over directory_embeddings
//               (the 17k vectors that already exist), embedding the query with
//               the SAME model that built them.
//   3) STRUCTURED — type x district top-rated (a supporting signal, not the gate).
// Results are merged, de-duped, ranked, and only PUBLISHED rows are hydrated.
// If embeddings are unavailable/misconfigured, semantic is skipped and the name +
// structured signals still work — so retrieval never regresses below before.
//
// Secrets reused: CLAUDE_API_KEY, SONNET_MODEL, NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY (already set on the project; used for
// the query embedding). Optional: EMBEDDING_MODEL (default text-embedding-3-small).
// Deploy with Verify JWT OFF (called by the site's /api/concierge route).
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const CLAUDE_KEY = Deno.env.get("CLAUDE_API_KEY") || "";
const MODEL = Deno.env.get("SONNET_MODEL") || "claude-sonnet-5";
const SUPABASE_URL = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
// Query embedding: MUST be the same model that built public.directory_embeddings.
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const EMBED_MODEL = Deno.env.get("EMBEDDING_MODEL") || "text-embedding-3-small";
const EMBED_DIM = 1536; // directory_embeddings / kb_embeddings are vector(1536)

const LOCALES = ["en", "el", "ro", "ar", "de", "pl", "ru"];
const DISTRICTS = ["paphos", "limassol", "larnaca", "nicosia", "famagusta", "ayia napa", "protaras", "paralimni"];

const HOUSE =
  "You are the concierge for Cyprus Lifestyle, a premium guide to the best of living in and visiting Cyprus. " +
  "You are warm, precise and genuinely helpful — the sensibility of a great hotel concierge crossed with a Condé Nast Traveller editor. " +
  "British spelling. When RECOMMENDING places, use ONLY the candidate places provided to you; never invent a place, name, price or rating. " +
  "If the candidates don't fit the request well, say so honestly and suggest the closest sensible option. " +
  "You may ALSO answer practical travel questions about Cyprus — weather and sea temperature by month and whether it is swimming season; airport transfers and getting around; beaches (sand, gentle entry, how busy); car hire; seasonality and public holidays — using the CYPRUS FACTS below. " +
  "You are ALSO an expert on practical life in Cyprus for visitors and residents. When the request matches one of the KNOWLEDGE entries provided, use its facts, prices and advice to answer directly and specifically (a scuba dive, cleaning a pool, forming a company, buying an engagement ring, finding a plumber, getting residency, and so on). Give the euro figures and the honest caveat where relevant (for services, always advise getting two or three quotes; note when insurance matters). The KNOWLEDGE is written in English — always WRITE your answer in the visitor's language. " +
  "Always keep the person on Cyprus Lifestyle first: when a KNOWLEDGE entry has on-site pages, cite the RELEVANT ones by their id in `sources` so we can show 'on our site' links from which they connect onward — never send them straight to an outside site. " +
  "Be specific and honest: give typical figures, and where something depends on live conditions (a specific day's forecast far ahead, a current sea state, a particular hotel's winter opening) say what is usual and note it can vary. " +
  "For a purely informational or how-to question it is completely fine to answer with few or no picks. Always reply in the visitor's language. Keep the answer to 2–5 sentences.";

// Curated, accurate Cyprus facts (south coast: Ayia Napa, Protaras, Larnaca,
// Limassol, Paphos) so the concierge can answer the practical questions real
// visitors ask, grounded rather than guessed.
const CY_BRIEF =
  "CYPRUS FACTS.\n" +
  "CLIMATE by month (coast; day high °C / sea °C / swimming): " +
  "Jan 16/17 no; Feb 17/17 no; Mar 19/18 chilly; Apr 22/18 warming, season starting; May 26/21 yes; Jun 30/24 yes; " +
  "Jul 33/26 yes; Aug 33/27 yes (warmest sea); Sep 31/26 excellent; Oct 27/25 still great, warm all month (late Oct ~24); " +
  "Nov 22/22 comfortable early Nov, cooler later; Dec 18/19 not really. Evenings are much cooler than days from Oct onward — a light jacket helps Oct–Apr. " +
  "300+ sunny days; rain mainly Dec–Feb; summer virtually rainless. Swimming season runs roughly late May to early November; sea is warmest Aug–Sep; October is still very swimmable. Occasional seagrass/seaweed can wash up after wind — it clears and varies by day and beach.\n" +
  "GETTING AROUND. Two airports: Larnaca (LCA, main) and Paphos (PFO). LCA to Ayia Napa/Protaras/Nissi is ~45 min by car. " +
  "Options: Kapnos Airport Shuttle (scheduled), private transfer firms (pre-book), a taxi (~€60–75), or intercity/OSEA buses. Ride-hailing apps that work here: Bolt, CabCY, nTaxi (Uber and Yandex do NOT operate in Cyprus). " +
  "Public buses by district: Cyprus Public Transport (Nicosia, Larnaca), EMEL (Limassol), OSYPA (Paphos), OSEA (Famagusta: Ayia Napa/Protaras — local buses reach Nissi and Sandy/Makronissos; check the OSEA app or ask the driver, and the return stop is usually across the road). " +
  "Car hire is easy at both airports (Enterprise, Sixt, Hertz and local firms; some advertise no deposit). Driving is on the LEFT. Latchi (near Polis) is the base for self-drive boat hire — about an hour from Paphos; book ahead in peak.\n" +
  "BEACHES (fine sand, gentle entry): Nissi Beach (lively, shallow, busy), Konnos Bay (a quieter scenic cove), Fig Tree Bay Protaras (family favourite), Makronissos (calmer), Landa/Sandy Bay near Ayia Napa; Finikoudes & Mackenzie in Larnaca town; Coral Bay in Paphos (sandy, gentle). Nissi is busier and livelier than Konnos. Many are Blue Flag.\n" +
  "PRACTICAL. 1 October is Cyprus Independence Day, a public holiday — banks and public offices close; in the resorts most tourist businesses stay open, some shops close, supermarkets often run reduced hours. Ayia Napa/Protaras are lively roughly May–October; from November many hotels, tavernas and clubs close for winter and Ayia Napa is very quiet (for New Year's Eve, Limassol, Paphos or Nicosia are livelier). Currency euro; Greek and widely English; tipping ~5–10%.";

function j(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: CORS });
}
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

// PostgREST fetch (same pattern as the enricher). Returns parsed rows or [].
async function rest(query: string): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

// PostgREST RPC call (for match_directory / match_directory_name). Returns rows or [].
async function rpc(fn: string, args: Record<string, unknown>): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

// Embed the visitor's query with the SAME model that built directory_embeddings.
// Returns a 1536-dim vector, or null (caller then skips semantic search cleanly).
async function embedQuery(text: string): Promise<number[] | null> {
  if (!OPENAI_KEY || !text) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 2000) }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const v = data?.data?.[0]?.embedding;
    return Array.isArray(v) && v.length === EMBED_DIM ? (v as number[]) : null;
  } catch { return null; }
}

interface Tool { name: string; description: string; input_schema: Record<string, unknown>; }

// Force a structured answer via tool use. Retries once on a transient failure.
async function claudeTool(system: string, user: string, tool: Tool, maxTokens: number): Promise<Record<string, unknown>> {
  const payload = {
    model: MODEL, max_tokens: maxTokens, system,
    messages: [{ role: "user", content: user }],
    tools: [tool], tool_choice: { type: "tool", name: tool.name },
  };
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": CLAUDE_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });
    } catch (e) {
      const err = e as Error;
      lastErr = err.message;
      const isTimeout = err.name === "TimeoutError" || /timed?\s?out|abort/i.test(err.message);
      if (!isTimeout && attempt === 0) { await new Promise((r) => setTimeout(r, 500)); continue; }
      break;
    }
    if (res.ok) {
      const data = await res.json();
      const block = (data?.content || []).find((c: Record<string, unknown>) => c.type === "tool_use");
      if (block && block.input && typeof block.input === "object") return block.input as Record<string, unknown>;
      lastErr = "model did not return the expected structured result";
      if (attempt === 0) { await new Promise((r) => setTimeout(r, 500)); continue; }
      break;
    }
    lastErr = `AI service ${res.status}: ${(await res.text()).slice(0, 160)}`;
    if (res.status !== 429 && res.status < 500) throw new Error(lastErr);
    if (attempt === 0) { await new Promise((r) => setTimeout(r, 700)); continue; }
  }
  throw new Error(lastErr || "the concierge did not return a valid result");
}

// Parse obvious type/district signals from the query to steer the structured pass.
function readIntent(q: string): { types: string[]; districts: string[] } {
  const s = q.toLowerCase();
  const types: string[] = [];
  const add = (t: string, ...words: string[]) => { if (words.some((w) => s.includes(w)) && !types.includes(t)) types.push(t); };
  add("restaurant", "restaurant", "dinner", "lunch", "eat", "dining", "food", "meze", "taverna", "cuisine", "brunch", "cafe", "café", "coffee", "bakery", "bar", "pub");
  add("hotel", "hotel", "stay", "resort", "accommodation", "spa", "suite", "room");
  add("beach", "beach", "sea", "swim", "sand", "coast", "sunbathe", "bay");
  add("winery", "wine", "winery", "vineyard", "tasting");
  add("development", "apartment", "property", "real estate", "developer", "buy", "invest", "new build", "villa");
  add("vendor", "rent", "car", "service", "furniture", "builder", "lawyer", "gym", "clinic", "shop");
  const districts = DISTRICTS.filter((d) => s.includes(d));
  return { types, districts };
}

interface Cand {
  slug: string; type: string; name: string; district: string | null;
  summary: string; rating: number | null; rating_count: number | null;
  price_band: string | null; tags: string[]; image: string | null;
}

// Hybrid retrieval: NAME (fuzzy) + SEMANTIC (vector) + STRUCTURED (type x district),
// merged and ranked. Only published rows are hydrated and returned.
async function retrieve(locale: string, q: string): Promise<Cand[]> {
  const { types, districts } = readIntent(q);
  const district = districts.length === 1 ? districts[0] : null;
  const cols = encodeURIComponent(`slug,type,district,price_band,rating,rating_count,tags,image,name_${locale},name_en,summary_${locale},summary_en`);
  const base = `directory_listings?select=${cols}&status=eq.published`;
  const order = "order=rating.desc.nullslast,rating_count.desc.nullslast";

  // Best score per slug across the three signals (name outranks semantic outranks structured).
  const score = new Map<string, number>();
  const bump = (slug: string, s: number) => { if (!slug) return; const cur = score.get(slug) ?? 0; if (s > cur) score.set(slug, s); };

  // 1) NAME — exact / partial / misspelled. Highest band (1.0 + similarity).
  for (const r of await rpc("match_directory_name", { q, match_count: 14 })) {
    bump(str(r.slug), 1.0 + Number(r.score ?? 0));
  }

  // 2) SEMANTIC — pgvector cosine over the existing directory_embeddings.
  const emb = await embedQuery(q);
  if (emb) {
    const args: Record<string, unknown> = { query_embedding: emb, match_count: 24 };
    if (district) args.filter_district = district;
    for (const r of await rpc("match_directory", args)) {
      const sim = Number(r.similarity ?? 0);
      if (sim >= 0.30) bump(str(r.slug), 0.5 + sim * 0.4); // ~0.6..0.9 band, below name
    }
  }

  // 3) STRUCTURED — type x district top-rated (supporting signal).
  for (const ty of types) {
    const dfilter = district ? `&district=eq.${encodeURIComponent(district)}` : "";
    for (const r of await rest(`${base}&type=eq.${ty}${dfilter}&${order}&limit=10`)) bump(str(r.slug), 0.4);
  }

  // Fallbacks so there is always something to reason over.
  if (score.size < 6 && district) {
    for (const r of await rest(`${base}&district=eq.${encodeURIComponent(district)}&${order}&limit=12`)) bump(str(r.slug), 0.2);
  }
  if (score.size < 4) {
    for (const r of await rest(`${base}&${order}&limit=10`)) bump(str(r.slug), 0.1);
  }

  const ranked = [...score.keys()].sort((a, b) => (score.get(b)! - score.get(a)!)).slice(0, 40);
  if (!ranked.length) return [];

  // Hydrate the ranked slugs (published only) in one request.
  // Slugs are URL-safe ([a-z0-9-]); keep the in-list commas literal for PostgREST.
  const inList = ranked.map((s) => s.replace(/[(),"\s]/g, "")).filter(Boolean).join(",");
  const rows = await rest(`${base}&slug=in.(${inList})&limit=40`);
  const bySlug = new Map<string, Record<string, unknown>>();
  for (const r of rows) bySlug.set(str(r.slug), r);

  const out: Cand[] = [];
  for (const slug of ranked) {
    const r = bySlug.get(slug);
    if (!r) continue; // e.g. a 'listed'-only slug from the vector RPC — dropped (no page)
    out.push({
      slug, type: str(r.type),
      name: str(r[`name_${locale}`] || r.name_en),
      district: (r.district as string) ?? null,
      summary: str(r[`summary_${locale}`] || r.summary_en),
      rating: (r.rating as number) ?? null,
      rating_count: (r.rating_count as number) ?? null,
      price_band: (r.price_band as string) ?? null,
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      image: (r.image as string) ?? null,
    });
  }
  return out;
}

const TOOL_PICKS: Tool = {
  name: "concierge_answer",
  description: "Answer the visitor with a short recommendation grounded strictly in the candidate places.",
  input_schema: {
    type: "object",
    properties: {
      answer: { type: "string", description: "2-4 warm, specific sentences answering the request and framing the picks. No markdown." },
      picks: {
        type: "array",
        description: "3-6 recommended places, best first. Use ONLY slugs from the candidates.",
        items: {
          type: "object",
          properties: {
            slug: { type: "string", description: "The exact slug of a candidate place." },
            why: { type: "string", description: "One specific sentence on why it fits THIS request." },
          },
          required: ["slug", "why"],
        },
      },
      sources: {
        type: "array",
        description: "The ids of the KNOWLEDGE entries you actually used to answer (0-4). Use ONLY ids from the provided KNOWLEDGE. Leave empty if you used none.",
        items: { type: "string" },
      },
      followup: { type: "string", description: "One optional short follow-up question to refine, or empty string." },
    },
    required: ["answer", "picks"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    // Gated by the site's server route, which holds the service key.
    if (!SERVICE_KEY || String(body.secret || "") !== SERVICE_KEY) return j({ ok: false, error: "unauthorized" }, 401);
    if (!CLAUDE_KEY) return j({ ok: false, error: "The concierge is not configured on the server." }, 500);

    const q = String(body.q || "").slice(0, 500).trim();
    const locale = LOCALES.includes(String(body.locale || "")) ? String(body.locale) : "en";
    if (q.length < 3) return j({ ok: false, error: "Please ask a fuller question." }, 400);

    // Practical knowledge base, retrieved by the site route from the intent map.
    interface KBItem { id: string; q: string; a: string; res: { l: string; p: string }[]; connect: string[]; }
    const knowledge: KBItem[] = (Array.isArray(body.knowledge) ? body.knowledge : [])
      .map((k: Record<string, unknown>) => ({
        id: str(k.id),
        q: str(k.q),
        a: str(k.a),
        res: Array.isArray(k.res) ? (k.res as Record<string, unknown>[]).map((r) => ({ l: str(r.l), p: str(r.p) })).filter((r) => r.l && r.p) : [],
        connect: Array.isArray(k.connect) ? (k.connect as unknown[]).map(str).filter(Boolean) : [],
      }))
      .filter((k: KBItem) => k.id && k.a)
      .slice(0, 8);

    const candidates = await retrieve(locale, q);
    if (!candidates.length && !knowledge.length) {
      return j({ ok: true, answer: "I couldn't find anything published that fits yet — try another area or category.", picks: [], guides: [], candidates: [] });
    }

    // Compact candidate list for the model (index + the facts it may cite).
    const menu = candidates.length
      ? candidates.map((c, i) =>
          `${i + 1}. [${c.slug}] ${c.name} — ${c.type}${c.district ? `, ${c.district}` : ""}${c.rating ? `, ${c.rating}★${c.rating_count ? ` (${c.rating_count})` : ""}` : ""}${c.price_band ? `, ${c.price_band}` : ""}${c.summary ? ` — ${c.summary.slice(0, 160)}` : ""}`
        ).join("\n")
      : "(no directory places retrieved for this request — answer from your knowledge)";

    const kbBlock = knowledge.length
      ? "\n\nKNOWLEDGE (accurate facts, prices and advice you may use; cite the ids you actually use in 'sources'):\n" +
        knowledge.map((k) =>
          `- id=${k.id} · ${k.q}\n  ${k.a}${k.res.length ? `\n  on-site pages: ${k.res.map((r) => r.l).join("; ")}` : ""}`
        ).join("\n")
      : "";

    const system = HOUSE + "\n\n" + CY_BRIEF;
    const user =
      `Visitor's request:\n"${q}"\n\n` +
      `Candidate places (recommend ONLY from these, by their [slug]):\n${menu}` +
      kbBlock + "\n\n" +
      "If this is a practical or how-to question, answer it directly from the KNOWLEDGE with the euro figures and honest caveats, and set 'sources' to the ids you used. " +
      "If it calls for specific places, choose the 3-6 candidates that best fit, best first, each in one specific sentence; return an empty picks list for a pure how-to question. " +
      `Write the answer in the visitor's language (locale "${locale}").`;

    const out = await claudeTool(system, user, TOOL_PICKS, 1200);

    // Validate picks against real candidates — drop anything the model invented.
    const bySlug = new Map(candidates.map((c) => [c.slug, c]));
    const picks = (Array.isArray(out.picks) ? out.picks : [])
      .map((p: Record<string, unknown>) => ({ slug: str(p.slug), why: str(p.why) }))
      .filter((p) => bySlug.has(p.slug))
      .slice(0, 6)
      .map((p) => {
        const c = bySlug.get(p.slug)!;
        return { slug: c.slug, type: c.type, name: c.name, district: c.district, rating: c.rating, rating_count: c.rating_count, price_band: c.price_band, image: c.image, why: p.why };
      });

    // Map the KNOWLEDGE ids the model cited to on-site links (validated against
    // what we actually sent, so a guide link can never point somewhere invented).
    const kbById = new Map(knowledge.map((k) => [k.id, k]));
    const guideSeen = new Set<string>();
    const guides: { label: string; path: string }[] = [];
    for (const id of (Array.isArray(out.sources) ? out.sources : [])) {
      const k = kbById.get(str(id));
      if (!k) continue;
      for (const r of k.res) {
        if (guideSeen.has(r.p)) continue;
        guideSeen.add(r.p);
        guides.push({ label: r.l, path: r.p });
      }
    }

    return j({ ok: true, answer: str(out.answer), followup: str(out.followup), picks, guides: guides.slice(0, 4) });
  } catch (e) {
    return j({ ok: false, error: (e as Error).message }, 500);
  }
});
