# Konzept: Verkauf, Preise, Philosophie

Für Daniel Dobos · 13. Oktober 2026 · Gehört zu `docs/PLAN-UNTERNEHMEN-CONCIERGE-VERKAUF.md` (Paket K).
Sichtweise: ein Berater, der diese Plattform kaufen oder sanieren soll. Das heißt: erst die Zahlen, dann die Meinung, dann der Vorschlag. Preise sind **Vorschläge zur Entscheidung**, nichts davon ist umgesetzt.

---

## 1. Das Urteil in zehn Zeilen

1. **Das Wertvollste, was ihr habt, ist die Datenbank (17.833 Firmen, 7 Sprachen, Karte, Concierge) und die Marke („Aegean Nocturne“).** Nicht die Reichweite: die ist heute fast null.
2. **Es gab nie einen Verkauf.** 0 Bestellungen, 0 Stripe-Sitzungen (8 Versuche scheiterten im September), 0 Mitglieder, 0 Anfragen über Verzeichnis oder Werbung, 2 Newsletter-Abonnenten, etwa 64 Concierge-Fragen in 30 Tagen, 3 Anfragen.
3. **Die heutige Preisliste verkauft Reichweite, die es noch nicht gibt.** Banner, Newsletter-Platz und „Sponsored Feature“ sind Medien-Produkte. Für sie braucht man ein Publikum und Zahlen im Mediakit. Beides fehlt.
4. **Geld verdient diese Plattform dort, wo jemand kurz davor ist, Geld auszugeben:** Immobilie kaufen, umziehen, Anwalt/Steuerberater/Bank finden, ein Hotel oder eine Villa buchen. Dort ist eine Vermittlung 50 bis 2.000 Euro wert, ein Banner nur Cent.
5. **Darum: vom Medienverkauf zum Vermittlungsverkauf.** Der Concierge ist der Verkäufer (so wie Daniel es will): Er empfiehlt Partner zuerst, kennzeichnet sie, übergibt qualifizierte Anfragen und wir verdienen am Ergebnis.
6. **Das Vertrauen ist das Produkt. Man darf es nie verkaufen.** „Geprüft“ muss man sich verdienen, nicht kaufen. Bezahlen kann man Sichtbarkeit, Vorrang und Werkzeuge, aber nur **auf** dem Boden „geprüft“.
7. **Das Konzept bewahrt ihr mit zwei Ebenen:** **Die Auswahl** (geprüft, redaktionell, Marke) und **Das Verzeichnis** (alle 17.700, nützlich, ehrlich als „nicht geprüft“ gekennzeichnet). Alles ist findbar, aber die Marke zeigt nur die Auswahl.
8. **Preise:** Einstieg niedrig und klar (Gratis, dann ca. 29 Euro im Monat), High-Ticket-Kategorien mit Exklusivität und Erfolgsbeteiligung. Keine erfundenen Streichpreise.
9. **Zuerst reparieren, was schon fertig sein sollte:** Kasse (Testkauf), doppeltes Angebot streichen, Einheiten vereinheitlichen, Preisseite ehrlich machen.
10. **Rechtlich vor dem Provisionsmodell klären (nach meinem Kenntnisstand, bitte vom Anwalt bestätigen lassen):** Anwälte dürfen voraussichtlich keine Vermittlungsprovision teilen, Immobilienmakler brauchen eine Lizenz, Finanzprodukte unterliegen CySEC. Das entscheidet, wo Erfolgsbeteiligung geht und wo nur Festpreis.

---

## 2. Ausgangslage in Zahlen

| Kennzahl | Wert | Quelle |
|---|---|---|
| Firmen im Verzeichnis | 17.833 (14.671 importiert, 3.076 veröffentlicht, 86 Entwürfe/versteckt) | Datenbank |
| davon redaktionell geprüft | **0** | `verified` |
| davon bezahlend | **0** | `commercial_tier` leer |
| Bestellungen / Stripe-Sitzungen | **0 / 0** (8 gescheiterte Versuche 19./20. Sept.) | `ad_orders`, Stripe live |
| Mitglieder Concierge-Mitgliedschaft | 0 | `concierge_members` |
| Anfragen über Werbung / Verzeichnis | 0 / 0 | `ad_leads`, `directory_leads` |
| Newsletter-Abonnenten | 2 | `newsletter_subscribers` |
| Concierge-Fragen in 30 Tagen | 64 | `concierge_events` |
| Concierge-Anfragen (Mensch) / Buchungen | 3 / 1 | `concierge_requests`, `bookings` |
| CRM: Firmen als Interessenten | 18.010 (67 Stufe A, 86 Stufe B) | `crm_orgs` |

