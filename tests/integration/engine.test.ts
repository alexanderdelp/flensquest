import { describe, expect, it } from 'vitest';
import { BUILTIN as CAMPAIGNS } from '../../src/campaigns';
import {
  GM_COST, HAND_MAX, HAND_START, HEROES, MONSTERS, TINTE_MAX, TINTE_RUNDE, TINTE_START, type GmEffect, type HeroId,
} from '../../src/content';
import * as E from '../support/engine';
import { CHAPTERS } from '../../src/campaigns/legacy/hafen';

const ALL: HeroId[] = ['frauke', 'joern', 'maren', 'hinnerk'];
const play = (ids: HeroId[], chapter = 0, seed = 1) => {
  const c = E.newCampaign(ids);
  c.chapter = chapter;
  return E.startChapter(c, seed);
};

describe('Karten', () => {
  CHAPTERS.forEach((ch, i) => it(`Kapitel ${i + 1} ist spielbar aufgebaut`, () => {
    const w = ch.map[0].length;
    ch.map.forEach((r, y) => expect(r.length, `Zeile ${y}: ${r}`).toBe(w));
    expect(ch.map.join('').split('S').length - 1).toBeGreaterThanOrEqual(4);
    const g = play(ALL, i);
    const open = new Set<string>();
    const stack = [{ x: g.heroes[0].x, y: g.heroes[0].y }];
    while (stack.length) {
      const p = stack.pop()!;
      const k = `${p.x},${p.y}`;
      if (open.has(k) || E.tile(g, p.x, p.y) === '#' || E.propAt(g, p.x, p.y)) continue;
      open.add(k);
      stack.push({ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 });
    }
    if (ch.goal.type === 'bergen') {
      expect(open.has(`${g.goal!.x},${g.goal!.y}`)).toBe(true);
      expect(open.has(`${g.exit!.x},${g.exit!.y}`)).toBe(true);
    } else {
      expect(g.monsters.some((m) => (m.kind === 'klabauter' || m.kind === 'obermeister') && open.has(`${m.x},${m.y}`))).toBe(true);
    }
  }));
});

