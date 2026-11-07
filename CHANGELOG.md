# Änderungen

Version major.minor.build: major bei großen Umbrüchen, minor bei neuen Funktionen, build bei jeder sonstigen Änderung.
Der oberste Eintrag muss zur Version in `package.json` passen; ein Test prüft das.

## 0.6.2
- Test für das Doku-Beispiel läuft auch mit Windows-Zeilenenden.

## 0.6.1
- Übergabedokument für die Überarbeitung der Grafik: `docs/uebergabe-grafik.md`.

## 0.6.0
- Neue Kampagnensprache **Kladde**: Kampagnen und Kapitel als Textdateien mit Plan und Skripten (`wenn tür … aufgeht:`, `zeige`, `rufe` …). Beide Kampagnen liegen jetzt als `kampagnen/*.kladde` vor.
- Eigene Kampagnen in der Kampagnenauswahl laden, als Datei speichern und entfernen; Fehler erscheinen mit Zeilennummer.
- Neue Auslöser und Befehle für Kapitel: Start, Ziel gefunden, Runde n; Öre, Punkte, Heilen.
- Werkzeug `npm run kladde -- pruefe datei.kladde` und Sprachreferenz in `docs/kladde.md`.
- Tests neu aufgebaut: Unit (Prüfstand, erzwungene Würfel), Integration, Balance und E2E; Mindestabdeckung für Kern, Sprache und Kampagnen.

## 0.5.2
- Architektur in Schichten zerlegt: `content` (Regelwerte), `core` (Regelkern in Modulen: Gelände, Kampf, Helden, Spezialkönnen, Skripte, Spielleiter mit Karten, Rechner und Zugablauf), `campaigns`, `net`, `platform` (Speicher), `ui` (Bildschirme, Spielansicht, Brett).
- Raumtexte, Gegnertexte und Endkampf-Wenden laufen als Skripte mit Auslöser und Befehlen.
- Texte aus Kampagnen werden in der Oberfläche maskiert.
- Architekturtest wacht über die Modulgrenzen.

## 0.5.1
- Versionsnummer auf Startseite und Kampagnenauswahl.
- Stand bis hierhin: zwei Kampagnen, Spielleiter mit Kartenhand und Tinte, Pfeiltasten, Tooltips, Juni die echte Nordhexe mit Möwe Piet.
