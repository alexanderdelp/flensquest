import { describe, expect, it } from 'vitest';
import { HEROES, MONSTERS, SHOP } from '../../../src/content';
import { dispatch } from '../../../src/core/actions';
import { campaignById, campaigns, hasCampaign, registerCampaign, unregisterCampaign } from '../../../src/core/catalog';
import { buy, finishChapter, newProgress, startChapter } from '../../../src/core/progress';
import { play, PRUEFSTAND } from '../../support/fixture';

describe('Kampagnenverzeichnis', () => {
  it('eintragen, ersetzen, entfernen; Unbekanntes fällt auf die erste zurück', () => {
    const n = campaigns().length;
    registerCampaign({ ...PRUEFSTAND, id: 'kurz' });
    registerCampaign({ ...PRUEFSTAND, id: 'kurz', title: 'Neu' });
    expect(campaigns()).toHaveLength(n + 1);
    expect(campaignById('kurz').title).toBe('Neu');
    unregisterCampaign('kurz');
    expect(hasCampaign('kurz')).toBe(false);
    expect(campaignById('gibtsnicht').id).toBe(campaigns()[0].id);
  });
});

describe('Kapitelaufbau', () => {
  it('Figuren auf Startfeldern, Lebenspunkte mit Zuschlag, solo noch mehr', () => {
    const g = play({ heroes: ['joern', 'maren'] });
    expect(g.heroes.map((h) => [h.x, h.y])).toEqual([[1, 1], [2, 1]]);
    expect(g.heroes[0].maxHp).toBe(HEROES.joern.hp + 2);
    expect(play({ heroes: ['joern'] }).heroes[0].maxHp).toBe(HEROES.joern.hp + 6);
  });

  it('Gegner skalieren mit der Figurenzahl, Endgegner solo nicht unter 60 %', () => {
    const boss = (n: number) => play({ heroes: ['joern', 'maren', 'hinnerk', 'frauke'].slice(0, n) as never, chapter: 1 })
      .monsters.find((m) => m.kind === 'klabauter')!.maxHp;
    expect(boss(1)).toBe(Math.round(MONSTERS.klabauter.hp * 0.6));
    expect(boss(4)).toBe(Math.round(MONSTERS.klabauter.hp * 1.5));
  });

  it('liest Truhen, Fallen, Möbel, Ziel und Ausgang aus dem Plan', () => {
    const g = play();
    expect(g.chests).toEqual([{ x: 2, y: 4 }]);
    expect(g.traps).toEqual([{ x: 6, y: 3 }]);
    expect(g.props).toEqual([{ x: 3, y: 3, kind: 'fass' }]);
    expect([g.goal, g.exit]).toEqual([{ x: 7, y: 5 }, { x: 1, y: 6 }]);
    expect(g.tiles[4][8]).toBe('H');
  });

  it('gleicher Startwert, gleiches Kapitel', () => {
    const p = newProgress(['joern'], false, 'pruefstand');
    expect(startChapter(p, 7)).toEqual(startChapter(p, 7));
  });
});

describe('Fortschritt und Kiosk', () => {
  it('Kapitelende nimmt Öre und Fischbrötchen mit', () => {
    const p = newProgress(['joern', 'maren'], true, 'pruefstand');
    const g = startChapter(p, 1);
    g.oere = 99; g.heroes[1].food = 5;
    const next = finishChapter(p, g);
    expect(next).toMatchObject({ chapter: 1, oere: 99, gmHuman: true, campaign: 'pruefstand' });
    expect(next.heroes[1].food).toBe(5);
  });

  it('Ausrüstung nur einmal, erhöht genau einen Wert; Fischbrötchen beliebig', () => {
    const p = newProgress(['joern'], false, 'pruefstand');
    p.oere = 500;
    const item = (id: string) => SHOP.find((s) => s.id === id)!;
    expect(buy(p, 'joern', item('bootshaken'))).toBe(true);
    expect(buy(p, 'joern', item('bootshaken'))).toBe(false);
    expect(p.heroes[0].att).toBe(HEROES.joern.att + 1);
    expect(buy(p, 'joern', item('fischbroetchen')) && buy(p, 'joern', item('fischbroetchen'))).toBe(true);
    expect(p.heroes[0].food).toBe(4);
    p.oere = 0;
    expect(buy(p, 'joern', item('friesennerz'))).toBe(false);
  });
});

describe('Handlungen', () => {
  it('unbekannte oder unpassende Handlungen ändern nichts', () => {
    const g = play();
    const before = JSON.stringify(g);
    expect(dispatch(g, { type: 'attack', uid: 999 })).toBe(false);
    expect(dispatch(g, { type: 'gmEnd' })).toBe(false);
    expect(dispatch(g, { type: 'door', x: 1, y: 1 })).toBe(false);
    expect(dispatch(g, { type: 'nix' } as never)).toBe(false);
    expect(JSON.stringify(g)).toBe(before);
  });
});
