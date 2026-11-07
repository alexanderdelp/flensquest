import { PUNKTE_LIMIT } from '../content';
import { chapterOf, log } from './state';
import type { Game, Hero } from './types';

/** Punkte, Sieg und Niederlage. */

export function win(g: Game) {
  g.status = 'won';
  g.oere += chapterOf(g).reward;
  log(g, 'Geschafft! Kapitel gewonnen.');
}

export function lose(g: Game, why: string) {
  if (g.status === 'won' || g.status === 'lost') return;
  g.status = 'lost';
  g.lostReason = why;
  log(g, why);
}

export function addPunkte(g: Game, n: number, why = '') {
  g.punkte = Math.max(0, g.punkte + n);
  g.fx.push({ t: 'punkte', n, total: g.punkte, why });
  if (g.punkte >= PUNKTE_LIMIT) lose(g, `${PUNKTE_LIMIT} Punkte in Flensburg: der Lappen ist weg!`);
}

const bossDone = (g: Game) => !chapterOf(g).goal.boss || g.bossDead;

/** Besiegen-Ziele gelten sofort, sobald Endgegner und Gegenstand erledigt sind. */
export function tryWin(g: Game) {
  if (chapterOf(g).goal.type === 'besiegen' && bossDone(g) && (!g.goal || g.goalTaken)) win(g);
}

/** Bergen-Ziele gelten erst am Ausgang. */
export function checkExit(g: Game, h: Hero) {
  if (g.status === 'play' && g.goalTaken && bossDone(g) && g.exit && h.x === g.exit.x && h.y === g.exit.y) win(g);
}
