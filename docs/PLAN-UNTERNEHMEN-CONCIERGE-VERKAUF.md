# Plan: Unternehmen, Concierge, Verkauf

Stand: 13. Oktober 2026 · Verantwortlich: Daniel Dobos (Entscheidungen) · Umsetzung: Claude
Diese Datei ist die **eine Liste, nach der wir arbeiten**. Jeder Punkt hat eine Nummer, einen Nachweis („Fertig, wenn …“) und einen Status.
Status: `[x]` fertig und geprüft · `[~]` in Arbeit · `[ ]` offen · `[?]` wartet auf Daniel.

---

## 0. Was wir wollen (in Daniels Worten)

1. Alle Unternehmen (~17.700) sind **öffentlich**, **auf der Karte** und werden **vom Concierge angeboten**, ohne Ausnahme.
2. Der Concierge **erkennt jedes Unternehmen**, nennt echte Fakten (Adresse, Telefon, Website) und erfindet nichts.
3. **Geprüft / ungeprüft:** Bei ungeprüften sagt der Concierge, dass die Redaktion noch nicht geprüft hat und die Angaben allgemein sind. Hinter geprüften stehen wir und empfehlen sie.
4. **Wir sind Verkaufsagent** für Firmen mit Abo: Der Concierge nennt sie **in ihrer Kategorie zuerst** und empfiehlt sie (klar gekennzeichnet).
5. **Verkaufsoptionen** (Preise, Beschreibungen, Logik) werden aus Marketing-Sicht geprüft; wir bekommen eine Lösung auf Spitzen-Niveau mit wettbewerbsfähigen Preisen.
6. **Geschäftskonzept** der Plattform aus Sicht eines Top-Beraters: Gesamtkonzept des Verkaufs, Philosophie, Schutz des Konzepts (Mode, Style, Urlaub, Investieren, Umziehen nach Zypern).
7. Der Concierge **denkt logisch**, liefert die besten Informationen und weiß über Zypern fast alles.

---

## 1. Ergebnis der Datenprüfung („Alle Daten sollten in der Datenbank sein“)

| Frage | Ergebnis |
|---|---|
| Wie viele Unternehmen? | **17.833** in `directory_listings`: 14.671 `listed`, 3.076 `published`, 56 `draft` (Bauprojekte ohne Koordinaten), 30 `hidden`. |
| Ist der Atlas-Import vollständig übernommen? | **Ja.** Alle 14.671 `listed` stammen aus `atlas_import`. Telefon, Adresse, E-Mail, Website, Beschreibung: **0 Lücken**. |
| Atlas-Zeilen ohne Eintrag | 864. Davon 823 Dubletten (gleicher Name oder gleiche Telefonnummer), **41 wirklich neu** (alle mit Adresse). |
| CRM-Firmen (`crm_orgs`) | 18.010; 17.750 verknüpft; 260 ohne Eintrag: 48 Dubletten, **212 neu** (davon 60 Stufe A/B: Luxus-Handel, Fine Dining, Beauty, Recht/Umzug …). |
| Was fehlt in **allen** Tabellen? | **Öffnungszeiten** (0), **griechische Namen** bei `listed` (0), **Bewertungen** bei `listed` (0), **echte Fotos** bei `listed` (das „Foto“ ist ein Werbebild der Quelle, nicht des Betriebs), **Websites** bei 65 % der `listed`, **Straßenadressen** bei 2.941 von 3.076 `published` (nur Koordinaten). |
| Wie viele sind „geprüft“? | **0.** `verified = false` bei allen 17.833. |
| Karte | Die Karte liest schon `published` **und** `listed`. Koordinaten fehlen bei 194 `listed`, 104 `published`, 56 `draft`. |
| Warum sind 14.671 nicht öffentlich? | Absicht aus früheren Phasen: nur `published` ist öffentlich. Es gibt sogar einen Qualitäts-Filter (`/api/concierge/publish-directory`), der Zeilen ohne Kategorie oder Foto zurückhält. |
| Verkauf heute | Stripe-Konto live: **0 Produkte, 0 Checkout-Sitzungen**. `ad_orders`: 8 Versuche (19./20. September), **alle fehlgeschlagen**, keine Stripe-Sitzung entstanden. 0 Mitglieder, 0 Beanspruchungen, 0 Deals. **Es gab nie einen Verkauf.** |
| Live-Seite `/advertise` | Listed und Featured sowie 7 Einzelplätze zeigen „Get started“ (Karte), nur Partner zeigt „Request a quote“. Beim Klick öffnet sich zuerst ein **Formular** (Land, USt-ID), dann Stripe. |

