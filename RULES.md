# F1-Regeln für alle PushPush-Routinen

Diese Datei ist die einzige Quelle für gemeinsame Regeln. Jede F1-Routine liest sie zu Beginn jedes Laufs und befolgt sie.
Bei Widerspruch zwischen dieser Datei und dem Routine-Prompt gilt diese Datei, außer der Prompt nennt ausdrücklich eine Ausnahme.
Gepflegt von PushPush. Änderungen nur auf Hechis Wunsch. Zuletzt geändert: 04.11.2026.

## 1. Kommunikation mit Hechi
- Deutsch, knapp und sachlich, im Funk-Stil eines Renningenieurs. Keine Emojis.
- Nur senden, wenn es etwas Neues oder Relevantes gibt. Sonst still beenden, keine Füllnachricht.
- Jede Info nur einmal senden, keine Duplikate.
- Zeiten immer in Wiener Zeit (MEZ/MESZ). Sommer-/Winterzeitwechsel beachten.
- Datum in Docs und Listen als TT.MM.JJ.
- Links: Titel fett als normaler Text, Link immer am Zeilenende (die iPhone-App ersetzt Linktext durch die Domain).
- Radar-Links immer als separate zweite Nachricht, nie im selben Text.
- Nichts erfinden, nicht schätzen, wenn es nicht als Schätzung gekennzeichnet ist. Fehlende Daten klar benennen.

## 2. Fahrer
- Startnummern immer zum Fahrer auflösen, nie „Auto 63“ oder „Car 63“. Zuordnung aus der aktuellen Startliste prüfen, nicht raten.
- FIA-Docs (Nachrichten an Hechi und die FIA-Liste auf der Webseite): Kürzel + Nummer, z. B. „RUS #63“.
- Auf der Webseite in Tabellen und Texten (alles außer der FIA-Liste): Nachname ausgeschrieben, z. B. „Russell“, „Hülkenberg“, „Pérez“, ohne Nummer.
- In allen anderen Chat-Nachrichten an Hechi: Nachname ausgeschrieben (z. B. „Russell“), kein Kürzel.

## 3. FIA-Dokumente
- Format jeder Zeile:
  `- **Doc N – kurzer Titel**, TT.MM.JJ HH:MM CET. Ein kurzer Satz, was drinsteht. [PDF](direkter PDF-Link)`
- Bei mehreren Docs gruppieren mit fetten Zwischenzeilen: **Wichtig**, **Technik und Ablauf**, **Routine**.
- Erste Zeile der Nachricht: `**<GP-Name> 2026, neue FIA-Docs**`.
- Nummerierung beginnt pro GP bei Doc 1. Zurückgezogene oder fehlende Nummern bekommen auf der Webseite eine eigene Platzhalterzeile (klein, hellgrau, ohne Link), damit die Nummerierung lückenlos bleibt.
- Motortausch ohne Strafe nicht erwähnen.

