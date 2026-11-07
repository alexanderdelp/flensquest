#!/usr/bin/env node
/*
 Werkzeug für Kladde-Dateien (Kampagnen für FlensQuest).
   node tools/kladde.mjs pruefe <datei.kladde> [...]   Übersetzt und prüft, meldet Fehler mit Zeile.
   node tools/kladde.mjs vorlage <kennung> <datei>     Schreibt eine eingebaute Kampagne als Vorlage.
 Lädt die TypeScript-Quellen über Vite, damit Spiel und Werkzeug dieselbe Prüfung nutzen.
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const load = async (p) => (await runnerImport(`${root}${p}`)).module;

const [cmd, ...args] = process.argv.slice(2);
const kladde = await load('src/kladde/index.ts');

if (cmd === 'pruefe' && args.length) {
  let bad = 0;
  for (const file of args) {
    const { campaign, errors, warnings } = kladde.compile(readFileSync(file, 'utf-8'));
    for (const d of [...errors, ...warnings]) console.log(`${file}: ${kladde.formatDiagnostic(d)}`);
    if (campaign) console.log(`${file}: in Ordnung – „${campaign.title}“, ${campaign.chapters.length} Kapitel, ${campaign.cards.length} Karten.`);
    else bad++;
  }
  process.exit(bad ? 1 : 0);
} else if (cmd === 'vorlage' && args.length === 2) {
  const { BUILTIN } = await load('src/campaigns/index.ts');
  const def = BUILTIN.find((c) => c.id === args[0]);
  if (!def) { console.error(`Unbekannte Kampagne „${args[0]}“. Bekannt: ${BUILTIN.map((c) => c.id).join(', ')}`); process.exit(1); }
  writeFileSync(args[1], kladde.writeKladde(def));
  console.log(`${args[1]} geschrieben.`);
} else {
  console.log('Aufruf: node tools/kladde.mjs pruefe <datei.kladde> … | vorlage <kennung> <datei>');
  process.exit(2);
}
