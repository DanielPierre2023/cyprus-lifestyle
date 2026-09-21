-- 0073_concierge_request_tier.sql
-- Tier the concierge queue. Every incoming request is now auto-classified premium
-- vs standard by the request pipeline (lib/concierge/brain.ts → classifyRequest),
-- so the private-client desk can triage the high-end / glamour tier separately and
-- always connect it to the finest addresses on the island. Additive & idempotent.

alter table public.concierge_requests
  add column if not exists tier text not null default 'standard';

-- Keep it to the two tiers the pipeline emits (future tiers can relax this).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'concierge_requests_tier_check'
  ) then
    alter table public.concierge_requests
      add constraint concierge_requests_tier_check check (tier in ('premium', 'standard'));
  end if;
end $$;

-- Fast triage of the premium queue in the admin inbox.
create index if not exists concierge_requests_tier_idx
  on public.concierge_requests (tier, created_at desc);

-- report
select tier, count(*) from public.concierge_requests group by tier order by 2 desc;
