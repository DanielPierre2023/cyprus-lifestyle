-- 20261014-57-leptos-lage-nachtragen.sql
-- ---------------------------------------------------------------------------------------------------------------------
-- VORLAGE für später: genaue Projektpunkte, sobald Leptos sie liefert (Google Maps: Rechtsklick auf die Anlage, oben die Zahlen kopieren).
-- So benutzen: in der Liste unten bei einem Projekt lat und lng ersetzen und aus 'town' oder 'geocoded' das Wort 'exact' machen. Zeilen, die nicht geändert werden, können stehen bleiben (sie schreiben dieselben Werte).
-- Ungeänderte Datei = keine Änderung der Daten. Genaue Punkte werden auf der Karte nicht mehr aufgefächert, wenn sie verschieden sind.
-- Läuft im Supabase SQL Editor: ganze Datei einfügen, Run. Alles oder nichts (eine Transaktion). Unten steht eine Zahlentabelle.
-- ---------------------------------------------------------------------------------------------------------------------

update public.directory_listings l
   set lat = v.lat, lng = v.lng, coords_precision = v.prec, updated_at = now()
  from (values
    ('leptos-estates-adonis-beach-villas', 34.79959::double precision, 32.40792::double precision, 'town'),  -- Adonis Beach Villas, Chloraka
    ('leptos-estates-akakia-villas', 34.845448::double precision, 32.4359::double precision, 'town'),  -- Akakia Villas, Kamares (Tala)
    ('leptos-estates-akamantis-gardens', 35.03448::double precision, 32.42647::double precision, 'town'),  -- Akamantis Gardens, Polis Chrysochous
    ('leptos-estates-akropolis-275', 34.76118::double precision, 32.4527::double precision, 'town'),  -- Akropolis 275, Geroskipou
    ('leptos-estates-aphrodite-springs', 34.76118::double precision, 32.4527::double precision, 'town'),  -- Aphrodite Springs, Geroskipou
    ('leptos-estates-apollo-beach-villas', 34.791886::double precision, 32.395745::double precision, 'geocoded'),  -- Apollo Beach Villas, Chloraka
    ('leptos-estates-argaka-beach-villas', 35.06524::double precision, 32.49293::double precision, 'town'),  -- Argaka Beach Villas, Argaka
    ('leptos-estates-armonia-beach-villas', 34.82287::double precision, 32.40192::double precision, 'town'),  -- Armonia Beach Villas, Kissonerga
    ('leptos-estates-belvedere-villas', 34.79959::double precision, 32.40792::double precision, 'town'),  -- Belvedere Villas, Chloraka
    ('leptos-estates-coral-bay-villas', 34.85528::double precision, 32.37025::double precision, 'town'),  -- Coral Bay Villas, Coral Bay
    ('leptos-estates-coral-gardens', 34.85528::double precision, 32.37025::double precision, 'town'),  -- Coral Gardens, Coral Bay
    ('leptos-estates-coral-seas-villas', 34.85528::double precision, 32.37025::double precision, 'town'),  -- Coral Seas Villas, Coral Bay
    ('leptos-estates-eden-beach-apartments', 34.680462::double precision, 33.052683::double precision, 'geocoded'),  -- Eden Beach Apartments, Limassol
    ('leptos-estates-fortuna-court-i', 34.7744::double precision, 32.42316::double precision, 'town'),  -- Fortuna Court I, Paphos
    ('leptos-estates-iasonas-beach-villas', 34.85528::double precision, 32.37025::double precision, 'town'),  -- Iasonas Beach Villas, Coral Bay
    ('leptos-estates-kamares-village', 34.845448::double precision, 32.4359::double precision, 'town'),  -- Kamares Village, Kamares (Tala)
    ('leptos-estates-kings-court', 34.7744::double precision, 32.42316::double precision, 'town'),  -- Kings Court, Paphos
    ('leptos-estates-kings-gardens', 34.75876::double precision, 32.41008::double precision, 'town'),  -- Kings Gardens, Kato Paphos
    ('leptos-estates-latchi-beach-villas', 35.04081::double precision, 32.39391::double precision, 'town'),  -- Latchi Beach Villas, Latchi
    ('leptos-estates-limassol-blu-marine', 34.68529::double precision, 33.03327::double precision, 'town'),  -- Limassol Blu Marine, Limassol
    ('leptos-estates-limassol-park', 34.68529::double precision, 33.03327::double precision, 'town'),  -- Limassol Park, Limassol
    ('leptos-estates-limnaria-gardens', 34.75876::double precision, 32.41008::double precision, 'town'),  -- Limnaria Gardens, Kato Paphos
    ('leptos-estates-mandria-gardens', 34.709604::double precision, 32.531762::double precision, 'geocoded'),  -- Mandria Gardens, Mandria
    ('leptos-estates-maniki-beach-villas', 34.88351::double precision, 32.38032::double precision, 'town'),  -- Maniki Beach Villas, Peyia
    ('leptos-estates-neapolis-smart-ecocity', 34.749421::double precision, 32.426605::double precision, 'town'),  -- Neapolis Smart EcoCity, Paphos
    ('leptos-estates-olympus-village', 34.827769::double precision, 32.470793::double precision, 'geocoded'),  -- Olympus Village, Tsada
    ('leptos-estates-paphos-gardens', 34.753236::double precision, 32.424643::double precision, 'geocoded'),  -- Paphos Gardens, Kato Paphos
    ('leptos-estates-paradise-gardens', 34.758574::double precision, 32.425996::double precision, 'geocoded'),  -- Paradise Gardens, Kato Paphos
    ('leptos-estates-perneri-villas', 34.83613::double precision, 32.43098::double precision, 'town'),  -- Perneri Villas, Tala
    ('leptos-estates-peyia-gardens', 34.88351::double precision, 32.38032::double precision, 'town'),  -- Peyia Gardens, Peyia
    ('leptos-estates-peyia-hills-apartments', 34.88351::double precision, 32.38032::double precision, 'town'),  -- Peyia Hills Apartments, Peyia
    ('leptos-estates-pissouri-villas', 34.6689::double precision, 32.70105::double precision, 'town'),  -- Pissouri Villas, Pissouri
    ('leptos-estates-polis-beach-villas', 35.03448::double precision, 32.42647::double precision, 'town'),  -- Polis Beach Villas, Polis Chrysochous
    ('leptos-estates-regina-gardens', 34.75876::double precision, 32.41008::double precision, 'town'),  -- Regina Gardens, Kato Paphos
    ('leptos-estates-sea-caves-villas', 34.886389::double precision, 32.332511::double precision, 'geocoded'),  -- Sea Caves Villas, Coral Bay
    ('leptos-estates-venus-gardens-resort', 34.79959::double precision, 32.40792::double precision, 'town'),  -- Venus Gardens Resort, Chloraka
    ('leptos-estates-vikla-villas', 34.8312::double precision, 32.474336::double precision, 'geocoded'),  -- Vikla Villas, Tsada
    ('leptos-estates-west-park-court', 34.7744::double precision, 32.42316::double precision, 'town'),  -- West Park Court, Paphos
    ('leptos-estates-zanatzia-plots-villas', 34.7744::double precision, 32.42316::double precision, 'town'),  -- Zanatzia Plots & Villas, Paphos
    ('leptos-estates-zelemenos-village', 34.83613::double precision, 32.43098::double precision, 'town')  -- Zelemenos Village, Tala
  ) v(slug, lat, lng, prec)
 where l.slug = v.slug
   and l.coords_precision in ('town', 'geocoded')   -- ein bereits genauer Punkt wird nie überschrieben
   and (l.lat is distinct from v.lat or l.lng is distinct from v.lng or l.coords_precision is distinct from v.prec)
   and v.lat between 34.5 and 35.2 and v.lng between 32.2 and 33.2;

