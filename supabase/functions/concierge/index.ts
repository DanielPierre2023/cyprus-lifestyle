// supabase/functions/concierge/index.ts
// ============================================================================
// CYPRUS LIFESTYLE — "Ask the island" concierge  (grounded, structured output)
// ----------------------------------------------------------------------------
// A visitor asks in plain language ("a quiet beachfront dinner in Paphos for an
// anniversary", "family hotel near a sandy beach", "who builds new apartments in
// Limassol?"). We RETRIEVE real candidates from the published directory + agenda,
// then ask the model to PICK from those candidates and explain why — it can only
// choose from what we hand it, so it can never invent a place that doesn't exist.
//
// Reuses the secrets already in Supabase (CLAUDE_API_KEY, SONNET_MODEL,
// NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Nothing new to configure.
// Deploy with Verify JWT OFF (it's called by the site's /api/concierge route,
// which gates and rate-limits it and passes the shared secret).
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

const LOCALES = ["en", "el", "ro", "ar", "de", "pl", "ru"];
const DISTRICTS = ["paphos", "limassol", "larnaca", "nicosia", "famagusta", "ayia napa", "protaras", "paralimni"];

const HOUSE =
  "You are the concierge for Cyprus Lifestyle, a premium guide to the best of living in and visiting Cyprus. " +
  "You are warm, precise and genuinely helpful — the sensibility of a great hotel concierge crossed with a Condé Nast Traveller editor. " +
  "British spelling. You recommend ONLY from the candidate places provided to you; never invent a place, name, price or rating. " +
  "If the candidates don't fit the request well, say so honestly and suggest the closest sensible option.";

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

// Parse obvious type/district signals from the query to steer retrieval.
function readIntent(q: string): { types: string[]; districts: string[] } {
  const s = q.toLowerCase();
  const types: string[] = [];
  const add = (t: string, ...words: string[]) => { if (words.some((w) => s.includes(w)) && !types.includes(t)) types.push(t); };
  add("restaurant", "restaurant", "dinner", "lunch", "eat", "dining", "food", "meze", "taverna", "cuisine", "brunch");
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

async function retrieve(locale: string, q: string): Promise<Cand[]> {
  const { types, districts } = readIntent(q);
  const cols = encodeURIComponent(`slug,type,district,price_band,rating,rating_count,tags,image,name_${locale},name_en,summary_${locale},summary_en`);
  const base = `directory_listings?select=${cols}&status=eq.published`;
  const order = "order=rating.desc.nullslast,rating_count.desc.nullslast";
  const seen = new Set<string>();
  const out: Cand[] = [];
  const push = (rows: Record<string, unknown>[]) => {
    for (const r of rows) {
      const slug = str(r.slug);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
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
  };

  // 1) Keyword match on name/summary (EN + locale), best-rated first.
  const terms = q.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 3).slice(0, 5);
  if (terms.length) {
    const conds = terms.flatMap((t) => {
      const v = t.replace(/[(),*]/g, ""); // keep the OR grammar safe
      return [`name_${locale}.ilike.*${v}*`, `name_en.ilike.*${v}*`, `summary_${locale}.ilike.*${v}*`, `summary_en.ilike.*${v}*`];
    }).join(",");
    push(await rest(`${base}&or=(${encodeURIComponent(conds)})&${order}&limit=24`));
  }

  // 2) Type × district top-rated (the structured signal).
  for (const ty of types) {
    const dfilter = districts.length === 1 ? `&district=eq.${encodeURIComponent(districts[0])}` : "";
    push(await rest(`${base}&type=eq.${ty}${dfilter}&${order}&limit=12`));
  }

  // 3) District-only fallback (top-rated across types).
  if (out.length < 6 && districts.length) {
    push(await rest(`${base}&district=eq.${encodeURIComponent(districts[0])}&${order}&limit=16`));
  }

  // 4) Last resort: overall top-rated so there's always something to reason over.
  if (out.length < 4) {
    push(await rest(`${base}&${order}&limit=12`));
  }

  return out.slice(0, 40);
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

    const candidates = await retrieve(locale, q);
    if (!candidates.length) return j({ ok: true, answer: "I couldn't find anything published that fits yet — try another area or category.", picks: [], candidates: [] });

    // Compact candidate list for the model (index + the facts it may cite).
    const menu = candidates.map((c, i) =>
      `${i + 1}. [${c.slug}] ${c.name} — ${c.type}${c.district ? `, ${c.district}` : ""}${c.rating ? `, ${c.rating}★${c.rating_count ? ` (${c.rating_count})` : ""}` : ""}${c.price_band ? `, ${c.price_band}` : ""}${c.summary ? ` — ${c.summary.slice(0, 160)}` : ""}`
    ).join("\n");

    const system = HOUSE;
    const user =
      `Visitor's request:\n"${q}"\n\n` +
      `Candidate places (recommend ONLY from these, by their [slug]):\n${menu}\n\n` +
      `Choose the 3-6 that best fit the request, best first, and explain each in one specific sentence. ` +
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

    return j({ ok: true, answer: str(out.answer), followup: str(out.followup), picks });
  } catch (e) {
    return j({ ok: false, error: (e as Error).message }, 500);
  }
});
