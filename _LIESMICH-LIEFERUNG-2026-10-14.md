# Lieferung 14.10.2026: Concierge, Verzeichnis-Seiten, Veröffentlichung

**Diese Datei nicht committen.** Alle anderen Dateien liegen im Zip mit ihrem Pfad im Repository: im Hauptordner des Repositorys entpacken (vorhandene Dateien überschreiben), committen, pushen.

## 1. Dateien committen (alle Dateien im Zip außer dieser)
- Concierge: `lib/concierge/*` (neu: `names.ts`, `trust.ts`, `facts.ts`, `sensitive.ts`; geändert: `brain.ts`, `analytics.ts`, `eval.ts`), `app/api/concierge/chat/route.ts`, `lib/mail/assist.ts`, Admin-Seite `app/[locale]/admin/(panel)/analytics/page.tsx`
- Verzeichnis-Seiten für 17.700 Einträge: `lib/queries.ts`, `lib/directory/paging.ts`, `components/Directory*View.tsx`, `components/DirectoryPagedList.tsx`, Seiten unter `app/[locale]/(site)/directory/…`, Texte in `messages/*.json` (7 Sprachen)
- Tests: `scripts/tests/concierge-*.test.ts`, `directory-paging.test.ts`
- Doku: `docs/PLAN-UNTERNEHMEN-CONCIERGE-VERKAUF.md`, `docs/CONCIERGE-UNTERNEHMEN.md`, `docs/VEROEFFENTLICHUNG-UNTERNEHMEN.md`
- SQL: `supabase/migrations/20261013120000_…`, `…121000_…`, `…122000_…` und `supabase/data/20261014-0*.sql`

Geprüft vor dem Packen: 133 Testdateien grün, `tsc` sauber, ESLint sauber, Vercel-Vorschau „Ready“.
Der Pull Request #8 auf GitHub enthält dieselben Änderungen. Wenn du die Dateien selbst committest, schließe #8 ohne Merge.

## 2. SQL in Supabase (SQL Editor), in dieser Reihenfolge
Die ersten drei Dateien sind unkritisch (kein Datenwechsel, die Website funktioniert auch davor). Je Datei: Inhalt einfügen, Run, dann die Prüfzeile.

| # | Datei | Prüfzeile (Ergebnis) |
|---|---|---|
| 1 | `supabase/migrations/20261013120000_concierge_name_search.sql` | `select * from public.match_directory_name('Do you have a phone number for A and M Solomou Signs in Kato Polemidia?', 5, array['solomou signs']);` → eine Zeile, Wert 1 |
| 2 | `supabase/migrations/20261013121000_directory_facets.sql` | `select * from public.directory_facets() limit 5;` → 5 Zeilen (Art, Bezirk, Anzahl) |
| 3 | `supabase/migrations/20261013122000_directory_address_source.sql` | `select count(*) from public.directory_listings where address_source is not null;` → 0 |

## 3. Veröffentlichung (erst wenn Vercel „Ready“ ist)
1. Stichprobe auf der Live-Seite: `/en/directory/vendor` zeigt 48 Karten mit Seitenwahl, `/en/directory/vendor/p/2` lädt.
2. `supabase/data/20261014-01-veroeffentlichen.sql`: jeden „SCHRITT“ einzeln ausführen. Erwartet am Ende: published 17.739 · hidden 38 · draft 56.
3. Nach 5 bis 60 Minuten aktualisieren sich die Listen von selbst. Danach `/sitemap.xml` ansehen und in der Google Search Console einreichen.
4. `supabase/data/20261014-03-aufraeumen.sql` (entfernt zwei kleine Arbeitsreste).
Rückweg, falls nötig: `supabase/data/20261014-02-veroeffentlichen-rueckgaengig.sql`.

Nicht veröffentlicht (Status `hidden`): die 6 Einträge der Rubrik `escort-agencies` (Desire Cyprus Escorts, VIP Escorts, Hot Independent, Skokka, Adults Boutique Limassol, LOVE SHOP) und die 2 Platzhalter. Erotik-Läden, Wettbüros, Casinos, Lotterie und Waffengeschäfte werden veröffentlicht, der Concierge nennt sie aber nur auf Namen oder direkte Frage.

## 4. Noch nicht dabei
- Adressen (3.083 fehlen) und Koordinaten (354 fehlen): kommen als zweites Zip mit fertigen SQL-Dateien.
- Wortlaut der Standards-Seite zu „Geprüft“: wartet auf deine Entscheidung.
- Die Embeddings sind für alle 17.747 Einträge schon vorhanden; ein Auffrischen ist nicht nötig.
