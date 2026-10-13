# Alle Unternehmen veröffentlichen: Ablauf (Runbook)

Gehört zu `docs/PLAN-UNTERNEHMEN-CONCIERGE-VERKAUF.md`, Paket V. Stand: 13. Oktober 2026.
Daniel hat am 13. Oktober das „Go“ für Concierge-Code und Unternehmensdaten (Veröffentlichung, Adressen, Koordinaten) gegeben. Dieses Dokument ist der Ablauf dazu; was tatsächlich ausgeführt wurde, steht im Plan.

## Warum nicht einfach „alles auf published“?

Vorher hätte das die Seiten zerstört. Geprüft im Code:

| Stelle | Problem bei 17.700 Einträgen | Jetzt |
|---|---|---|
| `/directory/<Art>` (z. B. „Dienstleistungen“: 13.461 Einträge) | lud **alle** Einträge und **alle** Kartenpunkte in eine Seite | 48 pro Seite, Seiten unter `/directory/<Art>/p/<n>`, Karte nur mit den 48 |
| `/directory/g/<Gruppe>` | dasselbe | dasselbe (`/directory/g/<Gruppe>/p/<n>`) |
| Vorschau auf `/directory` | die ersten 6 **alphabetisch** („1st Class …“) | gerankt: Partner, geprüft, Bewertung, Bewertungsanzahl, A–Z |
| „Beste … in <Ort>“ | Zähl-Scan brach bei 12.000 Zeilen ab | eine Zählabfrage in der Datenbank (`directory_facets`), sonst Scan ohne Grenze |
| „In der Nähe“ | `limit 400` lieferte in dichten Orten **zufällige** 400 | Radius schrumpft, bis die Auswahl vollständig ist |
| Foto | Quelle liefert ein Werbebild einer Fremdseite | wird nicht gezeigt; Markenbild als Platzhalter |
| Ehrlichkeit | alle wirken „geprüft“ | Hinweis auf jeder ungeprüften Seite („nicht von der Redaktion geprüft“), 7 Sprachen |

Die Karte (`/map`) liest schon `published` **und** `listed` und braucht keine Änderung; nach dem Wechsel bekommen alle Pins automatisch einen Link zur Detailseite.

## Reihenfolge

1. Pull Request mergen, Vercel-Deployment „Ready“ abwarten.
2. **Datenbank (einmalig):** `supabase/migrations/20261013120000_concierge_name_search.sql`, `supabase/migrations/20261013121000_directory_facets.sql` und `supabase/migrations/20261013122000_directory_address_source.sql` ausführen.
3. Stichprobe auf der Live-Seite: `/directory/vendor` zeigt 48 Karten, Seite 2 (`/directory/vendor/p/2`) lädt, Ranking sieht sinnvoll aus.
4. **Go von Daniel.**
5. Sicherung → Wechsel → Prüfung (unten).
6. Sitemap prüfen (`/sitemap.xml`, zwei Dateien `listings-0` und `listings-1`), danach in Google Search Console einreichen (Daniel).
7. Concierge-Index auffrischen: `/api/concierge/embed-directory` aufrufen (wie bisher, Admin angemeldet), bis „remaining: 0“.
8. Koordinaten nachholen (V2): `/api/concierge/geocode-directory`.

## Datenbank-Schritte (nach „Go“)

```sql
-- 1. Sicherung (Rückweg ist damit jederzeit möglich)
create schema if not exists backup_20261013;
create table backup_20261013.directory_status as
  select id, slug, status, published_at from public.directory_listings where status in ('listed','draft','hidden');

-- 2. Pro Zeile würde sonst ein Aufruf an die Website gehen (14.671 mal): kurz abschalten
alter table public.directory_listings disable trigger zz_cl_revalidate;

-- 3. Ausnahmen zuerst auf 'hidden' (nicht öffentlich, auch nicht auf der Karte): die 6 Einträge der Rubrik escort-agencies
--    und die 2 Platzhalter.
update public.directory_listings set status = 'hidden'
 where status = 'listed'
   and (subtype = 'escort-agencies' or slug in (<Slugs der 2 Platzhalter>));

-- 4. Wechsel in Paketen (jedes unter 60 Sekunden); so oft wiederholen, bis 0 Zeilen
with todo as (
  select id from public.directory_listings
  where status = 'listed'
  order by id limit 3000
)
update public.directory_listings l
   set status = 'published', published_at = coalesce(l.published_at, now())
  from todo where l.id = todo.id;

-- 5. Wieder einschalten
alter table public.directory_listings enable trigger zz_cl_revalidate;

-- 6. Prüfung
select status, count(*) from public.directory_listings group by status order by 2 desc;
```

