-- 20261014-02-veroeffentlichen-rueckgaengig.sql
-- ---------------------------------------------------------------------------------------------------------------------
-- NUR BEI BEDARF: stellt den Status aller Zeilen auf den Stand vor der Veröffentlichung zurück
-- (aus backup_20261014.directory_status, angelegt in SCHRITT 1 von 20261014-01-veroeffentlichen.sql).
-- ---------------------------------------------------------------------------------------------------------------------
alter table public.directory_listings disable trigger zz_cl_revalidate;

with upd as (
  update public.directory_listings l
     set status = b.status, published_at = b.published_at
    from backup_20261014.directory_status b
   where b.id = l.id and l.status is distinct from b.status
  returning 1
)
select count(*) as zurueckgesetzt from upd;

alter table public.directory_listings enable trigger zz_cl_revalidate;

select status, count(*) as anzahl from public.directory_listings group by 1 order by 2 desc;
