# Kladde: Kampagnen für FlensQuest selbst schreiben

Eine Kladde-Datei (`.kladde`, reiner Text in UTF-8) beschreibt eine ganze Kampagne: Rahmentexte, die Karten des Spielleiters und alle Kapitel mit Plan und Ereignissen. Die Datei lässt sich einzeln weitergeben und im Spiel unter **Neues Abenteuer → 📂 Eigene Kampagne laden** einlesen. Sie bleibt danach im Browser gespeichert.

Vorbild sind Abenteuer-Skriptsprachen wie SCUMM: Ein Kapitel ist ein Raum mit Plan, dazu kommen Skripte nach dem Muster „wenn etwas passiert, dann tue dies“.

Am schnellsten geht es mit einer Vorlage: In der Kampagnenauswahl unter einer Kampagne auf **⬇ Kladde** tippen, die Datei ändern, eine eigene Kennung vergeben und wieder laden. Die mitgelieferten Kampagnen liegen auch im Repository unter [`kampagnen/`](../kampagnen).

## Aufbau

```
-- Kommentare beginnen mit zwei Strichen.

kampagne nordertor
  titel: Nebel am Nordertor
  klappentext: Zwei Kapitel zwischen Stadttor und Hafenkneipe.
  einleitung: Am Nordertor hängt seit Tagen Nebel, und niemand hat ihn bestellt.

spielleiter
  karte 2× eile: Rückenwind | Alle Gegner laufen diese Runde 2 Felder weiter.
  karte falle: Lose Planke | Eine verdeckte Falle liegt jetzt 2 bis 3 Felder neben einer Figur.
  karte knoellchen: Falsch geparkt | 1 Punkt in Flensburg.
  pause: Der Oberpunktezähler poliert seinen Stempel.

kapitel Im Torbogen
  ort: Nordertor
  einleitung: Unter dem Torbogen tropft es.
  auftrag: Finde die Nebelkerze 🕯️ und bring sie zum Ausgang 🚪.
  ziel: bergen Nebelkerze 🕯️
  belohnung: 25
  abschluss: Der Nebel lichtet sich. Ein bisschen.
  plan:
    ##############
    #SS....#.....#
    #SS....D..m..#
    #......#..G..#
    #X..t..H.....#
    ##############
  wenn tür 7,2 aufgeht:
    zeige Wachstube: Hier riecht es nach kaltem Kaffee
      und nassem Hund.
    rufe ratte 9,1
  wenn moewe auftaucht:
    zeige Pommes-Möwe: Sie hat Hunger. Immer.
```

Die Einrückung zählt: Was tiefer eingerückt ist als eine Zeile, gehört zu ihr. Blöcke stehen ganz links. Lange Texte dürfen in eingerückten Folgezeilen weiterlaufen; sie werden mit Leerzeichen verbunden. Bei Schlüsseln ist `ue` gleich `ü`, bei Kennungen von Gegnern und Karten ist `ö` gleich `oe`.

## Block `kampagne <kennung>`

Genau einmal je Datei. Die Kennung besteht aus Kleinbuchstaben, Ziffern und Bindestrichen. `hafen` und `akte` sind vergeben. Lädt man eine Kampagne mit derselben Kennung erneut, ersetzt sie die alte.

| Eintrag | Bedeutung |
|---|---|
| `titel:` | Name in der Auswahl (Pflicht) |
| `klappentext:` | Kurzer Text in der Auswahl |
| `bild:` | Bild aus dem Spiel, etwa `img/kampagne-hafen.webp`; ohne Angabe steht der Titel groß da |
| `einleitung:` | Wird vor dem ersten Kapitel gezeigt und vorgelesen |
| `epilog:` | Nach dem letzten Kapitel |
| `verloren:`, `nochmal:` | Zusätzliche Sätze nach einer Niederlage |

## Block `spielleiter`

| Eintrag | Bedeutung |
|---|---|
| `karte [n×] <wirkung>: <Name> \| <Text>` | Karte für den Stapel, `n×` legt sie mehrfach hinein |
| `pause: <Satz>` | Was der Rechner sagt, wenn er keine Karte spielt |