describe('Regeln', () => {
  it('Fässer und Kisten blockieren den Weg', () => {
    const g = play(['joern']);
    const h = E.activeHero(g);
    g.props = [{ x: h.x + 2, y: h.y, kind: 'fass' }];
    expect(E.reachable(g).has(`${h.x + 2},${h.y}`)).toBe(false);
  });

  it('Rumschmuggler wirft aus der Ferne', () => {
    expect(MONSTERS.schmuggler.range).toBeGreaterThan(1);
    const g = play(['joern', 'maren'], 0, 7);
    expect(g.monsters.some((m) => m.kind === 'schmuggler')).toBe(true);
    expect(g.monsters.some((m) => m.kind === 'ratte')).toBe(true);
    expect(g.monsters.some((m) => m.kind === 'krabbe')).toBe(true);
  });

  it('Start: Helden auf Startfeldern, Tiden nach Spielerzahl', () => {
    expect(play(ALL).tiden).toBe(3);
    expect(play(['joern']).tiden).toBe(4);
    expect(play(['joern']).heroes[0].maxHp).toBe(HEROES.joern.hp + 6);
  });

  it('Bewegung verbraucht Tiden und angebrochene Tide reicht weiter', () => {
    const g = play(['frauke', 'joern']);
    const h = E.activeHero(g);
    const [k] = [...E.reachable(g).entries()].find(([, p]) => p.length === 1)!;
    const [x, y] = k.split(',').map(Number);
    expect(E.moveTo(g, x, y)).toBe(true);
    expect(g.tiden).toBe(2);
    expect(g.steps).toBe(h.spd - 1);
  });

  it('Schritte und Tidenkosten stimmen', () => {
    const g = play(['frauke', 'joern']);
    const h = E.activeHero(g);
    expect(E.stepsLeft(g)).toBe(3 * h.spd);
    expect(E.tideCost(g, 1)).toBe(1);
    expect(E.tideCost(g, h.spd)).toBe(1);
    expect(E.tideCost(g, h.spd + 1)).toBe(2);
    g.steps = 2; g.tiden = 1;
    expect(E.stepsLeft(g)).toBe(2 + h.spd);
    expect(E.tideCost(g, 2)).toBe(0);
    expect(E.tideCost(g, 3)).toBe(1);
  });

  it('Tür öffnet nur daneben und deckt den Raum auf', () => {
    const g = play(['frauke']);
    expect(E.openDoor(g, 5, 2)).toBe(false);
    const h = E.activeHero(g);
    h.x = 4; h.y = 2;
    expect(g.seen[2][7]).toBe(false);
    expect(E.openDoor(g, 5, 2)).toBe(true);
    expect(g.seen[2][7]).toBe(true);
  });

  it('Falle macht Schaden, gibt einen Punkt und stoppt', () => {
    const g = play(['joern']);
    const h = E.activeHero(g);
    g.traps = [{ x: h.x + 2, y: h.y }];
    const hp = h.hp;
    E.moveTo(g, h.x + 3, h.y);
    expect(h.hp).toBe(hp - 2);
    expect(g.punkte).toBe(1);
    expect(g.traps).toHaveLength(0);
  });

  it('Suchen findet verborgene Türen in der Nähe', () => {
    const g = play(['maren'], 0);
    const h = E.activeHero(g);
    h.x = 20; h.y = 6;
    E.reveal(g);
    expect(E.tile(g, 20, 7)).toBe('H');
    E.search(g);
    expect(E.tile(g, 20, 7)).toBe('D');
  });

  it('Angriff nur einmal je Zug und nur in Reichweite mit Sichtlinie', () => {
    const g = play(['joern']);
    const h = E.activeHero(g), m = g.monsters[0];
    expect(E.attack(g, m)).toBeNull();
    h.x = m.x - 1; h.y = m.y;
    E.reveal(g);
    g.seen[m.y][m.x] = true;
    expect(E.attack(g, m)).not.toBeNull();
    expect(E.attack(g, m)).toBeNull();
  });

  it('Wurf: 6+6 trifft immer, 1+1 nie', () => {
    const g = play(['joern']);
    for (let i = 0; i < 500; i++) {
      const r = E.rollAttack(g, 2, 3);
      if (r.crit) expect(r.hit).toBe(true);
      if (r.a === 1 && r.b === 1) expect(r.hit).toBe(false);
      if (!r.crit && r.a + r.b > 2) expect(r.hit).toBe(r.total >= 10);
    }
  });

  it('Bergen: Gegenstand aufnehmen, am Ausgang gewinnen', () => {
    const g = play(['maren']);
    g.goalTaken = true;
    const h = E.activeHero(g);
    h.x = g.exit!.x - 1; h.y = g.exit!.y;
    E.reveal(g);
    E.moveTo(g, g.exit!.x, g.exit!.y);
    expect(g.status).toBe('won');
  });

  it('Besiegen: Endgegner erledigt gewinnt und zahlt Beute', () => {
    const g = play(['joern'], 4);
    const boss = g.monsters.find((m) => m.kind === 'obermeister')!;
    const before = g.oere;
    boss.hp = 1;
    const h = E.activeHero(g);
    h.x = boss.x - 1; h.y = boss.y;
    E.reveal(g);
    g.seen[boss.y][boss.x] = true;
    E.special(g, boss);
    expect(g.status).toBe('won');
    expect(g.oere).toBe(before + MONSTERS.obermeister.reward + CHAPTERS[4].reward);
  });

  it('8 Punkte beenden das Kapitel', () => {
    const g = play(['joern']);
    E.addPunkte(g, 8);
    expect(g.status).toBe('lost');
  });

  it('Spielleiter-Zug läuft durch und gibt die Runde zurück', () => {
    const g = play(['frauke', 'joern']);
    E.endTurn(g); E.endTurn(g);
    expect(g.status).toBe('gm');
    for (const _ of E.gmTurn(g)) void _;
    expect(g.status).toBe('play');
    expect(g.round).toBe(2);
    expect(g.turn).toBe(0);
  });

  it('Gestürzte setzen aus und Lütt un Lütt holt sie zurück', () => {
    const g = play(['hinnerk', 'joern']);
    const [a, b] = g.heroes;
    b.hp = 0; b.down = true;
    b.x = a.x + 1; b.y = a.y;
    expect(E.special(g)).toBe(true);
    expect(b.down).toBe(false);
    expect(b.hp).toBe(4);
  });

  it('FlensLeuchtfeuer blendet Gegner für eine Runde', () => {
    const g = play(['juni', 'joern']);
    const h = E.activeHero(g), m = g.monsters[0];
    h.x = m.x - 1; h.y = m.y;
    E.reveal(g);
    expect(E.dispatch(g, { type: 'special' })).toBe(true);
    expect(m.stuck).toBe(true);
    expect(h.charges).toBe(1);
    E.endTurn(g); E.endTurn(g);
    for (const _ of E.gmTurn(g)) void _;
    expect(m.stuck).toBe(false);
    expect(m.blind).toBe(false);
  });

  it('Katzenohren retten einmal je Kapitel vor dem Sturz', () => {
    const c = E.newCampaign(['joern', 'maren']);
    c.oere = 100;
    expect(E.buy(c, 'joern', E.SHOP.find((s) => s.id === 'katzenohren')!)).toBe(true);
    const g = E.startChapter(c, 1);
    const h = g.heroes[0];
    h.hp = 2;
    g.traps = [{ x: h.x, y: h.y + 1 }];
    E.moveTo(g, h.x, h.y + 1);
    expect(h.hp).toBe(1);
    expect(h.down).toBe(false);
    expect(h.pfoten).toBe(false);
    const punkte = g.punkte;
    g.traps = [{ x: h.x + 1, y: h.y }];
    E.moveTo(g, h.x + 1, h.y);
    expect(h.down).toBe(true);
    expect(g.punkte).toBeGreaterThan(punkte);
  });

  it('Nordhexe: Piet pikt aus der Ferne und lässt den Gegner aussetzen', () => {
    const g = play(['nordhexe', 'joern']);
    const h = E.activeHero(g), m = g.monsters[0];
    h.x = m.x - 4; h.y = m.y;
    g.tiles[m.y].fill('.', 1, g.w - 1);
    E.reveal(g);
    g.seen[m.y][m.x] = true;
    const hp = m.hp;
    expect(E.specialNeedsTarget(g)).toBe(true);
    expect(E.dispatch(g, { type: 'special', uid: m.uid })).toBe(true);
    expect(m.hp).toBe(hp - 2);
    expect(m.stuck || !g.monsters.includes(m)).toBe(true);
    expect(g.fx.some((f) => f.t === 'shot' && f.shot === 'nordhexe')).toBe(true);
  });

  it('die alte Juni ist ausgeblendet, alte Spielstände laufen weiter', () => {
    expect(HEROES.juni.hidden).toBe(true);
    expect(HEROES.nordhexe.hidden).toBeFalsy();
    expect(Object.values(HEROES).filter((d) => !d.hidden)).toHaveLength(5);
    expect(play(['juni']).heroes[0].id).toBe('juni');
  });

  it('Laden: einmalige Ausrüstung nur einmal, Werte steigen', () => {
    const c = E.newCampaign(['joern']);
    c.oere = 200;
    const item = E.SHOP.find((s) => s.id === 'bootshaken')!;
    expect(E.buy(c, 'joern', item)).toBe(true);
    expect(c.heroes[0].att).toBe(HEROES.joern.att + 1);
    expect(E.buy(c, 'joern', item)).toBe(false);
  });
});

