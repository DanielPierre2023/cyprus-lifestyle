# Leptos: Konzernseite, Projekte, Concierge (Stand 14. Oktober 2026)

Leptos Estates (Leptos Group) ist das erste Unternehmen mit einer von Hand geschriebenen Konzernseite. Dieses Dokument sagt, wo was liegt und wie man etwas ändert.

## Aufbau in einem Satz
Die langen Texte stehen im Code (`lib/partners/`), die Verzeichnis-Zeilen in der Datenbank tragen nur die Kurzfakten (Name, Adresse, Punkt, Kurztext in 7 Sprachen); die SQL-Dateien werden aus denselben Daten erzeugt, damit Seite, Datenbank und Concierge nie auseinanderlaufen.

## Dateien
| Pfad | Inhalt |
|---|---|
| `lib/partners/leptos.data.ts` | Fakten ohne Sprache: 42 Projekte (Ort, Art, Punkt, Genauigkeit, Bild), 3 Büros, 20 Konzernfirmen, 10 Büros im Ausland, 14 griechische Projekte, Auszeichnungen |
| `lib/partners/leptos.text.ts` | Alle Texte in en, de, el, pl, ro, ru, ar: Kurztext, Geschichte, 12 Gründe, Konzernstruktur, Satzbausteine für Projekt-Kurztexte |
| `lib/partners/leptos.ts` | Zusammenbau: Projekt-Kurztexte, Concierge-Briefing (`leptosBrief`), Erkennung „geht es um Leptos?“ (`leptosMentioned`) |
| `lib/partners/leptos.sql.ts` | erzeugt die SQL-Dateien aus den Daten; `node scripts/leptos-sql.mjs` schreibt sie nach `supabase/data/` |
| `lib/partners/geo.ts` | fächert Karten-Pins auf, die auf einem Dorf liegen (nur Darstellung, gespeicherte Punkte bleiben) |
| `components/LeptosProfile.tsx`, `LeptosProjects.tsx` | die Seite (Kennzahlen, Geschichte, 12 Gründe, Konzern, Standorte mit Karte, Projekte mit Filter, Auszeichnungen) |
| `components/LeptosMemberNote.tsx` | Hinweis „Projekt von Leptos Estates / Teil der Leptos Group“ auf Projekt-, Büro- und Konzernseiten |
| `public/partners/leptos/` | Titelbild, `p/` (1200 px) und `t/` (560 px) je Projekt |
| `supabase/data/20261014-50` bis `-57` | Vorprüfung, Sicherung, Konzern, Projekte, Rückweg, Dubletten, Kontrolle, Lage-Vorlage |
| `scripts/tests/leptos-partner.test.ts` | prüft Daten, 7 Sprachen, Bilder, SQL (gleich wie erzeugt), Karte, Concierge |

## Ändern
1. Text oder Fakt ändern: in `lib/partners/leptos.data.ts` oder `leptos.text.ts`.
2. SQL neu erzeugen: `node scripts/leptos-sql.mjs` (der Test schlägt fehl, solange die Dateien nicht zu den Daten passen).
3. `node scripts/tests/run.mjs`.

## Regeln, die der Code einhält
- Zahlen und Aussagen von Leptos stehen als Angaben des Unternehmens (Seite: „Zahlen laut Leptos, nicht von uns geprüft“; Concierge: „Leptos says“).
- Keine Preise, keine Termine, kein Bauzustand (Leptos nennt Preise „auf Anfrage“).
- Projektpunkte: `geocoded` = OpenStreetMap-Treffer gleichen Namens, `town` = Ortsmitte. Genaue Punkte kommen von Leptos (Vorlage `-57-`).
- Es wird kein Partner-Tarif und kein „geprüft“ gesetzt (Entscheidung von Daniel nach dem Gespräch).
- Zweites großes Unternehmen später: gleiche Struktur unter `lib/partners/<name>.*`, ein Eintrag im Detailseiten-Code, ein Eintrag in `leptosMentioned`-Logik des Concierge.
