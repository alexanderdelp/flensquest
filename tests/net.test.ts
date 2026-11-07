import { describe, expect, it } from 'vitest';
import * as E from '../src/game/engine';
import { LocalTransport, allowed, snapshot, type NetMessage, type Seat } from '../src/net/transport';

const start = (gm = false) => E.startChapter(E.newCampaign(['frauke', 'joern'], gm), 42);
const clean = (g: E.Game) => JSON.stringify({ ...g, fx: [] });

function script(g: E.Game): E.Action[] {
  const h = E.activeHero(g);
  return [
    { type: 'move', x: h.x + 2, y: h.y },
    { type: 'search' },
    { type: 'end' },
    { type: 'search' },
    { type: 'end' },
  ];
}

describe('mehrere Geräte vorbereitet', () => {
  it('gleicher Start und gleiche Handlungen ergeben denselben Spielstand', () => {
    const a = start(), b = start();
    for (const act of script(a)) {
      expect(E.dispatch(a, act)).toBe(E.dispatch(b, act));
    }
    for (const _ of E.gmTurn(a)) void _;
    for (const _ of E.gmTurn(b)) void _;
    expect(clean(a)).toBe(clean(b));
    expect(a.round).toBe(2);
  });

  it('ein übertragener Spielstand spielt identisch weiter', () => {
    const a = start();
    const snap = snapshot(a, 1);
    if (snap.kind !== 'snapshot') throw new Error('kein Snapshot');
    const b = JSON.parse(JSON.stringify(snap.game)) as E.Game;
    for (const act of script(a)) { E.dispatch(a, act); E.dispatch(b, act); }
    expect(clean(a)).toBe(clean(b));
  });

  it('Handlungen landen als Nachricht beim Empfänger', () => {
    const t = new LocalTransport();
    const got: NetMessage[] = [];
    t.onMessage((m) => got.push(m));
    t.send({ kind: 'request', device: 'a', action: { type: 'search' } });
    expect(got).toHaveLength(1);
  });

  it('nur der eigene Sitz darf handeln', () => {
    const g = start(true);
    const seats: Seat[] = [
      { device: 'a', heroes: ['frauke'], gm: false },
      { device: 'b', heroes: ['joern'], gm: false },
      { device: 'c', heroes: [], gm: true },
    ];
    expect(allowed(g, seats, 'a', { type: 'search' })).toBe(true);
    expect(allowed(g, seats, 'b', { type: 'search' })).toBe(false);
    expect(allowed(g, seats, 'x', { type: 'search' })).toBe(false);
    E.dispatch(g, { type: 'end' }); E.dispatch(g, { type: 'end' });
    expect(allowed(g, seats, 'a', { type: 'gmEnd' })).toBe(false);
    expect(allowed(g, seats, 'c', { type: 'gmEnd' })).toBe(true);
  });
});
