import { describe, expect, it } from 'vitest';
import { GM_COST, HAND_MAX, HAND_START, MONSTERS, TINTE_MAX, TINTE_RUNDE, TINTE_START, type GmEffect } from '../../../src/content';
import { dispatch } from '../../../src/core/actions';
import { aiCards, cardValue, gmTargets, monsterAct, pathToward } from '../../../src/core/gm/ai';
import { canPlayCard, cardWorks, drawCard, gmBegin, playCard } from '../../../src/core/gm/cards';
import { gmReachable, gmTurn } from '../../../src/core/gm/turn';
import { endTurn } from '../../../src/core/heroes';
import { spdOf } from '../../../src/core/state';
import { clearFoes, foe, fxOf, play, PRUEFSTAND, seeAll } from '../../support/fixture';

const card = (id: GmEffect) => PRUEFSTAND.cards.findIndex((c) => c.id === id);
const toGm = (g: ReturnType<typeof play>) => { while (g.status === 'play') endTurn(g); };

describe('Kartenhand und Tinte', () => {
  it('Start mit Hand und Tinte; jede Runde Tinte und eine Karte, beides gedeckelt', () => {
    const g = play();
    expect(g.gmHand).toHaveLength(HAND_START);
    expect(g.tinte).toBe(TINTE_START);
    gmBegin(g);
    expect(g.tinte).toBe(TINTE_START + TINTE_RUNDE);
    expect(g.gmHand).toHaveLength(HAND_START + 1);
    for (let i = 0; i < 10; i++) gmBegin(g);
    expect(g.tinte).toBe(TINTE_MAX);
    expect(g.gmHand).toHaveLength(HAND_MAX);
  });

  it('leerer Stapel wird aus der Ablage gemischt', () => {
    const g = play();
    g.gmHand = []; g.gmDeck = []; g.gmPile = [card('klau')];
    drawCard(g);
    expect(g.gmHand).toEqual([card('klau')]);
    expect(g.gmPile).toEqual([]);
  });

  it('Karten kosten Tinte, nur im Spielleiter-Zug, nur mit Wirkung', () => {
    const g = play();
    g.gmHand = [card('knoellchen')];
    g.tinte = 99;
    expect(canPlayCard(g, 0)).toBe(false);
    g.status = 'gm';
    g.tinte = GM_COST.knoellchen - 1;
    expect(canPlayCard(g, 0)).toBe(false);
    g.tinte = GM_COST.knoellchen;
    expect(playCard(g, 0)).toBe(true);
    expect(g.tinte).toBe(0);
    expect(g.punkte).toBe(1);
    expect(fxOf(g, 'card')[0]).toMatchObject({ name: 'Knöllchen', cost: GM_COST.knoellchen });
  });
});

describe('Kartenwirkungen', () => {
  const ready = () => { const g = play(); seeAll(g); g.status = 'gm'; g.tinte = 99; return g; };
  const playId = (g: ReturnType<typeof play>, id: GmEffect) => { g.gmHand = [card(id)]; return playCard(g, 0); };

  it('Eile: Gegner laufen 2 weiter, bis Rundenende', () => {
    const g = ready();
    const m = foe(g, 'krabbe', 4, 4);
    const before = Math.max(...[...gmReachable({ ...g, gmHuman: true }, m).values()].map((p) => p.length));
    expect(playId(g, 'eile')).toBe(true);
    const after = Math.max(...[...gmReachable({ ...g, gmHuman: true }, m).values()].map((p) => p.length));
    expect(after).toBe(before + 2);
    expect(cardWorks(g, 'eile')).toBe(false);
  });

  it('Flicken heilt den am schwersten getroffenen Gegner um 3', () => {
    const g = ready();
    clearFoes(g);
    expect(cardWorks(g, 'flicken')).toBe(false);
    const a = foe(g, 'rumgeist', 4, 4, 9), b = foe(g, 'rumgeist', 5, 4, 9);
    a.hp = 7; b.hp = 2;
    playId(g, 'flicken');
    expect([a.hp, b.hp]).toEqual([7, 5]);
  });

  it('Schietwetter: 1 Schaden ohne Friesennerz, nie den letzten Punkt', () => {
    const g = ready();
    const [a, b] = g.heroes;
    a.gear.push('friesennerz');
    b.hp = 1;
    expect(cardWorks(g, 'schiet')).toBe(false);
    b.hp = 5;
    playId(g, 'schiet');
    expect([a.hp, b.hp]).toEqual([a.maxHp, 4]);
  });

  it('Verstärkung setzt einen Kobold mindestens 4 Felder entfernt', () => {
    const g = ready();
    const n = g.monsters.length;
    playId(g, 'verstaerkung');
    const k = g.monsters[g.monsters.length - 1];
    expect(g.monsters.length).toBe(n + 1);
    expect(k.kind).toBe('knoellchen');
    expect(Math.min(...g.heroes.map((h) => Math.abs(h.x - k.x) + Math.abs(h.y - k.y)))).toBeGreaterThanOrEqual(4);
  });

  it('Baustelle legt eine verdeckte Falle 2 bis 3 Felder neben eine Figur', () => {
    const g = ready();
    g.traps = [];
    playId(g, 'falle');
    const t = g.traps[0];
    const d = g.heroes.map((h) => Math.abs(h.x - t.x) + Math.abs(h.y - t.y));
    expect(d.some((n) => n >= 2 && n <= 3)).toBe(true);
  });

  it('Klau nimmt ein Fischbrötchen von der Figur mit den meisten', () => {
    const g = ready();
    g.heroes[1].food = 5;
    playId(g, 'klau');
    expect(g.heroes.map((h) => h.food)).toEqual([2, 4]);
    g.heroes.forEach((h) => { h.food = 0; });
    expect(cardWorks(g, 'klau')).toBe(false);
  });

  it('Schlick bremst die Figuren in der nächsten Runde um 1, nie unter 1', () => {
    const g = ready();
    playId(g, 'schlick');
    expect(spdOf(g, g.heroes[0])).toBe(g.heroes[0].spd - 1);
    g.heroes[0].spd = 1;
    expect(spdOf(g, g.heroes[0])).toBe(1);
  });

  it('Zorn wirkt nur bis Rundenende', () => {
    const g = play();
    seeAll(g);
    toGm(g);
    g.gmHuman = true;
    g.tinte = 99;
    g.gmHand = [card('zorn')];
    dispatch(g, { type: 'gmCard', index: 0 });
    expect(g.gmZorn).toBe(true);
    dispatch(g, { type: 'gmEnd' });
    expect(g.gmZorn).toBe(false);
  });
});

