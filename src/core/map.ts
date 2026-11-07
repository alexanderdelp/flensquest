import { blocked, dist, heroAt, key, living, monsterAt, tile } from './state';
import type { Game, Pos } from './types';

/** Gelände: Laufen, Sicht, Aufdecken und freie Felder. */

export const walkable = (t: string) => t === '.' || t === 'O' || t === 'X';
export const blocksSight = (t: string) => t === '#' || t === 'D' || t === 'H';
export const STEPS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function lineOfSight(g: Game, a: Pos, b: Pos): boolean {
  const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  for (let i = 1; i < n; i++) {
    const x = Math.round(a.x + ((b.x - a.x) * i) / n);
    const y = Math.round(a.y + ((b.y - a.y) * i) / n);
    if (blocksSight(tile(g, x, y))) return false;
  }
  return true;
}

/** Aufdecken per Flutfüllung ab allen stehenden Figuren: geschlossene Türen begrenzen die Sicht. */
export function reveal(g: Game) {
  const stack: Pos[] = living(g).map((h) => ({ x: h.x, y: h.y }));
  const done = new Set<string>();
  while (stack.length) {
    const p = stack.pop()!;
    if (done.has(key(p.x, p.y))) continue;
    done.add(key(p.x, p.y));
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (g.seen[p.y + dy]?.[p.x + dx] !== undefined) g.seen[p.y + dy][p.x + dx] = true;
    }
    for (const [dx, dy] of STEPS) {
      const x = p.x + dx, y = p.y + dy;
      if (walkable(tile(g, x, y)) && !done.has(key(x, y))) stack.push({ x, y });
    }
  }
}

/** Ist ein Feld frei für eine neue Figur oder Falle? */
export const freeForUnit = (g: Game, x: number, y: number) =>
  walkable(tile(g, x, y)) && !monsterAt(g, x, y) && !heroAt(g, x, y) && !blocked(g, x, y);

/** Breitensuche über begehbare, aufgedeckte Felder; liefert für jedes erreichbare Feld den Weg. */
export function paths(g: Game, from: Pos, max: number, passable: (x: number, y: number) => boolean): Map<string, Pos[]> {
  const out = new Map<string, Pos[]>();
  const q: { p: Pos; path: Pos[] }[] = [{ p: { x: from.x, y: from.y }, path: [] }];
  const done = new Set([key(from.x, from.y)]);
  while (q.length) {
    const { p, path } = q.shift()!;
    if (path.length) out.set(key(p.x, p.y), path);
    if (path.length >= max) continue;
    for (const [dx, dy] of STEPS) {
      const x = p.x + dx, y = p.y + dy, k = key(x, y);
      if (done.has(k) || !passable(x, y)) continue;
      done.add(k);
      q.push({ p: { x, y }, path: [...path, { x, y }] });
    }
  }
  return out;
}

/** Nächstes freies Feld um einen Punkt, höchstens 4 Felder weit. */
export function nearestFree(g: Game, at: Pos): Pos | null {
  for (let r = 0; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = at.x + dx, y = at.y + dy;
    if (freeForUnit(g, x, y)) return { x, y };
  }
  return null;
}

/** Abstand zur nächsten stehenden Figur. */
export const nearestHero = (g: Game, p: Pos) => Math.min(...living(g).map((h) => dist(h, p)));
