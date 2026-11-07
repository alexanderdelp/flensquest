import { describe, expect, it } from 'vitest';
import { BUILTIN as CAMPAIGNS } from '../../src/campaigns';
import { type HeroId } from '../../src/content';
import * as E from '../support/engine';

/*
 * Balance: Ein einfacher Bot spielt jedes Kapitel viele Male durch. Er zeigt nur die Tendenz;
 * entscheidend bleibt echtes Anspielen. Läuft getrennt (npm run test:balance), weil er dauert.
 */
const ALL: HeroId[] = ['frauke', 'joern', 'maren', 'hinnerk'];

/** Einfacher Bot: prüft, dass jedes Kapitel durchspielbar ist, und misst die Balance. */
function bot(ids: HeroId[], chapter: number, seed: number, campaign = 'hafen', geared = false): 'won' | 'lost' {
  const c = E.newCampaign(ids, false, campaign);
  c.chapter = chapter;
  if (geared) {
    c.oere = 500;
    for (const h of c.heroes) for (const s of E.SHOP) if (s.once) E.buy(c, h.id, s);
  }
  const g = E.startChapter(c, seed);
  for (let guard = 0; guard < 3000 && (g.status === 'play' || g.status === 'gm'); guard++) {
    if (g.status === 'gm') { for (const _ of E.gmTurn(g)) void _; continue; }
    const h = E.activeHero(g);
    if (h.hp <= 4 && E.eat(g)) continue;
    if (E.canSpecial(g) && !E.specialNeedsTarget(g) && h.id === 'hinnerk' && g.heroes.some((o) => E.dist(o, h) <= 1 && o.hp < o.maxHp / 2) && E.special(g)) continue;
    if (E.canSpecial(g) && h.id !== 'hinnerk') {
      const near = g.monsters.find((m) => E.canSpecialOn(g, m));
      if (near && E.dispatch(g, { type: 'special', uid: near.uid })) continue;
    }
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
    const hidden: E.Pos[] = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (E.tile(g, x, y) === 'H' && g.seen[y][x]) hidden.push({ x, y });
    }
    if (hidden.some((p) => E.dist(p, h) <= 4) && g.tiden > 0) { E.search(g); continue; }
    if (!goals.length) goals.push(...hidden);
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

describe('Balance (Bot)', () => {
  CAMPAIGNS.forEach((camp) => it(`${camp.title}: jedes Kapitel ist gewinnbar`, () => {
    const lines: string[] = [camp.title];
    camp.chapters.forEach((_, ch) => {
      const rates = [1, 2, 3, 4].map((n) => {
        let wins = 0;
        for (let s = 0; s < 30; s++) if (bot(ALL.slice(0, n), ch, s * 7 + 1, camp.id) === 'won') wins++;
        return wins;
      });
      lines.push(`Kapitel ${ch + 1}: ${rates.map((r) => `${Math.round((r / 30) * 100)}%`).join('  ')}`);
      expect(Math.max(...rates), lines.at(-1)).toBeGreaterThan(0);
    });
    console.log(lines.join('\n'));
  }, 120000));

  it('solo mit Ausrüstung aus dem Kiosk bleibt die Akte Förde schaffbar', () => {
    const lines = ['Solo, ausgerüstet'];
    CAMPAIGNS[1].chapters.forEach((_, ch) => {
      const rates = (['joern', 'hinnerk', 'juni'] as HeroId[]).map((id) => {
        let wins = 0;
        for (let s = 0; s < 30; s++) if (bot([id], ch, s * 7 + 1, 'akte', true) === 'won') wins++;
        return wins;
      });
      lines.push(`Kapitel ${ch + 1}: ${rates.map((r) => `${Math.round((r / 30) * 100)}%`).join('  ')}`);
      expect(Math.max(...rates), lines.at(-1)).toBeGreaterThan(0);
    });
    console.log(lines.join('\n'));
  }, 120000);
});
