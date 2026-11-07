import { HEROES, MONSTERS } from '../content';
import { lineOfSight } from './map';
import { addPunkte, lose, tryWin } from './outcome';
import { d6 } from './rng';
import { fire } from './scripts';
import { activeHero, chapterOf, dist, hkey, isActive, living, log, mkey } from './state';
import type { Game, Hero, Monster } from './types';

/** Würfeln, Schaden und Stürze. */

export interface Roll { a: number; b: number; total: number; need: number; hit: boolean; crit: boolean }

/** 2W6 + Angriff gegen 7 + Rüstung; 6+6 trifft immer (doppelt), 1+1 nie. */
export function rollAttack(g: Game, att: number, arm: number): Roll {
  const a = d6(g), b = d6(g);
  const total = a + b + att, need = 7 + arm;
  const crit = a === 6 && b === 6;
  return { a, b, total, need, crit, hit: crit || (total >= need && !(a === 1 && b === 1)) };
}

export function hurtHero(g: Game, h: Hero, dmg: number) {
  h.hp = Math.max(0, h.hp - dmg);
  g.fx.push({ t: 'hurt', who: hkey(h), n: dmg });
  if (h.hp === 0 && h.pfoten) {
    h.pfoten = false;
    h.hp = 1;
    log(g, `${HEROES[h.id].name} landet auf den Pfoten: 1 Lebenspunkt bleibt.`);
    g.fx.push({ t: 'float', at: { x: h.x, y: h.y }, text: 'Miau!' });
    return;
  }
  if (h.hp === 0 && !h.down) {
    h.down = true;
    log(g, `${HEROES[h.id].name} geht zu Boden: 2 Punkte.`);
    addPunkte(g, 2, `${HEROES[h.id].name} gestürzt`);
    if (!living(g).length) lose(g, 'Alle liegen auf den Planken. Das war nix.');
  }
}

export function damageMonster(g: Game, m: Monster, dmg: number) {
  m.hp -= dmg;
  g.fx.push({ t: 'hurt', who: mkey(m), n: dmg });
  if (m.hp > 0) {
    if (m.hp * 2 <= m.maxHp) fire(g, { on: 'halb', kind: m.kind });
    return;
  }
  const d = MONSTERS[m.kind];
  g.fx.push({ t: 'die', who: mkey(m) });
  g.fx.push({ t: 'float', at: { x: m.x, y: m.y }, text: `+${d.reward} Öre` });
  g.monsters = g.monsters.filter((o) => o !== m);
  g.oere += d.reward;
  log(g, `${d.name} ist erledigt (+${d.reward} Öre).`);
  if (m.kind === chapterOf(g).goal.boss) { g.bossDead = true; tryWin(g); }
}

export function canAttack(g: Game, m: Monster): boolean {
  const h = activeHero(g);
  if (g.status !== 'play' || g.tiden < 1) return false;
  if (g.attacked || !isActive(g, m)) return false;
  return dist(h, m) <= HEROES[h.id].range && lineOfSight(g, h, m);
}

/** Angriff der aktiven Figur: kostet eine Tide, einmal je Zug. */
export function attack(g: Game, m: Monster): Roll | null {
  if (!canAttack(g, m)) return null;
  const h = activeHero(g), def = HEROES[h.id], md = MONSTERS[m.kind];
  g.tiden--; g.attacked = true; g.steps = 0;
  const r = rollAttack(g, h.att, md.arm);
  const dmg = (r.crit ? 2 : 1) * def.dmg;
  log(g, `${def.name} → ${md.name}: 🎲 ${r.a}+${r.b}+${h.att} = ${r.total} (nötig ${r.need}) ${r.hit ? `Treffer, ${dmg} Schaden` : 'daneben'}`);
  g.fx.push({ t: 'attack', who: hkey(h), target: mkey(m), shot: def.range > 1 ? h.id : null, a: r.a, b: r.b, total: r.total, need: r.need, hit: r.hit, dmg });
  if (r.hit) damageMonster(g, m, dmg);
  return r;
}

/** Angriff eines Gegners; Knöllchenkobolde kleben bei einer 6 zusätzlich einen Punkt an. */
export function strike(g: Game, m: Monster, t: Hero) {
  const d = MONSTERS[m.kind];
  const att = d.att + (g.gmZorn ? 1 : 0);
  const r = rollAttack(g, att, t.arm);
  log(g, `${d.name} → ${HEROES[t.id].name}: 🎲 ${r.a}+${r.b}+${att} = ${r.total} (nötig ${r.need}) ${r.hit ? `Treffer, ${d.dmg} Schaden` : 'daneben'}`);
  g.fx.push({ t: 'attack', who: mkey(m), target: hkey(t), shot: d.range > 1 ? m.kind : null, a: r.a, b: r.b, total: r.total, need: r.need, hit: r.hit, dmg: d.dmg });
  if (!r.hit) return;
  hurtHero(g, t, d.dmg);
  if (m.kind === 'knoellchen' && d6(g) === 6) {
    log(g, 'Der Kobold klebt ein Knöllchen an: 1 Punkt.');
    addPunkte(g, 1, 'Knöllchen');
  }
}
