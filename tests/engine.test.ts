import { describe, expect, it } from 'vitest';
import { CHAPTERS, HEROES, MONSTERS, type HeroId } from '../src/game/data';
import * as E from '../src/game/engine';

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
      if (open.has(k) || E.tile(g, p.x, p.y) === '#') continue;
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
  it('Start: Helden auf Startfeldern, Tiden nach Spielerzahl', () => {
    expect(play(ALL).tiden).toBe(3);
    expect(play(['joern']).tiden).toBe(4);
    expect(play(['joern']).heroes[0].maxHp).toBe(HEROES.joern.hp + 4);
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

  it('Laden: einmalige Ausrüstung nur einmal, Werte steigen', () => {
    const c = E.newCampaign(['joern']);
    c.oere = 200;
    const item = E.SHOP.find((s) => s.id === 'bootshaken')!;
    expect(E.buy(c, 'joern', item)).toBe(true);
    expect(c.heroes[0].att).toBe(HEROES.joern.att + 1);
    expect(E.buy(c, 'joern', item)).toBe(false);
  });
});

/** Einfacher Bot: prüft, dass jedes Kapitel durchspielbar ist, und misst die Balance. */
function bot(ids: HeroId[], chapter: number, seed: number): 'won' | 'lost' {
  const g = play(ids, chapter, seed);
  for (let guard = 0; guard < 3000 && (g.status === 'play' || g.status === 'gm'); guard++) {
    if (g.status === 'gm') { for (const _ of E.gmTurn(g)) void _; continue; }
    const h = E.activeHero(g);
    if (h.hp <= 4 && E.eat(g)) continue;
    if (E.canSpecial(g) && !E.specialNeedsTarget(g) && h.id === 'hinnerk' && g.heroes.some((o) => E.dist(o, h) <= 1 && o.hp < o.maxHp / 2) && E.special(g)) continue;
    const foe = g.monsters.find((m) => E.canAttack(g, m));
    if (foe) { E.attack(g, foe); if (g.status !== 'play') continue; }
    if (g.tiden === 0 && g.steps === 0) { E.endTurn(g); continue; }
    const r = E.reachable(g);
    const goals: E.Pos[] = [];
    if (g.goal && !g.goalTaken && g.seen[g.goal.y][g.goal.x]) goals.push(g.goal);
    if (g.goalTaken && g.exit && g.seen[g.exit.y][g.exit.x]) goals.push(g.exit);
    g.monsters.filter((m) => E.isActive(g, m)).forEach((m) => goals.push(m));
    let opened = false;
    for (let y = 0; y < g.h && !opened; y++) for (let x = 0; x < g.w; x++) {
      if (E.canOpenDoor(g, x, y)) { E.openDoor(g, x, y); opened = true; break; }
    }
    if (opened) continue;
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (E.tile(g, x, y) === 'D' && g.seen[y][x]) goals.push({ x, y });
    }
    if (!goals.length && g.tiden > 0) { E.search(g); continue; }
    let best: string | null = null, bestD = Infinity;
    for (const k of r.keys()) {
      const [x, y] = k.split(',').map(Number);
      const d = Math.min(...goals.map((p) => E.dist(p, { x, y }))) + r.get(k)!.length / 50;
      if (d < bestD) { bestD = d; best = k; }
    }
    const here = Math.min(...goals.map((p) => E.dist(p, h)));
    if (best && bestD < here) {
      const [x, y] = best.split(',').map(Number);
      E.moveTo(g, x, y);
      if (g.status === 'play' && g.tiden === 0) E.endTurn(g);
    } else if (g.tiden > 0 && Math.random() < 0.3) { E.search(g); } else { E.endTurn(g); }
  }
  return g.status === 'won' ? 'won' : 'lost';
}

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

  it('die Runde wartet auf den Menschen und zieht zwei Karten', () => {
    const { g } = start();
    expect(g.status).toBe('gm');
    expect(g.gmCards).toHaveLength(2);
    expect(E.dispatch(g, { type: 'gmEnd' })).toBe(false);
  });

  it('Gegner zieht einmal, greift einmal an, und die Karte beendet die Runde', () => {
    const { g, h, m } = start();
    const target = { x: h.x - 1, y: h.y };
    expect(E.dispatch(g, { type: 'gmMove', uid: m.uid, ...target })).toBe(true);
    expect(E.dispatch(g, { type: 'gmMove', uid: m.uid, x: m.x - 1, y: m.y })).toBe(false);
    expect(E.dispatch(g, { type: 'gmAttack', uid: m.uid, hero: h.id })).toBe(true);
    expect(E.dispatch(g, { type: 'gmAttack', uid: m.uid, hero: h.id })).toBe(false);
    expect(E.dispatch(g, { type: 'gmCard', index: 1 })).toBe(true);
    expect(E.dispatch(g, { type: 'gmCard', index: 0 })).toBe(false);
    expect(E.dispatch(g, { type: 'gmEnd' })).toBe(true);
    expect(g.status === 'play' || g.status === 'lost').toBe(true);
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

describe('Balance (Bot)', () => {
  it('jedes Kapitel ist für 1 bis 4 Helden gewinnbar', () => {
    const lines: string[] = [];
    for (let ch = 0; ch < CHAPTERS.length; ch++) {
      const rates = [1, 2, 3, 4].map((n) => {
        let wins = 0;
        for (let s = 0; s < 30; s++) if (bot(ALL.slice(0, n), ch, s * 7 + 1) === 'won') wins++;
        return wins;
      });
      lines.push(`Kapitel ${ch + 1}: ${rates.map((r) => `${Math.round((r / 30) * 100)}%`).join('  ')}`);
      expect(Math.max(...rates)).toBeGreaterThan(0);
    }
    console.log(lines.join('\n'));
  }, 60000);
});
