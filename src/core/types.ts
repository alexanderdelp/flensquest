import type { GmCard, GoalSprite, HeroId, MonsterId, PropKind } from '../content';

/*
 Datentypen des Spiels. Alles hier ist reines JSON: Spielstände lassen sich speichern,
 zwischen Geräten übertragen und in Tests vergleichen.
*/

export interface Pos { x: number; y: number }

/* ---------- Kampagnen: was eine Kladde-Datei beschreibt ---------- */

/** bergen: Gegenstand zum Ausgang bringen; besiegen: Endgegner besiegen. Beides lässt sich kombinieren. */
export type Goal =
  | { type: 'bergen'; item: string; icon: string; sprite?: GoalSprite; boss?: MonsterId }
  | { type: 'besiegen'; boss: MonsterId; item?: string; icon?: string; sprite?: GoalSprite };

/** Wann ein Skript eines Kapitels läuft. */
export type Trigger =
  | { on: 'start' }
  | { on: 'tuer'; at: Pos[] }
  | { on: 'sieht'; kind: MonsterId }
  | { on: 'halb'; kind?: MonsterId }
  | { on: 'ziel' }
  | { on: 'runde'; n: number };

/** Was ein Skript tut. */
export type Command =
  | { do: 'zeige'; title: string; text: string }
  | { do: 'rufe'; kind: MonsterId; at: Pos }
  | { do: 'oere'; n: number }
  | { do: 'punkte'; n: number }
  | { do: 'heile'; n: number };

/** Ein Skript läuft genau einmal je Kapitel, sobald sein Auslöser eintritt. */
export interface Script { when: Trigger; then: Command[] }

export interface Chapter {
  title: string;
  place: string;
  intro: string;
  outro: string;
  goalText: string;
  goal: Goal;
  reward: number;
  map: string[];
  /** Raumthema für Boden und Wände; ohne Angabe die Kapitelnummer. */
  theme?: number;
  /** Ausgangslage vor dem Kapitel und Überleitung danach. */
  situation?: string;
  bridge?: string;
  scripts: Script[];
}

export interface CampaignDef {
  id: string;
  title: string;
  blurb: string;
  /** Auswahlbild; eigene Kampagnen dürfen ohne auskommen. */
  image?: string;
  chapters: Chapter[];
  /** Stapel des Spielleiters; Doppelte sind gewollt. */
  cards: GmCard[];
  /** Sätze, wenn der Rechner keine Karte spielt. */
  idle: string[];
  intro?: string;
  epilog?: string;
  lostText?: string;
  retryText?: string;
}

/* ---------- Fortschritt über Kapitel hinweg (wird gespeichert) ---------- */

export interface PartyHero {
  id: HeroId; att: number; arm: number; spd: number; food: number; gear: string[];
}

export interface Progress { heroes: PartyHero[]; oere: number; chapter: number; gmHuman?: boolean; campaign?: string }

/* ---------- Ein laufendes Kapitel ---------- */

export interface Hero extends PartyHero, Pos {
  hp: number; maxHp: number; charges: number; down: boolean; pfoten: boolean;
}
export interface Prop extends Pos { kind: PropKind }
export interface Monster extends Pos {
  uid: number; kind: MonsterId; hp: number; maxHp: number; stuck: boolean; blind?: boolean;
}

/** Was passiert ist, damit die Oberfläche es zeigen kann. Die Regeln hängen nicht davon ab. */
export type Fx =
  | { t: 'move'; who: string; path: Pos[] }
  | { t: 'attack'; who: string; target: string; shot: string | null; a: number; b: number; total: number; need: number; hit: boolean; dmg: number }
  | { t: 'shot'; who: string; target: string; shot: string }
  | { t: 'hurt'; who: string; n: number }
  | { t: 'heal'; who: string; n: number }
  | { t: 'die'; who: string }
  | { t: 'float'; at: Pos; text: string }
  | { t: 'card'; name: string; text: string; cost: number }
  | { t: 'note'; title: string; text: string }
  | { t: 'punkte'; n: number; total: number; why: string };

export interface Game {
  fx: Fx[];
  campaign: string; theme: number; chapter: number;
  /** Erledigte Skripte des Kapitels, als Nummern in chapter.scripts. */
  scriptsDone: number[];
  bossDead: boolean;
  gmHuman: boolean; gmActed: number[]; gmMoved: number[];
  /** Hand, Nachziehstapel und Ablage des Spielleiters als Nummern in der Kartenliste der Kampagne. */
  gmHand: number[]; gmDeck: number[]; gmPile: number[];
  /** Stempeltinte bezahlt die Karten. */
  tinte: number;
  /** Wirkungen bis zum Ende der Runde: mehr Schritte, mehr Angriff für die Gegner; Schlick bremst die Figuren. */
  gmEile: boolean; gmZorn: boolean; slow: boolean;
  w: number; h: number;
  tiles: string[][]; seen: boolean[][];
  heroes: Hero[]; monsters: Monster[];
  chests: Pos[]; traps: Pos[]; props: Prop[];
  goal: Pos | null; goalTaken: boolean; exit: Pos | null;
  turn: number; tiden: number; steps: number; attacked: boolean; specialUsed: boolean;
  round: number; punkte: number; oere: number; nextUid: number;
  status: 'play' | 'gm' | 'won' | 'lost'; lostReason: string;
  rng: number; log: string[];
}
