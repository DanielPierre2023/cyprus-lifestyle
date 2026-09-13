-- ============================================================================
-- Cyprus Lifestyle — 0007 · Analytics & settings
--   site_analytics · section_views · site_settings
--   get_analytics_data() · get_analytics_data_admin() · update_view_geo()
-- Adjustments vs TT: internal-referrer match → cypruslifestyle domains;
-- Romanian display labels → English (Internal / Other / unknown).
-- ============================================================================

-- ── site_analytics ───────────────────────────────────────────────────────────
create table if not exists public.site_analytics (
  id               uuid primary key default gen_random_uuid(),
  page_path        text not null,
  referrer         text,
  user_agent       text,
  country          text,
  city             text,
  device_type      text,
  browser          text,
  session_duration integer default 0,
  session_id       text,
  visitor_id       text,
  event_type       text default 'pageview',
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  utm_content      text,
  screen_width     integer,
  is_bot           boolean default false,
  created_at       timestamptz not null default now()
);
alter table public.site_analytics enable row level security;
drop policy if exists "Anyone can insert analytics" on public.site_analytics;
create policy "Anyone can insert analytics" on public.site_analytics for insert to anon, authenticated with check (true);
drop policy if exists "Admins read analytics" on public.site_analytics;
create policy "Admins read analytics"       on public.site_analytics for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ── section_views ────────────────────────────────────────────────────────────
create table if not exists public.section_views (
  id            uuid primary key default gen_random_uuid(),
  page_path     text not null,
  section_id    text not null,
  view_duration integer default 0,
  created_at    timestamptz not null default now()
);
alter table public.section_views enable row level security;
drop policy if exists "Anyone can insert section views" on public.section_views;
create policy "Anyone can insert section views" on public.section_views for insert to anon, authenticated with check (true);
drop policy if exists "Admins read section views" on public.section_views;
create policy "Admins read section views"       on public.section_views for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ── site_settings ────────────────────────────────────────────────────────────
create table if not exists public.site_settings (
  id         uuid primary key default gen_random_uuid(),
  key        text unique not null,
  value      jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "Public can read settings" on public.site_settings;
create policy "Public can read settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "Admins manage settings" on public.site_settings;
create policy "Admins manage settings"   on public.site_settings for all to authenticated using (public.has_role(auth.uid(), 'admin'));

drop trigger if exists set_updated_at on public.site_settings;
create trigger set_updated_at before update on public.site_settings
  for each row execute function public.update_updated_at();

-- ── update_view_geo ──────────────────────────────────────────────────────────
-- Verbatim from TT.
create or replace function public.update_view_geo(p_slug text, p_country text default null, p_city text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update site_analytics
     set country = p_country, city = p_city
   where id = (
     select id from site_analytics
      where page_path like '%' || p_slug || '%'
        and country is null
        and created_at > now() - interval '2 minutes'
      order by created_at desc
      limit 1
   );
end;
$$;

-- ── get_analytics_data ───────────────────────────────────────────────────────
-- Ported from TT. Adjustments: internal domain match + English display labels.
create or replace function public.get_analytics_data(p_period text default '7d')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
  period_interval interval;
  now_ts timestamptz := now();
begin
  period_interval := case p_period
    when '24h' then interval '24 hours'
    when '7d'  then interval '7 days'
    when '30d' then interval '30 days'
    else interval '7 days'
  end;

  with
  period_rows as (
    select * from site_analytics
    where created_at > now_ts - period_interval
      and (is_bot is null or is_bot = false)
      and page_path not like '/admin%'
  ),
  all_rows as (
    select * from site_analytics
    where created_at > now_ts - interval '30 days'
      and (is_bot is null or is_bot = false)
      and page_path not like '/admin%'
  ),
  overview as (
    select jsonb_build_object(
      'views_24h',    count(*) filter (where created_at > now_ts - interval '24 hours'),
      'visitors_24h', count(distinct visitor_id) filter (where created_at > now_ts - interval '24 hours'),
      'views_7d',     count(*) filter (where created_at > now_ts - interval '7 days'),
      'visitors_7d',  count(distinct visitor_id) filter (where created_at > now_ts - interval '7 days'),
      'views_30d',    count(*),
      'visitors_30d', count(distinct visitor_id),
      'live_5min',    count(distinct visitor_id) filter (where created_at > now_ts - interval '5 minutes')
    ) as data
    from all_rows
  ),
  top_pages as (
    select jsonb_agg(row_obj order by cnt desc) as data
    from (
      select jsonb_build_object('label', page_path, 'value', count(*)::int,
                                'extra', count(distinct visitor_id)::int) as row_obj, count(*) as cnt
      from period_rows group by page_path order by cnt desc limit 15
    ) sub
  ),
  traffic_sources as (
    select jsonb_agg(row_obj order by cnt desc) as data
    from (
      select jsonb_build_object('label', case
          when referrer is null or lower(trim(referrer)) = '' or lower(trim(referrer)) = 'direct' then 'Direct'
          when lower(referrer) like '%facebook%' or lower(referrer) like '%fb.com%' or lower(referrer) like '%fbclid%' then 'Facebook'
          when lower(referrer) like '%news.google%' then 'Google News'
          when lower(referrer) like '%google%' then 'Google Search'
          when lower(referrer) like '%t.co%' or lower(referrer) like '%twitter%' or lower(referrer) like '%x.com%' then 'Twitter / X'
          when lower(referrer) like '%linkedin%' or lower(referrer) like '%lnkd.in%' then 'LinkedIn'
          when lower(referrer) like '%instagram%' then 'Instagram'
          when lower(referrer) like '%whatsapp%' or lower(referrer) like '%wa.me%' then 'WhatsApp'
          when lower(referrer) like '%reddit%' then 'Reddit'
          when lower(referrer) like '%bing%' then 'Bing'
          when lower(referrer) like '%yahoo%' then 'Yahoo'
          when lower(referrer) like '%duckduckgo%' then 'DuckDuckGo'
          when lower(referrer) like '%cypruslifestyle%' or lower(referrer) like '%cyprus-lifestyle%' then 'Internal'
          else 'Other'
        end, 'value', count(*)::int) as row_obj, count(*) as cnt
      from period_rows
      group by case
          when referrer is null or lower(trim(referrer)) = '' or lower(trim(referrer)) = 'direct' then 'Direct'
          when lower(referrer) like '%facebook%' or lower(referrer) like '%fb.com%' or lower(referrer) like '%fbclid%' then 'Facebook'
          when lower(referrer) like '%news.google%' then 'Google News'
          when lower(referrer) like '%google%' then 'Google Search'
          when lower(referrer) like '%t.co%' or lower(referrer) like '%twitter%' or lower(referrer) like '%x.com%' then 'Twitter / X'
          when lower(referrer) like '%linkedin%' or lower(referrer) like '%lnkd.in%' then 'LinkedIn'
          when lower(referrer) like '%instagram%' then 'Instagram'
          when lower(referrer) like '%whatsapp%' or lower(referrer) like '%wa.me%' then 'WhatsApp'
          when lower(referrer) like '%reddit%' then 'Reddit'
          when lower(referrer) like '%bing%' then 'Bing'
          when lower(referrer) like '%yahoo%' then 'Yahoo'
          when lower(referrer) like '%duckduckgo%' then 'DuckDuckGo'
          when lower(referrer) like '%cypruslifestyle%' or lower(referrer) like '%cyprus-lifestyle%' then 'Internal'
          else 'Other'
        end
      order by cnt desc
    ) sub
  ),
  top_countries as (
    select jsonb_agg(row_obj order by cnt desc) as data
    from (
      select jsonb_build_object('label', coalesce(country, 'unknown'), 'value', count(*)::int) as row_obj, count(*) as cnt
      from period_rows where country is not null group by country order by cnt desc limit 15
    ) sub
  ),
  top_cities as (
    select jsonb_agg(row_obj order by cnt desc) as data
    from (
      select jsonb_build_object('label', coalesce(city, 'unknown'), 'value', count(*)::int) as row_obj, count(*) as cnt
      from period_rows where city is not null group by city order by cnt desc limit 15
    ) sub
  ),
  device_breakdown as (
    select jsonb_agg(row_obj order by cnt desc) as data
    from (
      select jsonb_build_object('label', coalesce(device_type, 'unknown'), 'value', count(*)::int) as row_obj, count(*) as cnt
      from period_rows where device_type is not null group by device_type order by cnt desc
    ) sub
  ),
  browser_breakdown as (
    select jsonb_agg(row_obj order by cnt desc) as data
    from (
      select jsonb_build_object('label', coalesce(browser, 'unknown'), 'value', count(*)::int) as row_obj, count(*) as cnt
      from period_rows where browser is not null group by browser order by cnt desc limit 10
    ) sub
  ),
  daily_series as (
    select jsonb_agg(jsonb_build_object('day', d::text, 'views', coalesce(v.views,0), 'uniques', coalesce(v.uniques,0)) order by d) as data
    from generate_series((now_ts - period_interval)::date, now_ts::date, '1 day') as d
    left join (
      select created_at::date as day, count(*)::int as views, count(distinct visitor_id)::int as uniques
      from period_rows group by created_at::date
    ) v on v.day = d
  ),
  fb_organic as (
    select jsonb_build_object(
      'facebook', count(*) filter (where lower(coalesce(referrer,'')) like '%facebook%' or lower(coalesce(referrer,'')) like '%fb.com%' or lower(coalesce(referrer,'')) like '%fbclid%'),
      'google',   count(*) filter (where (lower(coalesce(referrer,'')) like '%google%' and lower(coalesce(referrer,'')) not like '%news.google%') or lower(coalesce(referrer,'')) like '%news.google%'),
      'direct',   count(*) filter (where referrer is null or lower(trim(referrer)) = '' or lower(trim(referrer)) = 'direct'),
      'other',    count(*) filter (where referrer is not null and lower(trim(referrer)) != '' and lower(trim(referrer)) != 'direct'
                    and lower(referrer) not like '%facebook%' and lower(referrer) not like '%fb.com%' and lower(referrer) not like '%fbclid%'
                    and lower(referrer) not like '%google%')
    ) as data
    from period_rows
  )
  select jsonb_build_object(
    'overview',  (select data from overview),
    'pages',     coalesce((select data from top_pages), '[]'::jsonb),
    'sources',   coalesce((select data from traffic_sources), '[]'::jsonb),
    'countries', coalesce((select data from top_countries), '[]'::jsonb),
    'cities',    coalesce((select data from top_cities), '[]'::jsonb),
    'devices',   coalesce((select data from device_breakdown), '[]'::jsonb),
    'browsers',  coalesce((select data from browser_breakdown), '[]'::jsonb),
    'daily',     coalesce((select data from daily_series), '[]'::jsonb),
    'fb_organic', (select data from fb_organic)
  ) into result;

  return result;
end;
$$;

-- Admin-guarded wrapper — verbatim from TT.
create or replace function public.get_analytics_data_admin(p_period text default '7d')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return public.get_analytics_data(p_period);
end;
$$;
