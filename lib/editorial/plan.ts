// lib/editorial/plan.ts
// ============================================================================
// THE EDITORIAL PLANNER — server-only runner (the I/O around lib/editorial/planner.ts).
// ----------------------------------------------------------------------------
// One run: read the accountability gaps (editorial_plan view), and for each
// under-served subcategory — grounded on the season, live web research, and the
// directory's own candidate businesses — generate fresh, non-redundant article
// ideas with accurate research briefs, and queue them for the editor to approve.
//
// SENSE → IDEATE (Sonnet + web_search) → DEDUP (title hash + pgvector) → PLAN → QUEUE.
// Degrades gracefully: a model/parse/search failure on one section is logged and the
// run moves on. Never throws. Suggest-only — it writes ideas as 'suggested'; drafting
// happens later, on approval (respecting the autonomy setting).
// ============================================================================
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callClaude, CLAUDE_SONNET, parseAiJson } from '@/lib/ai';
import { embedText } from '@/lib/concierge/embed';
import { getSection } from '@/lib/editorial/taxonomy';
import { getEditorialSettings } from '@/lib/editorial/settings';
import {
  plannerSystem, ideatePrompt, coerceIdeas, filterRedundant, dedupHash,
  seasonalNote, monthName, researchQueriesFor, type PlannerSignals,
} from '@/lib/editorial/planner';
import { researchWeb } from '@/lib/editorial/search';

const SEMANTIC_DUP = 0.90;   // cosine ≥ this against an existing idea → treat as duplicate

interface PlanGapRow {
  section_key: string; section_name: string; department_key: string; department_name: string;
  monthly_target: number; franchise_key: string | null; published_mtd: number; ideas_open: number; gap: number;
}
export interface PlannerRunOptions {
  sectionKey?: string | null;   // limit to one subcategory
  monthIndex?: number | null;    // 1–12; default = current month
  dryRun?: boolean;              // generate + report but don't write
  webSearch?: boolean | null;    // override the setting
  maxIdeas?: number | null;      // hard cap on ideas created this run
}

function firstOfMonth(monthIndex: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), monthIndex - 1, 1));
  return d.toISOString().slice(0, 10);
}

// Directory candidates for a section (its dir_groups), best-first, as feature subjects.
async function candidatesFor(dirGroups: string[]): Promise<PlannerSignals['candidates']> {
  if (!dirGroups.length) return [];
  const { data } = await supabaseAdmin()
    .from('directory_listings')
    .select('slug, name_en, district, rating')
    .in('canonical_category', dirGroups)
    .in('status', ['published', 'listed'])
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(12);
  return ((data as { slug: string; name_en: string | null; district: string | null }[] | null) || [])
    .filter((r) => r.name_en)
    .map((r) => ({ name: r.name_en as string, slug: r.slug, district: r.district }));
}

// Titles already published or queued for a section — the redundancy baseline.
async function existingTitlesFor(sectionKey: string, deptKey: string): Promise<string[]> {
  const sb = supabaseAdmin();
  const [posts, ideas] = await Promise.all([
    sb.from('blog_posts').select('title_en')
      .or(`subcategory.eq.${sectionKey},category.eq.${sectionKey},category.eq.${deptKey}`)
      .not('title_en', 'is', null).limit(60),
    sb.from('editorial_ideas').select('working_title')
      .eq('subcategory_key', sectionKey).neq('status', 'rejected').limit(60),
  ]);
  const a = ((posts.data as { title_en: string | null }[] | null) || []).map((r) => r.title_en || '').filter(Boolean);
  const b = ((ideas.data as { working_title: string }[] | null) || []).map((r) => r.working_title).filter(Boolean);
  return [...a, ...b];
}

