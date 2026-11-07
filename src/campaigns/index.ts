import akte from '../../kampagnen/akte.kladde?raw';
import hafen from '../../kampagnen/hafen.kladde?raw';
import { campaigns, registerCampaign, unregisterCampaign, type CampaignDef } from '../core';
import { compile, formatDiagnostic, type CompileResult } from '../kladde';

/*
 Kampagnen des Spiels: die mitgelieferten Kladde-Dateien aus kampagnen/ und eigene, die jemand lädt.
 Hier wird nur übersetzt und eingetragen; wo eigene Kampagnen liegen, entscheidet die Oberfläche.
*/

/** Mitgelieferte Kampagnen in der Reihenfolge der Auswahl. */
export const BUILTIN_SOURCES: Record<string, string> = { hafen, akte };

export const isBuiltin = (id: string) => id in BUILTIN_SOURCES;

/** Übersetzt die mitgelieferten Kampagnen; ein Fehler darin ist ein Fehler im Spiel selbst. */
export function builtins(): CampaignDef[] {
  return Object.entries(BUILTIN_SOURCES).map(([file, src]) => {
    const r = compile(src);
    if (!r.campaign) throw new Error(`kampagnen/${file}.kladde: ${r.errors.map(formatDiagnostic).join('; ')}`);
    return r.campaign;
  });
}

export function registerBuiltins() { builtins().forEach(registerCampaign); }

/** Prüft eine eigene Kampagne; eingebaute Kennungen sind tabu. */
export function checkOwn(source: string): CompileResult {
  const r = compile(source);
  if (r.campaign && isBuiltin(r.campaign.id)) {
    return { campaign: null, warnings: r.warnings, errors: [{ line: 0, severity: 'fehler', message: `Die Kennung „${r.campaign.id}“ gehört zu einer mitgelieferten Kampagne. Bitte eine andere wählen.` }] };
  }
  return r;
}

/** Trägt gespeicherte eigene Kampagnen ein; was nicht (mehr) übersetzbar ist, bleibt außen vor. */
export function registerOwn(sources: string[]): CampaignDef[] {
  return sources.flatMap((s) => {
    const r = checkOwn(s);
    if (!r.campaign) return [];
    registerCampaign(r.campaign);
    return [r.campaign];
  });
}

/** Fügt eine eigene Kampagne hinzu oder ersetzt die mit gleicher Kennung; liefert die neue Liste der Quelltexte. */
export function addOwn(source: string, sources: string[]): { result: CompileResult; sources: string[] } {
  const result = checkOwn(source);
  if (!result.campaign) return { result, sources };
  const id = result.campaign.id;
  const kept = sources.filter((s) => checkOwn(s).campaign?.id !== id);
  registerCampaign(result.campaign);
  return { result, sources: [...kept, source] };
}

/** Entfernt eine eigene Kampagne; mitgelieferte bleiben. */
export function removeOwn(id: string, sources: string[]): string[] {
  if (isBuiltin(id)) return sources;
  unregisterCampaign(id);
  return sources.filter((s) => checkOwn(s).campaign?.id !== id);
}

export const ownCampaigns = () => campaigns().filter((c) => !isBuiltin(c.id));

/** Quelltext zum Weitergeben: mitgelieferte im Original samt Kommentaren, eigene so, wie sie geladen wurden. */
export function sourceOf(id: string, sources: string[]): string | null {
  if (isBuiltin(id)) return BUILTIN_SOURCES[id];
  return sources.find((s) => checkOwn(s).campaign?.id === id) ?? null;
}