**Wichtige technische Entdeckung für „alle veröffentlichen“:** Die Seiten `/directory/[type]` und `/directory/g/[group]` laden **alle** Einträge ohne Seitenaufteilung. Mit 13.000 „Vendor“-Einträgen würde eine Seite mehrere MB groß und mit 13.000 Karten-Punkten laden. Auch die Facetten (`getCollectionFacets`, Grenze 12.000) und „In der Nähe“ (`limit 400`) brechen. **Darum zuerst die Seiten vorbereiten, dann veröffentlichen** (Punkt V1).

---

## 2. Arbeitspakete

### Paket S: Concierge-Schritte 1–4 (von Daniel freigegeben)

- [~] **S1 Namenssuche.** `listed` einbeziehen; den Namen auch **mitten im Satz** finden („Ist A and M Solomou Signs in Kato Polemidia erreichbar?“).
  Stand: **Code fertig und getestet**; SQL-Datei liegt bereit (`20261013120000_concierge_name_search.sql`), Lesetest gegen die echten Daten bestanden (Satz, Tippfehler, kyrillisch, unbekannter Name, Allerwelts-Name; 20 bis 100 ms). Wirkt für `listed` erst nach dem Einspielen (S-DB).
  Fertig, wenn: nach dem Einspielen die drei Prüfzeilen aus `docs/CONCIERGE-UNTERNEHMEN.md` stimmen.
- [~] **S2 Fakten für den Concierge.** Adresse, Telefon, eigene Website (kein Facebook/Portal), kurze Übersicht; **nie Öffnungszeiten erfinden** („bitte kurz anrufen“).
  Stand: **Code fertig und getestet** (`lib/concierge/facts.ts`).
  Fertig, wenn: Testfrage „Telefonnummer von …“ nennt die Nummer aus der Datenbank, und „Öffnungszeiten von …“ sagt ehrlich, dass wir sie nicht haben (nach Deploy mit echter Frage prüfen).
- [~] **S3 Saubere Stichwortsuche.** Füllwörter (7 Sprachen) raus, Namenstreffer zuerst, nicht mehr nur nach Bewertung sortieren. Stand: **Code fertig und getestet**.
- [~] **S4 Unbekannte Unternehmen.** Ehrlich „nicht in unserem Verzeichnis“, Aufnahme anbieten, Fragen ohne Treffer **protokollieren**; Admin-Liste „Fragen ohne Treffer“ (Admin → Analytics). Stand: **Code fertig und getestet**.
- [~] **S5 Vertrauensstufen + Verkaufsagent.** Drei Stufen im Concierge:
  **Geprüft** („wir stehen dahinter“), **Partner** (Abo, gekennzeichnet, zuerst in der Kategorie), **Ungeprüft** („Redaktion hat noch nicht geprüft; allgemeine Angaben“). Stand: **Code fertig und getestet** (`lib/concierge/trust.ts`).
- [x] **S-Test.** 118 neue Prüfungen in `concierge-names.test.ts` und `concierge-trust.test.ts`; alle 131 Testgruppen grün; `tsc` sauber; ESLint ohne neue Meldung. Vorschau-Build folgt mit dem Pull Request.
- [?] **S-DB.** Anleitung und Rücknahme: `docs/CONCIERGE-UNTERNEHMEN.md`. SQL-Datei `supabase/migrations/20261013120000_concierge_name_search.sql` einspielen (neue Namens-Funktion + Index). **Braucht Daniels OK**, weil es die Produktions-Datenbank ändert.

### Paket V: Alles veröffentlichen und auf der Karte

- [ ] **V1a Seiten vorbereiten.** Seitenaufteilung für `/directory/[type]` und `/directory/g/[group]` (48 pro Seite), Filter Bezirk/Kategorie, Vorschau nach Qualität statt alphabetisch, Facetten ohne 12.000-Grenze, „In der Nähe“ wirklich nach Entfernung, keine Fremd-Fotos.
- [ ] **V1b Suche und Sitemap.** Sitemap-Auslieferung prüfen (2 Dateien à 10.000), dünne Seiten (zu kurzer Text) bleiben `noindex`, bis Text vorliegt.
- [ ] **V1c Veröffentlichung (Runbook).** Sicherung (`backup_20261013.directory_status`) → Revalidate-Trigger kurz aus → `listed` → `published` in Paketen → Trigger an → Stichproben.
  **Fertig, wenn:** 17.747 Unternehmen öffentlich, jede Detailseite lädt, Verzeichnis und Karte zählen gleich.
- [?] **V1d Entscheidung 86 Fälle.** 56 Entwürfe (Bauprojekte, keine Koordinaten) und 30 versteckte (eines ist „geschlossen“). Daniel sagt „ohne Ausnahme“; ich schlage vor: erst ansehen, geschlossene nicht veröffentlichen.
- [ ] **V2 Karte vollständig.** 298 fehlende Koordinaten per Geocode-Route nachholen; danach Karte = Verzeichnis (Zähler prüfen).
- [ ] **V3 Concierge-Index.** Embeddings nach Veröffentlichung auffrischen (`/api/concierge/embed-directory`, braucht den bestehenden Schlüssel in Vercel).

