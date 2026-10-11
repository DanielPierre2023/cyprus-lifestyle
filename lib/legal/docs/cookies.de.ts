import type { LegalDoc } from '@/lib/legal/types';

export const cookiesDe: LegalDoc = {
  title: 'Cookie-Richtlinie',
  dek: 'Welche Cookies und ähnlichen Browser-Speicher Cyprus Lifestyle verwendet, wozu, wie lange und wie Sie die Kontrolle behalten.',
  sections: [
    { h: '1. Worum es in dieser Richtlinie geht', p: [
      'Diese Richtlinie erklärt die auf {site} verwendeten Cookies, Browser-Speicher (z. B. localStorage) und ähnlichen Technologien. Grundlage sind die ePrivacy-Richtlinie 2002/58/EG, in Zypern umgesetzt durch das Gesetz 112(I)/2004 über die Regulierung der elektronischen Kommunikation und der Postdienste, sowie die DSGVO. Wie wir personenbezogene Daten allgemein verarbeiten, steht in der Datenschutzerklärung.',
    ] },
    { h: '2. Wie die Einwilligung auf dieser Website funktioniert', p: [
      'Beim ersten Besuch bittet Sie ein Hinweis, zu akzeptieren oder abzulehnen. Solange Sie nicht gewählt haben und wenn Sie ablehnen, laden wir keine optionale Analyse und keine Partner-Tracking-Skripte. Ihre Wahl wird in Ihrem Browser gespeichert (Eintrag cl-consent); der Hinweis erscheint dann nicht mehr. Die in Abschnitt 3 und 4 genannten notwendigen und funktionalen Einträge benötigen keine Einwilligung, da sie nur dazu dienen, etwas bereitzustellen, das Sie angefordert haben (z. B. die gewählte Sprache oder die Anmeldung als Mitglied).',
    ] },
    { h: '3. Cookies, die wir setzen', p: ['Sie werden nicht für Werbung oder seitenübergreifendes Tracking verwendet.'], li: [
      'NEXT_LOCALE: merkt sich die Sprache, die Sie im Sprachwechsler wählen. Wird von Ihrem Browser gesetzt, wenn Sie eine Sprache wählen; 1 Jahr.',
      'cl_member: hält Sie als Mitglied angemeldet (und gibt Ihnen die Prioritätsspur für Mitglieder). HttpOnly, Secure, SameSite=Lax; nur gesetzt, wenn Sie sich anmelden oder Ihre Mitgliedschaft wiederherstellen; bis zu 30 Tage, verlängert, solange Sie die Website nutzen; entfernt bei Abmeldung.',
      'cl_business: hält Unternehmensinhaber im Bereich des Unternehmenskontos angemeldet. HttpOnly, Secure, SameSite=Lax; 14 Tage.',
      'cl_owner_sess: eine kurze Bearbeitungssitzung für Inhaber eines Verzeichniseintrags, die einen per E-Mail gesendeten Verwaltungslink geöffnet haben. HttpOnly, Secure, SameSite=Lax; 60 Minuten.',
      'Anmelde-Cookies für Mitarbeiter (Supabase) werden nur für unsere Redaktion im Verwaltungsbereich gesetzt, nie für normale Leser.',
    ] },
    { h: '4. Browser-Speicher (localStorage), den wir nutzen', p: ['Nur auf Ihrem Gerät gespeichert; nicht zum Verfolgen über andere Websites verwendet.'], li: [
      'cl-consent: Ihre Wahl (Akzeptieren/Ablehnen). Bleibt, bis Sie sie löschen.',
      'cl_cid: eine anonyme zufällige Browser-Kennung, erzeugt, wenn Sie den Concierge, die Mitgliedschaftsseite oder Ihr Konto nutzen. Sie ermöglicht dem Concierge, sich Ihre Vorlieben zu merken, erkennt Ihre Mitgliedschaft auf diesem Gerät und zählt Klicks auf unsere Handlungsaufforderungen. Bleibt, bis Sie sie löschen; Mitglieder können das damit verknüpfte Gedächtnis löschen.',
      'cl_voiceout: ob Sie das Vorlesen für den Concierge eingeschaltet haben.',
      'cl:recent: die zuletzt angesehenen Artikel und Einträge (bis zu 12), als „Zuletzt angesehen“ für Sie angezeigt. Wird nie an uns gesendet.',
      'cl:saved-places: auf der Karte gespeicherte Orte. Wird nie an uns gesendet.',
    ] },
    { h: '5. Optionale Elemente, nur nach Ihrer Zustimmung', li: [
      'Vercel Web Analytics: zählt Seitenaufrufe, Referrer und grob Land/Gerät, ohne Werbeprofile. Laut Vercel funktioniert es ohne Cookies. Wird nur nach Ihrer Zustimmung geladen.',
      'Vercel Speed Insights: misst die Ladeleistung, damit die Website schnell bleibt. Laut Vercel funktioniert es ohne Cookies. Wird nur nach Ihrer Zustimmung geladen.',
      'GetYourGuide-Partnerskript (widget.getyourguide.com): nötig, um GetYourGuide-Erlebnis-Widgets anzuzeigen und darüber getätigte Buchungen zuzuordnen. GetYourGuide kann eigene Cookies oder Kennungen setzen. Wird nur nach Ihrer Zustimmung geladen; davor erscheint stattdessen ein einfacher Partnerlink.',
    ] },
    { h: '6. Inhalte Dritter, die ohne Hinweis laden', p: ['Einige Funktionen laden Inhalte direkt von anderen Unternehmen, sobald die Seite sie braucht. Diese erhalten Ihre IP-Adresse und technische Angaben und können nach eigenen Richtlinien eigene Cookies setzen oder lesen. Sie vermeiden das, indem Sie die betreffende Seite oder Funktion nicht öffnen.'], li: [
      'Live-Seite: eingebettete Wetter- und Webcam-Player von Windy und YouTube (youtube-nocookie.com, Google).',
      'Karten: die Kartenbibliothek (jsDelivr) und Kartenkacheln (CARTO), wenn Sie eine Karte öffnen.',
      'Zahlungs- und Abrechnungsseiten: von Stripe gehostete Kasse und Kundenportal, wenn Sie abonnieren oder die Abrechnung verwalten.',
      'Ausgehende Links (z. B. Google-Maps-Route, GetYourGuide, Partnerseiten) nur, wenn Sie sie anklicken.',
    ] },
    { h: '7. Wahl ändern und Browser-Einstellungen', p: [
      'Sie können die Wahl jederzeit über den Link „Cookie-Einstellungen“ im Seitenfuß erneut öffnen oder die Daten dieser Website in Ihrem Browser löschen; danach erscheint der Hinweis wieder. Sie können Cookies und Website-Speicher auch in den Browser-Einstellungen blockieren oder löschen; das Blockieren notwendiger Einträge kann Anmeldung, Sprachspeicherung oder das Concierge-Gedächtnis beeinträchtigen.',
    ] },
    { h: '8. Aktualisierungen und Kontakt', p: ['Wir aktualisieren diese Richtlinie, wenn wir Cookies oder Werkzeuge hinzufügen oder entfernen, und nennen oben das Datum. Fragen: {privacy_mail}.'] },
  ],
};