**Was daraus folgt:** Die Plattform ist technisch weit (Mehrsprachigkeit, Karte, Concierge, Zahlungen mit USt-Prüfung, Provisionsbuch, Partner-Anfragen), aber **kommerziell nicht gestartet**. Eine Preisliste für ein etabliertes Medium passt nicht zu einem Start. Das ist keine Schande, es bestimmt nur die Reihenfolge.

---

## 3. Die zehn heutigen Angebote: Befund

Alle Preise ohne USt. „Liste“ ist der durchgestrichene Preis, der heute auf der Seite steht.

| Angebot | Heute | Liste | „Rabatt“ | Befund | Empfehlung |
|---|---|---|---|---|---|
| **Listed** (Jahr) | 149 € | 490 € | −70 % | Preis plausibel (Tripadvisor ab ca. 99 $/Jahr). Verspricht „verified profile“: **verkauft den Prüfstempel** | behalten, Inhalt umbauen (Abschnitt 5) |
| **Featured** (Monat) | 49 € | 199 € | −75 % | Enthält „ein Sponsored Feature pro Quartal“ (einzeln 149 bis 490 €) und Newsletter-Erwähnung (2 Abonnenten). **Wert im Paket über dem Preis**: Verlust bei jedem Kunden | umbauen |
| **Partner** (Jahr) | ab 3.000 € | 6.000 € | −50 % | Nur Anfrage, keine definierten Leistungen, „by invitation“. Als Spitze richtig, aber ohne Belege unverkäuflich | umbauen: Erfolgsanteil |
| **Banner Startseite/Seitenleiste** (Monat) | 79 € | 300 € | −74 % | Vergleich: Vestnik Kipra (70 bis 80 Tsd. Nutzer/Monat) verlangt 400 bis 1.000 € im Monat. **Ohne eigene Besucherzahl nicht zu bewerten** | pausieren bis Zahlen da |
| **Section Sponsorship** (Monat) | 149 € | 490 € | −70 % | Vergleich „Themen-Sponsor“ bei Vestnik: 400 € für 3 Monate, 550 € für 6 Monate (ca. 92 bis 133 €/Monat). Preis liegt im Markt | behalten, später |
| **Sponsored Feature** (Stück) | 149 € | 490 € | −70 % | Vergleich: Artikel 350 €, Interview 550 € (Vestnik). Unser Artikel kostet in der Herstellung wenig (7 Sprachen aus einer Pipeline), Preis zu niedrig | auf ca. 350 € anheben |
| **Saturday Letter** Alleinsponsor | 79 € | 250 € | −68 % | 2 Abonnenten. Vergleich: Vestnik verlangt 100 € je Newsletter | nicht verkaufen, bis es Abonnenten gibt |
| **Directory Category Exclusive** (Monat) | 39 € | 150 € | −74 % | Gute Idee, falsch bepreist: **Exklusivität ist das knappste und wertvollste Gut**, und sie kostet hier weniger als ein Mittagessen | zum Kern des Partner-Angebots machen |
| **Agenda Event** (Stück) | 19 € | 90 € | −79 % | Einstiegsprodukt, niedrige Hürde, sinnvoll. Vergleich Social-Post bei Vestnik: 90 € | behalten (ca. 39 €) |
| **Premium listing** (Jahr) | 149 € | 490 € | −70 % | **Doppelt**: identisch mit „Listed“ | streichen |

**Fünf strukturelle Fehler**

