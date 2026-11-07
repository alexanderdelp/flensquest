import type { CampaignDef } from './types';

/*
 Verzeichnis der Kampagnen. Der Kern kennt keine Inhalte; wer startet, trägt die Kampagnen ein
 (mitgelieferte und eigene). Spielstände merken sich nur die Kennung.
*/

const list: CampaignDef[] = [];

/** Trägt eine Kampagne ein; gibt es die Kennung schon, wird sie ersetzt. */
export function registerCampaign(def: CampaignDef) {
  const i = list.findIndex((c) => c.id === def.id);
  if (i >= 0) list[i] = def; else list.push(def);
}

export function unregisterCampaign(id: string) {
  const i = list.findIndex((c) => c.id === id);
  if (i >= 0) list.splice(i, 1);
}

export const campaigns = (): readonly CampaignDef[] => list;

export const hasCampaign = (id: string) => list.some((c) => c.id === id);

/** Unbekannte Kennungen (alte Spielstände) gehören zur ersten Kampagne. */
export function campaignById(id?: string): CampaignDef {
  const c = list.find((o) => o.id === id) ?? list[0];
  if (!c) throw new Error('Keine Kampagne eingetragen.');
  return c;
}
