// supabase/functions/search-cover-photos/index.ts
//
// Grounded Unsplash cover search for Cyprus Lifestyle articles. Two things it
// fixes: (1) the query is built by a Cyprus-grounded visual brief, so a subject
// like "parliament" resolves to the CYPRIOT House of Representatives in Nicosia,
// never a foreign one; (2) it returns Unsplash's RELEVANCE-RANKED results as
// CANDIDATES for a human to pick — not a blind roll among the top few.
//
// Actions (POST JSON):
//   { action:'search', title, summary?, category?, county?, query? }
//     -> { ok, query, brief:{photo_prompt,prefer_real,alt_text,place}, results:[…] }
//        results[i] = { id, thumb, preview, url, full, author, author_link,
//                       unsplash_link, download_location, alt }
//   { action:'download', image_url, download_location?, credit? }
//     -> pings Unsplash's download endpoint (their API rule) and returns the
//        hot-link URL to store: { ok, publicUrl, credit }. This MATCHES the AI
//        writer (which hot-links urls.regular) — no storage bucket required.
//
// Admin-gated (the Unsplash key is quota'd). Env: UNSPLASH_ACCESS_KEY,
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY (for the brief).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── admin gate (inlined; self-contained for dashboard paste) ─────────────────
// Allows only this project's service-role key (internal/cron callers) or a
// signed-in admin (a user_roles 'admin' row). Anon/non-admin are rejected.
async function requireAdmin(req: Request): Promise<Response | null> {
  const AUTH_CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  const deny = (status: number, error: string) =>
    new Response(JSON.stringify({ error }), {
      status,
      headers: { ...AUTH_CORS, "Content-Type": "application/json" },
    });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return deny(401, "Unauthorized");

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) return null;

  try {
    const probe = createClient(url, token, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await probe.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (!error) return null;
  } catch { /* not service-role — fall through to the admin-user check */ }

  try {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey!;
    const sb = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: u, error: uErr } = await sb.auth.getUser(token);
    if (uErr || !u.user) return deny(401, "Unauthorized");
    const { data: role, error: rErr } = await sb
      .from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (rErr || !role) return deny(403, "Forbidden");
    return null;
  } catch (e) {
    console.error("[requireAdmin] check failed, denying by default:", (e as Error).message);
    return deny(401, "Unauthorized");
  }
}

// ── Grounded visual brief (inlined; self-contained) ──────────────────────────
// Turns an article into a Cyprus-grounded Unsplash query + AI photo prompt so a
// subject like "parliament" resolves to the CYPRIOT one (Nicosia). Gemini is
// timeout-guarded with a deterministic fallback.
interface VisualBrief {
  unsplash_query: string;
  photo_prompt: string;
  alt_text: string;
  prefer_real: boolean;
  place: string;
}
const _VB_DISTRICT: Record<string, string> = {
  nicosia: "Nicosia",
  limassol: "Limassol",
  larnaca: "Larnaca",
  famagusta: "Famagusta",
  paphos: "Paphos",
  kyrenia: "Kyrenia",
};
const _VB_SCENE: Record<string, { q: string; scene: string }> = {
  cyprus: {
    q: "Cyprus town street",
    scene: "a Cypriot town square and historic street, everyday public life",
  },
  business: { q: "Cyprus business office", scene: "a modern Cypriot office or business district" },
  property: {
    q: "Cyprus property coast",
    scene: "Cypriot real estate — apartments and villas along the coastline",
  },
  culture: {
    q: "Cyprus heritage architecture",
    scene: "a Cypriot heritage building, museum, theatre or archaeological site",
  },
  escapes: { q: "Cyprus landscape beach", scene: "a scenic Cypriot beach, mountains or old town" },
  table: {
    q: "Cyprus food taverna",
    scene: "Cypriot food and dining — meze, a taverna table, local produce",
  },
  world: {
    q: "world news skyline",
    scene: "an international news scene, a recognisable world city or landmark",
  },
};
function _vbPlace(county?: string | null): string {
  const c = (county || "").toLowerCase();
  if (c && c !== "national" && _VB_DISTRICT[c]) return `${_VB_DISTRICT[c]}, Cyprus`;
  return "Cyprus";
}
function _vbClean(q: string): string {
  return (q || "").replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 7).join(
    " ",
  );
}
function _vbFallback(
  input: { title: string; category?: string; county?: string | null },
  place: string,
): VisualBrief {
  const base = _VB_SCENE[(input.category || "cyprus").toLowerCase()] || _VB_SCENE.cyprus;
  const isWorld = (input.category || "").toLowerCase() === "world";
  const dist = _VB_DISTRICT[(input.county || "").toLowerCase()] || "";
  const q = _vbClean(isWorld || place === "Cyprus" ? base.q : `${dist} ${base.q}`);
  return {
    unsplash_query: q || "Cyprus",
    photo_prompt:
      `Photorealistic editorial news photograph of ${base.scene}, in ${place}. Natural light, documentary style, sharp focus, realistic. No text, no logos, no watermark, no distorted faces.`,
    alt_text: `Illustrative image — ${input.title}`.slice(0, 160),
    prefer_real: true,
    place,
  };
}
async function buildVisualBrief(
  input: { title: string; summary?: string; category?: string; county?: string | null },
): Promise<VisualBrief> {
  const place = _vbPlace(input.county);
  const fallback = _vbFallback(input, place);
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return fallback;
  const sys =
    `You are the photo editor of Cyprus Lifestyle, an English-language magazine covering Cyprus. For the given article output a STRICT JSON object used to pick or generate an accurate COVER IMAGE.

Ground EVERYTHING in the real place: ${place}. Hard rule: never depict another country's version of a subject. For "the parliament" it is the CYPRIOT House of Representatives in Nicosia — never a foreign parliament. For a named town, district, institution, road or landmark, keep it Cypriot. For a WORLD-desk story about another country, ground it in that real country instead.

Output ONLY this JSON object (no prose):
{"unsplash_query":"3-6 ENGLISH words for a stock-photo search that returns a RELEVANT REAL photo; include the country/city/landmark when the subject is a named place, building, institution, road or event (e.g. \\"Cyprus House Representatives Nicosia\\", \\"Limassol marina old town\\"); concrete photographable nouns, no punctuation","photo_prompt":"40-70 word ENGLISH prompt for a PHOTOREALISTIC editorial photo of the scene, grounded in ${place}; describe setting, light, composition; must NOT contain text, logos, watermarks or recognizable real individuals' faces","prefer_real":true if a REAL stock photo is more appropriate/credible (named places, institutions, events, factual news) — false only for abstract/illustrative/opinion pieces,"alt_text":"one concise ENGLISH sentence describing the intended image"}`;
  const user = `Category: ${input.category || "cyprus"}\nDistrict: ${
    input.county || "national"
  }\nTitle: ${input.title}\nSummary: ${(input.summary || "").substring(0, 500)}`;
  try {
    const call = fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: sys }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500, responseMimeType: "application/json" },
        }),
      },
    ).then((r) => r.json()).catch(() => null);
    const data = await Promise.race([call, new Promise<null>((res) => setTimeout(() => res(null), 7000))]);
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    if (!text) return fallback;
    const p = JSON.parse(text);
    const query = _vbClean(String(p.unsplash_query || ""));
    const prompt = String(p.photo_prompt || "").trim();
    return {
      unsplash_query: query || fallback.unsplash_query,
      photo_prompt: prompt.length > 25 ? prompt : fallback.photo_prompt,
      alt_text: String(p.alt_text || fallback.alt_text).trim().slice(0, 200),
      prefer_real: p.prefer_real !== false,
      place,
    };
  } catch {
    return fallback;
  }
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