1. **Erfundene Ankerpreise.** Alle zehn Angebote zeigen −50 bis −79 % gegenüber einem Listenpreis, den nie jemand gezahlt hat. Im B2B-Geschäft wirkt das schwach (Käufer rechnen nach) und es ist die Art von Muster, die bei Verbraucherschutz-Prüfungen auffällt. Besser: **ein ehrlicher Preis** und ein echter Gründerbonus (Preis garantiert, Vorrang, Abzeichen).
2. **Drei Preiseinheiten.** Jahr, Monat, Stück: ein Kunde kann „Listed“ und „Featured“ nicht vergleichen. Alles in **Euro pro Monat, bei Jahreszahlung mit 2 Monaten Rabatt**.
3. **Ein Paket, das den Einzelverkauf auffrisst** (Featured enthält Features, die einzeln mehr kosten als das Paket).
4. **Das Wertversprechen ist „gesehen werden“.** Es fehlt der Beleg (Besucher, Anfragen) und das Ergebnis (Anfragen, Buchungen). Kein Kunde kann nach 3 Monaten sagen, ob es sich gelohnt hat.
5. **Der Kauf funktioniert nicht.** 9 von 10 Angeboten führen zu „Get started“ → Formular (Land, USt-ID) → Stripe. Acht Versuche endeten ohne Stripe-Sitzung. Die Ursache ist nicht mehr nachvollziehbar (Fehlerprotokoll leer). **Vor jedem Preisgespräch: Testkauf.**

**Was gut ist:** Kennzeichnung bezahlter Platzierungen, USt-Logik mit VIES-Prüfung, Sieben-Sprachen-Auslieferung, Stripe-Kundenportal, Provisionsbuch (nur Aufzeichnung), Partner-Anfragen für Buchungen. Das ist die Substanz, auf der der Verkauf aufbauen kann.

---

## 4. Die Philosophie: eine Auswahl, kein Telefonbuch

**Leitsatz: „Die Insel, redigiert.“** (The island, edited.)

Die Plattform deckt vier Lebensbereiche ab (Mode und Style zusammen), die eine Reise bilden: **Urlaub** → **Style & Mode** (der Geschmack, der die Marke trägt) → **Investieren** → **Umziehen**. Wer einmal zum Urlaub kommt, will vielleicht bleiben, kaufen, investieren. Jede Stufe hat Firmen, die gebraucht werden.

| Bereich | Wer sucht | Was wir veröffentlichen | Wer zahlt | Produkt |
|---|---|---|---|---|
| **Urlaub** | Gäste, Paare, Familien | Hotels, Restaurants, Strände, Erlebnisse, Agenda | Hotels, Gastronomie, Anbieter | Partner Prime, Buchungsprovision (GetYourGuide, Hotels) |
| **Style & Mode** | Kundschaft mit Geschmack | Boutiquen, Designer, Beauty, Interior, Kunst | Marken, Salons, Galerien | Partner Prime, Sponsored Feature, Agenda |
| **Investieren** | Käufer, Anleger | Bauträger, Makler, Anwälte, Banken, Steuer | Bauträger, Makler, Berater | **Partner Exklusiv** mit Vermittlung |
| **Umziehen** | Zuzügler, Familien | Umzug, Schulen, Ärzte, Versicherung, Behörden-Wissen | Dienstleister, Schulen, Kliniken | **Partner Exklusiv**, „Relocation Roadmap“ |

**Wie das Konzept geschützt wird (sieben Regeln):**

1. **Zwei Ebenen.** *Die Auswahl* = geprüfte und redaktionell ausgewählte Firmen. Sie trägt Startseite, Luxury-Seite, Newsletter, Social Media und die ersten Plätze des Concierge. *Das Verzeichnis* = alle Firmen, nützlich und ehrlich („von der Redaktion noch nicht geprüft“). Alles ist auffindbar, aber nur die Auswahl ist Marke.
2. **Geprüft ist nicht käuflich.** Kriterien schriftlich (Inhaberbestätigung, Registrierung/Lizenz, Kontaktdaten stimmen, Mindestqualität, keine Beschwerden). Bezahlt wird nie für den Stempel.
3. **Bezahltes ist immer gekennzeichnet** („Partner“), im Text und in der Karte, auch im Concierge.
4. **Der Concierge lügt nicht:** nichts erfunden, Lücken benannt („das haben wir nicht“), Partner nie als „der Beste“ ausgegeben, wenn Besseres in der Liste steht.
5. **Redaktion und Verkauf getrennt.** Wer Partner ist, bekommt keinen Einfluss auf Berichte; ein Sponsored Feature trägt den Vermerk.
6. **Eine Qualitätsstufe für Texte** (die Voice-Engine, sieben Sprachen, ohne Quellenangabe, ohne Füllwörter): gilt auch für Partner-Texte.
7. **Wachsen nur mit Beleg.** Ein Produkt wird erst öffentlich verkauft, wenn die Zahl dahinter belegbar ist (Besucher, Anfragen, Buchungen).

