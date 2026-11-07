/*
 Zeichen auf dem Plan eines Kapitels. Gegner haben eigene Zeichen (siehe monsters.ts).
 # Wand, . Boden, D Tür, H verborgene Tür, S Start, X Ausgang, T Truhe, t Falle, G Ziel-Gegenstand,
 f Fass, x Kiste, o Pumpe, z Regal.
*/

export type PropKind = 'fass' | 'kiste' | 'pumpe' | 'regal';

export const PROP_CHARS: Record<string, PropKind> = { f: 'fass', x: 'kiste', o: 'pumpe', z: 'regal' };

/** Alle Zeichen außer Gegnern, mit Bedeutung; für Prüfungen und die Sprachbeschreibung. */
export const MAP_CHARS: Record<string, string> = {
  '#': 'Wand', '.': 'Boden', D: 'Tür', H: 'verborgene Tür', S: 'Start', X: 'Ausgang',
  T: 'Truhe', t: 'Falle', G: 'Ziel-Gegenstand', f: 'Fass', x: 'Kiste', o: 'Pumpe', z: 'Regal',
};

/** Bilder für den Ziel-Gegenstand. */
export const GOAL_SPRITES = ['logbuch', 'schluessel', 'karte', 'akte', 'feder', 'stempel'] as const;
export type GoalSprite = typeof GOAL_SPRITES[number];
