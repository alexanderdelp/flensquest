import { GM_BEFORE, MONSTERS, type GmEffect } from '../../content';
import { strike } from '../combat';
import { blocked, dist, heroAt, key, living, log, mkey, monsterAt, tile, cardOf, costOf } from '../state';
import { lineOfSight, STEPS, walkable } from '../map';
import type { Game, Hero, Monster, Pos } from '../types';
import { activeFoes, canPlayCard, hurtFoe, playCard, wetHeroes } from './cards';

/** Der Rechner als Spielleiter: Gegner ziehen und angreifen, Karten nach Nutzen je Tinte. */

export const monsterSpd = (g: Game, m: Monster) => MONSTERS[m.kind].spd + (g.gmEile ? 2 : 0);

/** Figuren, die ein Gegner von seinem Feld aus angreifen kann. */
export function gmTargets(g: Game, m: Monster): Hero[] {
  const r = MONSTERS[m.kind].range;
  return living(g).filter((h) => dist(m, h) <= r && lineOfSight(g, m, h));
}

/** Kürzester Weg bis in Angriffsreichweite einer Figur; [] wenn schon in Reichweite, null wenn unerreichbar. */
export function pathToward(g: Game, m: Monster, targets: Hero[], range: number): Pos[] | null {
  const inReach = (p: Pos) => targets.some((h) => dist(p, h) <= range && lineOfSight(g, p, h));
  if (inReach(m)) return [];
  const q: { p: Pos; path: Pos[] }[] = [{ p: { x: m.x, y: m.y }, path: [] }];
  const done = new Set([key(m.x, m.y)]);
  while (q.length) {
    const { p, path } = q.shift()!;
    for (const [dx, dy] of STEPS) {
      const x = p.x + dx, y = p.y + dy, k = key(x, y);
      if (done.has(k) || !walkable(tile(g, x, y))) continue;
      if (monsterAt(g, x, y) || heroAt(g, x, y) || blocked(g, x, y)) continue;
      done.add(k);
      const next = [...path, { x, y }];
      if (inReach({ x, y })) return next;
      q.push({ p: { x, y }, path: next });
    }
  }
  return null;
}

/** Ein Gegnerzug: Gefesselte setzen aus, sonst ranlaufen und die schwächste Figur in Reichweite angreifen. */
export function monsterAct(g: Game, m: Monster) {
  const d = MONSTERS[m.kind];
  if (m.stuck) { m.stuck = false; m.blind = false; log(g, `${d.name} setzt aus.`); return; }
  const path = pathToward(g, m, living(g), d.range);
  if (path === null) return;
  const walk = path.slice(0, monsterSpd(g, m));
  if (walk.length) {
    g.fx.push({ t: 'move', who: mkey(m), path: walk });
    m.x = walk[walk.length - 1].x; m.y = walk[walk.length - 1].y;
  }
  const t = gmTargets(g, m).sort((a, b) => a.hp - b.hp)[0];
  if (t) strike(g, m, t);
}

/** Wie sehr sich eine Karte für den Rechner gerade lohnt; 0 heißt: nicht spielen. */
export function cardValue(g: Game, id: GmEffect): number {
  const foes = activeFoes(g), heroes = living(g);
  const gap = (m: Monster) => Math.min(...heroes.map((h) => dist(m, h))) - MONSTERS[m.kind].range;
  switch (id) {
    case 'eile': {
      const n = foes.filter((m) => !m.stuck && gap(m) > MONSTERS[m.kind].spd && gap(m) <= MONSTERS[m.kind].spd + 2).length;
      return n ? 1 + n : 0;
    }
    case 'zorn': {
      const n = foes.filter((m) => !m.stuck && gap(m) <= monsterSpd(g, m)).length;
      return n >= 2 ? n : 0;
    }
    case 'flicken': { const m = hurtFoe(g); return m && m.maxHp - m.hp >= 3 ? (MONSTERS[m.kind].boss ? 4 : 2) : 0; }
    case 'schiet': return wetHeroes(g).length >= Math.min(2, heroes.length) ? 1 + wetHeroes(g).length : 0;
    case 'verstaerkung': return 3;
    case 'falle': return 2;
    case 'klau': return heroes.some((h) => h.food > 0 && h.hp < h.maxHp - 3) ? 2 : 1;
    case 'schlick': return 2;
    case 'knoellchen': return 3;
    default: return 0;
  }
}

/** Spielt die lohnendsten bezahlbaren Karten einer Phase (vor oder nach den Gegnerzügen). */
export function aiCards(g: Game, before: boolean): number {
  let played = 0;
  for (;;) {
    let best = -1, bestV = 0;
    g.gmHand.forEach((c, i) => {
      const id = cardOf(g, c).id, value = cardValue(g, id);
      if (GM_BEFORE.includes(id) !== before || value <= 0 || !canPlayCard(g, i)) return;
      const v = value / costOf(g, c) + value / 10;
      if (v > bestV) { bestV = v; best = i; }
    });
    if (best < 0 || g.status !== 'gm') return played;
    playCard(g, best);
    played++;
  }
}
