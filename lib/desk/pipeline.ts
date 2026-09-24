// Cyprus Lifestyle — the AI editorial desk (7 languages).
// Faithful to TT's pipeline shape: draft (desk 1) → translate/fan-out (desk 2b)
// → deterministic anti-AI pass → commit via commit_scraper_blog_post RPC, with
// a generation_logs row for observability. Prompts/voice are Cyprus-specific.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { callClaude, CLAUDE_SONNET, parseAiJson } from '@/lib/ai';
import { humanizeHtml, humanizeText, scoreAiTells, type Lang } from '@/lib/antiAi';
import { translateHtml, translateBundle } from '@/lib/translate';
import { proofread, AI_PROOFREAD_LANGS } from '@/lib/desk/proofread';
import { draftSystemPrompt, editorForCategory, AUTHOR_SLUG, AUTHOR_NAME, type EditorKey } from '@/lib/desk/prompts';
import { findCover } from '@/lib/desk/cover';
import { uniqueSlug, wordCount, stripTags } from '@/lib/util';
import { LOCALES, type Locale } from '@/lib/locales';

// Every non-English edition the desk fans out to. Kept in sync with the seven
// editions the site (and the commit RPC) support, so German/Polish/Russian pieces
// ship translated instead of falling back to English.
const TRANSLATE_TO: Locale[] = ['el', 'ro', 'ar', 'de', 'pl', 'ru'];

// generation_logs (migration 0004) only has per-language columns for the original
// four editions, and no generic JSON column. We translate + persist all seven, but
// log word-count / humanness / desk2b flags only for these four so the insert stays
// schema-valid — de/pl/ru are still produced, humanised and committed to blog_posts,
// they are just not logged per-language here.
const LOG_LANGS: Locale[] = ['en', 'el', 'ro', 'ar'];

interface Draft {
  title: string; excerpt: string; summary: string; body_html: string;
  tags: string[]; seo_title: string; seo_description: string;
  subcategory: string; district: string;
}
interface LangBundle {
  title: string; excerpt: string; summary: string; body_html: string;
  seo_title: string; seo_description: string; tags: string[];
}

function humanness(title: string, content: string, lang: Lang): number {
  const { score } = scoreAiTells({ title, content: stripTags(content), lang });
  return Math.max(0, Math.min(100, 100 - score));
}

// ── Desk 1 — English draft ──────────────────────────────────────────────────
async function draftEnglish(sourceTitle: string, sourceContent: string, editor: EditorKey, wordTarget: number): Promise<{ draft: Draft | null; ms: number; usd: number }> {
  const t0 = Date.now();
  const user = [
    `SOURCE HEADLINE: ${sourceTitle}`, ``, `SOURCE MATERIAL:`, sourceContent.slice(0, 16000),
  ].join('\n');
  const { text, error, usd } = await callClaude({
    systemInstruction: draftSystemPrompt(editor, wordTarget),
    userMessage: user, model: CLAUDE_SONNET, temperature: 0.7, maxTokens: 4096, jsonMode: true, fn: 'desk1-draft',
  });
  if (error) return { draft: null, ms: Date.now() - t0, usd: 0 };
  const j = parseAiJson<Record<string, unknown>>(text);
  if (!j.title || !j.body_html) return { draft: null, ms: Date.now() - t0, usd: usd || 0 };
  const draft: Draft = {
    title: String(j.title || ''),
    excerpt: String(j.excerpt || ''),
    summary: String(j.summary || ''),
    body_html: String(j.body_html || ''),
    tags: Array.isArray(j.tags) ? (j.tags as unknown[]).map(String).slice(0, 6) : [],
    seo_title: String(j.seo_title || j.title || ''),
    seo_description: String(j.seo_description || j.excerpt || ''),
    subcategory: String(j.subcategory || ''),
    district: String(j.district || ''),
  };
  return { draft, ms: Date.now() - t0, usd: usd || 0 };
}

