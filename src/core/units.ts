import { BOSS_SCALE_MIN, HP_SCALE, MONSTERS, type MonsterId } from '../content';
import { nearestFree } from './map';
import type { Game, Pos } from './types';

/** Gegner ins Spiel bringen; Lebenspunkte skalieren mit der Figurenzahl. */

export const hpScale = (g: Game) => HP_SCALE[Math.max(1, Math.min(4, g.heroes.length)) - 1];

export function spawn(g: Game, kind: MonsterId, x: number, y: number, scale: number) {
  const d = MONSTERS[kind];
  const hp = Math.max(1, Math.round(d.hp * (d.boss ? Math.max(scale, BOSS_SCALE_MIN) : scale)));
  g.monsters.push({ uid: g.nextUid++, kind, x, y, hp, maxHp: hp, stuck: false });
}

/** Verstärkung aufs nächste freie Feld um den gewünschten Punkt. */
export function placeSpawn(g: Game, kind: MonsterId, at: Pos) {
  const spot = nearestFree(g, at);
  if (spot) spawn(g, kind, spot.x, spot.y, hpScale(g));
}
