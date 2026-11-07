import { HEROES, TIDEN } from '../content';
import { hurtHero } from './combat';
import { gmStart } from './gm/turn';
import { lineOfSight, paths, walkable } from './map';
import { addPunkte, checkExit, tryWin } from './outcome';
import { d6 } from './rng';
import { fire, look } from './scripts';
import { SPECIALS } from './specials';
import {
  activeHero, blocked, chapterOf, chestAt, dist, heroAt, hkey, isActive, key, log, monsterAt, spdOf, tile,
} from './state';
import type { Fx, Game, Monster, Pos } from './types';

/** Was die Figur am Zug tun kann: laufen, Türen, Truhen, suchen, essen, Spezialkönnen, Zug beenden. */

export function beginTurn(g: Game) {
  const h = activeHero(g);
  g.tiden = TIDEN + (g.heroes.length === 1 ? 1 : 0);
  g.steps = 0;
  g.attacked = false;
  g.specialUsed = false;
  log(g, `${HEROES[h.id].name} ist dran.`);
}

/** Wege, die die aktive Figur mit ihren Schritten plus Tiden erreicht; Felder anderer Figuren nur zum Durchgehen. */
export function reachable(g: Game): Map<string, Pos[]> {
  const h = activeHero(g);
  const all = paths(g, h, g.steps + g.tiden * spdOf(g, h), (x, y) =>
    walkable(tile(g, x, y)) && g.seen[y][x] && !monsterAt(g, x, y) && !blocked(g, x, y));
  for (const [k, p] of all) if (heroAt(g, p[p.length - 1].x, p[p.length - 1].y)) all.delete(k);
  return all;
}

/** Schritte, die in diesem Zug noch möglich sind. */
export const stepsLeft = (g: Game) => g.steps + g.tiden * spdOf(g, activeHero(g));

/** Wie viele neue Tiden ein Weg dieser Länge kostet. */
export const tideCost = (g: Game, len: number) =>
  (len <= g.steps ? 0 : Math.ceil((len - g.steps) / spdOf(g, activeHero(g))));

function takeGoal(g: Game) {
  const goal = chapterOf(g).goal;
  g.goalTaken = true;
  if (goal.type === 'bergen') log(g, `${goal.item} gefunden! Jetzt zum Ausgang.`);
  else if (goal.item) log(g, `${goal.item} gesichert.`);
  fire(g, { on: 'ziel' });
  tryWin(g);
}

export function moveTo(g: Game, x: number, y: number): boolean {
  const path = reachable(g).get(key(x, y));
  if (!path || g.status !== 'play') return false;
  const h = activeHero(g);
  const walked: Pos[] = [];
  const mv: Fx = { t: 'move', who: hkey(h), path: walked };
  g.fx.push(mv);
  for (const p of path) {
    if (g.steps === 0) { g.tiden--; g.steps = spdOf(g, h); }
    g.steps--;
    h.x = p.x; h.y = p.y;
    walked.push({ x: p.x, y: p.y });
    const trap = g.traps.findIndex((t) => t.x === p.x && t.y === p.y);
    if (trap >= 0) {
      g.traps.splice(trap, 1);
      log(g, `Falle! ${HEROES[h.id].name} tritt in ein Fangnetz: 2 Schaden und 1 Punkt.`);
      hurtHero(g, h, 2);
      addPunkte(g, 1, 'Falle');
      break;
    }
    if (g.goal && !g.goalTaken && p.x === g.goal.x && p.y === g.goal.y) takeGoal(g);
  }
  look(g);
  checkExit(g, h);
  return true;
}

export function canOpenDoor(g: Game, x: number, y: number) {
  return g.status === 'play' && tile(g, x, y) === 'D' && dist(activeHero(g), { x, y }) === 1;
}

/** Türen öffnen kostet nichts; dahinter wird aufgedeckt, und Tür-Skripte laufen. */
export function openDoor(g: Game, x: number, y: number): boolean {
  if (!canOpenDoor(g, x, y)) return false;
  g.tiles[y][x] = 'O';
  log(g, 'Tür auf.');
  fire(g, { on: 'tuer', at: { x, y } });
  look(g);
  return true;
}