### Paket D: Datenqualität (alter „Schritt 5“, jetzt Teil des Plans)

- [ ] **D1 Namen.** 1.198 `listed`-Namen in GROSSBUCHSTABEN und 525 mit „- Cyprus“ schön schreiben (Original bleibt in `name_raw`).
- [ ] **D2 Kategorien.** 2.142 `listed` in „general-vendor“ neu einordnen.
- [ ] **D3 Adressen** für die 2.941 `published` ohne Straße (aus Koordinaten).
- [ ] **D4 41 neue Atlas-Firmen und 212 neue CRM-Firmen** aufnehmen (CRM-Stufe A/B zuerst).
- [ ] **D5 Öffnungszeiten und Websites** anreichern (nur aus belegten Quellen, nie geraten).

### Paket K: Verkauf und Konzept

- [~] **K1 Konzept** (`docs/KONZEPT-VERKAUF-PHILOSOPHIE.md`): Analyse der 10 Angebote, Preislogik, Produkt-Leiter, Verkaufssystem, Philosophie, Schutz des Konzepts. Daniel wählt, bevor etwas gebaut wird.
- [?] **K2 Umsetzung** nach Daniels Wahl: Checkout reparieren (Testkauf), Preisliste neu, Partner-Berichte, Agenten-Provision, Concierge-Reihenfolge.
- [ ] **K3 Testkauf.** Ein echter Durchlauf mit kleinem Betrag, danach Rückerstattung (nur mit Daniels OK).

### Paket C: Concierge „allwissend und logisch“

- [ ] **C1 Wissenslücken** der Wissensbasis (Recht, Steuern, Immobilien, Umzug, Mode/Style, Urlaub, Investieren) mit Liste aus „Fragen ohne Treffer“ füllen.
- [ ] **C2 Denkregeln:** Rückfragen bei Unklarem, Vergleich mit Begründung, Tagesplan, ehrliche Grenzen.
- [ ] **C3 Prüfkatalog** mit 60 echten Fragen in 7 Sprachen und Soll-Antworten; läuft bei jeder Änderung.

---

## 3. Reihenfolge

1. **Jetzt:** Plan (diese Datei), Datenprüfung, Schritte S1–S5 im Code (Pull Request, Vorschau prüfen).
2. **Danach:** V1a/V1b (Seiten für 17.700 Einträge bereit) → Daniel gibt „Go“ → V1c, V2, V3.
3. **Parallel:** K1 (Konzept) zur Entscheidung → K2/K3.
4. **Laufend:** D und C.

## 4. Was nur Daniel tun oder freigeben kann

| Punkt | Was | Warum |
|---|---|---|
| S-DB | Freigabe der SQL-Datei (oder ich spiele sie nach „Ja“ per Verbindung ein) | ändert die Produktionsdatenbank |
| V1c | „Go“ für die Veröffentlichung nach dem Seiten-Update | öffentlich sichtbar, bei Google sichtbar |
| V1d | Entscheidung zu 86 Entwürfen/Versteckten | teils geschlossen oder Dubletten |
| K1/K2 | Auswahl Preise und Produkte | Geschäftsentscheidung |
| K3 | Testkauf mit echtem Geld | Stripe-Konto ist live |
| Vercel | Schlüssel/Variablen (nie im Chat!) | z. B. für `embed-directory` |

## 5. Risiken, die wir offen sagen

- **Dünne Seiten:** Die Texte der 14.671 `listed` sind kurz und automatisch geschrieben. Google kann viele davon als wenig nützlich einstufen. Gegenmaßnahme: nur echte Fakten (Adresse, Telefon, Karte), „Eintrag beanspruchen“ gut sichtbar, `noindex` für zu dünne Seiten, schrittweise Freigabe an Google.
- **Keine echten Fotos:** Bei `listed` zeigen wir das Marken-Platzhalterbild. Das Quellen-Werbebild wird **nicht** gezeigt.
- **Nichts ist „geprüft“:** Solange `verified` überall `false` ist, sagt der Concierge bei jedem Unternehmen „noch nicht von der Redaktion geprüft“. Das ist ehrlich, aber wir brauchen einen Prüfweg (Admin-Schalter, Kriterien).
- **Verkauf:** Ohne reparierten Checkout gibt es keinen Umsatz. Ursache der 8 Fehlversuche ist nicht mehr nachvollziehbar (das Fehlerprotokoll ist leer). Darum Testkauf (K3).