describe('Rechner als Spielleiter', () => {
  it('Gegner laufen auf die nächste Figur zu und greifen die schwächste in Reichweite an', () => {
    const g = play();
    clearFoes(g);
    const [a, b] = g.heroes;
    const m = foe(g, 'rumgeist', 5, 1, 4);
    expect(pathToward(g, m, [a, b], 1)).toHaveLength(2);
    b.hp = 2;
    monsterAct(g, m);
    expect([m.x, m.y]).toEqual([3, 1]);
    expect(fxOf(g, 'attack')[0].target).toBe('h:maren');
    // Von 1,2 aus ist nur Jörn (1,1) in Reichweite 1, Maren (2,1) steht diagonal.
    m.x = 1; m.y = 2;
    expect(gmTargets(g, m).map((h) => h.id)).toEqual(['joern']);
  });

  it('gefesselte Gegner setzen eine Runde aus', () => {
    const g = play();
    const m = foe(g, 'rumgeist', 5, 1);
    m.stuck = true;
    monsterAct(g, m);
    expect([m.x, m.stuck]).toEqual([5, false]);
  });

  it('spielt Karten mit Nutzen, lässt nutzlose liegen', () => {
    const g = play();
    seeAll(g);
    g.status = 'gm';
    g.tinte = 99;
    g.gmHand = [card('knoellchen'), card('flicken')];
    expect(cardValue(g, 'flicken')).toBe(0);
    expect(aiCards(g, true)).toBe(0);
    expect(aiCards(g, false)).toBe(1);
    expect(g.gmHand).toEqual([card('flicken')]);
  });

  it('der Zug läuft durch, der Stempel fällt jede vierte Runde', () => {
    const g = play();
    clearFoes(g);
    g.gmHand = [];
    g.gmDeck = [];
    for (let r = 1; r <= 4; r++) { toGm(g); for (const _ of gmTurn(g)) void _; }
    expect(g.round).toBe(5);
    expect(fxOf(g, 'punkte').some((p) => p.why === 'Der Stempel fällt')).toBe(true);
    expect(MONSTERS.rumgeist).toBeTruthy();
  });
});

describe('Mensch als Spielleiter', () => {
  const human = () => {
    const g = play({ gm: true });
    clearFoes(g);
    const m = foe(g, 'rumgeist', 5, 2, 4);
    toGm(g);
    return { g, m };
  };

  it('die Runde wartet; jeder Gegner zieht einmal und greift einmal an', () => {
    const { g, m } = human();
    expect(g.status).toBe('gm');
    const h = g.heroes[1];
    expect(dispatch(g, { type: 'gmMove', uid: m.uid, x: 2, y: 2 })).toBe(true);
    expect(dispatch(g, { type: 'gmMove', uid: m.uid, x: 3, y: 2 })).toBe(false);
    expect(dispatch(g, { type: 'gmAttack', uid: m.uid, hero: h.id })).toBe(true);
    expect(dispatch(g, { type: 'gmAttack', uid: m.uid, hero: h.id })).toBe(false);
    expect(dispatch(g, { type: 'gmEnd' })).toBe(true);
    expect(g.status).toBe('play');
  });

  it('Figurenhandlungen sind im Spielleiter-Zug gesperrt', () => {
    const { g } = human();
    expect(dispatch(g, { type: 'search' })).toBe(false);
    expect(dispatch(g, { type: 'end' })).toBe(false);
  });

  it('gefesselte Gegner sind für den Menschen schon verbraucht', () => {
    const g = play({ gm: true });
    clearFoes(g);
    const m = foe(g, 'rumgeist', 5, 2);
    m.stuck = true;
    toGm(g);
    expect(dispatch(g, { type: 'gmMove', uid: m.uid, x: 4, y: 2 })).toBe(false);
    expect(m.stuck).toBe(false);
  });
});
