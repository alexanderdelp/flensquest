import { describe, expect, it } from 'vitest';
import { damageMonster } from '../../../src/core/combat';
import { gmTurn } from '../../../src/core/gm/turn';
import { moveTo, openDoor } from '../../../src/core/heroes';
import { fire, foeNote, look } from '../../../src/core/scripts';
import { activeHero, chapterOf } from '../../../src/core/state';
import { fxOf, play, PRUEFSTAND } from '../../support/fixture';

const notes = (g: ReturnType<typeof play>) => fxOf(g, 'note').map((n) => n.title);

describe('Skripte der Kapitel', () => {
  it('wenn start läuft beim Aufbau', () => {
    const p = play();
    expect(p.log).toContain('📍 Willkommen');
  });

  it('wenn tür: Text und Verstärkung, nur einmal', () => {
    const g = play();
    const h = activeHero(g);
    h.x = 7; h.y = 2;
    const n = g.monsters.length;
    openDoor(g, 8, 2);
    expect(notes(g)).toContain('Nebenraum');
    expect(g.monsters.filter((m) => m.kind === 'ratte')).toHaveLength(1);
    expect(g.monsters.length).toBe(n + 1);
    fire(g, { on: 'tuer', at: { x: 8, y: 2 } });
    expect(g.monsters.length).toBe(n + 1);
  });

  it('wenn <gegner> auftaucht: sobald er sichtbar wird, einmal', () => {
    const g = play();
    g.tiles[4][8] = 'O';
    look(g);
    look(g);
    expect(notes(g).filter((t) => t === 'Kobold')).toHaveLength(1);
  });

  it('wenn ziel gefunden: Öre', () => {
    const g = play();
    const h = activeHero(g);
    h.x = 7; h.y = 4;
    const oere = g.oere;
    moveTo(g, 7, 5);
    expect(g.oere).toBe(oere + 5);
  });

  it('wenn runde: Punkte und Heilung zu Rundenbeginn', () => {
    const g = play();
    g.heroes.forEach((h) => { h.hp -= 3; });
    for (let r = 1; r < 3; r++) {
      g.status = 'gm';
      for (const _ of gmTurn(g)) void _;
    }
    expect(g.round).toBe(3);
    expect(g.punkte).toBeGreaterThanOrEqual(1);
    expect(g.heroes[0].hp).toBe(g.heroes[0].maxHp - 1);
  });

  it('wenn endgegner halb: einmal, sobald er die Hälfte verloren hat', () => {
    const g = play({ chapter: 1 });
    const boss = g.monsters.find((m) => m.kind === 'klabauter')!;
    const oere = g.oere, n = g.monsters.length;
    damageMonster(g, boss, 1);
    expect(notes(g)).not.toContain('Wende');
    damageMonster(g, boss, Math.ceil(boss.hp / 2));
    expect(notes(g)).toContain('Wende');
    expect(g.monsters.length).toBe(n + 1);
    expect(g.oere).toBe(oere - 3);
    damageMonster(g, boss, 1);
    expect(notes(g).filter((t) => t === 'Wende')).toHaveLength(1);
  });

  it('Gegnertext für Tooltips kommt aus dem „auftaucht“-Skript', () => {
    const g = play();
    expect(foeNote(chapterOf(g), 'knoellchen')).toBe('Ein Kobold.');
    expect(foeNote(chapterOf(g), 'ratte')).toBeUndefined();
    expect(PRUEFSTAND.chapters[0].scripts).toHaveLength(5);
  });
});
