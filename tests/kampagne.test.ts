import { describe, expect, it } from 'vitest';
import { campaignById, CAMPAIGNS } from '../src/game/campaigns';
import { MONSTERS, type HeroId } from '../src/game/data';
import * as E from '../src/game/engine';

const AKTE = campaignById('akte');
const start = (ids: HeroId[], chapter: number, seed = 1) => {
  const c = E.newCampaign(ids, false, 'akte');
  c.chapter = chapter;
  return E.startChapter(c, seed);
};

/** Felder, die nach Öffnen aller Türen und Finden aller Verstecke erreichbar sind. */
function area(g: E.Game) {
  const open = new Set<string>();
  const stack = [{ x: g.heroes[0].x, y: g.heroes[0].y }];
  while (stack.length) {
    const p = stack.pop()!;
    const k = `${p.x},${p.y}`;
    if (open.has(k) || E.tile(g, p.x, p.y) === '#' || E.propAt(g, p.x, p.y)) continue;
    open.add(k);
    stack.push({ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 });
  }
  return open;
}

describe('Die Akte Förde', () => {
  it('hat sechs Missionen und alle Rahmentexte', () => {
    expect(AKTE.chapters).toHaveLength(6);
    for (const t of [AKTE.intro, AKTE.epilog, AKTE.lostText, AKTE.retryText]) expect(t?.length).toBeGreaterThan(20);
    expect(CAMPAIGNS.map((c) => c.id)).toEqual(['hafen', 'akte']);
  });

  AKTE.chapters.forEach((ch, i) => describe(`Mission ${i + 1}: ${ch.title}`, () => {
    const g = start(['frauke', 'joern', 'maren', 'juni'], i);

    it('ist vollständig erzählt', () => {
      for (const t of [ch.title, ch.intro, ch.situation, ch.goalText, ch.outro]) expect(t?.length).toBeGreaterThan(10);
      if (i < 5) expect(ch.bridge?.length).toBeGreaterThan(10);
      expect(ch.notes!.length).toBeGreaterThanOrEqual(3);
      expect(Object.keys(ch.foes!).length).toBeGreaterThanOrEqual(1);
      expect(ch.notes!.some((n) => n.spawn) || !!ch.phase).toBe(true);
      expect(ch.notes!.every((n) => n.text.length <= 170)).toBe(true);
    });

    it('hat eine gültige Karte', () => {
      ch.map.forEach((r, y) => expect(r.length, `Zeile ${y}: ${r}`).toBe(24));
      expect(ch.map).toHaveLength(14);
      expect(ch.map.join('').split('S').length - 1).toBeGreaterThanOrEqual(4);
    });

    it('alle Raumtexte hängen an echten Türen', () => {
      for (const n of ch.notes!) for (const [x, y] of n.at) {
        expect('DH', `${n.title} bei ${x},${y}`).toContain(E.tile(g, x, y));
      }
    });

    it('jede Tür verbindet zwei begehbare Seiten', () => {
      const free = (x: number, y: number) => E.tile(g, x, y) !== '#' && E.tile(g, x, y) !== 'H';
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
        if (E.tile(g, x, y) !== 'D' && E.tile(g, x, y) !== 'H') continue;
        const ns = free(x, y - 1) && free(x, y + 1), ew = free(x - 1, y) && free(x + 1, y);
        expect(ns || ew, `Tür ${x},${y}`).toBe(true);
      }
    });

    it('das Missionsziel ist erreichbar', () => {
      const open = area(g);
      const goal = ch.goal;
      if (g.goal) expect(open.has(`${g.goal.x},${g.goal.y}`)).toBe(true);
      if (goal.type === 'bergen') expect(open.has(`${g.exit!.x},${g.exit!.y}`)).toBe(true);
      if (goal.boss) {
        const boss = g.monsters.find((m) => m.kind === goal.boss)!;
        expect(boss).toBeTruthy();
        expect(open.has(`${boss.x},${boss.y}`)).toBe(true);
      }
    });

    it('beschreibt nur Gegner, die auftauchen', () => {
      const here = new Set([...g.monsters.map((m) => m.kind), ...(ch.notes ?? []).flatMap((n) => (n.spawn ?? []).map((s) => s.kind))]);
      for (const k of Object.keys(ch.foes!)) expect(here.has(k as never), k).toBe(true);
    });
  }));

  it('Mission 6 hat eine Wende im Endkampf', () => {
    const g = start(['joern', 'maren'], 5);
    const boss = g.monsters.find((m) => m.kind === 'oberarchivar')!;
    const h = E.activeHero(g);
    h.x = boss.x - 1; h.y = boss.y;
    E.reveal(g);
    g.seen[boss.y][boss.x] = true;
    const before = g.monsters.length;
    boss.hp = Math.ceil(boss.maxHp / 2) + 1;
    E.dispatch(g, { type: 'special', uid: boss.uid });
    expect(g.phaseDone).toBe(true);
    expect(g.monsters.length).toBe(before + 2);
    expect(g.fx.some((f) => f.t === 'note')).toBe(true);
  });

  it('Sieg braucht Gegenstand und Endgegner', () => {
    const g = start(['joern', 'maren'], 0);
    const boss = g.monsters.find((m) => m.kind === 'kalle')!;
    boss.hp = 1;
    const h = E.activeHero(g);
    h.x = boss.x - 1; h.y = boss.y;
    E.reveal(g);
    g.seen[boss.y][boss.x] = true;
    E.dispatch(g, { type: 'special', uid: boss.uid });
    expect(g.bossDead).toBe(true);
    expect(g.status).toBe('play');
    const reward = g.oere;
    h.x = g.goal!.x - 1; h.y = g.goal!.y;
    E.reveal(g);
    E.moveTo(g, g.goal!.x, g.goal!.y);
    expect(g.status).toBe('won');
    expect(g.oere).toBe(reward + AKTE.chapters[0].reward);
  });

  it('Ausgang öffnet erst nach Gegenstand und Endgegner', () => {
    const g = start(['joern', 'maren'], 1);
    g.goalTaken = true;
    const h = E.activeHero(g);
    h.x = g.exit!.x - 1; h.y = g.exit!.y;
    g.tiles[g.exit!.y][g.exit!.x - 1] = '.';
    E.reveal(g);
    E.moveTo(g, g.exit!.x, g.exit!.y);
    expect(g.status).toBe('play');
    h.x = g.exit!.x - 1;
    g.bossDead = true;
    E.moveTo(g, g.exit!.x, g.exit!.y);
    expect(g.status).toBe('won');
  });

  it('Raumtexte erscheinen einmal und bringen ihre Überraschung', () => {
    const g = start(['joern', 'maren'], 0);
    const h = E.activeHero(g);
    h.x = 14; h.y = 3;
    E.reveal(g);
    const before = g.monsters.length;
    g.fx = [];
    expect(E.dispatch(g, { type: 'door', x: 14, y: 4 })).toBe(true);
    expect(g.fx.filter((f) => f.t === 'note' && f.title === 'Fischkisten')).toHaveLength(1);
    expect(g.monsters.length).toBe(before + 1);
    expect(g.notesDone).toEqual([1]);
  });

  it('Gegnertexte erscheinen beim ersten Auftauchen', () => {
    const g = start(['joern', 'maren'], 0);
    const m = g.monsters.find((o) => o.kind === 'kalle')!;
    g.seen[m.y][m.x] = true;
    E.reveal(g);
    E.reveal(g);
    expect(g.foesSeen).toEqual(['kalle']);
    expect(g.fx.filter((f) => f.t === 'note')).toHaveLength(1);
  });

  it('Spielstand läuft durch alle Missionen, Niederlage bleibt im Kapitel', () => {
    let c = E.newCampaign(['joern', 'maren'], false, 'akte');
    for (let i = 0; i < 6; i++) {
      const lost = E.startChapter(c, i + 1);
      E.addPunkte(lost, 8);
      expect(lost.status).toBe('lost');
      expect(c.chapter).toBe(i);
      const g = E.startChapter(c, i + 1);
      expect(E.chapterOf(g).title).toBe(AKTE.chapters[i].title);
      g.status = 'won';
      c = E.finishChapter(c, g);
      expect(c.campaign).toBe('akte');
    }
    expect(c.chapter).toBe(6);
  });

  it('Endgegner bleiben solo ernst zu nehmen', () => {
    const g = start(['joern'], 5);
    const boss = g.monsters.find((m) => m.kind === 'oberarchivar')!;
    expect(boss.maxHp).toBe(Math.round(MONSTERS.oberarchivar.hp * 0.6));
  });
});
