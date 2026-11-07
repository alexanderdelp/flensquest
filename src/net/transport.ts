import type { HeroId } from '../content';
import type { Action, Game } from '../core';

/** Wer an einem Gerät was steuert. */
export interface Seat { device: string; heroes: HeroId[]; gm: boolean }

/** Nachrichten zwischen den Geräten eines Raums. Ein Gerät (Gastgeber) rechnet die Regeln. */
export type NetMessage =
  | { kind: 'join'; device: string; name: string }
  | { kind: 'seats'; seats: Seat[] }
  | { kind: 'request'; device: string; action: Action }
  | { kind: 'apply'; seq: number; action: Action }
  | { kind: 'snapshot'; seq: number; game: Game };

/** Schmale Schnittstelle: Eine Netzvariante muss nur diese zwei Dinge können. */
export interface Transport {
  send(message: NetMessage): void;
  onMessage(handler: (message: NetMessage) => void): void;
}

/** Ein Gerät: Nachrichten kommen direkt wieder an. */
export class LocalTransport implements Transport {
  private handlers: ((message: NetMessage) => void)[] = [];
  send(message: NetMessage) { this.handlers.forEach((h) => h(message)); }
  onMessage(handler: (message: NetMessage) => void) { this.handlers.push(handler); }
}

/** Spielstand ohne reine Anzeige-Ereignisse, bereit für die Übertragung. */
export function snapshot(g: Game, seq: number): NetMessage {
  return { kind: 'snapshot', seq, game: JSON.parse(JSON.stringify({ ...g, fx: [] })) as Game };
}

/** Darf dieses Gerät die Handlung auslösen? */
export function allowed(g: Game, seats: Seat[], device: string, action: Action): boolean {
  const seat = seats.find((s) => s.device === device);
  if (!seat) return false;
  if (action.type.startsWith('gm')) return seat.gm && g.gmHuman;
  return g.status === 'play' && seat.heroes.includes(g.heroes[g.turn].id);
}