// Semantic-dup check against existing ideas via the pgvector match function.
async function isSemanticDup(embedding: number[] | null): Promise<boolean> {
  if (!embedding) return false;
  try {
    const { data } = await supabaseAdmin().rpc('match_editorial_ideas', { query_embedding: embedding, match_count: 3 });
    const top = Array.isArray(data) && data.length ? Number((data[0] as { similarity?: number }).similarity ?? 0) : 0;
    return top >= SEMANTIC_DUP;
  } catch { return false; }
}

async function processSection(
  gap: PlanGapRow, monthIndex: number, opts: PlannerRunOptions, settings: { webSearch: boolean; ideasPerSection: number },
  budgetLeftMs: () => number,
): Promise<{ section: string; created: number; skippedDup: number; error?: string; webFallback?: boolean; webSource?: string }> {
  const section = getSection(gap.section_key);
  if (!section) return { section: gap.section_key, created: 0, skippedDup: 0, error: 'unknown section' };

  const want = Math.min(Math.max(gap.gap, 1), settings.ideasPerSection);
  const candidates = await candidatesFor(section.dirGroups);
  const existing = await existingTitlesFor(section.key, gap.department_key);
  const wantWeb = opts.webSearch == null ? settings.webSearch : !!opts.webSearch;

  // Live web research: PREFER Tavily (a search API built for grounding) when
  // TAVILY_API_KEY is set; else fall back to Anthropic's built-in web_search tool.
  let digest = '';
  if (wantWeb) { try { digest = await researchWeb(researchQueriesFor(section, monthIndex)); } catch { digest = ''; } }
  const webSource: 'tavily' | 'anthropic' | 'none' = digest ? 'tavily' : (wantWeb ? 'anthropic' : 'none');

  // One ideation attempt. `useTool` turns on Anthropic web_search; `webText` is the
  // research block (Tavily digest, or the directive that tells the tool to search).
  async function ideate(useTool: boolean, webText: string) {
    const signals: PlannerSignals = { seasonal: seasonalNote(monthIndex), web: webText, demand: [], candidates };
    const userMessage = ideatePrompt({ section: section!, departmentName: gap.department_name, monthIndex, count: want, signals, existingTitles: existing });
    return callClaude({
      systemInstruction: plannerSystem(), userMessage, model: CLAUDE_SONNET, jsonMode: true,
      webSearch: useTool, maxSearches: 4, maxTokens: 3600,
      timeoutMs: Math.min(70_000, Math.max(20_000, budgetLeftMs() - 5_000)), fn: 'editorial-planner',
    });
  }

  // Attempt 1: Tavily digest (no Anthropic tool), or the Anthropic tool if no digest,
  // or plain. If web was wanted but yields nothing usable, retry ONCE fully offline so
  // a section is never silently skipped.
  const useTool = webSource === 'anthropic';
  const firstText = digest || (useTool ? '(Use web search now to find what is genuinely happening, new or of interest for this section in the Republic of Cyprus this month, then propose. Treat findings as leads to verify.)' : '');
  let r = await ideate(useTool, firstText);
  let parsed = r.text ? coerceIdeas(parseAiJson(r.text)) : [];
  let lastErr = r.error || (parsed.length === 0 ? 'the model returned no usable ideas' : undefined);
  let webFallback = false;
  if (wantWeb && parsed.length === 0 && budgetLeftMs() > 15_000) {
    webFallback = true;
    r = await ideate(false, '');
    const p2 = r.text ? coerceIdeas(parseAiJson(r.text)) : [];
    if (p2.length) { parsed = p2; lastErr = undefined; }
    else lastErr = r.error || 'no usable ideas, with or without web search';
  }
  if (!parsed.length) return { section: section.key, created: 0, skippedDup: 0, error: lastErr, webFallback };

  const fresh = filterRedundant(parsed, existing).slice(0, want);
  if (opts.dryRun) return { section: section.key, created: fresh.length, skippedDup: parsed.length - fresh.length, webFallback, webSource: webFallback ? 'none' : webSource };

  let created = 0, skippedDup = 0;
  const targetMonth = firstOfMonth(monthIndex);
  for (const idea of fresh) {
    const embedding = await embedText(`${idea.workingTitle}. ${idea.angle}`);
    if (await isSemanticDup(embedding)) { skippedDup++; continue; }

    // Resolve a real subject listing if the model named one by slug.
    let subjectListingId: string | null = null;
    if (idea.subjectSlug) {
      const { data } = await supabaseAdmin().from('directory_listings').select('id').eq('slug', idea.subjectSlug).maybeSingle();
      subjectListingId = (data as { id: string } | null)?.id ?? null;
    }
    const { error } = await supabaseAdmin().from('editorial_ideas').insert({
      section_key: gap.department_key,
      subcategory_key: section.key,
      working_title: idea.workingTitle,
      angle: idea.angle || null,
      rationale: idea.rationale || null,
      status: 'suggested',
      source: 'ai-planner',
      target_month: targetMonth,
      subject_listing_id: subjectListingId,
      research_brief: {
        needs: idea.needs, wordTarget: idea.wordTarget, outline: idea.outline, verify: idea.verify,
        franchise: idea.franchise || section.franchiseKey || null, subjectHint: idea.subjectHint,
      },
      signals: { seasonal: seasonalNote(monthIndex), month: monthName(monthIndex), webResearched: wantWeb && !webFallback, webSource: webFallback ? 'none' : webSource },
      dedup_hash: dedupHash(idea.workingTitle),
      embedding,
      created_by: 'planner',
    });
    if (!error) created++;
  }
  return { section: section.key, created, skippedDup, webFallback, webSource: webFallback ? 'none' : webSource };
}

