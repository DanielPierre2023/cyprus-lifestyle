// Cyprus Lifestyle — RSS scraper (Node port of TT tt-scrape-rss v7).
// Fetches each feed, extracts real prose (stripping CSS/JS/markup soup),
// de-dupes against scraped_articles.original_url, and inserts new items with the
// source's routing metadata (category, county, scope, source_type, region, tier).
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

const FETCH_TIMEOUT_MS = 20000;
const ARTICLE_TIMEOUT_MS = 15000;
const UA = 'Mozilla/5.0 (compatible; CyprusLifestyle/1.0; +https://cypruslifestyle.com)';

function extractText(xml: string, tag: string): string {
  const cdata = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'));
  if (cdata) return cdata[1].trim();
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

function stripNonProse(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<template[\s\S]*?<\/template>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');
}

function stripHtml(html: string): string {
  return stripNonProse(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/@[a-z-]+[^{]*\{[\s\S]*?\}/gi, ' ')
    .replace(/[.#][a-zA-Z][\w-]*(?:\s*,\s*[.#][\w-]+)*\s*\{[^}]*\}/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/\s+/g, ' ').trim();
}

function looksLikeProse(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 40) return false;
  const avg = words.reduce((a, w) => a + w.length, 0) / words.length;
  return avg <= 12;
}

async function fetchFullArticle(url: string): Promise<{ body: string; wordCount: number }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(ARTICLE_TIMEOUT_MS),
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    });
    if (!res.ok) return { body: '', wordCount: 0 };
    const html = stripNonProse(await res.text());
    let content = '';

    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) content = articleMatch[1];

    if (!content || stripHtml(content).split(/\s+/).length < 100) {
      const selectors = [
        /<div[^>]*class="[^"]*(?:article-body|post-content|entry-content|article-content|story-body|article__body|td-post-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*id="[^"]*(?:article-body|post-content|entry-content|article-content|story-body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<main[^>]*>([\s\S]*?)<\/main>/i,
      ];
      for (const sel of selectors) {
        const m = html.match(sel);
        if (m && stripHtml(m[1]).split(/\s+/).length > 100) { content = m[1]; break; }
      }
    }

    if (!content || stripHtml(content).split(/\s+/).length < 100 || !looksLikeProse(stripHtml(content))) {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        const paragraphs = bodyMatch[1].match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
        const meaningful = paragraphs.map((p) => stripHtml(p)).filter((p) => p.split(/\s+/).length > 8);
        const joined = meaningful.join('\n\n');
        if (joined.split(/\s+/).length > 60) content = joined;
      }
    }

    if (!content) return { body: '', wordCount: 0 };
    const cleaned = /<[a-z]/i.test(content) ? stripHtml(content) : content.replace(/\s+/g, ' ').trim();
    if (!looksLikeProse(cleaned)) return { body: '', wordCount: 0 };
    return { body: cleaned.slice(0, 25000), wordCount: cleaned.split(/\s+/).filter(Boolean).length };
  } catch {
    return { body: '', wordCount: 0 };
  }
}

export interface FeedItem { title: string; url: string; contentSnippet: string; contentFull: string; sourceWordCount: number }

export async function fetchFeed(feedUrl: string, limit: number): Promise<FeedItem[]> {
  try {
    const res = await fetch(feedUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { 'User-Agent': UA } });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: FeedItem[] = [];
    const itemRegex = /<(item|entry)[\s>]([\s\S]*?)<\/\1>/gi;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
      const block = match[2];
      const title = stripHtml(extractText(block, 'title'));
      const link = block.match(/<link[^>]*href="([^"]+)"/)?.[1] || extractText(block, 'link');
      const rawContent = extractText(block, 'content:encoded') || extractText(block, 'description')
        || extractText(block, 'summary') || extractText(block, 'content');
      const snippet = stripHtml(rawContent);
      if (title && link) {
        const { body: fullBody, wordCount } = await fetchFullArticle(link);
        const full = fullBody || snippet.slice(0, 25000);
        items.push({
          title, url: link,
          contentSnippet: snippet.slice(0, 8000),
          contentFull: full,
          sourceWordCount: wordCount || snippet.split(/\s+/).filter(Boolean).length,
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

export interface SourceRow {
  id: string; name: string; url: string; category: string | null; source_language: string | null;
  county: string | null; scope: string | null; source_type: string | null; target_category: string | null;
  region: string | null; tier: string | null; output_limit: number | null;
}
export interface IngestResult {
  sourceId: string; sourceName: string; fetched: number; inserted: number;
  skipped_duplicates: number; errors: number; error_message?: string;
}

export async function ingestSource(supabase: SupabaseClient, source: SourceRow): Promise<IngestResult> {
  const result: IngestResult = { sourceId: source.id, sourceName: source.name, fetched: 0, inserted: 0, skipped_duplicates: 0, errors: 0 };
  const limit = Math.max(1, Math.min(50, source.output_limit ?? 10));
  const items = await fetchFeed(source.url, limit);
  result.fetched = items.length;

  if (items.length === 0) {
    result.error_message = 'No items fetched from feed';
    await supabase.from('rss_sources').update({ last_scraped_at: new Date().toISOString(), error_count: 1, error_message: 'Empty feed or fetch error' }).eq('id', source.id);
    return result;
  }

  const urls = items.map((i) => i.url);
  const { data: existing } = await supabase.from('scraped_articles').select('original_url').in('original_url', urls);
  const existingSet = new Set((existing || []).map((r) => (r as { original_url: string }).original_url));

  for (const item of items) {
    if (existingSet.has(item.url)) { result.skipped_duplicates++; continue; }
    const { error } = await supabase.from('scraped_articles').insert({
      source_id: source.id,
      original_title: item.title,
      original_url: item.url,
      original_content: item.contentSnippet,
      original_content_full: item.contentFull,
      source_word_count: item.sourceWordCount,
      status: 'scraped',
      category: source.target_category || source.category,
      county: source.county,
      scope: source.scope,
      source_type: source.source_type,
      target_category: source.target_category,
      is_used: false,
      marked_for_deletion: false,
    });
    if (error) {
      if (error.code === '23505') result.skipped_duplicates++;
      else { result.errors++; console.error(`[scraper] insert error for ${item.url}: ${error.message}`); }
    } else result.inserted++;
  }

  await supabase.from('rss_sources').update({
    last_scraped_at: new Date().toISOString(),
    error_count: result.errors > 0 ? result.errors : 0,
    error_message: result.errors > 0 ? `${result.errors} insert errors` : null,
  }).eq('id', source.id);

  return result;
}

const SRC_COLS = 'id, name, url, category, source_language, county, scope, source_type, target_category, region, tier, output_limit';

// Batch over active sources. Used by the cron and the admin "Scrape all" button.
export async function scrapeAllActive(supabase: SupabaseClient) {
  const { data: sources } = await supabase.from('rss_sources').select(SRC_COLS).eq('is_active', true).order('name');
  const list = (sources || []) as SourceRow[];
  const results: IngestResult[] = [];
  let totalInserted = 0, totalDuplicates = 0;
  for (const s of list) {
    const r = await ingestSource(supabase, s);
    results.push(r); totalInserted += r.inserted; totalDuplicates += r.skipped_duplicates;
  }
  return { sources_processed: list.length, total_scraped: totalInserted, total_duplicates_skipped: totalDuplicates, results };
}

export async function scrapeOne(supabase: SupabaseClient, sourceId: string) {
  const { data: src, error } = await supabase.from('rss_sources').select(SRC_COLS).eq('id', sourceId).single();
  if (error || !src) return null;
  return ingestSource(supabase, src as SourceRow);
}