---

## 5. Der Vorschlag: Produktleiter und Preise

Alle Preise ohne USt, in Euro. **Vorschlag**, ausgerichtet an Marktdaten (Abschnitt 8).

### 5.1 Die Leiter

| Stufe | Preis | Was der Kunde bekommt | Was wir davon haben |
|---|---|---|---|
| **0 Verzeichnis** | 0 | Seite mit Name, Adresse, Telefon, Karte; Hinweis „nicht geprüft“ | Reichweite, Daten |
| **1 Eintrag beanspruchen** | 0 | Inhaber bestätigt, ergänzt Fotos, Öffnungszeiten, Beschreibung (redaktionell geprüft) | verlässliche Daten, Adressen der Inhaber, **Verkaufskontakt** |
| **2 Geprüft** | 0 (verdient) | Abzeichen „Geprüft“, Aufnahme in *Die Auswahl*, Concierge empfiehlt sicher | Vertrauen; Voraussetzung für Stufe 3 |
| **3 Partner Local** | **29 €/Monat** (290 €/Jahr) | Vorrang in Kategorie und Bezirk unter den Geprüften, Kennzeichnung „Partner“, Anfragen (E-Mail/WhatsApp), Monatsbericht (Aufrufe, Anfragen, Concierge-Nennungen) | wiederkehrender Umsatz, Masse |
| **4 Partner Prime** | **149 €/Monat** (1.490 €/Jahr) | alles aus Local + Platz in den Themen-Seiten (Style, Table, Escapes), Concierge-Spitzenempfehlung, 1 Sponsored Feature pro Jahr (siehe 5.3), Agenda-Hervorhebung | mittlerer Umsatz |
| **5 Partner Exklusiv** | **ab 490 €/Monat + Erfolgsanteil** | **eine Firma pro Kategorie und Bezirk**, Concierge nennt sie zuerst, Serie/Interview, qualifizierte Anfragen mit Übergabe | Hauptumsatz in Investieren/Umziehen |

Gründungsangebot (ehrlich): **die ersten 25 Partner pro Stufe** bekommen den Preis **24 Monate garantiert**, ein „Gründungspartner“-Abzeichen und bei Exklusiv die Wahl der Kategorie zuerst. Keine Streichpreise.

### 5.2 Preislogik (warum diese Zahlen)

- **Local 29 €**: In vielen Branchen genügt **eine zusätzliche** Anfrage im Jahr, damit sich der Preis trägt. Tripadvisor liegt bei ca. 99 $/Jahr (Hotels, Basis), 2GIS Zypern verlangte 2017 180 bis 720 € für 3 bis 12 Monate. 290 €/Jahr ist ein selbstverständlicher Kauf für einen Salon, einen Installateur, ein Restaurant.
- **Prime 149 €**: Das Vestnik-Banner kostet 400 bis 1.000 €/Monat, der Themen-Sponsor ca. 92 bis 133 €/Monat. 149 €/Monat ist für Hotels, Kliniken, Boutiquen und Schulen ein Marketingbudget mit klarem Gegenwert (Concierge-Spitzenempfehlung statt Banner).
- **Exklusiv 490 € + Erfolgsanteil**: Exklusivität (nur eine Firma pro Kategorie und Bezirk) ist das knappste Gut und das, wofür Bauträger, Makler und Berater zahlen. Dazu eine Erfolgsbeteiligung, damit wir von qualifizierten Anfragen leben, nicht von Hoffnung.
- **Rechenbeispiel Immobilie:** Käufer-Anfrage → Makler; Immobilie 400.000 € × 3 % Provision = 12.000 € Maklerumsatz. Eine Vermittlungsbeteiligung von 10 bis 20 % davon wäre 1.200 bis 2.400 € je Abschluss. Schon ein Abschluss pro Jahr trägt einen Exklusiv-Partner. (Rechtlicher Rahmen siehe Abschnitt 9.)
- **Jährliche Zahlung = 2 Monate geschenkt** (Local 290 statt 348 €).

