/*
 Spielleiterkarten: Der Spielleiter hält eine Hand und bezahlt Karten mit Stempeltinte.
 Die Wirkung hängt nur an der id; Name und Text wählt jede Kampagne selbst.
*/

export type GmEffect = 'eile' | 'zorn' | 'flicken' | 'schiet' | 'verstaerkung' | 'falle' | 'klau' | 'schlick' | 'knoellchen';

export interface GmCard { id: GmEffect; name: string; text: string }

/** Tinte je Karte. */
export const GM_COST: Record<GmEffect, number> = {
  klau: 2, eile: 3, flicken: 3, zorn: 4, schiet: 4, schlick: 4, verstaerkung: 4, falle: 4, knoellchen: 6,
};

/** Karten, die vor dem Zug der Gegner wirken; der Rechner spielt sie zuerst. */
export const GM_BEFORE: GmEffect[] = ['eile', 'zorn', 'flicken'];

/** Alle Kartenwirkungen, etwa für Prüfungen. */
export const GM_EFFECTS = Object.keys(GM_COST) as GmEffect[];
