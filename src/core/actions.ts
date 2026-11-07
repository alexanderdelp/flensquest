import type { HeroId } from '../content';
import { attack } from './combat';
import { gmAttack, gmCard, gmEnd, gmMove } from './gm/turn';
import { endTurn, eat, moveTo, openChest, openDoor, search, special } from './heroes';
import type { Game } from './types';

/** Jede Spielhandlung als einfache Nachricht: gleiche Regeln lokal und zwischen Geräten. */
export type Action =
  | { type: 'move' | 'door' | 'chest'; x: number; y: number }
  | { type: 'attack'; uid: number }
  | { type: 'special'; uid?: number }
  | { type: 'search' | 'eat' | 'end' | 'gmEnd' }
  | { type: 'gmMove'; uid: number; x: number; y: number }
  | { type: 'gmAttack'; uid: number; hero: HeroId }
  | { type: 'gmCard'; index: number };

/** Führt eine Handlung aus; false, wenn sie nach den Regeln gerade nicht geht. */
export function dispatch(g: Game, a: Action): boolean {
  const foe = (uid?: number) => g.monsters.find((m) => m.uid === uid);
  switch (a.type) {
    case 'move': return moveTo(g, a.x, a.y);
    case 'door': return openDoor(g, a.x, a.y);
    case 'chest': return openChest(g, a.x, a.y);
    case 'attack': { const m = foe(a.uid); return !!m && attack(g, m) !== null; }
    case 'special': return special(g, foe(a.uid));
    case 'search': return search(g);
    case 'eat': return eat(g);
    case 'end': if (g.status !== 'play') return false; endTurn(g); return true;
    case 'gmMove': { const m = foe(a.uid); return !!m && gmMove(g, m, a.x, a.y); }
    case 'gmAttack': { const m = foe(a.uid); return !!m && gmAttack(g, m, a.hero); }
    case 'gmCard': return gmCard(g, a.index);
    case 'gmEnd': return gmEnd(g);
    default: return false;
  }
}
