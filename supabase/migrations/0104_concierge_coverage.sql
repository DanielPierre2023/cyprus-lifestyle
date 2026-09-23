-- 0104_concierge_coverage.sql
-- The concierge COVERAGE baseline. The live evals (0097) score answer quality but cost
-- model calls; this stores the cheap, retrieval-only breadth probe (lib/concierge/
-- coverage.ts): across every topic the concierge should know — investing, law, dining,
-- museums, theatre, archaeology, weather, diving, boats, yachts, jewellery, fashion,
-- nightlife, prices, culture, the current feel of Cyprus — in all seven languages,
-- did the directory / knowledge base / articles actually return anything, graded
-- blind | thin | ok | strong. This is the baseline the whole "make him smart"
-- programme is measured against. Additive & idempotent. No model cost to produce.

create table if not exists public.concierge_coverage (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  run_id        text not null,            -- groups one probe run
  topic         text not null,            -- COVERAGE_TOPICS.key (e.g. 'fine-dining', 'nightlife')
  locale        text,                     -- en | el | ro | ar | de | pl | ru
  question      text,                     -- synthetic probe (no PII)
  dir_count     integer not null default 0,
  kb_count      integer not null default 0,
  article_count integer not null default 0,
  category      text,                     -- classifyRequest category (routing)
  district      text,                     -- classifyRequest district  (routing)
  category_hit  boolean,                  -- routing landed where expected
  verdict       text                      -- blind | thin | ok | strong
);
create index if not exists concierge_coverage_run_idx     on public.concierge_coverage (run_id, created_at desc);
create index if not exists concierge_coverage_created_idx on public.concierge_coverage (created_at desc);
create index if not exists concierge_coverage_topic_idx   on public.concierge_coverage (topic, verdict);

alter table public.concierge_coverage enable row level security;
drop policy if exists "concierge_coverage admin" on public.concierge_coverage;
create policy "concierge_coverage admin" on public.concierge_coverage for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
-- (written by the server with the service role)

-- Score points per verdict: blind 0, thin 0.34, ok 0.70, strong 1.00 — mirrors
-- lib/concierge/coverage.ts so the SQL headline matches the app's.
create or replace view public.concierge_coverage_summary as
select run_id,
       min(created_at)                                   as run_at,
       count(*)                                          as n,
       count(*) filter (where verdict = 'blind')         as blind,
       count(*) filter (where verdict = 'thin')          as thin,
       count(*) filter (where verdict = 'ok')            as ok,
       count(*) filter (where verdict = 'strong')        as strong,
       round(avg(case verdict when 'strong' then 1.0 when 'ok' then 0.70 when 'thin' then 0.34 else 0 end) * 100, 1) as score,
       round(avg(dir_count), 2)                          as avg_dir,
       round(avg(kb_count), 2)                           as avg_kb,
       round(avg(article_count), 2)                      as avg_article
from public.concierge_coverage
group by run_id
order by min(created_at) desc;

-- Per-run, per-topic breakdown — the worklist (worst topics first) for the next
-- increments: where to grow the KB, where to enrich the directory.
create or replace view public.concierge_coverage_topics as
select run_id,
       topic,
       count(*)                                          as n,
       count(*) filter (where verdict = 'blind')         as blind,
       count(*) filter (where verdict = 'thin')          as thin,
       count(*) filter (where verdict in ('ok','strong'))as covered,
       round(avg(case verdict when 'strong' then 1.0 when 'ok' then 0.70 when 'thin' then 0.34 else 0 end) * 100, 1) as score
from public.concierge_coverage
group by run_id, topic
order by run_id, score asc;

-- report
select 'concierge_coverage' as check,
       (select count(*) from information_schema.tables where table_schema='public' and table_name='concierge_coverage')          as tbl,
       (select count(*) from information_schema.views  where table_schema='public' and table_name='concierge_coverage_summary') as vw_summary,
       (select count(*) from information_schema.views  where table_schema='public' and table_name='concierge_coverage_topics')  as vw_topics;
