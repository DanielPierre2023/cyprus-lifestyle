-- 20261014-01-veroeffentlichen.sql
-- ---------------------------------------------------------------------------------------------------------------------
-- Alle importierten Unternehmen veröffentlichen (Plan V1c). Läuft im Supabase SQL Editor.
--
-- VORHER erledigt sein:
--   1. Die neue Website-Version ist live (Vercel "Ready"): sie hat die Seitenaufteilung für 17.700 Einträge.
--   2. Die drei Migrationen vom 13.10. sind eingespielt (Namenssuche, Facetten, address_source).
--
-- So vorgehen: jeden "SCHRITT" einzeln markieren und mit "Run" ausführen, danach den nächsten.
-- Rückweg: 20261014-02-veroeffentlichen-rueckgaengig.sql (nur bei Bedarf).
-- ---------------------------------------------------------------------------------------------------------------------

-- SCHRITT 0: Ausgangslage (nur lesen). Erwartet: listed 14671 · published 3076 · hidden 30 · draft 56
select status, count(*) as anzahl from public.directory_listings group by 1 order by 2 desc;

-- SCHRITT 1: Sicherung des alten Status (macht den Rückweg möglich). Erwartet: listed 14671 · hidden 30 · draft 56
create schema if not exists backup_20261014;
create table if not exists backup_20261014.directory_status as
  select id, slug, status, published_at from public.directory_listings where status in ('listed', 'draft', 'hidden');
select status, count(*) as anzahl from backup_20261014.directory_status group by 1 order by 1;

-- SCHRITT 2: Pro Zeile würde sonst ein Aufruf an die Website gehen (14.600 Mal). Kurz abschalten; Schritt 5 schaltet wieder ein.
alter table public.directory_listings disable trigger zz_cl_revalidate;

-- SCHRITT 3: Ausnahmen, die NICHT öffentlich werden (Status "hidden", dann auch nicht auf der Karte und nicht im Concierge):
--   • die 6 Einträge der Rubrik escort-agencies
--   • die 2 Platzhalter ({EMPTY COMPANY} - Cyprus, Car for sale Cyprus - Limassol)
--   • alles im besetzten Norden (derzeit keiner mehr "listed")
-- Erwartet: 8 Zeilen
update public.directory_listings
   set status = 'hidden'
 where status = 'listed'
   and (subtype = 'escort-agencies'
        or slug in ('empty-company-cyprus', 'car-for-sale-cyprus---limassol-11112')
        or coalesce(north, false));

-- SCHRITT 4: Der Wechsel, in Paketen zu 3.000. Diesen Block so oft ausführen, bis "umgestellt" = 0 ist (etwa 5 Mal).
with todo as (
  select id from public.directory_listings where status = 'listed' order by id limit 3000
), upd as (
  update public.directory_listings l
     set status = 'published', published_at = coalesce(l.published_at, now())
    from todo where l.id = todo.id
  returning 1
)
select count(*) as umgestellt from upd;

-- SCHRITT 5: Trigger wieder einschalten
alter table public.directory_listings enable trigger zz_cl_revalidate;

-- SCHRITT 6: Kontrolle. Erwartet: published 17739 · hidden 38 · draft 56 · (listed gibt es nicht mehr)
select status, count(*) as anzahl from public.directory_listings group by 1 order by 2 desc;
-- Muss 0 liefern (0 = der Trigger ist wieder an):
select count(*) as trigger_noch_aus
  from pg_trigger
 where tgrelid = 'public.directory_listings'::regclass and tgname = 'zz_cl_revalidate' and tgenabled = 'D';

-- Danach (nicht in SQL): die Listen auf der Website aktualisieren sich von selbst innerhalb von 5 bis 60 Minuten.
