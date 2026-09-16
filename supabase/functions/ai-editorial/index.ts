// supabase/functions/ai-editorial/index.ts
// ============================================================================
// CYPRUS LIFESTYLE — AI Editorial Studio
// ----------------------------------------------------------------------------
// Self-contained editorial generator. Three modes:
//   • "questions"  — analyses a specific business, then writes a top-tier
//                    interview brief + tailored questions.
//   • "interview"  — turns a raw interview transcript into a finished,
//                    publication-grade profile article.
//   • "review"     — writes a review of a place/business at the highest
//                    journalistic standard from the reviewer's notes.
//
// Reuses the project's existing model secrets (CLAUDE_API_KEY, SONNET_MODEL)
// so nothing new needs configuring. Gated by the service-role key, which only
// the server-side admin route (/api/admin/editorial) holds — never the browser.
// Vendor names live only here (server-side); the admin UI stays neutral.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const CLAUDE_KEY = Deno.env.get("CLAUDE_API_KEY") || "";
const MODEL = Deno.env.get("SONNET_MODEL") || "claude-sonnet-5";

const HOUSE =
  `You write for Cyprus Lifestyle, a premium multilingual magazine about the best of living in Cyprus. ` +
  `Your standard is the world's great lifestyle titles — the sensibility of Vogue, Condé Nast Traveller and Monocle. ` +
  `The voice is elegant, precise and confident; specific over generic; warm but authoritative; never breathless, never salesy. ` +
  `British spelling. No clichés, no filler, no throat-clearing. Editorial independence is sacred: praise is earned and specific, ` +
  `and any criticism is fair and gracefully put. Never invent facts, names, prices or quotes that were not given to you.`;

function j(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj, null, 2), { status, headers: CORS });
}

// Tolerant JSON extraction from a model reply.
function safeJson(text: string): Record<string, unknown> {
  const t = (text || "").trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try { return JSON.parse(t.slice(a, b + 1)); } catch { /* fall through */ }
  }
  return { body_html: `<p>${t.replace(/</g, "&lt;")}</p>` };
}

async function claude(system: string, user: string, maxTokens: number): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": CLAUDE_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(110000),
  });
  if (!res.ok) throw new Error(`AI service ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data?.content?.[0]?.text || "").trim();
}

// Best-effort read of a business's own website, so questions/reviews are grounded
// in the real business rather than generic assumptions.
async function readSite(url: string): Promise<string> {
  try {
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { "user-agent": "Mozilla/5.0 (compatible; CyprusLifestyleBot/1.0)" } });
    if (!res.ok) return "";
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 3500);
  } catch { return ""; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!serviceKey || String(body.secret || "") !== serviceKey) return j({ ok: false, error: "unauthorized" }, 401);
    if (!CLAUDE_KEY) return j({ ok: false, error: "The editorial AI is not configured on the server." }, 500);

    const mode = String(body.mode || "");
    const biz = (body.business || {}) as Record<string, string>;
    const ctx = [
      biz.name ? `Business: ${biz.name}` : "",
      biz.category ? `Category: ${biz.category}` : "",
      biz.district ? `District: ${biz.district}` : "",
      biz.website ? `Website: ${biz.website}` : "",
      biz.notes ? `Known notes: ${biz.notes}` : "",
    ].filter(Boolean).join("\n");

    if (mode === "questions") {
      const site = biz.website ? await readSite(biz.website) : "";
      const system = HOUSE + `\n\nYou are the magazine's interviews editor. First study THIS specific business, then prepare an interview brief of the highest professional standard — the questions a senior features editor would bring. They must be tailored to this business (not generic PR prompts), open doors rather than invite yes/no answers, and draw out story, philosophy, craft, tension and the person behind the name.`;
      const user = `Prepare an interview brief.\n\n${ctx}\n${site ? `\nFrom their own website:\n${site}\n` : ""}\nReturn ONLY JSON: {"analysis":"3-4 sentences on what makes this business notable and the angle worth pursuing","questions":["12-15 tailored questions, ordered from warm opener to the memorable close"]}`;
      return j({ ok: true, mode, result: safeJson(await claude(system, user, 2600)) });
    }

    if (mode === "interview") {
      const raw = String(body.transcript || "").slice(0, 24000);
      if (!raw.trim()) return j({ ok: false, error: "Paste the raw interview first." }, 400);
      const system = HOUSE + `\n\nYou are a senior features writer. Turn a raw interview into a finished, publication-grade article: an arresting opening, a clear narrative arc, the subject's best answers woven in as verbatim quotes, context and colour, and a resonant close. Use ONLY what the transcript contains — never invent quotes or facts.`;
      const user = `Write the article from this raw interview.\n\n${ctx}\n\nRAW INTERVIEW:\n${raw}\n\nReturn ONLY JSON: {"title":"headline","standfirst":"one-sentence dek","body_html":"the article as <p>…</p> paragraphs, roughly 700-1000 words","pull_quote":"the single strongest verbatim quote"}`;
      return j({ ok: true, mode, result: safeJson(await claude(system, user, 4000)) });
    }

    if (mode === "review") {
      const notes = String(body.notes || "").slice(0, 16000);
      if (!notes.trim()) return j({ ok: false, error: "Add the reviewer's notes first." }, 400);
      const site = biz.website ? await readSite(biz.website) : "";
      const system = HOUSE + `\n\nYou are the magazine's critic for this category. Write a review at the highest journalistic level: evocative and precise, honest, alive to detail — the light, the service, the craft, the small tells. Convey the experience, then give a considered verdict. Be fair and graceful; where something falls short, say so with poise. Base every specific on the reviewer's notes; do not fabricate.`;
      const user = `Write the review.\n\n${ctx}\n\nREVIEWER'S NOTES:\n${notes}\n${site ? `\nContext from their site:\n${site}\n` : ""}\nReturn ONLY JSON: {"title":"headline","standfirst":"one-sentence dek","body_html":"the review as <p>…</p> paragraphs, roughly 500-800 words","verdict":"one-line verdict"}`;
      return j({ ok: true, mode, result: safeJson(await claude(system, user, 3400)) });
    }

    return j({ ok: false, error: `unknown mode "${mode}" (use questions | interview | review)` }, 400);
  } catch (e) {
    return j({ ok: false, error: (e as Error).message }, 500);
  }
});
