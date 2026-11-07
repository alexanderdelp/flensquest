# Spielen an mehreren Geräten: Entscheidungsgrundlage

## Kurzfassung

**Empfehlung: Supabase Realtime (Broadcast).** Das Spiel bleibt eine statische Seite auf GitHub Pages. Ein Gerät eröffnet einen Raum mit Code und rechnet die Regeln, die anderen Geräte treten bei und schicken ihre Handlungen dorthin. Eine Datenbank oder eigener Servercode ist dafür nicht nötig.

## Was FlensQuest braucht

- Rundenbasiert, wenige Nachrichten, kurze Verzögerung ist unkritisch.
- Ein Gerät pro Sitz: Figuren und optional Spielleiter verteilen sich auf die Geräte.
- GitHub Pages liefert nur statische Dateien. Für die Verbindung zwischen Geräten fehlt daher ein Vermittler.
- Spielstand muss vorerst nicht auf einem Server liegen.

## Optionen

| | A: Supabase Realtime | B: Cloudflare Worker mit Durable Objects | C: WebRTC direkt (zum Beispiel PeerJS) |
|---|---|---|---|
| **Prinzip** | Fertiger Nachrichtenkanal pro Raum | Eigener kleiner Spielserver | Geräte sprechen direkt miteinander |
| **Eigener Servercode** | Keiner | Ja | Keiner |
| **Einrichtung** | Projekt anlegen, zwei Werte eintragen | Konto, Worker, Deployment | Fremder Vermittlungsdienst oder eigener nötig |
| **Zuverlässigkeit** | Gut | Sehr gut | In manchen Netzen scheitert die Verbindung ohne Relay |
| **Betrug und Fehler** | Das eröffnende Gerät entscheidet | Server entscheidet | Das eröffnende Gerät entscheidet |
| **Spiel läuft weiter, wenn das eröffnende Gerät weg ist** | Nein, ohne Zusatzarbeit | Ja | Nein |
| **Später Spielstand speichern** | Datenbank ist schon dabei | Eigener Speicher vorhanden | Extra Lösung nötig |
| **Aufwand für mich** | Klein | Mittel | Klein bis mittel, Fehlersuche schwer |

Kosten habe ich bewusst nicht beziffert, weil sich Tarife ändern. Bitte vor dem Anlegen die aktuellen Preisseiten ansehen. Für ein privates Spiel im kleinen Kreis sollte bei A und B ein kostenloser Einstieg reichen, das ist aber nicht geprüft.

## Warum A

- Du kennst Supabase bereits aus Mimi & Mots.
- Kein Server, den wir betreiben müssen.
- Spiellogik bleibt im Browser, die Regeln müssen nicht doppelt existieren.
- Falls später nötig, lässt sich auf B umstellen: Das Spiel kennt nur eine schmale Schnittstelle (`src/net/transport.ts`).

**Nachteil:** Fällt das eröffnende Gerät aus, steht das Spiel. Für einen Spieleabend am Tisch ist das vertretbar.

## Was du für A anlegen müsstest

1. Neues Supabase-Projekt, zum Beispiel `flensquest`, Region in der EU.
2. Project URL und den öffentlichen Publishable- oder Anon-Key an mich geben. Der öffentliche Schlüssel darf im Browser stehen.
3. Keinen Service-Role- oder Secret-Key eintragen oder schicken.

**Wichtig:** Jeder, der die Seite öffnet, kann diesen öffentlichen Schlüssel sehen. Die Räume sind deshalb nur durch den Raumcode geschützt. Für private Runden reicht das. Für ein öffentliches Spiel bräuchte es zusätzlich Anmeldung oder Zugriffsregeln.

## Was schon vorbereitet ist

- Alle Handlungen laufen als einfache Nachrichten über `dispatch` (`src/game/engine.ts`).
- Der komplette Spielstand ist als JSON übertragbar.
- Gleicher Startwert und gleiche Handlungen ergeben auf jedem Gerät denselben Spielstand. Das ist per Test abgesichert.
- `src/net/transport.ts` beschreibt Nachrichten, Sitze und eine lokale Umsetzung. Für die Netzvariante fehlt nur der konkrete Anschluss.
