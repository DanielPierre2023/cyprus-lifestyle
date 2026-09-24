// lib/editorial/search.ts
// ============================================================================
// Live web research for the planner, via Tavily — a search API built for LLM/agent
// grounding (it returns ranked, cleaned content plus a synthesized answer). The
// planner turns the digest into the "LIVE RESEARCH" block of the ideation prompt.
//
// Reads TAVILY_API_KEY. Returns '' whenever it is unavailable or errors, so the
// planner degrades cleanly (Anthropic web_search, then season + directory only).
// Server-only. Never throws.
// ============================================================================
import 'server-only';

const TAVILY_URL = 'https://api.tavily.com/search';

async function searchOne(key: string, query: string, maxResults: number): Promise<string> {
  try {
    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      // api_key in the body too — Tavily accepts either, so this works on both plans.
      body: JSON.stringify({
        api_key: key, query, search_depth: 'basic', topic: 'general',
        max_results: maxResults, include_answer: true, include_raw_content: false,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return '';
    const d = await res.json() as { answer?: string; results?: { title?: string; content?: string; url?: string }[] };
    const parts: string[] = [];
    if (typeof d.answer === 'string' && d.answer.trim()) parts.push(d.answer.trim());
    for (const r of (Array.isArray(d.results) ? d.results : []).slice(0, maxResults)) {
      const title = String(r?.title || '').trim();
      const content = String(r?.content || '').replace(/\s+/g, ' ').trim().slice(0, 220);
      if (title || content) parts.push(`- ${title}${title && content ? ': ' : ''}${content}`);
    }
    return parts.length ? `Q: ${query}\n${parts.join('\n')}` : '';
  } catch { return ''; }
}

// Run a few research queries and return a compact digest (empty if unavailable).
export async function researchWeb(queries: string[], maxResults = 4): Promise<string> {
  const key = process.env.TAVILY_API_KEY;
  if (!key || !queries.length) return '';
  const digests: string[] = [];
  for (const q of queries.slice(0, 2)) {
    const d = await searchOne(key, q, maxResults);
    if (d) digests.push(d);
  }
  return digests.join('\n\n').slice(0, 3500);
}

export const hasTavily = (): boolean => !!process.env.TAVILY_API_KEY;
