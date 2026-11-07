import type { Game } from './types';

/** Zufall nur aus dem Startwert im Spielstand: gleiche Handlungen ergeben überall dasselbe Spiel. */
export function rand(g: { rng: number }): number {
  g.rng = (g.rng + 0x6d2b79f5) | 0;
  let t = g.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const d6 = (g: Game) => 1 + Math.floor(rand(g) * 6);

export const pick = <T>(g: Game, list: T[]): T => list[Math.floor(rand(g) * list.length)];

export function shuffle<T>(g: Game, list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand(g) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
