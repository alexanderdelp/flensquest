import { describe, expect, it } from 'vitest';
import { HEROES } from '../../../src/content';
import {
  canOpenChest, canOpenDoor, canSpecialOn, eat, endTurn, moveTo, openChest, openDoor, reachable, search, special,
  specialNeedsTarget, stepsLeft, tideCost,
} from '../../../src/core/heroes';
import { activeHero, key } from '../../../src/core/state';
import { clearFoes, forceDice, foe, fxOf, play, seeAll } from '../../support/fixture';

describe('Zug und Laufen', () => {
  it('3 Tiden je Zug, solo 4', () => {
    expect(play().tiden).toBe(3);
    expect(play({ heroes: ['joern'] }).tiden).toBe(4);
  });

  it('eine Tide bringt Schritte; angebrochene Tide reicht weiter', () => {
    const g = play();
    const h = activeHero(g); // Jörn, 3 Schritte je Tide
    expect(stepsLeft(g)).toBe(9);
    expect(tideCost(g, 4)).toBe(2);
    expect(moveTo(g, h.x, h.y + 2)).toBe(true);
    expect([g.tiden, g.steps]).toEqual([2, 1]);
    expect(tideCost(g, 1)).toBe(0);
    expect(fxOf(g, 'move')[0].path).toHaveLength(2);
  });

  it('nur auf aufgedeckte, freie Felder; andere Figuren darf man durchqueren, nicht besetzen', () => {
    const g = play();
    const r = reachable(g);
    expect(r.has(key(2, 1))).toBe(false); // Maren steht dort
    expect(r.has(key(3, 1))).toBe(true);
    expect(r.has(key(9, 1))).toBe(false); // hinter der Tür, nicht aufgedeckt
    expect(moveTo(g, 9, 1)).toBe(false);
  });

  it('Falle: 2 Schaden, 1 Punkt, Weg endet dort', () => {
    const g = play();
    const h = activeHero(g);
    h.x = 6; h.y = 2;
    expect(moveTo(g, 6, 4)).toBe(true);
    expect([h.x, h.y]).toEqual([6, 3]);
    expect(h.hp).toBe(h.maxHp - 2);
    expect(g.punkte).toBe(1);
    expect(g.traps).toHaveLength(0);
  });

  it('Bergen: Gegenstand aufheben, am Ausgang gewinnen, Belohnung gibt es dazu', () => {
    const g = play();
    const h = activeHero(g);
    h.x = 7; h.y = 4;
    moveTo(g, 7, 5);
    expect(g.goalTaken).toBe(true);
    h.x = 2; h.y = 6; g.tiden = 3; g.steps = 0;
    const oere = g.oere;
    moveTo(g, 1, 6);
    expect(g.status).toBe('won');
    expect(g.oere).toBe(oere + 10);
  });
});

describe('Türen, Truhen, Suchen, Essen', () => {
  it('Tür nur direkt daneben, kostenlos, deckt dahinter auf', () => {
    const g = play();
    expect(canOpenDoor(g, 8, 2)).toBe(false);
    const h = activeHero(g);
    h.x = 7; h.y = 2;
    const tiden = g.tiden;
    expect(openDoor(g, 8, 2)).toBe(true);
    expect(g.tiles[2][8]).toBe('O');
    expect(g.seen[2][10]).toBe(true);
    expect(g.tiden).toBe(tiden);
  });

  it('Truhe: 1 Mimik, 2 bis 4 Öre, 5 und 6 Fischbrötchen', () => {
    for (const [face, check] of [
      [1, (g: ReturnType<typeof play>) => expect(activeHero(g).hp).toBe(activeHero(g).maxHp - 2)],
      [3, (g: ReturnType<typeof play>) => expect(g.oere).toBe(20 + 25)],
      [6, (g: ReturnType<typeof play>) => expect(activeHero(g).food).toBe(3)],
    ] as const) {
      const g = play();
      const h = activeHero(g);
      h.x = 2; h.y = 3;
      expect(canOpenChest(g, 2, 4)).toBe(true);
      forceDice(g, face);
      expect(openChest(g, 2, 4)).toBe(true);
      check(g);
      expect(g.chests).toHaveLength(0);
    }
  });

  it('Suchen entschärft sichtbare Fallen und findet verborgene Türen in 4 Feldern', () => {
    const g = play();
    const h = activeHero(g);
    h.x = 6; h.y = 4;
    expect(search(g)).toBe(true);
    expect(g.traps).toHaveLength(0);
    expect(g.tiles[4][8]).toBe('D');
  });

  it('Essen heilt 4 und braucht ein Fischbrötchen und Schaden', () => {
    const g = play();
    const h = activeHero(g);
    expect(eat(g)).toBe(false);
    h.hp -= 6;
    expect(eat(g)).toBe(true);
    expect(h.hp).toBe(h.maxHp - 2);
    expect(h.food).toBe(1);
  });
});

