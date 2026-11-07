import type { CampaignDef } from '../core';
import { checkCampaign } from './check';
import { Report, type Diagnostic } from './diagnostics';
import { toTree } from './lines';
import { parseTree } from './parse';

/*
 Kladde: die Sprache für Kampagnen und Kapitel. Eine Datei beschreibt eine ganze Kampagne und lässt sich
 einzeln weitergeben. compile() übersetzt und prüft; writeKladde() schreibt eine Kampagne zurück.
*/

export type { Diagnostic } from './diagnostics';
export { formatDiagnostic } from './diagnostics';
export { writeKladde } from './write';

export interface CompileResult {
  campaign: CampaignDef | null;
  errors: Diagnostic[];
  warnings: Diagnostic[];
}

/** Übersetzt einen Kladde-Text in eine Kampagne. Bei Fehlern ist campaign null. */
export function compile(source: string): CompileResult {
  const r = new Report();
  // Kein HTML in Kampagnentexten: Dateien kommen auch von anderen und landen in der Oberfläche.
  source.split(/\r?\n/).forEach((l, i) => { if (/[<>]/.test(l)) r.error(i + 1, 'Spitze Klammern < > sind in Kladde-Texten nicht erlaubt.'); });
  const parsed = r.errors.length ? null : parseTree(toTree(source), r);
  if (parsed) checkCampaign(parsed.def, parsed.where, r);
  const errors = r.errors.sort((a, b) => a.line - b.line);
  return { campaign: errors.length ? null : parsed!.def, errors, warnings: r.warnings };
}
