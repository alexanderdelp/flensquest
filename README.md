# ⚓ FlensQuest

Ein augenzwinkerndes Keller-Abenteuer aus Flensburg für den Browser: 1 bis 4 Figuren an einem Gerät, den Spielleiter übernimmt der Rechner oder ein Mensch.
FlensQuest ist ein eigenständiges Spiel mit eigenen Regeln, Figuren und Kapiteln und steht in keiner Verbindung zu anderen Spielen oder Marken.

## Starten

```bash
npm install
npm run dev
```

Danach `http://localhost:5190` öffnen.

```bash
npm test
npm run build
```

## Regeln in Kürze

- **3 Tiden je Zug:** Eine Tide bringt dich so viele Felder weit wie dein Schritt-Wert oder bezahlt eine Aktion (Angriff, Suchen, Truhe, Essen, Spezialkönnen).
- **Angriff:** 2 Würfel + Angriff gegen 7 + Rüstung. Einmal je Zug. 6+6 trifft doppelt, 1+1 nie.
- **Türen** öffnen ist kostenlos. **Suchen** entschärft Fallen und findet verborgene Türen in der Nähe.
- **Punkte in Flensburg:** Fallen, Knöllchen, gestürzte Figuren und der Stempel jede dritte Runde bringen Punkte. Bei 8 ist der Lappen weg und das Kapitel verloren.
- **Hafenkiosk:** Zwischen den Kapiteln gibt es Friesennerz, Bootshaken, Gummistiefel und Fischbrötchen für Öre.

## Aufbau

- `src/game/data.ts`: Figuren, Gegner, Kapitel, Karten, Ereignisse
- `src/game/engine.ts`: Spielregeln und Spielleiter, ohne Abhängigkeit zur Oberfläche
- `src/main.ts`, `src/ui/style.css`: Oberfläche
- `tests/engine.test.ts`: Regeltests und ein Bot, der alle Kapitel durchspielt

## Telegram

`tools/telegram.mjs` schickt Updates, Screenshots und Fragen über einen eigenen Bot. Die Zugangsdaten liegen außerhalb des Repositorys in `~/.config/flensquest/telegram.env` und werden nie committet.

```bash
node tools/telegram.mjs send "Text"
node tools/telegram.mjs photo bild.png "Text"
node tools/telegram.mjs ask "Frage?" Ja Nein --wait 300
node tools/telegram.mjs inbox
```