// ── Desk 2b — fan out EN → EL/RO/AR/DE/PL/RU ─────────────────────────────────
async function buildAllLanguages(draft: Draft): Promise<{ langs: Record<Locale, LangBundle>; flags: Record<string, boolean> }> {
  const flags: Record<string, boolean> = {};
  const en: LangBundle = {
    title: humanizeText(draft.title, 'en'),
    excerpt: humanizeText(draft.excerpt, 'en'),
    summary: humanizeText(draft.summary, 'en'),
    body_html: humanizeHtml(draft.body_html, 'en'),
    seo_title: humanizeText(draft.seo_title, 'en'),
    seo_description: humanizeText(draft.seo_description, 'en'),
    tags: draft.tags.map((t) => t.toLowerCase()),
  };
  // Every non-English edition starts as the English bundle (fallback) and is then
  // overwritten by its translation below; a failed translation keeps the English
  // fallback. All seven keys are present so the map stays exhaustive.
  const langs: Record<Locale, LangBundle> = { en, el: en, ro: en, ar: en, de: en, pl: en, ru: en };

  await Promise.all(TRANSLATE_TO.map(async (target) => {
    const [bodyRes, bundle] = await Promise.all([
      translateHtml(draft.body_html, 'en', target),
      translateBundle({
        title: draft.title, excerpt: draft.excerpt, summary: draft.summary,
        seo_title: draft.seo_title, seo_description: draft.seo_description,
        tags: draft.tags.join(', '),
      }, 'en', target),
    ]);
    if (LOG_LANGS.includes(target)) flags[`desk2b_${target}_ok`] = !!bodyRes.ok;
    langs[target] = {
      title: bundle.title || en.title,
      excerpt: bundle.excerpt || en.excerpt,
      summary: bundle.summary || en.summary,
      body_html: bodyRes.ok && bodyRes.html ? bodyRes.html : en.body_html,
      seo_title: bundle.seo_title || en.seo_title,
      seo_description: bundle.seo_description || en.seo_description,
      tags: (bundle.tags || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
    };
    // Inflected editions (el/ar/de/pl/ru) get a targeted AI proofread pass
    // (self-gates by tell score) to catch AI-tells the deterministic net can't.
    // EN/RO have full deterministic coverage and skip it.
    if (AI_PROOFREAD_LANGS.includes(target as Lang)) {
      const pr = await proofread({ text: langs[target].body_html, lang: target as Lang, isHtml: true, title: langs[target].title });
      langs[target].body_html = pr.text;
      if (LOG_LANGS.includes(target)) flags[`${target}_polished`] = pr.changed;
    }
  }));
  return { langs, flags };
}

async function authorIdFor(sb: SupabaseClient, editor: EditorKey): Promise<string | null> {
  const { data } = await sb.from('authors').select('id').eq('slug', AUTHOR_SLUG[editor]).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

const CI = (v: string) => v || null;

// ── Commit: write blog_posts + scraped writeback via the RPC ────────────────
export interface CommitOpts {
  scrapedId: string; editor: EditorKey; category: string; county: string | null;
  coverImage: string | null; coverCredit?: string | null; sourceUrl: string | null;
  autoPublish: boolean; subcategory?: string;
}
async function commit(sb: SupabaseClient, langs: Record<Locale, LangBundle>, opts: CommitOpts): Promise<string> {
  const authorId = await authorIdFor(sb, opts.editor);
  const slug = uniqueSlug(langs.en.title);
  const wc = wordCount(langs.en.body_html);

  // Per-edition columns for ALL seven editions (en·el·ro·ar·de·pl·ru). The commit
  // RPC (0032_commit_seven_langs) already reads every *_de/_pl/_ru key; building
  // them from LOCALES here is what actually persists the German/Polish/Russian
  // editions instead of leaving them NULL to fall back to English at render.
  const blogLangCols: Record<string, unknown> = {};
  const writebackLangCols: Record<string, unknown> = {};
  for (const l of LOCALES) {
    const b = langs[l];
    blogLangCols[`title_${l}`] = b.title;
    blogLangCols[`content_${l}`] = b.body_html;
    blogLangCols[`excerpt_${l}`] = b.excerpt;
    blogLangCols[`summary_${l}`] = b.summary;
    blogLangCols[`tags_${l}`] = b.tags;
    blogLangCols[`seo_title_${l}`] = b.seo_title;
    blogLangCols[`seo_description_${l}`] = b.seo_description;

    writebackLangCols[`rewritten_${l}`] = CI(b.body_html);
    writebackLangCols[`title_${l}`] = b.title;
    writebackLangCols[`excerpt_${l}`] = b.excerpt;
    writebackLangCols[`summary_${l}`] = b.summary;
    writebackLangCols[`rewrite_tags_${l}`] = b.tags;
    writebackLangCols[`seo_title_${l}`] = b.seo_title;
    writebackLangCols[`seo_description_${l}`] = b.seo_description;
  }

  const p_blog_payload: Record<string, unknown> = {
    ...blogLangCols,
    slug, category: opts.category, subcategory: opts.subcategory || null, county: opts.county,
    cover_image: opts.coverImage, source_url: opts.sourceUrl, scraped_article_id: opts.scrapedId,
    ai_editor: opts.editor, author_name: AUTHOR_NAME[opts.editor], author_id: authorId,
    word_count: String(wc),
    status: opts.autoPublish ? 'published' : 'draft',
    published_at: opts.autoPublish ? new Date().toISOString() : '',
  };
  const p_writeback: Record<string, unknown> = {
    assigned_editor: opts.editor,
    ...writebackLangCols,
    category: opts.category, subcategory: opts.subcategory || null, cover_image: opts.coverImage,
    output_word_count: String(wc),
  };

  const { data, error } = await sb.rpc('commit_scraper_blog_post', {
    p_blog_payload, p_scraped_id: opts.scrapedId, p_writeback,
  });
  if (error) throw new Error(`commit_scraper_blog_post: ${error.message}`);
  return data as string;
}

// ── Main entry: process one scraped article into a 7-language draft post ─────
export interface ScrapedRow {
  id: string; original_title: string | null; original_content: string | null;
  original_content_full: string | null; category: string | null; county: string | null;
  original_url: string | null; cover_image: string | null;
}
export async function processScrapedArticle(sb: SupabaseClient, scraped: ScrapedRow, autoPublish: boolean): Promise<{ ok: boolean; postId?: string; error?: string }> {
  const t0 = Date.now();
  const editor = editorForCategory(scraped.category);
  const source = (scraped.original_content_full || scraped.original_content || '').trim();
  const sourceTitle = (scraped.original_title || '').trim();
  const wordTarget = 700;

  const log: Record<string, unknown> = {
    brief_excerpt: sourceTitle.slice(0, 200), article_type: 'rewrite', category: scraped.category,
    word_count_req: wordTarget, editor,
  };

  if (source.split(/\s+/).filter(Boolean).length < 60) {
    await sb.from('generation_logs').insert({ ...log, status: 'error', error_stage: 'source', error_msg: 'source too short' });
    return { ok: false, error: 'source too short' };
  }

  const d = await draftEnglish(sourceTitle, source, editor, wordTarget);
  log.desk1_ok = !!d.draft; log.desk1_ms = d.ms;
  if (!d.draft) {
    await sb.from('generation_logs').insert({ ...log, status: 'error', error_stage: 'desk1', error_msg: 'draft failed' });
    return { ok: false, error: 'draft failed' };
  }

  const t2 = Date.now();
  const { langs, flags } = await buildAllLanguages(d.draft);
  Object.assign(log, flags, { desk2b_ms: Date.now() - t2, desk2b_en_ok: true });

  // cover image if the source didn't carry one
  let cover = scraped.cover_image || null;
  let credit: string | null = null;
  if (!cover) {
    const found = await findCover(`${d.draft.title} Cyprus`);
    if (found) { cover = found.url; credit = found.credit; }
  }

  // word count + humanness per edition (observability). Limited to LOG_LANGS
  // because generation_logs only has columns for those four editions.
  for (const l of LOG_LANGS) log[`words_${l}`] = wordCount(langs[l].body_html);
  for (const l of LOG_LANGS) log[`${l}_humanness`] = humanness(langs[l].title, langs[l].body_html, l as Lang);

  try {
    const county = ['nicosia', 'limassol', 'larnaca', 'famagusta', 'paphos', 'kyrenia'].includes(d.draft.district) ? d.draft.district : scraped.county;
    const postId = await commit(sb, langs, {
      scrapedId: scraped.id, editor, category: scraped.category || editor, county,
      coverImage: cover, coverCredit: credit, sourceUrl: scraped.original_url,
      autoPublish, subcategory: d.draft.subcategory,
    });
    await sb.from('generation_logs').insert({ ...log, status: 'ok', total_ms: Date.now() - t0 });
    return { ok: true, postId };
  } catch (e) {
    await sb.from('generation_logs').insert({ ...log, status: 'error', error_stage: 'commit', error_msg: (e as Error).message, total_ms: Date.now() - t0 });
    return { ok: false, error: (e as Error).message };
  }
}