export async function runPlanner(opts: PlannerRunOptions = {}): Promise<Record<string, unknown>> {
  const started = Date.now();
  const BUDGET_MS = 52_000;                 // stay under the 60s route limit
  const budgetLeft = () => BUDGET_MS - (Date.now() - started);
  const settings = await getEditorialSettings();
  const monthIndex = opts.monthIndex && opts.monthIndex >= 1 && opts.monthIndex <= 12
    ? opts.monthIndex : new Date().getUTCMonth() + 1;
  const maxIdeas = opts.maxIdeas && opts.maxIdeas > 0 ? opts.maxIdeas : 1000;

  // SENSE — the biggest gaps first.
  let q = supabaseAdmin().from('editorial_plan').select('*').gt('gap', 0).order('gap', { ascending: false });
  if (opts.sectionKey) q = supabaseAdmin().from('editorial_plan').select('*').eq('section_key', opts.sectionKey);
  const { data, error } = await q;
  if (error) return { ok: false, error: `Could not read the editorial plan: ${error.message}` };
  const gaps = (data as PlanGapRow[] | null) || [];
  if (!gaps.length) return { ok: true, month: monthName(monthIndex), sectionsProcessed: 0, ideasCreated: 0, note: 'No gaps — the plan is full for this month.' };

  const results: { section: string; created: number; skippedDup: number; error?: string; webFallback?: boolean; webSource?: string }[] = [];
  let totalCreated = 0;
  const sectionLimit = opts.sectionKey ? 1 : settings.sectionsPerRun;

  for (const gap of gaps.slice(0, sectionLimit)) {
    if (budgetLeft() < 12_000 || totalCreated >= maxIdeas) break;
    const res = await processSection(gap, monthIndex, opts, settings, budgetLeft);
    results.push(res);
    totalCreated += res.created;
  }

  const remaining = gaps.length - results.length;
  return {
    ok: true,
    month: monthName(monthIndex),
    autonomy: settings.autonomy,
    webSearch: opts.webSearch == null ? settings.webSearch : !!opts.webSearch,
    dryRun: !!opts.dryRun,
    sectionsProcessed: results.length,
    ideasCreated: totalCreated,
    results,
    remainingGaps: remaining,
    note: remaining > 0 ? 'Time budget reached — call again to plan the remaining sections.' : 'All gap sections planned.',
  };
}
