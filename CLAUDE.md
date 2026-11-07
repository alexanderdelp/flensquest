# CLAUDE.md – FlensQuest

Eigenständiges Browser-Dungeonspiel mit Flensburg-Humor (Vite, TypeScript, kein Framework). Details stehen in `README.md`.

## Spielkontext
Kooperatives Keller-Abenteuer für 1 bis 4 Figuren an einem Gerät, reihum. Den Spielleiter spielt wahlweise der Rechner oder ein Mensch; er tritt als Oberpunktezähler gegen die Gruppe an. Die Geschichte führt in fünf Kapiteln von der Hafenspitze über Rote Straße, Nordertor und Museumsberg ins Punktearchiv.

Ausgangspunkt war der Wunsch nach einem Spiel im Stil klassischer Dungeon-Brettspiele. **FlensQuest ist aber keine Nachbildung eines bestehenden Spiels:** Regeln, Figuren, Gegner, Karten, Texte und Grafik bleiben eigenständig. Nichts aus einem konkreten Spiel übernehmen.

## Designkriterien
- **Ton:** augenzwinkernd, freundlich, norddeutsch-trocken, Deutsch und kurz. Lokalkolorit aus Flensburg ist der Kern des Spiels (Förde, Rum, Möwen, Schietwetter, Fischbrötchen, Punkte in Flensburg).
- **Namen:** Einige zentrale Begriffe dürfen mit „Flens“ beginnen (FlensQuest, FlensNetz, FlensLogbuch), aber nicht alle. Keine Logos oder Markenauftritte Dritter.
- **Kernidee Punkte:** Die Punkte in Flensburg sind die Uhr des Spiels. Fallen, Knöllchen, gestürzte Figuren, Ereignisse und der Stempel jede dritte Runde bringen Punkte. Bei 8 ist der Lappen weg und das Kapitel verloren.
- **Zugsystem:** 3 Tiden je Zug, solo 4. Eine Tide bringt Schritte oder bezahlt eine Aktion. Pro Zug ein Angriff und ein Spezialkönnen. Türen öffnen ist kostenlos.
- **Würfel:** 2W6 + Angriff gegen 7 + Rüstung, 6+6 trifft doppelt, 1+1 trifft nie.
- **Erkundung:** Räume werden erst sichtbar, wenn eine Tür aufgeht. Gegner werden erst aktiv, wenn ihr Feld aufgedeckt ist. Verborgene Türen und Fallen findet man mit Suchen.
- **Figuren:** Jede Figur hat eine klare Rolle und ein eigenes Spezialkönnen, zweimal je Kapitel. Frauke fesselt aus der Distanz, Jörn hält viel aus und schlägt hart zu, Maren ist schnell und trifft mehrere Gegner, Hinnerk heilt und holt Gestürzte zurück.
- **Fortschritt:** Klein und überschaubar. Öre gibt es für Gegner, Truhen und Kapitel, ausgegeben werden sie im Hafenkiosk. Ausrüstung bringt je +1 auf einen Wert, nicht mehr.
- **Balance:** Gegner-Lebenspunkte skalieren mit der Figurenzahl. Solo gibt es eine Tide und 4 Lebenspunkte extra. Kapitel sollen fordernd, aber schaffbar sein. Der Bot in `tests/engine.test.ts` zeigt nur die Tendenz, entscheidend ist echtes Anspielen.
- **Verlieren:** Eine Niederlage ist nie endgültig. Das Kapitel beginnt von vorn, nur die Öre aus dem Versuch sind weg.