Die Wirkung und ihre Kosten in Tinte stehen fest; Name und Text wählt die Kampagne.

| Wirkung | Tinte | Was passiert |
|---|---|---|
| `klau` | 2 | Die Figur mit den meisten Fischbrötchen verliert eins |
| `eile` | 3 | Alle Gegner laufen diese Runde 2 Felder weiter |
| `flicken` | 3 | Der am schwersten getroffene Gegner heilt 3 |
| `zorn` | 4 | Alle Gegner greifen diese Runde mit +1 an |
| `schiet` | 4 | 1 Schaden für jede Figur ohne Friesennerz, nie der letzte Lebenspunkt |
| `schlick` | 4 | In der nächsten Runde 1 Schritt weniger je Tide |
| `verstaerkung` | 4 | Ein Knöllchenkobold, mindestens 4 Felder entfernt |
| `falle` | 4 | Eine verdeckte Falle 2 bis 3 Felder neben einer Figur |
| `knoellchen` | 6 | 1 Punkt in Flensburg |

## Block `kapitel <Titel>`

| Eintrag | Bedeutung |
|---|---|
| `ort:` | Ort, steht über Raumtexten (Pflicht) |
| `einleitung:` | Text vor dem Kapitel, wird vorgelesen (Pflicht) |
| `lage:` | Zusätzliche Ausgangslage |
| `auftrag:` | Ziel in Worten, steht in der Seitenleiste (Pflicht) |
| `ziel:` | Siegbedingung, siehe unten (Pflicht) |
| `belohnung:` | Öre für den Sieg (Pflicht) |
| `abschluss:` | Text nach dem Sieg, wird vorgelesen (Pflicht) |
| `überleitung:` | Satz, der zum nächsten Kapitel führt |
| `thema:` | Boden und Wände: 0 Hafenkeller, 1 Backstein, 2 Gewölbe, 3 Museum, 4 Archiv, 5 Pumpwerk; ohne Angabe die Kapitelnummer |
| `plan:` | Die Karte, in den Folgezeilen (Pflicht) |

### Ziel

- `ziel: bergen <Name> <Symbol>`: Gegenstand G aufheben und zum Ausgang X bringen. Zusätze: `bild <bild>` und `endgegner <gegner>` (dann muss auch dieser fallen).
- `ziel: besiegen <gegner>`: Den Endgegner besiegen. Zusätze: `gegenstand <Name> <Symbol>` (dann muss auch G aufgehoben werden), `bild <bild>`.
- Bilder für den Gegenstand: `logbuch`, `schluessel`, `karte`, `akte`, `feder`, `stempel`.

### Plan

Jede Zeile gleich breit, ein Zeichen je Feld:

| Zeichen | Feld | Zeichen | Feld |
|---|---|---|---|
| `#` | Wand | `T` | Truhe |
| `.` | Boden | `t` | Falle, verdeckt |
| `D` | Tür | `G` | Ziel-Gegenstand |
| `H` | verborgene Tür, Suchen findet sie | `f` `x` `o` `z` | Fass, Kiste, Pumpe, Regal |
| `S` | Startfeld, mindestens 4 | `X` | Ausgang |

Gegner stehen mit ihrem Zeichen im Plan:

