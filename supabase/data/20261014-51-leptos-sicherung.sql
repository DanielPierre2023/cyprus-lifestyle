-- 20261014-51-leptos-sicherung.sql
-- ---------------------------------------------------------------------------------------------------------------------
-- Sichert die vorhandenen Zeilen, die die Leptos-Dateien ändern (Rückweg: -54-). Vor -52- und -53- einmal ausführen.
-- Die Sicherung wird nicht überschrieben, wenn die Datei ein zweites Mal läuft (der erste Stand bleibt).
-- Läuft im Supabase SQL Editor: ganze Datei einfügen, Run. Alles oder nichts (eine Transaktion). Unten steht eine Zahlentabelle.
-- ---------------------------------------------------------------------------------------------------------------------

create schema if not exists backup_20261014_leptos;
create table if not exists backup_20261014_leptos.directory_listings as
  select * from public.directory_listings where slug in ('leptos-estates', 'armonia-estates-ltd-12525', 'coral-beach-hotel-and-resort', 'thalassa-3l4tp3', 'paphos-gardens-fvm4nm', 'basilica-4oa6krw', 'neapolis-university-pafos-paphos', 'iasis-private-hospital-4757', 'aphrodite-gardens-68nradd', 'limassol-del-mar', 'leptos-paphos-gardens-hotel---cyprus-8720', 'thalassa-hotel-8814');

select count(*) as gesicherte_zeilen from backup_20261014_leptos.directory_listings;
