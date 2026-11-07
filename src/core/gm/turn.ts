import { MONSTERS, STEMPEL_RUNDE, type HeroId } from '../../content';
import { strike } from '../combat';
import { beginTurn } from '../heroes';
import { paths, walkable } from '../map';
import { addPunkte } from '../outcome';
import { fire, look } from '../scripts';
import { blocked, campaignOf, heroAt, isActive, key, log, mkey, monsterAt, tile } from '../state';
import type { Game, Monster } from '../types';
import { aiCards, gmTargets, monsterAct, monsterSpd } from './ai';
import { gmBegin, playCard } from './cards';

/** Ablauf der Spielleiter-Runde: Rechner als Generator, Mensch über einzelne Handlungen. */

/** Jede vierte Runde fällt der Stempel: ein Punkt in Flensburg. */
function stamp(g: Game) {
  if (g.round % STEMPEL_RUNDE !== 0) return;
  log(g, 'Der Stempel fällt: 1 Punkt in Flensburg.');
  addPunkte(g, 1, 'Der Stempel fällt');
}

/** Neue Runde: Gestürzte mit Lebenspunkten stehen auf, Rundenwirkungen enden, Runden-Skripte laufen. */
function nextRound(g: Game) {
  if (g.status !== 'gm') return;
  g.round++;
  g.status = 'play';
  g.gmEile = false; g.gmZorn = false;
  g.heroes.forEach((h) => { if (h.down && h.hp > 0) h.down = false; });
  g.turn = g.heroes.findIndex((h) => !h.down);
  fire(g, { on: 'runde', n: g.round });
  if (g.status !== 'play') return;
  beginTurn(g);
}

/** Spielleiter-Zug des Rechners als Generator, damit die Oberfläche jeden Gegnerzug einzeln zeigt. */
export function* gmTurn(g: Game): Generator<void> {
  if (g.status !== 'gm') return;
  log(g, '— Der Oberpunktezähler ist dran —');
  gmBegin(g);
  let played = aiCards(g, true);
  if (played) yield;
  for (const m of [...g.monsters]) {
    if (!isActive(g, m) || !g.monsters.includes(m)) continue;
    monsterAct(g, m);
    look(g);
    yield;
    if (g.status !== 'gm') return;
  }
  played += aiCards(g, false);
  if (g.status !== 'gm') return;
  if (!played) {
    const idle = campaignOf(g).idle;
    if (idle.length) log(g, `${idle[g.round % idle.length]} (${g.tinte} Tinte)`);
  }
  stamp(g);
  yield;
  nextRound(g);
}

/* ---------- Spielleiter als Mensch ---------- */

export function gmStart(g: Game) {
  log(g, '— Der Spielleiter ist dran —');
  g.gmActed = []; g.gmMoved = [];
  gmBegin(g);
  g.monsters.filter((m) => m.stuck && isActive(g, m)).forEach((m) => {
    m.stuck = false; m.blind = false;
    g.gmActed.push(m.uid);
    log(g, `${MONSTERS[m.kind].name} setzt aus.`);
  });
}

export const gmCanAct = (g: Game, m: Monster) =>
  g.status === 'gm' && g.gmHuman && isActive(g, m) && !g.gmActed.includes(m.uid);

/** Felder, auf die ein Gegner in diesem Zug ziehen darf. */
export function gmReachable(g: Game, m: Monster) {
  if (!gmCanAct(g, m) || g.gmMoved.includes(m.uid)) return new Map<string, { x: number; y: number }[]>();
  return paths(g, m, monsterSpd(g, m), (x, y) =>
    walkable(tile(g, x, y)) && g.seen[y][x] && !monsterAt(g, x, y) && !heroAt(g, x, y) && !blocked(g, x, y));
}

export function gmMove(g: Game, m: Monster, x: number, y: number): boolean {
  const path = gmReachable(g, m).get(key(x, y));
  if (!path) return false;
  g.fx.push({ t: 'move', who: mkey(m), path });
  m.x = x; m.y = y;
  g.gmMoved.push(m.uid);
  return true;
}

export function gmAttack(g: Game, m: Monster, id: HeroId): boolean {
  const t = gmTargets(g, m).find((h) => h.id === id);
  if (!t || !gmCanAct(g, m)) return false;
  g.gmActed.push(m.uid);
  strike(g, m, t);
  return true;
}

export const gmCard = (g: Game, i: number) => g.gmHuman && playCard(g, i);

export function gmEnd(g: Game): boolean {
  if (g.status !== 'gm' || !g.gmHuman) return false;
  stamp(g);
  nextRound(g);
  return true;
}
