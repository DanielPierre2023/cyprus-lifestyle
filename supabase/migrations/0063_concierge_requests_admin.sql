-- 0063_concierge_requests_admin.sql
-- Make concierge requests visible & actionable in the admin panel.
-- concierge_requests had RLS enabled but no policy (server-role only), so nobody
-- could see incoming requests in the UI. This adds admin read + update (to move a
-- request through new → routed → fulfilled → closed) and a couple of helpful
-- columns for the funnel. Additive & idempotent.

alter table public.concierge_requests add column if not exists phone   text;   -- optional phone / WhatsApp the guest leaves
alter table public.concierge_requests add column if not exists category text;   -- best-guess service category (for gap analysis)
alter table public.concierge_requests add column if not exists district text;   -- best-guess district (for gap analysis)
alter table public.concierge_requests add column if not exists handled_by text; -- who on the desk took it
alter table public.concierge_requests add column if not exists handled_at timestamptz;

drop policy if exists "concierge_requests admin read" on public.concierge_requests;
create policy "concierge_requests admin read" on public.concierge_requests
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "concierge_requests admin update" on public.concierge_requests;
create policy "concierge_requests admin update" on public.concierge_requests
  for update to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- report
select status, count(*) from public.concierge_requests group by status order by 2 desc;
