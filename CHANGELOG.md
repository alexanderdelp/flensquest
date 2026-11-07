# Änderungen

Version major.minor.build: major bei großen Umbrüchen, minor bei neuen Funktionen, build bei jeder sonstigen Änderung.
Der oberste Eintrag muss zur Version in `package.json` passen; ein Test prüft das.

## 0.5.2
- Architektur in Schichten zerlegt: `content` (Regelwerte), `core` (Regelkern in Modulen: Gelände, Kampf, Helden, Spezialkönnen, Skripte, Spielleiter mit Karten, Rechner und Zugablauf), `campaigns`, `net`, `platform` (Speicher), `ui` (Bildschirme, Spielansicht, Brett).
- Raumtexte, Gegnertexte und Endkampf-Wenden laufen als Skripte mit Auslöser und Befehlen.
- Texte aus Kampagnen werden in der Oberfläche maskiert.
- Architekturtest wacht über die Modulgrenzen.

## 0.5.1
- Versionsnummer auf Startseite und Kampagnenauswahl.
- Stand bis hierhin: zwei Kampagnen, Spielleiter mit Kartenhand und Tinte, Pfeiltasten, Tooltips, Juni die echte Nordhexe mit Möwe Piet.
