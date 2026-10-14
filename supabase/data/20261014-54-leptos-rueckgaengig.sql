-- 20261014-54-leptos-rueckgaengig.sql
-- ---------------------------------------------------------------------------------------------------------------------
-- NUR BEI BEDARF: nimmt alles zurück, was -52-, -53- und -55- geändert oder angelegt haben.
-- Stellt die vorhandenen Zeilen aus der Sicherung (-51-) wieder her und löscht die neu angelegten.
-- Läuft im Supabase SQL Editor: ganze Datei einfügen, Run. Alles oder nichts (eine Transaktion). Unten steht eine Zahlentabelle.
-- ---------------------------------------------------------------------------------------------------------------------

delete from public.directory_listings where slug in ('leptos-estates-limassol', 'leptos-vesta-holidays', 'leptos-chestertons-cyprus', 'leptos-resitour-holiday-residences', 'leptos-arena-sports', 'leptos-estates-adonis-beach-villas', 'leptos-estates-akakia-villas', 'leptos-estates-akamantis-gardens', 'leptos-estates-akropolis-275', 'leptos-estates-aphrodite-springs', 'leptos-estates-apollo-beach-villas', 'leptos-estates-argaka-beach-villas', 'leptos-estates-armonia-beach-villas', 'leptos-estates-belvedere-villas', 'leptos-estates-coral-bay-villas', 'leptos-estates-coral-gardens', 'leptos-estates-coral-seas-villas', 'leptos-estates-eden-beach-apartments', 'leptos-estates-fortuna-court-i', 'leptos-estates-iasonas-beach-villas', 'leptos-estates-kamares-village', 'leptos-estates-kings-court', 'leptos-estates-kings-gardens', 'leptos-estates-latchi-beach-villas', 'leptos-estates-limassol-blu-marine', 'leptos-estates-limassol-park', 'leptos-estates-limnaria-gardens', 'leptos-estates-mandria-gardens', 'leptos-estates-maniki-beach-villas', 'leptos-estates-neapolis-smart-ecocity', 'leptos-estates-olympus-village', 'leptos-estates-paphos-gardens', 'leptos-estates-paradise-gardens', 'leptos-estates-perneri-villas', 'leptos-estates-peyia-gardens', 'leptos-estates-peyia-hills-apartments', 'leptos-estates-pissouri-villas', 'leptos-estates-polis-beach-villas', 'leptos-estates-regina-gardens', 'leptos-estates-sea-caves-villas', 'leptos-estates-venus-gardens-resort', 'leptos-estates-vikla-villas', 'leptos-estates-west-park-court', 'leptos-estates-zanatzia-plots-villas', 'leptos-estates-zelemenos-village');

update public.directory_listings l set
  type = b.type,
  category_group = b.category_group,
  subtype = b.subtype,
  canonical_category = b.canonical_category,
  district = b.district,
  luxury = b.luxury,
  name_en = b.name_en,
  name_el = b.name_el,
  name_ro = b.name_ro,
  name_ar = b.name_ar,
  name_de = b.name_de,
  name_pl = b.name_pl,
  name_ru = b.name_ru,
  summary_en = b.summary_en,
  summary_el = b.summary_el,
  summary_ro = b.summary_ro,
  summary_ar = b.summary_ar,
  summary_de = b.summary_de,
  summary_pl = b.summary_pl,
  summary_ru = b.summary_ru,
  address = b.address,
  lat = b.lat,
  lng = b.lng,
  coords_precision = b.coords_precision,
  phone = b.phone,
  email = b.email,
  url = b.url,
  image = b.image,
  image_credit = b.image_credit,
  socials = b.socials,
  tags = b.tags,
  developer_slug = b.developer_slug,
  source_url = b.source_url,
  fetched_at = b.fetched_at,
  status = b.status,
  updated_at = now()
  from backup_20261014_leptos.directory_listings b
 where b.id = l.id;

select (select count(*) from public.directory_listings where slug in ('leptos-estates-limassol', 'leptos-vesta-holidays', 'leptos-chestertons-cyprus', 'leptos-resitour-holiday-residences', 'leptos-arena-sports', 'leptos-estates-adonis-beach-villas', 'leptos-estates-akakia-villas', 'leptos-estates-akamantis-gardens', 'leptos-estates-akropolis-275', 'leptos-estates-aphrodite-springs', 'leptos-estates-apollo-beach-villas', 'leptos-estates-argaka-beach-villas', 'leptos-estates-armonia-beach-villas', 'leptos-estates-belvedere-villas', 'leptos-estates-coral-bay-villas', 'leptos-estates-coral-gardens', 'leptos-estates-coral-seas-villas', 'leptos-estates-eden-beach-apartments', 'leptos-estates-fortuna-court-i', 'leptos-estates-iasonas-beach-villas', 'leptos-estates-kamares-village', 'leptos-estates-kings-court', 'leptos-estates-kings-gardens', 'leptos-estates-latchi-beach-villas', 'leptos-estates-limassol-blu-marine', 'leptos-estates-limassol-park', 'leptos-estates-limnaria-gardens', 'leptos-estates-mandria-gardens', 'leptos-estates-maniki-beach-villas', 'leptos-estates-neapolis-smart-ecocity', 'leptos-estates-olympus-village', 'leptos-estates-paphos-gardens', 'leptos-estates-paradise-gardens', 'leptos-estates-perneri-villas', 'leptos-estates-peyia-gardens', 'leptos-estates-peyia-hills-apartments', 'leptos-estates-pissouri-villas', 'leptos-estates-polis-beach-villas', 'leptos-estates-regina-gardens', 'leptos-estates-sea-caves-villas', 'leptos-estates-venus-gardens-resort', 'leptos-estates-vikla-villas', 'leptos-estates-west-park-court', 'leptos-estates-zanatzia-plots-villas', 'leptos-estates-zelemenos-village')) as neue_zeilen_uebrig,
       (select count(*) from backup_20261014_leptos.directory_listings) as gesicherte_zeilen;
