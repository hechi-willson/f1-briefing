# F1 Briefing

Öffentliches Briefing zum jeweils aktuellen Formel-1-Rennwochenende, veröffentlicht über GitHub Pages.

Live: https://hechi-willson.github.io/f1-briefing/

## Inhalt

- Session-Zeiten (Umschalter Wien / Ortszeit)
- Strecke, Reifen und Strategie
- Wetter pro Session
- Fahrer- und Konstrukteurs-WM
- Neue FIA-Dokumente
- Ergebnisse, Startaufstellung und Rennergebnis, laufend ergänzt übers Wochenende

## Aktualisierung

Die Seite wird an Rennwochenenden automatisch mehrmals täglich aktualisiert und in der Rennwoche auf das nächste Rennen umgestellt. Jeder Commit entspricht einem Update der Seite.

## Technik

Eine einzelne `index.html` ohne externe Abhängigkeiten (HTML, CSS, etwas Vanilla-JS für den Zeitzonen-Umschalter). Hell/dunkel folgt der Systemeinstellung.

## Benachrichtigungen

Bei jedem Push auf `main` ruft eine GitHub Action einen Webhook auf (JSON mit Commit-ID, Commit-Nachricht, Zeitpunkt und Seiten-Link). Neue Commits gibt es auch als Feed: https://github.com/hechi-willson/f1-briefing/commits/main.atom
