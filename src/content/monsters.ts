/** Gegner: Werte, Beute und ihr Zeichen auf dem Plan. Reine Daten, keine Regeln. */

export type MonsterId = 'moewe' | 'knoellchen' | 'rumgeist' | 'qualle' | 'klabauter' | 'obermeister' | 'ratte' | 'schmuggler' | 'krabbe'
  | 'moewenraeuber' | 'kellerkassierer' | 'punktepruefer' | 'schlurfer'
  | 'kalle' | 'fiete' | 'krischan' | 'waechter' | 'proehl' | 'oberarchivar';

export interface MonsterDef {
  id: MonsterId;
  name: string;
  icon: string;
  hp: number;
  att: number;
  arm: number;
  spd: number;
  dmg: number;
  range: number;
  reward: number;
  /** Endgegner werden solo weniger stark abgeschwächt. */
  boss?: boolean;
}

export const MONSTERS: Record<MonsterId, MonsterDef> = {
  moewe: { id: 'moewe', name: 'Pommes-Möwe', icon: '🐦', hp: 2, att: 1, arm: 0, spd: 5, dmg: 1, range: 1, reward: 3 },
  knoellchen: { id: 'knoellchen', name: 'Knöllchenkobold', icon: '🧾', hp: 3, att: 2, arm: 1, spd: 3, dmg: 1, range: 1, reward: 5 },
  rumgeist: { id: 'rumgeist', name: 'Rumgeist', icon: '👻', hp: 4, att: 3, arm: 2, spd: 3, dmg: 2, range: 1, reward: 8 },
  qualle: { id: 'qualle', name: 'Förde-Qualle', icon: '🦑', hp: 6, att: 2, arm: 0, spd: 2, dmg: 2, range: 1, reward: 6 },
  ratte: { id: 'ratte', name: 'Hafenratte', icon: '🐀', hp: 1, att: 1, arm: 0, spd: 6, dmg: 1, range: 1, reward: 2 },
  schmuggler: { id: 'schmuggler', name: 'Rumschmuggler', icon: '🍾', hp: 4, att: 2, arm: 1, spd: 3, dmg: 1, range: 3, reward: 7 },
  krabbe: { id: 'krabbe', name: 'Panzerkrabbe', icon: '🦀', hp: 5, att: 2, arm: 3, spd: 2, dmg: 2, range: 1, reward: 8 },
  klabauter: { id: 'klabauter', name: 'Klabauter', icon: '😈', hp: 7, att: 3, arm: 2, spd: 4, dmg: 2, range: 1, reward: 20, boss: true },
  obermeister: { id: 'obermeister', name: 'Oberpunktezähler', icon: '👔', hp: 12, att: 4, arm: 3, spd: 3, dmg: 2, range: 3, reward: 60, boss: true },
  moewenraeuber: { id: 'moewenraeuber', name: 'Möwenräuber', icon: '🐦', hp: 3, att: 2, arm: 0, spd: 5, dmg: 1, range: 1, reward: 4 },
  kellerkassierer: { id: 'kellerkassierer', name: 'Kellerkassierer', icon: '💰', hp: 5, att: 3, arm: 1, spd: 3, dmg: 2, range: 1, reward: 9 },
  punktepruefer: { id: 'punktepruefer', name: 'Punkteprüfer', icon: '📋', hp: 4, att: 2, arm: 2, spd: 3, dmg: 1, range: 3, reward: 9 },
  schlurfer: { id: 'schlurfer', name: 'Förde-Schlurfer', icon: '🌊', hp: 7, att: 2, arm: 1, spd: 2, dmg: 2, range: 1, reward: 8 },
  kalle: { id: 'kalle', name: 'Kai-Kalle', icon: '🍾', hp: 9, att: 3, arm: 1, spd: 3, dmg: 2, range: 3, reward: 20, boss: true },
  fiete: { id: 'fiete', name: 'Fälscher-Fiete', icon: '🖋️', hp: 10, att: 3, arm: 2, spd: 3, dmg: 2, range: 3, reward: 25, boss: true },
  krischan: { id: 'krischan', name: 'Hauptmann Krischan', icon: '🐦', hp: 11, att: 4, arm: 1, spd: 5, dmg: 2, range: 1, reward: 30, boss: true },
  waechter: { id: 'waechter', name: 'Archivwächter', icon: '🗄️', hp: 13, att: 4, arm: 3, spd: 2, dmg: 3, range: 1, reward: 35, boss: true },
  proehl: { id: 'proehl', name: 'Pumpenmeister Pröhl', icon: '🔧', hp: 13, att: 4, arm: 2, spd: 3, dmg: 2, range: 2, reward: 40, boss: true },
  oberarchivar: { id: 'oberarchivar', name: 'Oberarchivar', icon: '🔏', hp: 20, att: 5, arm: 3, spd: 3, dmg: 3, range: 3, reward: 80, boss: true },
};

export const MONSTER_CHARS: Record<string, MonsterId> = {
  m: 'moewe', k: 'knoellchen', r: 'rumgeist', q: 'qualle', K: 'klabauter', B: 'obermeister',
  a: 'ratte', s: 'schmuggler', c: 'krabbe',
  w: 'moewenraeuber', e: 'kellerkassierer', p: 'punktepruefer', u: 'schlurfer',
  1: 'kalle', 2: 'fiete', 3: 'krischan', 4: 'waechter', 5: 'proehl', 6: 'oberarchivar',
};