**Rückweg (falls nötig):**

```sql
alter table public.directory_listings disable trigger zz_cl_revalidate;
update public.directory_listings l
   set status = b.status, published_at = b.published_at
  from backup_20261013.directory_status b
 where b.id = l.id and b.status = 'listed' and l.status = 'published';
alter table public.directory_listings enable trigger zz_cl_revalidate;
```

## Ausnahmen (V1d, von Daniel am 13. Oktober freigegeben)

Daniel wollte „ohne Ausnahme“ und hat den folgenden Ausnahmen zugestimmt, weil die Marke dafür haftet:

| Gruppe | Anzahl | Befund | Entscheidung |
|---|---|---|---|
| Rubrik `escort-agencies` | 6 | „Desire Cyprus Escorts“, „VIP Escorts“, „Hot Independent“, „Skokka“ (Anzeigenportal) sowie „Adults Boutique Limassol“ und „LOVE SHOP“ (Erotik-Läden, die in dieser Rubrik landeten) | **nicht öffentlich** (`hidden`, damit auch nicht auf der Karte) |
| Sex-Shops, Wetten, Casino, Lotterie, Waffengeschäfte | ca. 45 | legal, aber nicht Marke | **veröffentlicht**; der Concierge nennt sie nur auf Namen oder direkte Frage (Plan S6) |
| Entwürfe (Bauprojekte, keine Koordinaten) | 56 | z. B. „Aqua Pearl Residences“ (ausverkauft), Einzelobjekte | bleiben Entwurf; erst Koordinaten und Status prüfen |
| Versteckt | 30 | 18 liegen im besetzten Norden (nie zeigen); 1 „[CLOSED] Yiannis Romanian Grill house“ | bleiben versteckt; die übrigen 11 sind noch zu prüfen |
| Platzhalter | 2 | „{EMPTY COMPANY} - Cyprus“, „Car for sale Cyprus - Limassol“ | **nicht öffentlich** (`hidden`) |

Die Erotik-Läden „Adults Boutique Limassol“ und „LOVE SHOP“ liegen nur wegen ihrer Rubrik in der Ausnahme. Soll einer davon doch erscheinen, wird er mit einem `update … set status = 'published'` freigegeben.

## Wie Google damit umgeht (Risiko offen gesagt)

- Die 14.671 Seiten haben kurze, automatisch erzeugte Texte, aber echte Fakten (Name, Adresse, Telefon, Karte, Kategorie). Ein Verzeichnis ist ein anerkanntes Format; reine Textkopien wären das Problem.
- Schutz, der schon da ist: Seiten mit zu kurzem Text sind `noindex` und fehlen in der Sitemap (`isStubText`, `isPublishableListing`).
- Empfehlung: nach dem Wechsel in der Search Console die Zahl der „indexierten“ Seiten wöchentlich ansehen. Wenn Google viele als „entdeckt, nicht indexiert“ führt, ist das ein Zeichen für zu wenig eigenen Inhalt: dann Öffnungszeiten, echte Fotos und Inhaberangaben (Eintrag beanspruchen) vorziehen (Paket D).
- Datenschutz: Es sind Geschäftsdaten aus öffentlichen Quellen. Jede Seite hat „Eintrag beanspruchen“; für Löschwünsche gibt es den bestehenden Weg über Kontakt/„Eintrag beanspruchen“. Das Verfahren in der Datenschutzerklärung kurz prüfen (Daniel/Anwalt).
