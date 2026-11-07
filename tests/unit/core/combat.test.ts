import { describe, expect, it } from 'vitest';
import { MONSTERS } from '../../../src/content';
import { attack, canAttack, damageMonster, hurtHero, rollAttack, strike } from '../../../src/core/combat';
import { activeHero } from '../../../src/core/state';
import { clearFoes, forceDice, foe, fxOf, play } from '../../support/fixture';

describe('Würfelwurf', () => {
  it('trifft ab 7 + Rüstung', () => {
    const g = play();
    forceDice(g, 3, 3);
    expect(rollAttack(g, 1, 0)).toMatchObject({ total: 7, need: 7, hit: true, crit: false });
    forceDice(g, 3, 3);
    expect(rollAttack(g, 1, 1).hit).toBe(false);
  });

  it('6+6 trifft immer und doppelt, 1+1 nie', () => {
    const g = play();
    forceDice(g, 6, 6);
    expect(rollAttack(g, -20, 9)).toMatchObject({ hit: true, crit: true });
    forceDice(g, 1, 1);
    expect(rollAttack(g, 20, 0).hit).toBe(false);
  });
});

describe('Angriff der Figur', () => {
  it('nur in Reichweite, mit Sichtlinie, einmal je Zug, kostet eine Tide', () => {
    const g = play();
    clearFoes(g);
    const h = activeHero(g);
    const near = foe(g, 'ratte', h.x, h.y + 1, 5);
    const far = foe(g, 'ratte', h.x + 4, h.y + 1, 5);
    expect(canAttack(g, far)).toBe(false);
    forceDice(g, 6, 6);
    const tiden = g.tiden;
    expect(attack(g, near)).toMatchObject({ crit: true });
    expect(near.hp).toBe(5 - 2 * 3);
    expect(g.tiden).toBe(tiden - 1);
    expect(canAttack(g, near)).toBe(false);
  });

  it('Erledigte Gegner zahlen Öre und verschwinden', () => {
    const g = play();
    const m = foe(g, 'ratte', 5, 2, 1);
    const oere = g.oere;
    damageMonster(g, m, 1);
    expect(g.monsters).not.toContain(m);
    expect(g.oere).toBe(oere + MONSTERS.ratte.reward);
    expect(fxOf(g, 'die')).toHaveLength(1);
  });
});

describe('Schaden an Figuren', () => {
  it('Sturz bringt 2 Punkte, alle gestürzt verliert das Kapitel', () => {
    const g = play();
    hurtHero(g, g.heroes[0], 99);
    expect(g.heroes[0].down).toBe(true);
    expect(g.punkte).toBe(2);
    hurtHero(g, g.heroes[1], 99);
    expect(g.status).toBe('lost');
  });

  it('Katzenohren retten einmal vor dem Sturz', () => {
    const g = play();
    const h = g.heroes[0];
    h.pfoten = true;
    hurtHero(g, h, 99);
    expect(h).toMatchObject({ hp: 1, down: false, pfoten: false });
    hurtHero(g, h, 1);
    expect(h.down).toBe(true);
  });

  it('Gegner treffen die Figur; Kobolde kleben bei einer 6 ein Knöllchen', () => {
    const g = play();
    const h = g.heroes[0];
    const k = foe(g, 'knoellchen', h.x, h.y + 1);
    forceDice(g, 6, 5, 6);
    strike(g, k, h);
    expect(h.hp).toBe(h.maxHp - MONSTERS.knoellchen.dmg);
    expect(g.punkte).toBe(1);
  });

  it('Zorn des Spielleiters gibt Gegnern +1 Angriff', () => {
    const g = play();
    const h = g.heroes[0];
    const m = foe(g, 'ratte', h.x, h.y + 1);
    g.gmZorn = true;
    forceDice(g, 2, 2);
    strike(g, m, h);
    expect(fxOf(g, 'attack')[0].total).toBe(2 + 2 + MONSTERS.ratte.att + 1);
  });
});