select count(*) filter (where coords_precision = 'exact') as genau, count(*) filter (where coords_precision = 'geocoded') as openstreetmap, count(*) filter (where coords_precision = 'town') as ortsmitte
  from public.directory_listings
 where slug in ('leptos-estates-adonis-beach-villas', 'leptos-estates-akakia-villas', 'leptos-estates-akamantis-gardens', 'leptos-estates-akropolis-275', 'leptos-estates-aphrodite-springs', 'leptos-estates-apollo-beach-villas', 'leptos-estates-argaka-beach-villas', 'leptos-estates-armonia-beach-villas', 'leptos-estates-belvedere-villas', 'leptos-estates-coral-bay-villas', 'leptos-estates-coral-gardens', 'leptos-estates-coral-seas-villas', 'leptos-estates-eden-beach-apartments', 'leptos-estates-fortuna-court-i', 'leptos-estates-iasonas-beach-villas', 'leptos-estates-kamares-village', 'leptos-estates-kings-court', 'leptos-estates-kings-gardens', 'leptos-estates-latchi-beach-villas', 'leptos-estates-limassol-blu-marine', 'leptos-estates-limassol-park', 'leptos-estates-limnaria-gardens', 'leptos-estates-mandria-gardens', 'leptos-estates-maniki-beach-villas', 'leptos-estates-neapolis-smart-ecocity', 'leptos-estates-olympus-village', 'leptos-estates-paphos-gardens', 'leptos-estates-paradise-gardens', 'leptos-estates-perneri-villas', 'leptos-estates-peyia-gardens', 'leptos-estates-peyia-hills-apartments', 'leptos-estates-pissouri-villas', 'leptos-estates-polis-beach-villas', 'leptos-estates-regina-gardens', 'leptos-estates-sea-caves-villas', 'leptos-estates-venus-gardens-resort', 'leptos-estates-vikla-villas', 'leptos-estates-west-park-court', 'leptos-estates-zanatzia-plots-villas', 'leptos-estates-zelemenos-village');
