import * as E from '../../core';
import type { Game } from '../../core';
import type { Mark } from '../board';

/** Was die Oberfläche gerade erlaubt: Animation läuft, Spezialkönnen zielt, Spielleiter hat einen Gegner gewählt. */
export interface UiMode { busy: boolean; aiming: boolean; gmSel: number | null }

/** Markierte Felder des menschlichen Spielleiters: Gegner wählen, ziehen, angreifen. */
function gmMarks(g: Game, gmSel: number | null): Mark[] {
  const out: Mark[] = [];
  const sel = g.monsters.find((o) => o.uid === gmSel);
  for (const o of g.monsters) if (E.gmCanAct(g, o) && o !== sel) out.push({ x: o.x, y: o.y, kind: 'use', act: 'gmSelect' });
  if (!sel || !E.gmCanAct(g, sel)) return out;
  for (const k of E.gmReachable(g, sel).keys()) {
    const [x, y] = k.split(',').map(Number);
    out.push({ x, y, kind: 'walk', act: 'gmMove' });
  }
  for (const h of E.gmTargets(g, sel)) out.push({ x: h.x, y: h.y, kind: 'foe', act: 'gmAttack' });
  return out;
}

/** Alle möglichen Ziele: grün gehen, gold Türen und Truhen, rot Gegner. */
export function marksFor(g: Game, mode: UiMode): Mark[] {
  const out: Mark[] = [];
  if (mode.busy) return out;
  if (g.status === 'gm' && g.gmHuman) return gmMarks(g, mode.gmSel);
  if (g.status !== 'play') return out;
  if (!mode.aiming) {
    for (const [k, path] of E.reachable(g)) {
      const [x, y] = k.split(',').map(Number);
      out.push({ x, y, kind: 'walk', act: 'move', steps: path.length, tides: E.tideCost(g, path.length) });
    }
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (E.canOpenDoor(g, x, y)) out.push({ x, y, kind: 'use', act: 'door' });
      if (E.canOpenChest(g, x, y)) out.push({ x, y, kind: 'use', act: 'chest' });
    }
  }
  for (const m of g.monsters) {
    if (mode.aiming ? E.canSpecialOn(g, m) : E.canAttack(g, m)) {
      out.push({ x: m.x, y: m.y, kind: 'foe', act: mode.aiming ? 'special' : 'attack' });
    }
  }
  return out;
}

/** Welche Handlung ein Tipp auf eine Markierung auslöst; gmSelect wählt nur aus und ist keine Handlung. */
export function actionForMark(g: Game, mark: Mark, gmSel: number | null): E.Action | 'select' | null {
  const m = E.monsterAt(g, mark.x, mark.y), p = { x: mark.x, y: mark.y };
  switch (mark.act) {
    case 'gmSelect': return m ? 'select' : null;
    case 'gmMove': return gmSel !== null ? { type: 'gmMove', uid: gmSel, ...p } : null;
    case 'gmAttack': {
      const h = E.heroAt(g, p.x, p.y);
      return gmSel !== null && h ? { type: 'gmAttack', uid: gmSel, hero: h.id } : null;
    }
    case 'move': case 'door': case 'chest': return { type: mark.act, ...p };
    case 'attack': return m ? { type: 'attack', uid: m.uid } : null;
    case 'special': return m ? { type: 'special', uid: m.uid } : null;
    default: return null;
  }
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
};

/** Pfeiltaste: ein Feld laufen, oder dort angreifen, die Tür oder die Truhe öffnen. */
export function actionForArrow(g: Game, key: string): E.Action | null {
  const d = ARROWS[key];
  if (!d || g.status !== 'play') return null;
  const h = E.activeHero(g), x = h.x + d[0], y = h.y + d[1];
  const m = E.monsterAt(g, x, y);
  if (m) return E.canAttack(g, m) ? { type: 'attack', uid: m.uid } : null;
  if (E.canOpenDoor(g, x, y)) return { type: 'door', x, y };
  if (E.canOpenChest(g, x, y)) return { type: 'chest', x, y };
  if (E.reachable(g).has(`${x},${y}`)) return { type: 'move', x, y };
  return null;
}

export const isArrow = (key: string) => key in ARROWS;
