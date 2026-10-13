# Plan: Unternehmen, Concierge, Verkauf

Stand: 13. Oktober 2026 · Verantwortlich: Daniel Dobos (Entscheidungen) · Umsetzung: Claude
Diese Datei ist die **eine Liste, nach der wir arbeiten**. Jeder Punkt hat eine Nummer, einen Nachweis („Fertig, wenn …“) und einen Status.
Status: `[x]` fertig und geprüft · `[~]` in Arbeit · `[ ]` offen · `[?]` wartet auf Daniel.

**Grundsatz:** Der Plan folgt Daniels Geschäftsmodell, wie es auf der Website (`/advertise`), in der Preisliste (`ad_pricing`) und im Code steht. Es gibt hier keine erfundenen Preise, Tarife oder Marktannahmen. Ein früheres „Konzept“-Dokument mit eigenen Preisstufen wurde zurückgezogen und ist nicht mehr Teil des Plans.

---

## 0. Was wir wollen (in Daniels Worten)

1. Alle Unternehmen (~17.700) sind **öffentlich**, **auf der Karte** und werden **vom Concierge angeboten**.
2. Der Concierge **erkennt jedes Unternehmen**, nennt echte Fakten (Adresse, Telefon, Website) und erfindet nichts.
3. **Geprüft / ungeprüft:** Bei ungeprüften sagt der Concierge, dass die Redaktion noch nicht geprüft hat und die Angaben allgemein sind. Hinter geprüften stehen wir und empfehlen sie. Die Redaktionsprüfung erfolgt mit der Zeit.
4. **Geprüft-Zeichen** bekommen alle Abonnenten sowie alle Unternehmen, die ein Interview geben, über die ein Review gemacht oder ein Artikel geschrieben wird.
5. **Wir sind Verkaufsagent** für Firmen mit Abo: Der Concierge nennt sie **in ihrer Kategorie zuerst** und empfiehlt sie (klar gekennzeichnet).
6. **Straßenadressen** gehören in die Datenbank. **Echte Fotos** nur, wenn der Eigentümer sie zur Verfügung stellt. **Alle Koordinaten** werden gefunden.
7. **Verkaufsoptionen** (Beschreibungen, Preise, Logik) werden anhand der Website geprüft; Ziel sind ausgefeilte Produkte. Die Gründerpreise (Gründer-100) sind Daniels Plan.
8. Der Concierge **denkt logisch**, liefert die besten Informationen und weiß über Zypern fast alles.

---

## 1. Ergebnis der Datenprüfung („Alle Daten sollten in der Datenbank sein“)

| Frage | Ergebnis |
|---|---|
| Wie viele Unternehmen? | **17.833** in `directory_listings`: 14.671 `listed`, 3.076 `published`, 56 `draft` (Bauprojekte ohne Koordinaten), 30 `hidden`. |
| Ist der Atlas-Import vollständig übernommen? | **Ja.** Alle 14.671 `listed` stammen aus `atlas_import`. Telefon, Adresse, E-Mail, Website, Beschreibung: **0 Lücken**. |
| Atlas-Zeilen ohne Eintrag | 864. Davon 823 Dubletten (gleicher Name oder gleiche Telefonnummer), **41 wirklich neu** (alle mit Adresse). |
| CRM-Firmen (`crm_orgs`) | 18.010; 17.750 verknüpft; 260 ohne Eintrag: 48 Dubletten, **212 neu** (davon 60 Stufe A/B). |
| Was fehlt? | **Öffnungszeiten** (0), **griechische Namen** bei `listed` (0), **Bewertungen** bei `listed` (0), **echte Fotos** bei `listed` (das „Foto“ ist ein Werbebild der Quelle), **Websites** bei 65 % der `listed`. |
| Straßenadressen | Es fehlen bei **3.169**: 2.941 `published` (2.351 davon mit OpenStreetMap-Kennung), 142 `listed`, 56 `draft`, 30 `hidden`. |
| Koordinaten | Es fehlen bei **354**: 194 `listed` (59 mit Adresse, 28 mit Website), 104 `published` (alle mit Website, ohne Adresse), 56 `draft` (alle mit Website). 11.878 vorhandene Positionen sind aus der Adresse errechnet (`geocoded`), nicht gemessen. |
| Wie viele sind „geprüft“? | **0.** `verified = false` bei allen 17.833. |
| Karte | Die Karte liest schon `published` **und** `listed`. |
| Verkauf heute | Noch keine Verkäufe, weil die Mail-Aktion noch nicht gestartet und das Portal nicht angekündigt ist. Stripe-Konto live: 0 Produkte, 0 Checkout-Sitzungen (der Code schickt den Preis bei jeder Zahlung selbst mit, es müssen keine Preise vorab angelegt sein). `ad_orders`: 8 Einträge (19./20. September), alle „failed“, ohne E-Mail und Land, also vermutlich aus einem älteren Ablauf ohne Formular; mit dem heutigen Formular gibt es **keinen einzigen Versuch**. Ob der Kauf live bis Stripe durchläuft, ist **nicht getestet**. |
| Live-Seite `/advertise` | Listed, Featured und 7 Einzelplätze zeigen „Get started“ (Formular, dann Stripe), nur Partner zeigt „Request a quote“. |