describe('Spielleiter als Mensch', () => {
  const start = () => {
    const c = E.newCampaign(['joern', 'maren'], true);
    const g = E.startChapter(c, 3);
    const h = g.heroes[0], m = g.monsters[0];
    g.seen[m.y][m.x] = true;
    h.x = m.x + 2; h.y = m.y;
    E.reveal(g);
    E.dispatch(g, { type: 'end' }); E.dispatch(g, { type: 'end' });
    return { g, h, m };
  };

  const card = (id: GmEffect) => CAMPAIGNS[0].cards.findIndex((c) => c.id === id);

  it('die Runde wartet auf den Menschen, bringt Tinte und eine Karte', () => {
    const { g } = start();
    expect(g.status).toBe('gm');
    expect(g.tinte).toBe(TINTE_START + TINTE_RUNDE);
    expect(g.gmHand).toHaveLength(HAND_START + 1);
    expect(E.dispatch(g, { type: 'gmEnd' })).toBe(true);
    expect(g.status).toBe('play');
  });

  it('Gegner zieht einmal und greift einmal an', () => {
    const { g, h, m } = start();
    const target = { x: h.x - 1, y: h.y };
    expect(E.dispatch(g, { type: 'gmMove', uid: m.uid, ...target })).toBe(true);
    expect(E.dispatch(g, { type: 'gmMove', uid: m.uid, x: m.x - 1, y: m.y })).toBe(false);
    expect(E.dispatch(g, { type: 'gmAttack', uid: m.uid, hero: h.id })).toBe(true);
    expect(E.dispatch(g, { type: 'gmAttack', uid: m.uid, hero: h.id })).toBe(false);
    expect(E.dispatch(g, { type: 'gmEnd' })).toBe(true);
    expect(g.status === 'play' || g.status === 'lost').toBe(true);
  });

  it('Karten kosten Tinte und mehrere sind möglich, solange sie reicht', () => {
    const { g } = start();
    g.gmHand = [card('klau'), card('eile'), card('knoellchen')];
    g.tinte = GM_COST.klau + GM_COST.eile;
    expect(E.canPlayCard(g, 2)).toBe(false);
    expect(E.dispatch(g, { type: 'gmCard', index: 0 })).toBe(true);
    expect(E.dispatch(g, { type: 'gmCard', index: 0 })).toBe(true);
    expect(g.tinte).toBe(0);
    expect(g.gmEile).toBe(true);
    expect(g.gmHand).toEqual([card('knoellchen')]);
    expect(g.gmPile).toEqual([card('klau'), card('eile')]);
    expect(E.dispatch(g, { type: 'gmCard', index: 0 })).toBe(false);
  });

  it('Eile gibt Gegnern 2 Schritte mehr, nur bis Rundenende', () => {
    const { g, m } = start();
    g.seen = g.seen.map((row) => row.map(() => true));
    g.tiles = g.tiles.map((row) => row.map(() => '.'));
    const longest = () => Math.max(...[...E.gmReachable(g, m).values()].map((p) => p.length));
    const before = longest();
    g.gmHand = [card('eile')]; g.tinte = 9;
    E.dispatch(g, { type: 'gmCard', index: 0 });
    expect(before).toBe(MONSTERS[m.kind].spd);
    expect(longest()).toBe(before + 2);
    E.dispatch(g, { type: 'gmEnd' });
    expect(g.gmEile).toBe(false);
  });

  it('Schlick bremst die Figuren in der nächsten Runde', () => {
    const { g } = start();
    g.gmHand = [card('schlick')]; g.tinte = 9;
    E.dispatch(g, { type: 'gmCard', index: 0 });
    E.dispatch(g, { type: 'gmEnd' });
    const h = E.activeHero(g);
    expect(E.spdOf(g, h)).toBe(h.spd - 1);
  });

  it('Baustelle legt eine verdeckte Falle neben eine Figur', () => {
    const { g } = start();
    const n = g.traps.length;
    g.gmHand = [card('falle')]; g.tinte = 9;
    expect(E.dispatch(g, { type: 'gmCard', index: 0 })).toBe(true);
    expect(g.traps).toHaveLength(n + 1);
    const t = g.traps.at(-1)!;
    expect(Math.min(...E.living(g).map((h) => E.dist(h, t)))).toBeGreaterThanOrEqual(2);
  });

  it('Karten ohne Wirkung lassen sich nicht spielen', () => {
    const { g } = start();
    g.heroes.forEach((h) => { h.food = 0; });
    g.gmHand = [card('klau'), card('flicken')]; g.tinte = 9;
    expect(E.canPlayCard(g, 0)).toBe(false);
    expect(E.canPlayCard(g, 1)).toBe(false);
  });

  it('Helden-Aktionen sind im Spielleiter-Zug gesperrt', () => {
    const { g } = start();
    expect(E.dispatch(g, { type: 'search' })).toBe(false);
  });

  it('Spielleiter-Rolle bleibt über Kapitel erhalten', () => {
    const c = E.newCampaign(['joern'], true);
    expect(E.finishChapter(c, E.startChapter(c, 1)).gmHuman).toBe(true);
  });
});

