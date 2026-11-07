import type { GmCard, GoalSprite, MonsterId } from '../../content';

/* Altes Datenformat der Kampagnen, nur noch für den Übergang zur Kladde-Sprache. */

/** bergen: Gegenstand zum Ausgang bringen; besiegen: Endgegner besiegen. Beides lässt sich kombinieren. */
export type Goal =
  | { type: 'bergen'; item: string; icon: string; sprite?: GoalSprite; boss?: MonsterId }
  | { type: 'besiegen'; boss: MonsterId; item?: string; icon?: string; sprite?: GoalSprite };

export interface Spawn { kind: MonsterId; x: number; y: number }

/** Text beim Öffnen einer Tür, auf Wunsch mit einer Überraschung. */
export interface Note { at: [number, number][]; title: string; text: string; spawn?: Spawn[] }

export interface Chapter {
  title: string;
  place: string;
  intro: string;
  outro: string;
  goalText: string;
  goal: Goal;
  reward: number;
  map: string[];
  /** Raumthema; ohne Angabe die Kapitelnummer. */
  theme?: number;
  /** Ausgangslage, Überleitung und Raumtexte nutzt die Story-Kampagne. */
  situation?: string;
  bridge?: string;
  notes?: Note[];
  /** Beschreibung beim ersten Auftauchen eines Gegners. */
  foes?: Partial<Record<MonsterId, string>>;
  /** Wende im Endkampf, sobald der Endgegner die Hälfte verloren hat. */
  phase?: { title: string; text: string; spawn: Spawn[] };
}

/*
 Kartenzeichen: # Wand, . Boden, D Tür, H verborgene Tür, S Start, X Ausgang,
 T Truhe, t Falle, G Ziel-Gegenstand, f Fass, x Kiste, Kleinbuchstaben/K/B siehe MONSTER_CHARS.
*/

export type { GmCard };