**Technische Entdeckung für „alle veröffentlichen“:** Die Seiten `/directory/[type]` und `/directory/g/[group]` luden **alle** Einträge ohne Seitenaufteilung. Darum wurden sie vorbereitet (V1a), bevor veröffentlicht wird.

---

## 2. Arbeitspakete

### Paket S: Concierge-Schritte 1–4 (von Daniel freigegeben, Go am 13.10.)

- [x] **S1 Namenssuche.** `listed` einbeziehen; den Namen auch **mitten im Satz** finden. Code fertig und getestet (`lib/concierge/names.ts`, SQL `20261013120000_concierge_name_search.sql`). Wirkt für `listed` erst nach S-DB.
- [x] **S2 Fakten für den Concierge.** Adresse, Telefon, eigene Website (kein Facebook/Portal), kurze Übersicht; **nie Öffnungszeiten erfinden** (`lib/concierge/facts.ts`).
- [x] **S3 Saubere Stichwortsuche.** Füllwörter (7 Sprachen) raus, Namenstreffer zuerst.
- [x] **S4 Unbekannte Unternehmen.** Ehrlich „nicht in unserem Verzeichnis“, Aufnahme anbieten, Fragen ohne Treffer **protokollieren**; Admin → Analytics zeigt die Liste.
- [x] **S5 Vertrauensstufen + Verkaufsagent.** Drei Stufen: **Geprüft** („wir stehen dahinter“), **Partner** (Abo, gekennzeichnet, zuerst in der Kategorie), **Ungeprüft** (Redaktion hat noch nicht geprüft; allgemeine Angaben) (`lib/concierge/trust.ts`).
- [x] **S6 Sensible Rubriken.** Erotik-Läden, Wettbüros, Casinos, Lotterie und Waffengeschäfte stehen im Verzeichnis, der Concierge nennt sie aber nicht ungefragt, nur auf Namen oder direkte Frage (`lib/concierge/sensitive.ts`).
- [x] **S-Test.** Prüfungen in `concierge-names`, `concierge-trust`, `concierge-sensitive` und `directory-paging`; alle Testgruppen grün; `tsc` sauber.
- [~] **S-DB.** SQL-Dateien `20261013120000_concierge_name_search.sql`, `20261013121000_directory_facets.sql`, `20261013122000_directory_address_source.sql` einspielen (Anleitung und Rücknahme: `docs/CONCIERGE-UNTERNEHMEN.md`). Daniel hat am 13.10. das Go gegeben.

### Paket V: Alles veröffentlichen und auf der Karte

