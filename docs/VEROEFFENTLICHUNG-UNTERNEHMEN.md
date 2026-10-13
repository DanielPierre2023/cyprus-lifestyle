# Alle Unternehmen veröffentlichen: Ablauf (Runbook)

Gehört zu `docs/PLAN-UNTERNEHMEN-CONCIERGE-VERKAUF.md`, Paket V. Stand: 13. Oktober 2026.
**Nichts in diesem Dokument wurde ausgeführt.** Die Datenbank ist unverändert. Jeder Schritt mit „Datenbank“ braucht Daniels „Go“.

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
2. **Datenbank (einmalig):** `supabase/migrations/20261013120000_concierge_name_search.sql` und `supabase/migrations/20261013121000_directory_facets.sql` im Supabase SQL Editor ausführen.
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

-- 3. Wechsel in Paketen (jedes unter 60 Sekunden); so oft wiederholen, bis 0 Zeilen
with todo as (
  select id from public.directory_listings
  where status = 'listed'
  order by id limit 3000
)
update public.directory_listings l
   set status = 'published', published_at = coalesce(l.published_at, now())
  from todo where l.id = todo.id;

-- 4. Wieder einschalten
alter table public.directory_listings enable trigger zz_cl_revalidate;

-- 5. Prüfung
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

## Ausnahmen, die Daniel noch entscheiden muss (V1d)

„Ohne Ausnahme“ ist verstanden. Diese Gruppen würde ich trotzdem **nicht blind** mitveröffentlichen, weil ein Luxus-Lifestyle-Magazin dafür haftet:

| Gruppe | Anzahl | Befund | Vorschlag |
|---|---|---|---|
| Escort-Agenturen | 3 | „Desire Cyprus Escorts“, „VIP Escorts“, „Adults Boutique Limassol“; rechtlich heikel, Markenschaden | nicht veröffentlichen |
| Sex-Shops, Casino, Wetten | 14 | legal, aber nicht Marke; der Concierge würde sie Luxusgästen nicht empfehlen | veröffentlichen, aber **nicht** vom Concierge empfehlen, außer auf direkte Frage |
| Entwürfe (Bauprojekte, keine Koordinaten) | 56 | z. B. „Aqua Pearl Residences“ (ausverkauft), Einzelobjekte | erst Koordinaten/Status prüfen |
| Versteckt | 30 | 18 liegen im besetzten Norden (nie zeigen); 1 „[CLOSED] Yiannis Romanian Grill house“ | Norden und „geschlossen“ bleiben versteckt; die übrigen 11 prüfen und freigeben |
| Platzhalter | 2 | „{EMPTY COMPANY} - Cyprus“, „Car for sale Cyprus - Limassol“ | nicht veröffentlichen |

Wenn Daniel „alle ohne Ausnahme“ bestätigt, ändere ich nur die `where`-Zeile im Wechsel (`status = 'listed'`) nicht. Für die Vorschläge oben käme dazu:
`and slug not in ('empty-company-cyprus') and subtype <> 'escort-agencies'`.

## Wie Google damit umgeht (Risiko offen gesagt)

- Die 14.671 Seiten haben kurze, automatisch erzeugte Texte, aber echte Fakten (Name, Adresse, Telefon, Karte, Kategorie). Ein Verzeichnis ist ein anerkanntes Format; reine Textkopien wären das Problem.
- Schutz, der schon da ist: Seiten mit zu kurzem Text sind `noindex` und fehlen in der Sitemap (`isStubText`, `isPublishableListing`).
- Empfehlung: nach dem Wechsel in der Search Console die Zahl der „indexierten“ Seiten wöchentlich ansehen. Wenn Google viele als „entdeckt, nicht indexiert“ führt, ist das ein Zeichen für zu wenig eigenen Inhalt: dann Öffnungszeiten, echte Fotos und Inhaberangaben (Eintrag beanspruchen) vorziehen (Paket D).
- Datenschutz: Es sind Geschäftsdaten aus öffentlichen Quellen. Jede Seite hat „Eintrag beanspruchen“; für Löschwünsche gibt es den bestehenden Weg über Kontakt/„Eintrag beanspruchen“. Das Verfahren in der Datenschutzerklärung kurz prüfen (Daniel/Anwalt).