describe('Spezialkönnen', () => {
  const setup = (id: 'frauke' | 'joern' | 'maren' | 'hinnerk' | 'nordhexe' | 'juni') => {
    const g = play({ heroes: [id, 'hinnerk'] });
    clearFoes(g);
    seeAll(g);
    return { g, h: activeHero(g) };
  };

  it('FlensNetz: bis 3 Felder, 1 Schaden, setzt aus', () => {
    const { g, h } = setup('frauke');
    const m = foe(g, 'rumgeist', h.x + 3, h.y, 4);
    expect(specialNeedsTarget(g)).toBe(true);
    expect(canSpecialOn(g, foe(g, 'ratte', h.x + 4, h.y))).toBe(false);
    expect(special(g, m)).toBe(true);
    expect(m).toMatchObject({ hp: 3, stuck: true });
    expect(h.charges).toBe(1);
  });

  it('Dicker Schlüssel: Nachbar, sicher 4 Schaden', () => {
    const { g, h } = setup('joern');
    const m = foe(g, 'rumgeist', h.x, h.y + 1, 6);
    expect(special(g, m)).toBe(true);
    expect(m.hp).toBe(2);
  });

  it('Schwarm: alle sichtbaren Gegner bis 3 Felder je 1 Schaden', () => {
    const { g, h } = setup('maren');
    const a = foe(g, 'rumgeist', h.x + 1, h.y + 1, 4), b = foe(g, 'rumgeist', h.x + 3, h.y, 4), c = foe(g, 'rumgeist', h.x + 6, h.y, 4);
    expect(special(g)).toBe(true);
    expect([a.hp, b.hp, c.hp]).toEqual([3, 3, 4]);
  });

  it('Lütt un Lütt: heilt den schwächsten Nachbarn um 4 und holt Gestürzte zurück', () => {
    const g = play({ heroes: ['hinnerk', 'joern'] });
    const [hin, joe] = g.heroes;
    expect(special(g)).toBe(false);
    joe.hp = 0; joe.down = true;
    expect(special(g)).toBe(true);
    expect(joe).toMatchObject({ hp: 4, down: false });
    void hin;
  });

  it('Piets Sturzflug: bis 4 Felder, 2 Schaden, setzt aus', () => {
    const { g, h } = setup('nordhexe');
    const m = foe(g, 'rumgeist', h.x + 4, h.y, 4);
    expect(special(g, m)).toBe(true);
    expect(m).toMatchObject({ hp: 2, stuck: true, blind: true });
  });

  it('Leuchtfeuer der alten Juni blendet alle in 3 Feldern', () => {
    const { g, h } = setup('juni');
    const m = foe(g, 'rumgeist', h.x + 2, h.y, 4);
    expect(special(g)).toBe(true);
    expect(m).toMatchObject({ stuck: true, blind: true, hp: 4 });
  });

  it('zweimal je Kapitel, einmal je Zug; ohne Wirkung kostet es nichts', () => {
    const { g, h } = setup('maren');
    expect(special(g)).toBe(false);
    expect(h.charges).toBe(2);
    foe(g, 'rumgeist', h.x + 1, h.y + 1, 9);
    expect(special(g)).toBe(true);
    expect(special(g)).toBe(false);
    expect(HEROES[h.id].special).toBeTruthy();
  });
});

describe('Zug beenden', () => {
  it('reicht an die nächste stehende Figur, nach der letzten ist der Spielleiter dran', () => {
    const g = play({ heroes: ['joern', 'maren', 'hinnerk'] });
    g.heroes[1].down = true;
    endTurn(g);
    expect(g.turn).toBe(2);
    endTurn(g);
    expect(g.status).toBe('gm');
  });
});