- [x] **V1a Seiten vorbereiten.** Seitenaufteilung für `/directory/<Art>` und `/directory/g/<Gruppe>` (48 pro Seite, `/p/<n>`), Ranking statt alphabetisch, Facetten über eine Datenbank-Zählung (`directory_facets`), „In der Nähe“ mit schrumpfendem Radius, Quellen-Werbebild wird nicht gezeigt, Hinweis „nicht von der Redaktion geprüft“ auf jeder ungeprüften Seite (7 Sprachen).
- [x] **V1b Suche und Sitemap.** Sitemap ist in Dateien à 10.000 geteilt, dünne Seiten bleiben `noindex`. Keine Änderung nötig.
- [~] **V1c Veröffentlichung.** Ablauf, Sicherung und Rückweg: `docs/VEROEFFENTLICHUNG-UNTERNEHMEN.md`. Go von Daniel am 13.10. **Fertig, wenn:** alle `listed` außer den Ausnahmen auf `published` stehen, jede Detailseite lädt, Verzeichnis und Karte zählen gleich.
- [x] **V1d Ausnahmen (entschieden).** Nicht öffentlich (auf `hidden`): die 6 Einträge der Rubrik `escort-agencies` und die 2 Platzhalter. Erotik, Wetten, Casino, Lotterie, Waffen werden veröffentlicht (S6). Die 56 Entwürfe und die 30 versteckten (18 im besetzten Norden) bleiben unverändert.
- [ ] **V2 Alle Koordinaten.** 354 fehlen (siehe Abschnitt 1). Vorgehen: Ultimate Web Scraper an Beispielen testen und ehrlich berichten, Adresse→Punkt über OpenStreetMap, Firmen-Websites lesen; Genauigkeit in `coords_precision`. Sicherung vorher.
- [ ] **V3 Concierge-Index.** Embeddings nach der Veröffentlichung auffrischen (`/api/concierge/embed-directory`, braucht den Admin-Zugang).

### Paket A: Adressen, Fotos, Geprüft

- [ ] **A1 Straßenadressen.** 3.083 veröffentlichte/gelistete Einträge ohne Adresse. 2.351 haben eine OSM-Kennung (Adresse aus den OSM-Tags), der Rest bekommt sie aus den Koordinaten. Es werden nur belastbare Straßenadressen gespeichert; `address_source` hält fest, woher sie stammt (`osm`, `osm-reverse`). Sicherung vorher.
- [ ] **A2 Echte Fotos.** Nur vom Eigentümer (Weg besteht: Einreichung, Freigabe durch die Redaktion, Feld `owned_photos`). Bis dahin zeigt die Seite das Markenbild, nie das Werbebild der Quelle.
- [?] **A3 Geprüft-Regel.** Zeichen für Abonnenten (Listed, Featured, Partner setzen `verified` heute automatisch bei Zahlung) und für Unternehmen mit Interview, Review oder Artikel. Offen: Ablauf nach Ende eines Abos, Wortlaut der Standards-Seite (sie sagt heute, jedes gelistete Unternehmen sei geprüft und Bezahlen ändere nie, wie geprüft wird). Wartet auf Daniels Entscheidung.

### Paket D: Datenqualität

- [ ] **D1 Namen.** 1.198 `listed`-Namen in GROSSBUCHSTABEN und 525 mit „- Cyprus“ schön schreiben (Original bleibt in `name_raw`).
- [ ] **D2 Kategorien.** 2.142 `listed` in „general-vendor“ neu einordnen.
- [ ] **D3 41 neue Atlas-Firmen und 212 neue CRM-Firmen** aufnehmen (CRM-Stufe A/B zuerst).
- [ ] **D4 Öffnungszeiten und Websites** anreichern (nur aus belegten Quellen, nie geraten).

### Paket K: Angebote (Preisliste und Website) nachbessern

Grundlage ist ausschließlich die Live-Seite `/advertise`, die Preisliste (`ad_pricing`) und der Code. Preise und Gründer-100 bleiben Daniels Entscheidung.

Befunde:
1. Kein Kauf ist je durchgelaufen; mit dem heutigen Formular gibt es keinen Versuch (Testkauf fehlt).
2. „Die ersten 100“ ist nur ein Text; im Code gibt es keinen Zähler und keine Sperre.
3. Alleinstellung („Directory – category exclusive“, Partner, Section sponsorship) kann doppelt verkauft werden: das Formular fragt Kategorie/Rubrik nicht ab, geprüft wird erst von Hand nach der Zahlung.
4. Wichtige Angaben (Kategorie, Rubrik, Sendetermin, Eventdaten) kommen erst nach der Zahlung per Mail.
5. „Premium listing (Listed tier)“ ist dasselbe Angebot wie „Listed“ (149 €/Jahr, gleiche Abwicklung); beide stehen auf der Seite.
6. Featured (49 €/Monat) ist günstiger als seine Teile (Listed plus vier Sponsored Features); jedes Abo löst vier Redaktionstexte pro Jahr aus. Gewollt?
7. Standards-Seite und Preisliste widersprechen sich bei „verified“.
8. Namen und Beschreibungen der Angebote gibt es nur auf Englisch (`label_de` … leer).

