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

## Datenbank-Schritte

Die fertigen Skripte liegen im Repository unter `supabase/data/` und werden im Supabase SQL Editor ausgeführt, jeder „SCHRITT“ einzeln:

| Datei | Zweck |
|---|---|
| `supabase/data/20261014-01-veroeffentlichen.sql` | Sicherung → Trigger aus → Ausnahmen auf `hidden` → Wechsel in 3.000er-Paketen → Trigger an → Kontrolle |
| `supabase/data/20261014-02-veroeffentlichen-rueckgaengig.sql` | nur bei Bedarf: stellt den alten Status aus der Sicherung wieder her |
| `supabase/data/20261014-03-aufraeumen.sql` | entfernt zwei kleine Arbeitsreste (leere Zwischentabelle, Probe-Funktion) |

Erwartete Zahlen nach dem Wechsel: `published` 17.739 · `hidden` 38 · `draft` 56 · `listed` 0.
Hinweis: Das Audit-Protokoll (`zz_audit_row_change`) schreibt nur bei Änderungen durch angemeldete Administratoren; im SQL Editor entsteht daher kein Audit-Eintrag pro Zeile.

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