describe('Spielleiter als Rechner', () => {
  it('spielt Karten von seiner Hand, bezahlt sie und bleibt in den Grenzen', () => {
    const g = E.startChapter(E.newCampaign(['joern', 'maren']), 5);
    let played = 0;
    for (let r = 0; r < 12 && g.status === 'play'; r++) {
      while (g.status === 'play') E.endTurn(g);
      const before = g.log.length;
      for (const _ of E.gmTurn(g)) void _;
      played += g.log.slice(before).filter((l) => l.startsWith('📜')).length;
      expect(g.tinte).toBeGreaterThanOrEqual(0);
      expect(g.tinte).toBeLessThanOrEqual(TINTE_MAX);
      expect(g.gmHand.length).toBeLessThanOrEqual(HAND_MAX);
    }
    expect(played).toBeGreaterThan(0);
  });

  it('gleicher Startwert, gleiche Karten', () => {
    const run = () => {
      const g = E.startChapter(E.newCampaign(['joern']), 11);
      for (let r = 0; r < 6 && g.status === 'play'; r++) {
        while (g.status === 'play') E.endTurn(g);
        for (const _ of E.gmTurn(g)) void _;
      }
      return g.log.filter((l) => l.startsWith('📜')).join('|');
    };
    expect(run()).toBe(run());
  });
});

describe('Kampagnen', () => {
  it('Spielstände ohne Kampagne gehören zur ersten', () => {
    const alt = { heroes: E.newCampaign(['joern']).heroes, oere: 20, chapter: 1 };
    const g = E.startChapter(alt, 1);
    expect(g.campaign).toBe('hafen');
    expect(E.chapterOf(g).title).toBe(CHAPTERS[1].title);
  });

  it('die Kampagne bleibt über Kapitel erhalten', () => {
    const c = E.newCampaign(['joern'], false, 'hafen');
    expect(E.finishChapter(c, E.startChapter(c, 1)).campaign).toBe('hafen');
  });
});
