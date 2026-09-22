#!/usr/bin/env node
// scripts/seed/gen-articles-sql.mjs — roadmap item 16. Turns articles.data.mjs into
// per-batch migrations (one idempotent UPSERT per article, on conflict (slug) do
// update), so re-running a migration never duplicates and edits to the data re-apply.
// Each article carries a `batch` number; each batch is written to its own migration
// file (see BATCH_FILES) so an already-applied batch is never rewritten by a new one.
//   node scripts/seed/gen-articles-sql.mjs        # regenerate every batch
//   node scripts/seed/gen-articles-sql.mjs 2      # regenerate only batch 2
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTICLES, LOCALES } from './articles.data.mjs';
import { dq, arr, wordCount } from './sql-util.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BATCH_FILES = {
  1: 'supabase/migrations/0100_seed_articles.sql',
  2: 'supabase/migrations/0101_seed_articles_batch2.sql',
};

function columnsAndValues(a) {
  const cols = ['slug', 'status', 'category', 'author_name', 'reading_time_min', 'word_count', 'published_at', 'source_url', 'sources', 'tags'];
  const vals = [
    dq(a.slug),
    dq('published'),
    dq(a.category),
    dq(a.author_name),
    String(a.reading_time_min || 0),
    String(wordCount(a.content.en)),
    'now()',
    a.source_url ? dq(a.source_url) : 'null',
    arr(a.sources),
    arr(a.tags.en), // generic tags mirror the English set
  ];
  for (const l of LOCALES) {
    for (const field of ['title', 'excerpt', 'summary', 'seo_title', 'seo_description', 'content']) {
      cols.push(`${field}_${l}`);
      vals.push(dq(a[field][l]));
    }
    cols.push(`tags_${l}`);
    vals.push(arr(a.tags[l]));
  }
  return { cols, vals };
}

function upsert(a) {
  const { cols, vals } = columnsAndValues(a);
  // Update every column except the conflict key + created_at; bump updated_at.
  const setCols = cols.filter((c) => c !== 'slug');
  const set = setCols.map((c) => `  ${c} = excluded.${c}`).concat('  updated_at = now()').join(',\n');
  return `insert into public.blog_posts (\n  ${cols.join(', ')}\n) values (\n  ${vals.join(',\n  ')}\n)\non conflict (slug) do update set\n${set};\n`;
}

function fileHeader(batch, path) {
  return `-- ${path.split('/').pop()}
-- Roadmap item 16: bulk multilingual content sprint — batch ${batch}.
-- GENERATED from scripts/seed/articles.data.mjs by scripts/seed/gen-articles-sql.mjs.
-- Do not edit by hand; edit the data file and regenerate. Each article is UPSERTed on
-- its slug, so this migration is idempotent (re-running updates in place, never
-- duplicates) and edits to the source re-apply. All seven languages are populated so
-- no locale falls back to English. Additive.

`;
}

function reportBlock(list) {
  const slugs = list.map((a) => `'${a.slug}'`).join(', ');
  return `\n-- report
select 'seed_articles' as check,
       (select count(*) from public.blog_posts where slug in (${slugs})) as articles,
       (select count(*) from public.blog_posts
          where slug in (${slugs})
            and content_en is not null and content_el is not null and content_ro is not null
            and content_ar is not null and content_de is not null and content_pl is not null
            and content_ru is not null) as all_seven_langs;
`;
}

const only = process.argv[2] ? Number(process.argv[2]) : null;
const batches = [...new Set(ARTICLES.map((a) => a.batch || 1))].sort((x, y) => x - y);
for (const batch of batches) {
  if (only && batch !== only) continue;
  const path = BATCH_FILES[batch];
  if (!path) { console.error(`no output file mapped for batch ${batch}`); process.exit(1); }
  const list = ARTICLES.filter((a) => (a.batch || 1) === batch);
  const body = list.map(upsert).join('\n');
  writeFileSync(join(root, path), fileHeader(batch, path) + body + reportBlock(list));
  console.log(`wrote ${path} (batch ${batch}: ${list.length} article(s), ${LOCALES.length} languages each)`);
}
