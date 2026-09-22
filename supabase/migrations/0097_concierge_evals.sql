-- 0097_concierge_evals.sql
-- Roadmap item 14: live-model quality evals. The gold suite (item 05) proves retrieval
-- and intent routing offline; this scores the concierge's ACTUAL prose. A curated eval
-- set is answered by the live concierge, then an LLM judge rates each answer on
-- groundedness (no fabrication), language correctness and helpfulness. Results land here
-- so a drop in answer quality is caught, not just a routing regression. On-demand /
-- opt-in (a model cost per run), never auto-run. Additive & idempotent.

create table if not exists public.concierge_evals (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  run_id        text not null,                 -- groups one eval run
  locale        text,
  intent        text,
  question      text,
  answer        text,                          -- the concierge's answer (synthetic Q, no PII)
  grounded_score integer,                      -- 1..5
  language_score integer,                      -- 1..5
  helpful_score  integer,                      -- 1..5
  overall        numeric(4,2),
  verdict        text,                         -- pass | weak | fail
  notes          text,
  model          text
);
create index if not exists concierge_evals_run_idx     on public.concierge_evals (run_id, created_at desc);
create index if not exists concierge_evals_created_idx on public.concierge_evals (created_at desc);
create index if not exists concierge_evals_verdict_idx on public.concierge_evals (verdict, created_at desc);

alter table public.concierge_evals enable row level security;
drop policy if exists "concierge_evals admin" on public.concierge_evals;
create policy "concierge_evals admin" on public.concierge_evals for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
-- (written by the server with the service role)

-- Per-run summary for the admin panel.
create or replace view public.concierge_eval_summary as
select run_id,
       min(created_at)                          as run_at,
       count(*)                                 as n,
       round(avg(grounded_score), 2)            as avg_grounded,
       round(avg(language_score), 2)            as avg_language,
       round(avg(helpful_score), 2)             as avg_helpful,
       round(avg(overall), 2)                   as avg_overall,
       count(*) filter (where verdict = 'fail') as fails,
       count(*) filter (where verdict = 'weak') as weak
from public.concierge_evals
group by run_id
order by min(created_at) desc;

-- report
select 'concierge_evals' as check,
       (select count(*) from information_schema.tables where table_schema='public' and table_name='concierge_evals') as tbl,
       (select count(*) from information_schema.views where table_schema='public' and table_name='concierge_eval_summary') as vw;