const UTM = "utm_source=cyprus_lifestyle&utm_medium=referral";
const withUtm = (link: string) => {
  if (!link) return link;
  return link + (link.includes("?") ? "&" : "?") + UTM;
};

interface UnsplashPhoto {
  id: string;
  alt_description?: string | null;
  urls?: { thumb?: string; small?: string; regular?: string; full?: string };
  user?: { name?: string; links?: { html?: string } };
  links?: { html?: string; download_location?: string };
}

async function handleSearch(body: Record<string, unknown>, accessKey: string): Promise<Response> {
  const title = String(body.title || "").trim();
  const provided = String(body.query || "").trim();
  if (!title && !provided) return json({ error: "title or query is required" }, 400);

  const brief = await buildVisualBrief({
    title,
    summary: String(body.summary || ""),
    category: String(body.category || ""),
    county: (body.county as string) ?? null,
  });
  const query = provided || brief.unsplash_query;

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}` +
    `&per_page=12&orientation=landscape&content_filter=high`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let results: UnsplashPhoto[] = [];
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}`, "Accept-Version": "v1" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return json({ error: `Unsplash ${res.status}: ${t.slice(0, 160)}`, query }, 502);
    }
    const data = await res.json();
    results = Array.isArray(data?.results) ? data.results as UnsplashPhoto[] : [];
  } catch (e) {
    clearTimeout(timer);
    return json({ error: `Unsplash request failed: ${(e as Error).message}`, query }, 502);
  }

  // Relevance order preserved (Unsplash returns most-relevant first).
  const mapped = results.map((p) => ({
    id: p.id,
    thumb: p.urls?.thumb || p.urls?.small || "",
    preview: p.urls?.small || p.urls?.regular || "",
    url: p.urls?.regular || p.urls?.full || "",
    full: p.urls?.full || p.urls?.regular || "",
    author: p.user?.name || "Unsplash",
    author_link: withUtm(p.user?.links?.html || ""),
    unsplash_link: withUtm(p.links?.html || ""),
    download_location: p.links?.download_location || "",
    alt: p.alt_description || "",
  })).filter((r) => r.url);

  return json({
    ok: true,
    query,
    brief: {
      photo_prompt: brief.photo_prompt,
      prefer_real: brief.prefer_real,
      alt_text: brief.alt_text,
      place: brief.place,
    },
    results: mapped,
  });
}

// The chosen photo is hot-linked from Unsplash's CDN — exactly what the AI
// writer does (urls.regular). We only ping Unsplash's download endpoint, which
// their API guidelines require when a photo is used. No storage bucket needed.
async function handleDownload(body: Record<string, unknown>, accessKey: string): Promise<Response> {
  const imageUrl = String(body.image_url || "").trim();
  if (!imageUrl) return json({ error: "image_url is required" }, 400);

  const dl = String(body.download_location || "").trim();
  if (dl) {
    try {
      await fetch(withUtm(dl), { headers: { Authorization: `Client-ID ${accessKey}` } });
    } catch { /* non-fatal — the ping is a courtesy, the hot-link still works */ }
  }

  return json({ ok: true, publicUrl: imageUrl, credit: (body.credit as string) || null });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const denied = await requireAdmin(req);
  if (denied) return denied;
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const accessKey = Deno.env.get("UNSPLASH_ACCESS_KEY");
    if (!accessKey) return json({ error: "UNSPLASH_ACCESS_KEY not configured" }, 400);

    const action = String(body.action || "search");
    if (action === "download") return await handleDownload(body, accessKey);
    return await handleSearch(body, accessKey);
  } catch (e) {
    return json({ error: (e as Error).message || "Unknown error" }, 500);
  }
});
