-- 20261014-55-leptos-doubletten-verbergen.sql
-- ---------------------------------------------------------------------------------------------------------------------
-- OPTIONAL: versteckt zwei Dubletten ohne eigenen Inhalt (gleiche Hotels wie im Konzern, schon vorhanden): „Leptos Paphos Gardens Hotel - Cyprus“ und „Thalassa Hotel“.
-- Die Zeilen bleiben erhalten (Status hidden); Rückweg über -54- (die Zeilen sind in der Sicherung).
-- Läuft im Supabase SQL Editor: ganze Datei einfügen, Run. Alles oder nichts (eine Transaktion). Unten steht eine Zahlentabelle.
-- ---------------------------------------------------------------------------------------------------------------------

update public.directory_listings set status = 'hidden' where slug in ('leptos-paphos-gardens-hotel---cyprus-8720', 'thalassa-hotel-8814');

select slug, status, name_en from public.directory_listings where slug in ('leptos-paphos-gardens-hotel---cyprus-8720', 'thalassa-hotel-8814');
