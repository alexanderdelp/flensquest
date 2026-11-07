import { HEROES, MONSTERS, type HeroId } from '../content';
import { damageMonster } from './combat';
import { lineOfSight } from './map';
import { dist, hkey, isActive, log, mkey } from './state';
import type { Game, Hero, Monster } from './types';

/*
 Spezialkönnen der Figuren als Tabelle: Reichweite, ob ein Ziel nötig ist, und die Wirkung.
 apply gibt false zurück, wenn das Können gerade nichts bewirken würde; dann kostet es nichts.
*/

export interface SpecialRule {
  /** Braucht ein Gegnerziel, das man antippt. */
  target: boolean;
  /** Reichweite zum Ziel oder Wirkungsradius. */
  range: number;
  apply(g: Game, h: Hero, target?: Monster): boolean;
}

const nameOf = (m: Monster) => MONSTERS[m.kind].name;

const inRange = (g: Game, h: Hero, r: number) =>
  g.monsters.filter((m) => isActive(g, m) && dist(h, m) <= r && lineOfSight(g, h, m));

export const SPECIALS: Record<HeroId, SpecialRule> = {
  frauke: {
    target: true, range: 3,
    apply(g, h, t) {
      log(g, `FlensNetz fesselt ${nameOf(t!)}.`);
      t!.stuck = true;
      g.fx.push({ t: 'shot', who: hkey(h), target: mkey(t!), shot: 'netz' });
      damageMonster(g, t!, 1);
      return true;
    },
  },
  joern: {
    target: true, range: 1,
    apply(g, h, t) {
      log(g, `Dicker Schlüssel trifft ${nameOf(t!)}: 4 Schaden.`);
      g.fx.push({ t: 'attack', who: hkey(h), target: mkey(t!), shot: null, a: 0, b: 0, total: 0, need: 0, hit: true, dmg: 4 });
      damageMonster(g, t!, 4);
      return true;
    },
  },
  maren: {
    target: false, range: 3,
    apply(g, h) {
      const hit = inRange(g, h, 3);
      if (!hit.length) return false;
      log(g, `Schwarm über der Förde trifft ${hit.length} Gegner.`);
      hit.forEach((m) => {
        g.fx.push({ t: 'shot', who: hkey(h), target: mkey(m), shot: 'maren' });
        damageMonster(g, m, 1);
      });
      return true;
    },
  },
  hinnerk: {
    target: false, range: 1,
    apply(g, h) {
      const near = g.heroes.filter((o) => dist(o, h) <= 1 && o.hp < o.maxHp).sort((a, b) => a.hp - b.hp);
      if (!near.length) return false;
      const o = near[0];
      g.fx.push({ t: 'heal', who: hkey(o), n: Math.min(4, o.maxHp - o.hp) });
      o.hp = Math.min(o.maxHp, o.hp + 4);
      o.down = false;
      log(g, `Lütt un Lütt für ${HEROES[o.id].name} (+4).`);
      return true;
    },
  },
  juni: {
    target: false, range: 3,
    apply(g, h) {
      const hit = inRange(g, h, 3);
      if (!hit.length) return false;
      log(g, `FlensLeuchtfeuer blendet ${hit.length} Gegner.`);
      hit.forEach((m) => {
        m.stuck = true; m.blind = true;
        g.fx.push({ t: 'shot', who: hkey(h), target: mkey(m), shot: 'licht' });
      });
      return true;
    },
  },
  nordhexe: {
    target: true, range: 4,
    apply(g, h, t) {
      log(g, `Piet stürzt sich auf ${nameOf(t!)}.`);
      t!.stuck = true; t!.blind = true;
      g.fx.push({ t: 'shot', who: hkey(h), target: mkey(t!), shot: 'nordhexe' });
      damageMonster(g, t!, 2);
      return true;
    },
  },
};
