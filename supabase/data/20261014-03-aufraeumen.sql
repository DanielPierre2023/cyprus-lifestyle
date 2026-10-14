-- 20261014-03-aufraeumen.sql
-- ---------------------------------------------------------------------------------------------------------------------
-- Entfernt zwei kleine Reste vom Arbeiten am 13./14.10.: eine leere Zwischentabelle und eine Probe-Funktion.
-- (Beide sind leer bzw. wirkungslos; der Zugriff für anon/authenticated ist bereits entzogen. Löschen braucht eine Bestätigung,
--  darum liegt das hier statt bei mir.)
-- ---------------------------------------------------------------------------------------------------------------------
drop table if exists public.zz_geo_stage;
drop function if exists public.zz_tmp_probe();
