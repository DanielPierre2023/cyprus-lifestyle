-- 20261014-50-leptos-vorpruefung.sql
-- ---------------------------------------------------------------------------------------------------------------------
-- Nur lesen. Vorher einmal ausführen: zeigt, ob etwas von Leptos schon in der Datenbank steht (Dubletten) und ob eine neue Zeile mit einer vorhandenen kollidieren würde.
-- Es wird nichts geändert. Die Antwort ist EINE Tabelle:
-- Zeilen „1 …“ und „2 …“ sollten fehlen (= keine Probleme); Zeilen „3 …“ sind vorhandene Leptos-nahe Einträge zum Ansehen.
-- Läuft im Supabase SQL Editor: ganze Datei einfügen, Run. Alles oder nichts (eine Transaktion). Unten steht eine Zahlentabelle.
-- ---------------------------------------------------------------------------------------------------------------------

with target(slug, type, name, lat, lng) as (values
  ('leptos-estates', 'vendor', 'Leptos Estates', 34.757208::double precision, 32.412227::double precision),
  ('armonia-estates-ltd-12525', 'vendor', 'Leptos Estates Nicosia', 35.164723::double precision, 33.365636::double precision),
  ('leptos-estates-limassol', 'vendor', 'Leptos Estates Limassol', 34.709137::double precision, 33.126074::double precision),
  ('leptos-vesta-holidays', 'vendor', 'Vesta Holidays', 34.783786::double precision, 32.408588::double precision),
  ('leptos-chestertons-cyprus', 'vendor', 'Chestertons Cyprus Residential', 34.756076::double precision, 32.416215::double precision),
  ('leptos-resitour-holiday-residences', 'vendor', 'Resitour Holiday Residences', 34.759436::double precision, 32.430833::double precision),
  ('leptos-arena-sports', 'vendor', 'Arena Sports', 34.857098::double precision, 32.362959::double precision),
  ('leptos-estates-adonis-beach-villas', 'development', 'Adonis Beach Villas', 34.79959::double precision, 32.40792::double precision),
  ('leptos-estates-akakia-villas', 'development', 'Akakia Villas', 34.845448::double precision, 32.4359::double precision),
  ('leptos-estates-akamantis-gardens', 'development', 'Akamantis Gardens', 35.03448::double precision, 32.42647::double precision),
  ('leptos-estates-akropolis-275', 'development', 'Akropolis 275', 34.76118::double precision, 32.4527::double precision),
  ('leptos-estates-aphrodite-springs', 'development', 'Aphrodite Springs', 34.76118::double precision, 32.4527::double precision),
  ('leptos-estates-apollo-beach-villas', 'development', 'Apollo Beach Villas', 34.791886::double precision, 32.395745::double precision),
  ('leptos-estates-argaka-beach-villas', 'development', 'Argaka Beach Villas', 35.06524::double precision, 32.49293::double precision),
  ('leptos-estates-armonia-beach-villas', 'development', 'Armonia Beach Villas', 34.82287::double precision, 32.40192::double precision),
  ('leptos-estates-belvedere-villas', 'development', 'Belvedere Villas', 34.79959::double precision, 32.40792::double precision),
  ('leptos-estates-coral-bay-villas', 'development', 'Coral Bay Villas', 34.85528::double precision, 32.37025::double precision),
  ('leptos-estates-coral-gardens', 'development', 'Coral Gardens', 34.85528::double precision, 32.37025::double precision),
  ('leptos-estates-coral-seas-villas', 'development', 'Coral Seas Villas', 34.85528::double precision, 32.37025::double precision),
  ('leptos-estates-eden-beach-apartments', 'development', 'Eden Beach Apartments', 34.680462::double precision, 33.052683::double precision),
  ('leptos-estates-fortuna-court-i', 'development', 'Fortuna Court I', 34.7744::double precision, 32.42316::double precision),
  ('leptos-estates-iasonas-beach-villas', 'development', 'Iasonas Beach Villas', 34.85528::double precision, 32.37025::double precision),
  ('leptos-estates-kamares-village', 'development', 'Kamares Village', 34.845448::double precision, 32.4359::double precision),
  ('leptos-estates-kings-court', 'development', 'Kings Court', 34.7744::double precision, 32.42316::double precision),
  ('leptos-estates-kings-gardens', 'development', 'Kings Gardens', 34.75876::double precision, 32.41008::double precision),
  ('leptos-estates-latchi-beach-villas', 'development', 'Latchi Beach Villas', 35.04081::double precision, 32.39391::double precision),
  ('leptos-estates-limassol-blu-marine', 'development', 'Limassol Blu Marine', 34.68529::double precision, 33.03327::double precision),
  ('leptos-estates-limassol-park', 'development', 'Limassol Park', 34.68529::double precision, 33.03327::double precision),
  ('leptos-estates-limnaria-gardens', 'development', 'Limnaria Gardens', 34.75876::double precision, 32.41008::double precision),
  ('leptos-estates-mandria-gardens', 'development', 'Mandria Gardens', 34.709604::double precision, 32.531762::double precision),
  ('leptos-estates-maniki-beach-villas', 'development', 'Maniki Beach Villas', 34.88351::double precision, 32.38032::double precision),
  ('leptos-estates-neapolis-smart-ecocity', 'development', 'Neapolis Smart EcoCity', 34.749421::double precision, 32.426605::double precision),
  ('leptos-estates-olympus-village', 'development', 'Olympus Village', 34.827769::double precision, 32.470793::double precision),
  ('leptos-estates-paphos-gardens', 'development', 'Paphos Gardens', 34.753236::double precision, 32.424643::double precision),
  ('leptos-estates-paradise-gardens', 'development', 'Paradise Gardens', 34.758574::double precision, 32.425996::double precision),
  ('leptos-estates-perneri-villas', 'development', 'Perneri Villas', 34.83613::double precision, 32.43098::double precision),
  ('leptos-estates-peyia-gardens', 'development', 'Peyia Gardens', 34.88351::double precision, 32.38032::double precision),
  ('leptos-estates-peyia-hills-apartments', 'development', 'Peyia Hills Apartments', 34.88351::double precision, 32.38032::double precision),
  ('leptos-estates-pissouri-villas', 'development', 'Pissouri Villas', 34.6689::double precision, 32.70105::double precision),
  ('leptos-estates-polis-beach-villas', 'development', 'Polis Beach Villas', 35.03448::double precision, 32.42647::double precision),
  ('leptos-estates-regina-gardens', 'development', 'Regina Gardens', 34.75876::double precision, 32.41008::double precision),
  ('leptos-estates-sea-caves-villas', 'development', 'Sea Caves Villas', 34.886389::double precision, 32.332511::double precision),
  ('leptos-estates-venus-gardens-resort', 'development', 'Venus Gardens Resort', 34.79959::double precision, 32.40792::double precision),
  ('leptos-estates-vikla-villas', 'development', 'Vikla Villas', 34.8312::double precision, 32.474336::double precision),
  ('leptos-estates-west-park-court', 'development', 'West Park Court', 34.7744::double precision, 32.42316::double precision),
  ('leptos-estates-zanatzia-plots-villas', 'development', 'Zanatzia Plots & Villas', 34.7744::double precision, 32.42316::double precision),
  ('leptos-estates-zelemenos-village', 'development', 'Zelemenos Village', 34.83613::double precision, 32.43098::double precision)
),
c1 as (
  select '1 Kollision mit der Dubletten-Sperre (muss leer sein)'::text as pruefung, t.slug::text as zeile, o.slug::text as andere_zeile, o.name_en::text as name, o.status::text as status
    from target t
    join public.directory_listings o
      on public.directory_dedup_key(o.type, o.name_en, o.lat, o.lng) = public.directory_dedup_key(t.type, t.name, t.lat, t.lng)
     and o.slug <> t.slug
),
c2 as (
  select '2 Adresse (slug) ist schon vergeben (muss leer sein)'::text, slug::text, ''::text, name_en::text, status::text
    from public.directory_listings where slug in ('leptos-estates-limassol', 'leptos-vesta-holidays', 'leptos-chestertons-cyprus', 'leptos-resitour-holiday-residences', 'leptos-arena-sports', 'leptos-estates-adonis-beach-villas', 'leptos-estates-akakia-villas', 'leptos-estates-akamantis-gardens', 'leptos-estates-akropolis-275', 'leptos-estates-aphrodite-springs', 'leptos-estates-apollo-beach-villas', 'leptos-estates-argaka-beach-villas', 'leptos-estates-armonia-beach-villas', 'leptos-estates-belvedere-villas', 'leptos-estates-coral-bay-villas', 'leptos-estates-coral-gardens', 'leptos-estates-coral-seas-villas', 'leptos-estates-eden-beach-apartments', 'leptos-estates-fortuna-court-i', 'leptos-estates-iasonas-beach-villas', 'leptos-estates-kamares-village', 'leptos-estates-kings-court', 'leptos-estates-kings-gardens', 'leptos-estates-latchi-beach-villas', 'leptos-estates-limassol-blu-marine', 'leptos-estates-limassol-park', 'leptos-estates-limnaria-gardens', 'leptos-estates-mandria-gardens', 'leptos-estates-maniki-beach-villas', 'leptos-estates-neapolis-smart-ecocity', 'leptos-estates-olympus-village', 'leptos-estates-paphos-gardens', 'leptos-estates-paradise-gardens', 'leptos-estates-perneri-villas', 'leptos-estates-peyia-gardens', 'leptos-estates-peyia-hills-apartments', 'leptos-estates-pissouri-villas', 'leptos-estates-polis-beach-villas', 'leptos-estates-regina-gardens', 'leptos-estates-sea-caves-villas', 'leptos-estates-venus-gardens-resort', 'leptos-estates-vikla-villas', 'leptos-estates-west-park-court', 'leptos-estates-zanatzia-plots-villas', 'leptos-estates-zelemenos-village')
),
c3 as (
  select '3 vorhandener Eintrag, der zu Leptos gehören könnte (ansehen)'::text, slug::text, coalesce(url, '')::text, name_en::text, (type || ' / ' || status)::text
    from public.directory_listings
   where name_en ilike any (array['%leptos%','%armonia estates%','%vesta holidays%','%resitour%','%chestertons%','%arena sports%','%arena dmc%','%pandora%','%kamares%','%neapolis%','%iasis%','%coral beach%','%thalassa%','%basilica%','%paphos gardens%','%aphrodite gardens%','%paradise gardens%','%limassol del mar%'])
      or url ilike any (array['%leptos%','%vestaholidays%','%resitour%','%chestertons.com.cy%','%arena-sports%','%pandora.com.cy%','%kamaresvillage%','%coral.com.cy%','%thalassa.com.cy%','%paphosgardens%','%basilicaresort%','%nup.ac.cy%','%iasishospital%'])
      or email ilike any (array['%leptos%','%vestaholidays%','%coral.com.cy%','%thalassa.com.cy%'])
)
select * from c1 union all select * from c2 union all select * from c3
 order by 1, 2;
