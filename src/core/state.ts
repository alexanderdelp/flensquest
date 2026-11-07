import { GM_COST, type GmCard } from '../content';
import { campaignById } from './catalog';
import type { Game, Hero, Monster, Pos } from './types';

/** Kleine Abfragen auf dem Spielstand, ohne ihn zu verändern (bis auf log). */

export const key = (x: number, y: number) => `${x},${y}`;
export const hkey = (h: { id: string }) => `h:${h.id}`;
export const mkey = (m: { uid: number }) => `m:${m.uid}`;
export const dist = (a: Pos, b: Pos) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function log(g: Game, msg: string) { g.log.push(msg); }

export const campaignOf = (g: Game) => campaignById(g.campaign);
export const chapterOf = (g: Game) => campaignOf(g).chapters[g.chapter];
export const cardOf = (g: Game, i: number): GmCard => campaignOf(g).cards[i];
export const costOf = (g: Game, i: number) => GM_COST[cardOf(g, i).id];

export const activeHero = (g: Game): Hero => g.heroes[g.turn];
export const living = (g: Game) => g.heroes.filter((h) => !h.down);
/** Schritte je Tide; Schlick kostet einen, nie unter 1. */
export const spdOf = (g: Game, h: Hero) => Math.max(1, h.spd - (g.slow ? 1 : 0));

export const tile = (g: Game, x: number, y: number) => g.tiles[y]?.[x] ?? '#';
export const monsterAt = (g: Game, x: number, y: number): Monster | undefined =>
  g.monsters.find((m) => m.x === x && m.y === y);
export const heroAt = (g: Game, x: number, y: number): Hero | undefined =>
  g.heroes.find((h) => !h.down && h.x === x && h.y === y);
export const chestAt = (g: Game, x: number, y: number) => g.chests.find((c) => c.x === x && c.y === y);
export const propAt = (g: Game, x: number, y: number) => g.props.find((c) => c.x === x && c.y === y);
export const blocked = (g: Game, x: number, y: number) => !!chestAt(g, x, y) || !!propAt(g, x, y);

/** Gegner handeln erst, wenn ihr Feld aufgedeckt ist. */
export const isActive = (g: Game, m: Monster) => g.seen[m.y][m.x];