### 5.3 À-la-carte neu geordnet

| Produkt | Neu | Bedingung |
|---|---|---|
| Sponsored Feature (7 Sprachen, redaktionell, gekennzeichnet) | **350 €** (Interview 550 €) | sofort verkaufbar, Herstellungskosten gering |
| Agenda-Event hervorgehoben | **39 €** | sofort |
| Section-Sponsor (Themenseite, 3 Monate) | **400 €** | wenn die Themenseite messbaren Verkehr hat |
| Newsletter-Sponsor | **ab 100 € je Ausgabe** | erst ab 2.000 Abonnenten |
| Banner | **ruhend** | erst mit Mediakit (Besucher, Reichweite) |
| Premium listing | **gestrichen** | Duplikat von „Listed“ |

### 5.4 Leistungsgebühren („Sales-Agent“)

| Kategorie | Modell | Rahmen (Vorschlag) | Voraussetzung |
|---|---|---|---|
| Hotels, Gastronomie, Erlebnisse | Buchungsprovision | 8 bis 15 % je bestätigter Buchung; Provisionsbuch ist da | Vereinbarung je Partner |
| Bauträger, Makler | Erfolgsanteil an der Maklerprovision | 10 bis 20 % (Beispiel) | Lizenz-/Rechtsprüfung, schriftlicher Vermittlervertrag |
| Anwälte | **nur Festpreis** | Partner Exklusiv ohne Erfolgsanteil | Standesregeln (kein Teilen von Honoraren) |
| Banken, Versicherungen, Finanzberatung | **nur Festpreis** | Partner Exklusiv ohne Erfolgsanteil | CySEC-/IDD-Regeln, nicht ohne Rechtsrat |
| Umzug, Schulen, Kliniken | Anfragegebühr | 25 bis 150 € je qualifizierte Anfrage | Einwilligung des Gastes zur Weitergabe |

---

## 6. Das Verkaufssystem: wie 17.700 Firmen zu Kunden werden

**Der Trichter** (alles ist schon halb vorhanden: Seiten, Beanspruchen-Formular, CRM mit 18.010 Firmen, Vorlagen, Anreicherung):

1. **Gefunden werden:** Jede Firma hat eine Seite (nach der Veröffentlichung), Google findet sie.
2. **Anschreiben mit Beleg:** „Ihre Firma steht bei uns. In diesem Monat haben X Gäste den Concierge nach einer Zahnarztpraxis in Limassol gefragt.“ Die Zahl kommt aus den Concierge-Fragen (anonym).
3. **Beanspruchen** (kostenlos) → **Prüfen** (Kriterien) → **Partner-Angebot** mit Monatsbericht als Beweis.
4. **Concierge vermittelt:** erst Partner in der Kategorie, dann Geprüfte, dann Verzeichnis (Regeln stehen im Code, `docs/CONCIERGE-UNTERNEHMEN.md`).
5. **Bericht, Verlängerung:** monatlich Aufrufe, Anfragen, Concierge-Nennungen; vor Ablauf Verlängerungsangebot.

**Reihenfolge der Ansprache:** Stufe A/B im CRM (153 Firmen: Luxus-Handel, Fine Dining, Beauty, Recht/Umzug, Interior, Luxus-Immobilien) zuerst, dann Kategorien, in denen der Concierge schon gefragt wird.

**Kennzahlen:** Beanspruchungsrate, Prüfquote, Partner-Quote, Umsatz je Partner, Abwanderung, Anfragen je Partner, Umsatz je 1.000 Besucher.

---

## 7. Der Concierge als Verkäufer und Wissensträger