| Kennung | Zeichen | Name | LP | Angriff | Rüstung | Schritte | Reichweite | Endgegner |
|---|---|---|---|---|---|---|---|---|
| moewe | m | Pommes-Möwe | 2 | 1 | 0 | 5 | 1 |  |
| knoellchen | k | Knöllchenkobold | 3 | 2 | 1 | 3 | 1 |  |
| rumgeist | r | Rumgeist | 4 | 3 | 2 | 3 | 1 |  |
| qualle | q | Förde-Qualle | 6 | 2 | 0 | 2 | 1 |  |
| ratte | a | Hafenratte | 1 | 1 | 0 | 6 | 1 |  |
| schmuggler | s | Rumschmuggler | 4 | 2 | 1 | 3 | 3 |  |
| krabbe | c | Panzerkrabbe | 5 | 2 | 3 | 2 | 1 |  |
| moewenraeuber | w | Möwenräuber | 3 | 2 | 0 | 5 | 1 |  |
| kellerkassierer | e | Kellerkassierer | 5 | 3 | 1 | 3 | 1 |  |
| punktepruefer | p | Punkteprüfer | 4 | 2 | 2 | 3 | 3 |  |
| schlurfer | u | Förde-Schlurfer | 7 | 2 | 1 | 2 | 1 |  |
| klabauter | K | Klabauter | 7 | 3 | 2 | 4 | 1 | ja |
| obermeister | B | Oberpunktezähler | 12 | 4 | 3 | 3 | 3 | ja |
| kalle | 1 | Kai-Kalle | 9 | 3 | 1 | 3 | 3 | ja |
| fiete | 2 | Fälscher-Fiete | 10 | 3 | 2 | 3 | 3 | ja |
| krischan | 3 | Hauptmann Krischan | 11 | 4 | 1 | 5 | 1 | ja |
| waechter | 4 | Archivwächter | 13 | 4 | 3 | 2 | 1 | ja |
| proehl | 5 | Pumpenmeister Pröhl | 13 | 4 | 2 | 3 | 2 | ja |
| oberarchivar | 6 | Oberarchivar | 20 | 5 | 3 | 3 | 3 | ja |

Die Lebenspunkte gelten für zwei Figuren; mit einer, drei oder vier Figuren skaliert das Spiel sie. Koordinaten zählen ab 0, `x` von links, `y` von oben.

### Skripte

Ein Skript beginnt mit `wenn <auslöser>:` und enthält eingerückt seine Befehle. Jedes Skript läuft einmal je Kapitel.

| Auslöser | Wann |
|---|---|
| `wenn start:` | Beim Aufbau des Kapitels |
| `wenn tür 16,6 aufgeht:` | Diese Tür geht auf; mehrere mit `oder`: `wenn tür 3,4 oder 5,6 aufgeht:` |
| `wenn kalle auftaucht:` | Ein Gegner dieser Art wird zum ersten Mal sichtbar |
| `wenn endgegner halb:` | Der Endgegner des Ziels hat die Hälfte verloren; auch `wenn fiete halb:` |
| `wenn ziel gefunden:` | Der Gegenstand ist aufgehoben |
| `wenn runde 5:` | Zu Beginn dieser Runde |

| Befehl | Was |
|---|---|
| `zeige <Überschrift>: <Text>` | Banner über dem Brett; der Text darf in Folgezeilen weiterlaufen |
| `rufe <gegner> x,y` | Gegner aufs nächste freie Feld bei x,y |
| `öre +5` / `öre -5` | Öre der Gruppe ändern |
| `punkte +1` / `punkte -1` | Punkte in Flensburg ändern |
| `heile 2` | Alle stehenden Figuren heilen |

Was bei `wenn <gegner> auftaucht:` als `zeige` steht, erscheint auch im Tooltip dieses Gegners.

## Prüfung

Beim Laden prüft das Spiel die Datei und meldet Fehler mit Zeilennummer, etwa:

```
Zeile 23: Bei 7,4 ist keine Tür (D oder H), sondern „.“.
Zeile 18: Der Ziel-Gegenstand bei 10,3 ist von den Startfeldern aus nicht erreichbar.
```

Geprüft werden unter anderem: Pflichtangaben, gleich breite Planzeilen, bekannte Zeichen, mindestens 4 Startfelder, G und X passend zum Ziel, Erreichbarkeit von Ziel, Ausgang und Endgegner (durch alle Türen und Verstecke), Türen in Tür-Skripten, bekannte Gegner und Karten. Spitze Klammern `< >` sind nicht erlaubt, damit niemand über eine geteilte Datei Code einschleusen kann. Hinweise (etwa ein Gegnertext für einen Gegner, der nie auftaucht) verhindern das Laden nicht.

Ohne Spiel geht die Prüfung auch auf der Kommandozeile:

```bash
npm run kladde -- pruefe meine.kladde
```
