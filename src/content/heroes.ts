/** Spielbare Figuren: Werte und Spezialkönnen. Reine Daten, keine Regeln. */

export type HeroId = 'frauke' | 'joern' | 'maren' | 'hinnerk' | 'juni' | 'nordhexe';

export interface HeroDef {
  id: HeroId;
  name: string;
  title: string;
  icon: string;
  color: string;
  hp: number;
  att: number;
  arm: number;
  spd: number;
  dmg: number;
  range: number;
  weapon: string;
  special: string;
  specialText: string;
  /** Ausgeblendet: nicht mehr wählbar, alte Spielstände laufen weiter. */
  hidden?: boolean;
}

export const HEROES: Record<HeroId, HeroDef> = {
  frauke: {
    id: 'frauke', name: 'Frauke', title: 'Fördefischerin', icon: '🎣', color: '#2f7f93',
    hp: 10, att: 2, arm: 1, spd: 4, dmg: 2, range: 2, weapon: 'Harpune',
    special: 'FlensNetz', specialText: 'Fesselt einen Gegner bis 3 Felder weit: 1 Schaden, setzt eine Runde aus.',
  },
  joern: {
    id: 'joern', name: 'Jörn', title: 'Werftschlosser', icon: '🔧', color: '#b5532f',
    hp: 13, att: 3, arm: 2, spd: 3, dmg: 3, range: 1, weapon: 'Rohrzange',
    special: 'Dicker Schlüssel', specialText: 'Ein Schlag gegen einen Nachbarn: Treffer sicher, 4 Schaden.',
  },
  maren: {
    id: 'maren', name: 'Maren', title: 'Möwenflüsterin', icon: '🪶', color: '#7a5aa6',
    hp: 8, att: 1, arm: 0, spd: 5, dmg: 2, range: 4, weapon: 'Möwenpfiff',
    special: 'Schwarm über der Förde', specialText: 'Alle sichtbaren Gegner bis 3 Felder weit nehmen 1 Schaden.',
  },
  hinnerk: {
    id: 'hinnerk', name: 'Hinnerk', title: 'Rumkontorist', icon: '🥃', color: '#a9791f',
    hp: 10, att: 2, arm: 1, spd: 4, dmg: 2, range: 1, weapon: 'Kontorstock',
    special: 'Lütt un Lütt', specialText: 'Heilt den am schwersten getroffenen Nachbarn (oder dich) um 4, holt auch Gestürzte zurück.',
  },
  juni: {
    id: 'juni', name: 'Juni', title: 'Leuchtturmwärterin', icon: '🏮', color: '#2f6fd6',
    hp: 9, att: 2, arm: 1, spd: 5, dmg: 2, range: 3, weapon: 'Leuchtpistole',
    special: 'FlensLeuchtfeuer', specialText: 'Blendet alle sichtbaren Gegner bis 3 Felder weit: Sie setzen eine Runde aus.',
    hidden: true,
  },
  nordhexe: {
    id: 'nordhexe', name: 'Juni', title: 'Die echte Nordhexe', icon: '🧙', color: '#2a5fc4',
    hp: 9, att: 2, arm: 0, spd: 4, dmg: 2, range: 3, weapon: 'Möwe Piet',
    special: 'Piets Sturzflug', specialText: 'Piet stürzt sich auf einen Gegner bis 4 Felder weit: 2 Schaden, und der Gegner ist so verdattert, dass er eine Runde aussetzt.',
  },
};
