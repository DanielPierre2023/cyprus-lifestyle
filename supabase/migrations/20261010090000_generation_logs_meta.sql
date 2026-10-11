-- generation_logs.meta: the structured record of one desk run (type, complexity, per-language style score, originality, fact-check outcome,
-- passes, timings, number of model calls and cost). The table only has per-language columns for EN, EL, RO and AR; everything else of a run
-- (including German, Polish and Russian) goes into this column. Nothing reads it yet; it is the data the planned corpus monitor will use.
-- Safe to run twice. The edge function process-scraped-article works with or without the column: where it is missing the row is written
-- without it.
alter table public.generation_logs add column if not exists meta jsonb;
comment on column public.generation_logs.meta is 'Structured record of one desk run: gate, per-language style/overlap/fact-check, passes, timings, calls, cost.';
