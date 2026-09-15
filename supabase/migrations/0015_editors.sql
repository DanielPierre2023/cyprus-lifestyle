-- ============================================================================
-- Named masthead — four editors instead of "The X Desk" bylines. This is an
-- E-E-A-T signal (real people, real beats, author pages already render at
-- /author/<slug>). Run once in the Supabase SQL editor. Safe to re-run.
--
-- IMPORTANT: these are starter profiles. Replace the names/titles/bios with your
-- REAL editorial team (and add avatar_url photos) — Google rewards genuine,
-- verifiable authors and can discount invented ones. Edit here or in the DB.
-- ============================================================================

insert into public.authors (slug, name_en, title_en, bio_en, avatar_style, specialties, active)
values
 ('elena-georgiou', 'Elena Georgiou', 'Editor-in-Chief',
  'Editor-in-Chief of Cyprus Lifestyle. She leads the newsroom and writes on the Republic, its economy and the people shaping the island.',
  'illustrated', array['cyprus','business','society'], true),
 ('andreas-constantinou', 'Andreas Constantinou', 'Property & Business Editor',
  'Covers Cyprus property, development and business — the market, the money and the new architecture of the coast.',
  'illustrated', array['property','business','architecture'], true),
 ('maria-ioannou', 'Maria Ioannou', 'Food & Travel Editor',
  'Writes on where to eat, drink and travel across Cyprus — the Cypriot kitchen, its wines and the island''s best escapes.',
  'illustrated', array['table','escapes','wine'], true),
 ('christiana-pavlou', 'Christiana Pavlou', 'Culture & Society Editor',
  'Follows Cyprus culture and society — art, heritage, music and the social calendar, from ancient Paphos to opening night.',
  'illustrated', array['culture','art','society'], true)
on conflict (slug) do update
  set name_en = excluded.name_en, title_en = excluded.title_en, bio_en = excluded.bio_en,
      specialties = excluded.specialties, active = true;

-- Retire the old desk personas so only the named editors appear.
update public.authors set active = false
where slug in ('cyprus-desk','business-desk','property-desk','culture-desk','escapes-desk','table-desk','world-desk');

-- Reassign existing articles to the matching editor (byline + author page link).
update public.blog_posts p
set author_id = a.id, author_name = a.name_en
from public.authors a
where a.slug = case p.ai_editor
    when 'cyprus'   then 'elena-georgiou'
    when 'world'    then 'elena-georgiou'
    when 'business' then 'andreas-constantinou'
    when 'property' then 'andreas-constantinou'
    when 'culture'  then 'christiana-pavlou'
    when 'escapes'  then 'maria-ioannou'
    when 'table'    then 'maria-ioannou'
    else 'elena-georgiou'
  end;
