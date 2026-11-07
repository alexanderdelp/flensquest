import { describe, expect, it } from 'vitest';
import { lineOfSight, nearestFree, paths, reveal, walkable } from '../../../src/core/map';
import { d6, pick, rand, shuffle } from '../../../src/core/rng';
import { blocked, key } from '../../../src/core/state';
import { foe, play, seeAll } from '../../support/fixture';

describe('Zufall', () => {
  it('hängt nur am Startwert', () => {
    const a = { rng: 42 }, b = { rng: 42 };
    expect([rand(a), rand(a), rand(a)]).toEqual([rand(b), rand(b), rand(b)]);
  });

  it('W6 bleibt zwischen 1 und 6 und trifft jede Zahl', () => {
    const g = play();
    const seen = new Set(Array.from({ length: 300 }, () => d6(g)));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('Mischen ist eine Umordnung, Ziehen nimmt ein Element', () => {
    const g = play();
    const list = [1, 2, 3, 4, 5, 6, 7];
    expect(shuffle(g, list).sort()).toEqual(list);
    expect(list).toContain(pick(g, list));
  });
});

describe('Gelände', () => {
  it('Boden, offene Türen und Ausgang sind begehbar, Wände und geschlossene Türen nicht', () => {
    expect(['.', 'O', 'X'].map(walkable)).toEqual([true, true, true]);
    expect(['#', 'D', 'H'].map(walkable)).toEqual([false, false, false]);
  });

  it('Sicht endet an Wänden und Türen', () => {
    const g = play();
    expect(lineOfSight(g, { x: 1, y: 2 }, { x: 7, y: 2 })).toBe(true);
    expect(lineOfSight(g, { x: 7, y: 2 }, { x: 10, y: 2 })).toBe(false);
    g.tiles[2][8] = 'O';
    expect(lineOfSight(g, { x: 7, y: 2 }, { x: 10, y: 2 })).toBe(true);
  });

  it('Aufdecken stoppt an geschlossenen Türen und folgt offenen', () => {
    const g = play();
    expect(g.seen[2][9]).toBe(false);
    g.tiles[2][8] = 'O';
    reveal(g);
    expect(g.seen[2][9]).toBe(true);
    expect(g.seen[5][10]).toBe(true);
  });

  it('Wege umgehen, was im Weg steht, und enden nach der erlaubten Länge', () => {
    const g = play();
    seeAll(g);
    const all = paths(g, { x: 1, y: 2 }, 3, (x, y) => walkable(g.tiles[y][x]) && !blocked(g, x, y));
    expect(all.get(key(4, 2))).toHaveLength(3);
    expect(all.has(key(5, 2))).toBe(false);
    expect(paths(g, { x: 2, y: 3 }, 2, (x, y) => walkable(g.tiles[y][x]) && !blocked(g, x, y)).has(key(3, 3))).toBe(false);
  });

  it('nächstes freies Feld weicht Figuren und Gegnern aus', () => {
    const g = play();
    foe(g, 'ratte', 5, 2);
    expect(nearestFree(g, { x: 5, y: 2 })).not.toEqual({ x: 5, y: 2 });
    expect(nearestFree(g, { x: 6, y: 2 })).toEqual({ x: 6, y: 2 });
  });
});
