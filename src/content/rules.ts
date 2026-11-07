/** Feste Regelwerte. Wer hier dreht, ändert das Gleichgewicht des ganzen Spiels. */

/** Tiden je Zug; solo gibt es eine mehr. */
export const TIDEN = 3;
/** Bei so vielen Punkten in Flensburg ist der Lappen weg. */
export const PUNKTE_LIMIT = 8;
/** Gegner-Lebenspunkte je nach Figurenzahl 1 bis 4. */
export const HP_SCALE = [0.5, 1, 1.25, 1.5];
/** Endgegner werden solo höchstens bis zu diesem Faktor schwächer. */
export const BOSS_SCALE_MIN = 0.6;
/** Lebenspunkte der Figuren: Grundwert plus dieser Zuschlag, solo noch einmal SOLO_HP. */
export const HP_BONUS = 2;
export const SOLO_HP = 4;
/** Start-Öre einer neuen Kampagne und Fischbrötchen je Figur. */
export const START_OERE = 20;
export const START_FOOD = 2;
/** Spezialkönnen je Kapitel. */
export const CHARGES = 2;
/** Jede wievielte Runde der Stempel fällt. */
export const STEMPEL_RUNDE = 4;

/** Stempeltinte und Kartenhand des Spielleiters. */
export const TINTE_START = 2;
export const TINTE_RUNDE = 2;
export const TINTE_MAX = 8;
export const HAND_START = 3;
export const HAND_MAX = 5;
