# Lieferung 5 (14.10.2026): Leptos Estates, Konzern und alle Projekte

**Nicht committen:** diese Datei und den Ordner `_pruefung/`. Alles andere hat seinen Repository-Pfad im Zip.

## Was jetzt da ist
- **Konzernseite am Hauptstandort** (Leptos Estates, Paphos): Geschichte (1960 bis heute), deine 12 Gründe, Konzernstruktur (20 Firmen in 7 Bereichen), Standorte mit Karte (Paphos, Nikosia, Limassol, dazu Hotels, Krankenhaus, Universität), alle **42 Projekte in Zypern** mit Bild, Kurztext, Filter nach Gebiet, Link zur eigenen Seite und zur offiziellen Leptos-Seite, die 14 griechischen Projekte als Links, die Auszeichnungen, die 10 Büros im Ausland. Alles in 7 Sprachen, auch Arabisch.
- **40 neue Projektseiten**, 2 vorhandene verknüpft (Aphrodite Gardens, Limassol Del Mar). Büro Limassol neu. Büro Nikosia ist die vorhandene Zeile „Armonia Estates Ltd“ (so heißt die juristische Person von Leptos Estates). 4 neue Konzernfirmen: Vesta Holidays, Chestertons, Resitour, Arena Sports.
- Auf jeder Projekt-, Büro- und Konzernseite steht ein Hinweis „Projekt von Leptos Estates“ mit Link zur Konzernseite.
- **Concierge:** bei „Leptos“, „Leptos Developers“, einem Projektnamen oder einer Konzernfirma bekommt er ein Briefing: Luxury Developer, die ganze Struktur, die 42 Projekte nach Gebiet. Zahlen nennt er nur als „Leptos sagt“, keine Preise, nie „der Beste“. Die Leptos-Seite erscheint dann als Karte in den Vorschlägen.

## Ausführen
Zuerst die Dateien committen und deployen (Vercel „Ready“). Die Seite funktioniert auch vor dem SQL (Projekte zeigen dann auf die offiziellen Leptos-Seiten). Danach im Supabase SQL Editor, jede Datei komplett einfügen, Run:

| # | Datei | Zweck |
|---|---|---|
| 1 | `-50-leptos-vorpruefung.sql` | nur lesen. Zeilen „1 …“ und „2 …“ sollten fehlen. Zeilen „3 …“ kurz ansehen (mögliche Dubletten). Zeigt „1“ oder „2“ etwas: nicht weiter, Ergebnis an mich |
| 2 | `-51-leptos-sicherung.sql` | sichert die 12 vorhandenen Zeilen, die geändert werden |
| 3 | `-52-leptos-konzern.sql` | Hauptsitz, 3 Büros, Konzernfirmen |
| 4 | `-53-leptos-projekte.sql` | 40 neue Projekte, 2 verknüpft |
| 5 | `-56-leptos-kontrolle.sql` | Soll: A 42, B 3, C 4, D „keine“ |
| optional | `-55-leptos-doubletten-verbergen.sql` | 2 Dubletten ohne Inhalt verbergen |
| später | `-57-leptos-lage-nachtragen.sql` | Vorlage für die genauen Punkte von Leptos |
| Rückweg | `-54-leptos-rueckgaengig.sql` | stellt alles aus der Sicherung wieder her, löscht die neuen Zeilen |

Danach einmal `/api/concierge/embed-directory` aufrufen (Admin angemeldet), bis „remaining: 0“, damit der Concierge die neuen Zeilen auch nach Bedeutung findet. Die Seiten aktualisieren sich innerhalb einer Stunde (oder sofort durch die Datenbank-Hooks).
Stichprobe: `/directory/vendor/leptos-estates` (auch `/de/…`, `/ar/…`), `/directory/development/leptos-estates-kamares-village`, im Concierge „Erzähl mir von Leptos Developers“.

## Was geprüft ist
- 134 Testdateien grün (neu: Leptos, 346 Prüfungen), `tsc` und `eslint` ohne Fehler.
- Darstellung in allen 7 Sprachen bei 320, 390, 768 und 1280 px (Arabisch rechts nach links), kein seitliches Wackeln.
- SQL: in einer Test-Datenbank (PostgreSQL 16, echte Tabellendefinition mit Dubletten-Sperre) angewendet, zweimal wiederholt (keine Doppelten), Rückweg stellt alles wieder her.
- Alle Punkte liegen laut OpenStreetMap in der Republik Zypern (Büro Nikosia: Agios Antonios, Straße Dimitsanis).
- Texte: nur aus deinen 12 Gründen, der Excel-Datei und den Seiten von leptosestates.com. Keine Preise, keine Termine.

## Was ich nicht weiß (bitte vor oder nach dem Gespräch)
1. **Bildrechte.** 41 Projektbilder und das Titelbild stammen von leptosestates.com und liegen im Repository (`public/partners/leptos/`). Bitte Leptos um Zustimmung bitten. Ohne Zustimmung den Ordner löschen: die Seite zeigt dann den Markenplatzhalter.
2. **„Über 350 Wohnprojekte“ oder „67+“?** Dein Text sagt 350, die Leptos-Seite nennt „67+ abgeschlossene Projekte“. Ich habe deinen Text genommen (als Angabe von Leptos). Bitte Leptos fragen.
3. **Name.** „Leptos Developers“ ist nicht der offizielle Name; die Firma heißt Leptos Estates (Leptos Group). Seite, Suche und Concierge kennen beide Namen.
4. **Genaue Lage der Projekte.** Die Leptos-Seiten enthalten keine Koordinaten. 10 Projekte haben einen OpenStreetMap-Treffer gleichen Namens, 32 stehen auf der Ortsmitte; die Seite sagt „Pins zeigen das Dorf, nicht das Grundstück“. Leptos kennt die genauen Punkte: `_pruefung/leptos-lage-liste.csv` mitnehmen, die Zahlen kommen in `-57-`.
5. **Luxus-Markierung.** Hauptsitz, Büros und 13 Projekte (Leptos nennt sie selbst „luxury“ oder „exclusive“) tragen das Luxus-Kennzeichen. Zurück: `luxury = false`.
6. **Tarif und „geprüft“.** Nichts gesetzt. Wird Leptos Partner: Tarif im Admin. „Geprüft“ erst nach deiner Prüfung.
7. **Neapolis Smart EcoCity** steht im Excel bei „Polis“ (Fehler: „Neapolis“ enthält „polis“). Ich habe Paphos genommen (bei der Universität).
8. **Pissouri** liegt zwischen Limassol und Paphos und steht in der Datenbank unter Limassol.
9. **Nur in der Struktur genannt, ohne eigene Seite:** Leptos Calypso Hotels (Hotel-Holding), Pandora Investments, Leda Travel, Karkavatsos, Cronos Insurance, Basilica Design Centre, Leptos Panorama Hotel (Kreta).
10. **Vorhandene Zeilen:** Hotels, Universität, Krankenhaus bekamen nur fehlende Koordinaten und Adressen. Vier Kurztexte (Iasis, Basilica, Paphos Gardens, Thalassa) ersetzen automatische Texte; Basilica war als Restaurant geführt und ist jetzt Hotel. Alles in der Sicherung.
11. Der Hauptsitz ist jetzt eine Firma (Art „vendor“) statt „development“. Der alte Link `/directory/development/leptos-estates` führt weiter auf dieselbe Seite.

## Auch auf dem Branch
Ich habe den Stand zusätzlich auf den Branch `claude/hopeful-newton-n36nie` gelegt (PR #8, nicht gemergt). Du kannst die Dateien aus dem Zip nehmen oder von dort.