**Schon umgesetzt (Paket S):** nennt Firmen auch mitten im Satz, kennt Adresse/Telefon/Website, sagt ehrlich „nicht im Verzeichnis“, drei Vertrauensstufen, Partner zuerst in der Kategorie mit Kennzeichnung.

**Als Nächstes (Paket C):**

- **Führen statt Auflisten:** Bei Investieren/Umziehen stellt er **zwei bis drei Rückfragen** (Budget, Zeitpunkt, Familie/Beruf), bevor er Firmen nennt, und fasst das Ergebnis für die Übergabe zusammen.
- **Übergabe mit Einwilligung:** „Darf ich Ihre Anfrage an unseren Partner X weitergeben?“ Erst nach Ja werden Kontaktdaten übergeben (Datenschutz). Die Anfrage landet im bestehenden Anfragen-/Desk-System; Provisionsbuch ist vorhanden.
- **Wissen:** Die Liste „Fragen ohne Treffer“ (Admin → Analytics) füllt die Wissensbasis. Themen-Pakete: Aufenthalt und Steuern, Immobilienkauf (Ablauf, Kosten, Anwalt), Schulen, Gesundheit, Umzug, Auto, Banken, Behörden, Mode-/Style-Adressen, Gastronomie, Erlebnisse.
- **Prüfkatalog:** 60 echte Fragen in 7 Sprachen mit Soll-Antworten; läuft nach jeder Änderung (Eval vorhanden: `concierge-eval`).
- **„Allwissend“ heißt ehrlich:** alles, was belegt ist, vollständig; was unsicher ist, als unsicher; was fehlt, als Aufgabe für die Redaktion.

---

## 8. Marktvergleich (Anker für die Preise)