- [?] **K1 Vorschläge, die nur eigene Versprechen einlösen** (keine neuen Preise): echter Gründer-Zähler mit automatischem Normalpreis · Formular je Angebot (Kategorie, Rubrik, Sendetermin, Eventdaten) mit Verfügbarkeitsprüfung · Duplikat „Premium listing“ entfernen · Namen und Beschreibungen in 7 Sprachen · Geprüft-Regel (A3) · Testkauf. Wartet auf Daniels Freigabe.
- [ ] **K2 Marktvergleich** nur auf Wunsch und mit den Wettbewerbern, die Daniel nennt.
- [ ] **K3 Testkauf.** Ein echter Durchlauf mit kleinem Betrag, danach Rückerstattung (nur mit Daniels OK; das Stripe-Konto ist live).

### Paket C: Concierge „allwissend und logisch“

- [ ] **C1 Wissenslücken** der Wissensbasis (Recht, Steuern, Immobilien, Umzug, Mode/Style, Urlaub, Investieren) mit der Liste aus „Fragen ohne Treffer“ füllen.
- [ ] **C2 Denkregeln:** Rückfragen bei Unklarem, Vergleich mit Begründung, Tagesplan, ehrliche Grenzen.
- [ ] **C3 Prüfkatalog** mit 60 echten Fragen in 7 Sprachen und Soll-Antworten; läuft bei jeder Änderung.

---

## 3. Reihenfolge

1. **Concierge-Code live:** Pull Request, Vorschau prüfen, mergen → SQL einspielen (S-DB).
2. **Unternehmensdaten:** Veröffentlichung (V1c) → Adressen (A1) → Koordinaten (V2) → Embeddings (V3).
3. **Danach, nach Daniels Entscheidung:** A3 (Geprüft-Regel), K1 (Nachbesserungen), K3 (Testkauf).
4. **Laufend:** D und C.

## 4. Was nur Daniel tun oder freigeben kann

| Punkt | Was | Warum |
|---|---|---|
| V3 | `embed-directory` mit Admin-Anmeldung auslösen | braucht den Admin-Zugang |
| Search Console | Sitemap bei Google einreichen, Indexierung wöchentlich ansehen | Google-Konto |
| A3 | Wortlaut „Geprüft“ auf der Standards-Seite, Verhalten nach Ende eines Abos | öffentliche Zusage der Marke |
| K1 | Welche Nachbesserungen der Angebote | Geschäftsentscheidung |
| K3 | Testkauf mit echtem Geld | Stripe-Konto ist live |
| Vercel | Schlüssel/Variablen (nie im Chat!) | z. B. für `embed-directory` |

## 5. Risiken, die wir offen sagen

- **Dünne Seiten:** Die Texte der 14.671 `listed` sind kurz und automatisch geschrieben. Google kann viele davon als wenig nützlich einstufen. Gegenmaßnahme: nur echte Fakten (Adresse, Telefon, Karte), „Eintrag beanspruchen“ gut sichtbar, `noindex` für zu dünne Seiten, danach wöchentlich die Zahl der indexierten Seiten ansehen.
- **Keine echten Fotos:** Bei `listed` zeigen wir das Marken-Platzhalterbild. Das Quellen-Werbebild wird **nicht** gezeigt.
- **Nichts ist „geprüft“:** Solange `verified` überall `false` ist, sagt der Concierge bei jedem Unternehmen „noch nicht von der Redaktion geprüft“. Das ist ehrlich.
- **Standards-Seite:** Der Satz „Jedes von uns gelistete Unternehmen ist … geprüft“ stimmt mit 17.700 ungeprüften Einträgen nicht mehr. Er muss mit der Entscheidung zu A3 geändert werden.
- **Adressen aus Koordinaten:** Eine rückwärts gefundene Adresse kann das Nachbarhaus sein. Darum steht die Herkunft in `address_source`.
- **Verkauf:** Ohne gelungenen Testkauf (K3) ist nicht bewiesen, dass die Kasse live funktioniert.