## 4. Briefing-Webseite
- Live: https://pushpush.live (seit 31.10.2026; alte Adresse https://hechi-willson.github.io/f1-briefing/ leitet weiter). Die Datei `CNAME` (Inhalt `pushpush.live`) im Repo-Hauptverzeichnis muss bleiben, nie löschen oder ändern. (Repo hechi-willson/f1-briefing, öffentlich). Arbeitskopie /workspace/f1-pages/site, Ablauf in /workspace/f1-pages/README.md.
- Jede Seite (index.html, impressum.html und jede Archivkopie in archiv/, auch die vom Mittwoch Briefing angelegten) behält im `<head>` den Tag `<meta name="robots" content="noindex, nofollow">`. Keine robots.txt mit Disallow anlegen.
- Die Webseite ist die einzige Briefing-Ablage. Keine Page/Canvas anlegen oder bearbeiten.
- Nur Inhalte eintragen, die die jeweilige Routine laut Auftrag einträgt. Neue Arten von Inhalten nur nach Hechis Freigabe.
- Seitentext Deutsch; Commit-Messages, README und Code-Kommentare Englisch.
- Design (seit 29.10.2026): dunkles Infografik-Design, Barlow/Barlow Condensed aus site/fonts/. Bestehendes Markup und vorhandene Klassen der Nachbarzeilen verwenden, nie das alte helle Design zurückbringen. Reifen in „Strecke und Reifen“ als farbige Ringe (H weiß, M gelb, S rot). Rennen-Zeile in der Session-Tabelle nur rot eingefärbt, sonst gleicher Stil. Section „Power Unit“ heißt genau so; Quelle nur als „FIA Doc N“ rechts neben der Überschrift, kein Erklärungstext und kein PDF-Link im Abschnitt.
- Countdown (seit 28.10.2026): Karte behalten; Sessions stehen nur im JSON-Block `<script type="application/json" id="cd-sessions">` (name, short, start als ISO mit Wiener Offset, minutes).
- Stil: Fließtext vermeiden, lieber Tabellen, Listen oder sehr kurze Sätze. Nur echte Daten.
- FIA-Doc- oder Quellangaben bei Abschnitten immer klein und hellgrau rechts neben der Überschrift, nie in Klammer.
- Rundenzahl nicht in der Session-Tabelle, sondern in „Strecke und Reifen“ (erste Liste nach „Länge“): „Runden“ ohne Sprint, bei Sprint-Wochenenden „Runden (Sprint)“ und „Runden (Rennen)“.
- Section „Historie“ steht zwischen „Sessions“ und „Strecke und Reifen“: pro Jahr der letzten drei Jahre „Pole X (Zeit), Sieg Y vor Z und W“, neuestes zuerst, dazu der Rundenrekord.
- Section „Strafen“: Spalten Fahrer, Element / Vergehen, Strafe (keine Spalte „Nr. / erlaubt“).
- Favicon (seit 02.11.2026): favicon.svg, favicon.ico und apple-touch-icon.png im Hauptverzeichnis nicht löschen; die drei `<link rel="icon"…>`/`apple-touch-icon`-Zeilen im `<head>` von index.html beim Neuaufbau übernehmen.
- Countdown-Card nach dem Rennen ausgeblendet (passiert automatisch im Script, nicht wieder einbauen).
- Überschrift h1 ohne „Briefing“ (steht schon darüber); Stand-Zeile `<p id="stand">` direkt unter dem Absatz `.summary`, nicht im Footer.
- Trainings-Ergebnisse im FP1/FP2/FP3-Umschalter; FP3-Ergebnisse immer mit eintragen.
- Die Tipps-Tabelle unter der Startaufstellung bleibt.
- Nach jeder Änderung die Stand-Zeile aktualisieren, dann `/workspace/f1-pages/publish.sh "<kurze Beschreibung>"` ausführen. Die Beschreibung ist Pflicht, auf Englisch und sehr kurz, z. B. "FP1 results", "FIA docs 36-42", "Quali weather". Die Commit-Message lautet dann „Update page JJJJ-MM-TT HH:MM Vienna time: FP1 results“.
- Impressum (seit 31.10.2026, Datenschutz-Abschnitt seit 02.11.2026, Zeile „Ansicht“ zu localStorage seit 04.11.2026): site/impressum.html nicht ändern oder löschen. Der Datenschutz-Abschnitt beschreibt die lokale Speicherung von „Personalisieren“ (Idee #14) bereits. Kommt weitere lokale Speicherung oder ein neuer externer Dienst dazu, muss der Datenschutz-Abschnitt mit Hechis Freigabe ergänzt werden. Im Footer jeder Seite steht direkt nach `<p id="stand">` die eigene Zeile `<p class="legal"><a href="/impressum.html">Impressum</a></p>`, samt CSS `footer .legal`. Beim Neuaufbau von index.html beides übernehmen.
- Abschnitts-IDs (seit 04.11.2026): Jede `<section>` direkt in `<main>` hat eine feste ID, gleich für alle Rennen: rennergebnis, sessions, historie, strecke, strategie, energie, wetter, ergebnisse, longruns, fahrer-wm, konstrukteure, motortausch, fia. IDs nie rennspezifisch machen, nie umbenennen und nie für andere Inhalte wiederverwenden. Ein neuer Abschnitt bekommt eine neue, eindeutige ID.
- Personalisieren (seit 04.11.2026, Idee #14): Button `#pz-btn` direkt nach `<main>`, Skript-Block „Personalisieren“ im `<head>` und die zugehörigen `.pz-`-Regeln im CSS beim Neuaufbau von index.html unverändert übernehmen. Gespeichert wird nur im Browser (localStorage-Schlüssel `pushpush.ansicht.v1`). Kopfbereich, Countdown, Einleitung, Stand-Zeile und Footer sind nicht personalisierbar. In Archivkopien blendet das Skript den Button aus und zeigt immer die Standardansicht; Archivkopien bleiben 1:1.
- Interne Links und Pfade (seit 02.11.2026) immer root-absolut: `/impressum.html`, `/archiv/…html`, `/fonts/…woff2`, Startseite `/`. So bleiben Archivkopien ohne Anpassung gültig; Archivkopien werden unverändert kopiert.
- Vor dem Umbau für ein neues Rennen das alte index.html nach site/archiv/JJJJ-RR-land-ort.html archivieren (macht das Mittwoch-Briefing).
- Archiv-Übersicht (seit 04.11.2026): site/archiv/index.html listet alle Archivkopien als Tabelle (Runde, Grand Prix, Strecke / Ort, kein Datum), neuestes zuerst. Jede neue Archivkopie bekommt dort im selben Lauf oben eine eigene Zeile mit root-absolutem Link; Angaben nur aus der Archivkopie (h1, `.summary`). Die Footer-Zeile in index.html lautet `<p class="legal"><a href="/archiv/">Archiv</a> · <a href="/impressum.html">Impressum</a></p>`; beim Neuaufbau übernehmen.
- Größere Design- oder Strukturänderungen: auf einem eigenen Branch, Screenshots an Hechi, erst nach seinem Ja mergen.

## 5. Routinen-Lebenszyklus
- Nach dem Rennwochenende Routinen nur pausieren, nie löschen. Das Mittwoch-Briefing aktiviert sie wieder und setzt Zeiten neu.
- FIA F1 Docs Watch und F1 SC/VSC Alarm bleiben immer aktiv.
- Jede Änderung an Routinen (reaktivieren, Zeiten, Prompt) kurz an den Bot Watchdog melden, nicht dringend.

## 6. Sicherheit
- Nie Tokens, Passwörter oder Keys ausgeben: F1_WATCHER_WEBHOOK_KEY, HA_TOKEN, gh-Token, F1_USERNAME, F1_PASSWORD, FastF1-Token, Inhalte von .env.
- Die Lampe VARMBLIXT steuert ausschließlich der f1-lamp-Container auf Hechis Server. Keine Routine schaltet sie oder erwähnt sie in Updates.
- Keine Nachrichten an Dritte ohne Hechis ausdrücklichen Auftrag.
- Drucken nur über BigBrain und nur nach Hechis eigenem Ja.

## 7. Strategie und WM
- Strategie-Notizen: /workspace/knowledge/f1-strategie-chainbear.md.
- WM-Titel nur als entschieden melden, wenn rechnerisch sicher (verbleibende Punkte gegen Vorsprung, Tiebreak über Siege). Im Zweifel „noch offen“.