| Anbieter | Produkt | Preis (ohne USt) | Quelle |
|---|---|---|---|
| Vestnik Kipra (russischsprachig, ca. 70 bis 80 Tsd. Nutzer/Monat, 300 Tsd. Seitenaufrufe) | Banner 310×310, 1 Monat | 400 bis 700 € | [Mediakit 2026](https://vkcyprus.com/wp-content/uploads/2026/03/vk-media-kit-2026-short.pdf) |
| dasselbe | Top-Banner, 1 Monat | 950 € | dasselbe |
| dasselbe | Homepage Partner, 1 Monat | 1.000 € | dasselbe |
| dasselbe | Themen-Sponsor | 400 € (3 Monate), 550 € (6 Monate) | dasselbe |
| dasselbe | Artikel / Interview | 350 € / 550 € | dasselbe |
| dasselbe | Newsletter-Platz | 100 € je Ausgabe | dasselbe |
| dasselbe | Social-Post | 90 € | dasselbe |
| Tripadvisor | Business Advantage (Hotels), Basis | ab 99 $/Jahr (ältere Quelle: ab 499 $) | [Tripadvisor](https://www.tripadvisor.com/BusinessAdvantage) |
| 2GIS Zypern (2017) | Online-Paket | 180 / 360 / 720 € für 3 / 6 / 12 Monate | [2GIS-Preisliste](https://static.2gis.com/files/price/2gis_price_gr_cyprus_022017.pdf) |

Grenzen: Eine Preisliste von Cyprus Mail, Yellow Pages oder Bazaraki war öffentlich nicht zu finden. Die Zahlen oben sind Anker, kein Beweis. Vor dem Start der Preisseite: 3 bis 5 Gespräche mit Interessenten aus CRM-Stufe A/B.

**Modellrechnung für 12 Monate** (Annahmen, kein Versprechen; setzt wachsende Besucherzahlen voraus):

| Szenario | Local | Prime | Exklusiv | Vermittlungen | Umsatz/Jahr (ca.) |
|---|---|---|---|---|---|
| vorsichtig | 25 × 290 € | 5 × 1.490 € | 2 × 6.000 € | 60 × 60 € | **30 Tsd. €** |
| Basis | 80 × 290 € | 15 × 1.490 € | 6 × 8.000 € | 200 × 70 € | **108 Tsd. €** |
| ehrgeizig | 200 × 290 € | 40 × 1.490 € | 15 × 8.000 € | 600 × 70 € | **280 Tsd. €** |

---

## 9. Risiken und rechtliche Punkte (vor dem Start prüfen lassen)

1. **Anwälte:** Nach meinem Kenntnisstand verbieten die zypriotischen Standesregeln Honorarteilung/Vermittlungsprovision an Nicht-Anwälte. Bis zur Bestätigung durch einen Anwalt nur Festpreis-Partnerschaft.
2. **Immobilien:** Makeln braucht nach meinem Kenntnisstand eine Registrierung (Immobilienmakler-Gesetz); als Werbe-/Vermittlungsplattform arbeiten, nicht als Makler; Vertrag mit dem lizenzierten Makler schriftlich.
3. **Finanzprodukte/Versicherung:** CySEC/IDD-Regeln (zu prüfen); keine Empfehlung von Produkten ohne Registrierung.
4. **Offenlegung:** Provisionen und bezahlte Platzierungen immer kennzeichnen (steht schon so in den FAQ).
5. **Datenschutz:** Weitergabe von Gästedaten nur mit ausdrücklicher Einwilligung; Löschweg für Firmen (Beanspruchen/Kontakt) in der Datenschutzerklärung benennen.
6. **Streichpreise:** erfundene Listenpreise vermeiden.
7. **Sensible Kategorien** (Escort, Sex-Shops, Glücksspiel): Marke und Recht; siehe `docs/VEROEFFENTLICHUNG-UNTERNEHMEN.md`.
8. **USt/Stripe:** schon geregelt (VIES); Testkauf nach jeder Preisumstellung.

---

## 10. Entscheidungen, die ich von Daniel brauche

| # | Frage | Meine Empfehlung |
|---|---|---|
| 1 | Verkauf auf **Vermittlung** ausrichten (Stufen 3 bis 5 plus Leistungsgebühr), Banner pausieren? | **Ja** |
| 2 | „Geprüft“ ist **verdient und gratis**, Bezahlen setzt „geprüft“ voraus? | **Ja** (schützt die Marke) |
| 3 | Preise wie in 5.1: Local 29, Prime 149, Exklusiv ab 490 + Erfolgsanteil? | **Ja**, nach 3 bis 5 Kundengesprächen justieren |
| 4 | Gründungsangebot: 25 Partner je Stufe, 24 Monate Preisgarantie, keine Streichpreise? | **Ja** |
| 5 | Wer prüft Firmen und nach welchen Kriterien (Entwurf in `docs/` folgt auf Wunsch)? | Redaktion, schriftliche Checkliste |
| 6 | Rechtsrat zu Anwalt/Makler/CySEC einholen, bevor Erfolgsanteile gelten? | **Ja** |
| 7 | Testkauf mit echtem Geld (kleiner Betrag, danach Rückerstattung)? | **Ja**, vor allem anderen |

## 11. Umsetzung (nach Daniels Entscheidung, Paket K2)

| Schritt | Inhalt | Aufwand (grob) |
|---|---|---|
| K2.1 | Kasse reparieren: Testkauf, Ursache finden (Stripe-Steuer/Adresse/Schlüssel), Fehlerprotokoll sichtbar | 0,5 Tag |
| K2.2 | `ad_pricing` neu: Stufen 3 bis 5, Einheit Monat/Jahr, Streichpreise raus, Duplikat raus; Preisseite und FAQ (7 Sprachen) | 1,5 Tage |
| K2.3 | Prüfweg: Admin-Schalter „geprüft“, Checkliste, Beanspruchen → Prüfen → Partner; Abzeichen auf Seiten | 2 Tage |
| K2.4 | Partner-Bericht (Monat) aus vorhandenen Messdaten, E-Mail an Partner | 1,5 Tage |
| K2.5 | Concierge-Übergabe mit Einwilligung, Anbindung an Anfragen und Provisionsbuch | 2 Tage |
| K2.6 | CRM-Ansprache: Vorlagen mit Nachfrage-Zahlen, Stufe A/B zuerst | 1 Tag |
| K2.7 | Mediakit-Seite mit echten Zahlen (sobald gemessen) | 0,5 Tag |