export function canOpenChest(g: Game, x: number, y: number) {
  return g.status === 'play' && g.tiden > 0 && !!chestAt(g, x, y) && dist(activeHero(g), { x, y }) === 1;
}

/** Truhe: 1 Mimik (2 Schaden), 2 bis 4 Öre, 5 oder 6 ein Fischbrötchen. */
export function openChest(g: Game, x: number, y: number): boolean {
  if (!canOpenChest(g, x, y)) return false;
  g.tiden--; g.steps = 0;
  g.chests = g.chests.filter((c) => !(c.x === x && c.y === y));
  const r = d6(g), h = activeHero(g);
  if (r === 1) {
    log(g, 'Die Truhe ist ein Mimik-Rumfass: 2 Schaden.');
    hurtHero(g, h, 2);
  } else if (r <= 4) {
    const o = 10 + r * 5;
    g.oere += o;
    log(g, `In der Truhe liegen ${o} Öre.`);
    g.fx.push({ t: 'float', at: { x, y }, text: `+${o} Öre` });
  } else {
    h.food++;
    log(g, 'In der Truhe liegt ein erstaunlich frisches Fischbrötchen.');
    g.fx.push({ t: 'float', at: { x, y }, text: '+1 Fischbrötchen' });
  }
  return true;
}

/** Suchen entschärft sichtbare Fallen und findet verborgene Türen bis 4 Felder weit. */
export function search(g: Game): boolean {
  if (g.status !== 'play' || g.tiden < 1) return false;
  g.tiden--; g.steps = 0;
  const h = activeHero(g);
  const before = g.traps.length;
  g.traps = g.traps.filter((t) => !(dist(h, t) <= 4 && g.seen[t.y][t.x]));
  let doors = 0;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (g.tiles[y][x] === 'H' && dist(h, { x, y }) <= 4 && g.seen[y][x]) { g.tiles[y][x] = 'D'; doors++; }
  }
  const traps = before - g.traps.length;
  log(g, doors || traps
    ? `Gefunden: ${doors ? `${doors} verborgene Tür(en) ` : ''}${traps ? `${traps} Falle(n) entschärft` : ''}`.trim()
    : 'Nichts gefunden. Nur alte Fischgräten.');
  return true;
}

export function eat(g: Game): boolean {
  const h = activeHero(g);
  if (g.status !== 'play' || g.tiden < 1 || h.food < 1 || h.hp >= h.maxHp) return false;
  g.tiden--; g.steps = 0; h.food--;
  g.fx.push({ t: 'heal', who: hkey(h), n: Math.min(4, h.maxHp - h.hp) });
  h.hp = Math.min(h.maxHp, h.hp + 4);
  log(g, `${HEROES[h.id].name} isst ein Fischbrötchen (+4).`);
  return true;
}

export const specialNeedsTarget = (g: Game) => SPECIALS[activeHero(g).id].target;

export function canSpecialOn(g: Game, m: Monster) {
  const h = activeHero(g);
  if (!isActive(g, m)) return false;
  return dist(h, m) <= SPECIALS[h.id].range && lineOfSight(g, h, m);
}

export function canSpecial(g: Game) {
  const h = activeHero(g);
  return g.status === 'play' && g.tiden > 0 && h.charges > 0 && !g.specialUsed;
}

/** Spezialkönnen: zweimal je Kapitel, einmal je Zug, kostet eine Tide. */
export function special(g: Game, target?: Monster): boolean {
  if (!canSpecial(g)) return false;
  const h = activeHero(g), rule = SPECIALS[h.id];
  if (rule.target && (!target || !canSpecialOn(g, target))) return false;
  if (!rule.apply(g, h, target)) return false;
  g.tiden--; g.steps = 0; h.charges--; g.specialUsed = true;
  log(g, `${HEROES[h.id].special}: noch ${h.charges}×.`);
  return true;
}

/** Nächste stehende Figur; nach der letzten ist der Spielleiter dran. */
export function endTurn(g: Game) {
  if (g.status !== 'play') return;
  for (let i = g.turn + 1; i < g.heroes.length; i++) {
    if (!g.heroes[i].down) { g.turn = i; beginTurn(g); return; }
  }
  g.status = 'gm';
  if (g.gmHuman) gmStart(g);
}