## Technik und Oberfläche
- **Trennung:** Regeln und Spielleiter liegen in `src/game/engine.ts` ohne DOM-Zugriff, Inhalte in `src/game/data.ts`, die Oberfläche in `src/main.ts`, das Brett in `src/ui/board.ts`, die Grafik in `src/ui/sprites.ts`. Zufall läuft über den Seed im Spielzustand, damit Tests reproduzierbar bleiben.
- **Spielleiter:** `gmTurn` ist ein Generator, damit die Oberfläche jeden Gegnerzug einzeln zeigt. Ein menschlicher Spielleiter zieht Gegner einzeln und spielt eine von zwei Karten.
- **Handlungen:** Alles läuft als serialisierbare `Action` über `dispatch` und `src/net/transport.ts`. Neue Handlungen nur dort ergänzen, damit das Spiel zwischen Geräten lauffähig bleibt. Die Engine meldet Sichtbares über `g.fx`; das steuert Animationen und Meldungen, nie die Regeln.
- **Bedienung:** Alles läuft per Klick oder Tippen auf dem Brett, ohne Tastatur. Mögliche Ziele sind markiert: grün zum Gehen, gold für Türen und Truhen, rot für Gegner. Aktionsknöpfe mindestens 44 px hoch.
- **Layout:** Die Spielansicht passt ab 821 px Breite ohne Seiten-Scrollen auf den Bildschirm. Darunter stehen Brett und Seitenleiste untereinander.
- **Optik:** Farben der Förde, Backstein und Sand als CSS-Variablen in `src/ui/style.css`. Alle Grafiken sind eigene Pixel-Art im 32er-Raster, im Code gezeichnet. Ausrüstung muss an der Figur sichtbar sein.
- **Ansicht:** Canvas-Brett mit echter Perspektive (`src/ui/projection.ts`), Blickwinkel per Regler 35 bis 90 Grad, Start 55. Wände sind Quader mit Höhe und dürfen Felder dahinter verdecken; Figuren schimmern dann durch. Türen stehen im Durchgang.
- **Reichweite:** Heller Rand um das Gebiet und ein Punkt je Feld, nie nur eine Tönung des Bodens.
- **Laune:** Figuren zeigen ihren Zustand im Sprite: finstere Miene nach Schaden, ab halben Lebenspunkten Verband, blaues Auge und Gewitterwolke.
- **Meldungen:** Was der Spielleiter tut, steht auf dem Brett (Zeile, Banner, Rundenrückblick). Niemand soll dafür den Verlauf lesen müssen.
- **Zielgeräte:** PC und iPad haben Vorrang. Das iPhone soll spielbar sein, darf aber keine Designentscheidung zulasten der anderen bestimmen.
- **Betrieb:** Statische Seite ohne Server und ohne externe Anfragen zur Laufzeit. Für mehrere Geräte siehe `docs/mehrgeraete.md`. Der Spielstand liegt nur in `localStorage`, Schlüssel `flensquest:v1`.
- **Veröffentlichung:** Jeder Push auf `main` testet, baut und veröffentlicht auf https://alexanderdelp.github.io/flensquest/ (`.github/workflows/deploy.yml`). `base` bleibt relativ.

## Befehle
```bash
npm run dev     # Dev-Server auf Port 5190
npm test        # Regeltests und Bot-Durchläufe
npm run build   # Typprüfung und Build nach dist/
```

## Telegram
Der Mensch bekommt über einen eigenen Bot Updates und beantwortet Fragen (`npm run telegram -- …`, siehe `tools/telegram.mjs`). Zugangsdaten liegen in `~/.config/flensquest/telegram.env` (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`): nie ausgeben, nie committen.
- **Pflicht:** Wenn eine Aufgabe fertig ist oder dringend Input gebraucht wird, unaufgefordert über den Bot melden, auch wenn die Antwort zusätzlich im Chat steht.
- **Fertig:** Update mit Screenshot per `photo`. Zeigt die Aufgabe nichts Sichtbares, reicht `send`.
- **Dringender Input:** `ask` mit Knöpfen, dazu ein Screenshot, wenn er die Frage erklärt. Kleinigkeiten nicht melden.
- Aufruf direkt mit `node tools/telegram.mjs …`; über `npm run` geht `--wait` verloren.
- `send`: kurzes Update ohne Bild.
- `photo <datei> [text]`: Screenshot aus dem Spiel, nur mit Testdaten.
- `ask`: Entscheidungsfrage mit Knöpfen; Antwort mit `--wait` oder später mit `inbox`.
- Inhalte kurz, auf Deutsch, ohne Geheimnisse. Antworten zählen nur aus der eingetragenen Chat-ID.
- `setup` liest die Nachrichten an den Bot und trägt die Chat-ID ein: nur nach Rückfrage ausführen.
