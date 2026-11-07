import { HAND_MAX, MONSTERS, TINTE_MAX, TINTE_RUNDE, type GmEffect } from '../../content';
import { freeForUnit, nearestHero } from '../map';
import { addPunkte } from '../outcome';
import { pick, shuffle } from '../rng';
import {
  cardOf, chestAt, costOf, dist, hkey, isActive, living, log, mkey,
} from '../state';
import type { Game, Monster, Pos } from '../types';
import { spawn } from '../units';

/** Kartenhand, Stapel und Wirkungen der Spielleiterkarten; gilt für Rechner und Mensch gleich. */

/** Zieht eine Karte auf die Hand; ist der Stapel leer, wird die Ablage gemischt. */
export function drawCard(g: Game) {
  if (g.gmHand.length >= HAND_MAX) return;
  if (!g.gmDeck.length) { g.gmDeck = shuffle(g, g.gmPile); g.gmPile = []; }
  const c = g.gmDeck.shift();
  if (c !== undefined) g.gmHand.push(c);
}

/** Zu Beginn jedes Spielleiter-Zugs: Tinte, eine neue Karte, Schlick ist vorbei. */
export function gmBegin(g: Game) {
  g.tinte = Math.min(TINTE_MAX, g.tinte + TINTE_RUNDE);
  g.slow = false;
  drawCard(g);
}

export const activeFoes = (g: Game) => g.monsters.filter((m) => isActive(g, m));

/** Freies, aufgedecktes Bodenfeld ohne Truhe, Falle oder Ziel. */
function freeTile(g: Game, x: number, y: number) {
  return g.seen[y][x] && g.tiles[y][x] === '.' && freeForUnit(g, x, y) && !chestAt(g, x, y)
    && !g.traps.some((t) => t.x === x && t.y === y)
    && !(g.goal && !g.goalTaken && g.goal.x === x && g.goal.y === y);
}

function spots(g: Game, ok: (p: Pos) => boolean): Pos[] {
  const out: Pos[] = [];
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (freeTile(g, x, y) && ok({ x, y })) out.push({ x, y });
  return out;
}

/** Für Verstärkung: mindestens 4 Felder von allen Figuren weg. */
export const spotsFar = (g: Game) => spots(g, (p) => nearestHero(g, p) >= 4);
/** Für Fallen: 2 bis 3 Felder neben einer Figur. */
export const spotsNear = (g: Game) => spots(g, (p) => living(g).some((h) => dist(h, p) >= 2 && dist(h, p) <= 3));

export const hurtFoe = (g: Game): Monster | undefined => activeFoes(g).filter((m) => m.hp < m.maxHp)
  .sort((a, b) => (b.maxHp - b.hp) - (a.maxHp - a.hp) || Number(!!MONSTERS[b.kind].boss) - Number(!!MONSTERS[a.kind].boss))[0];

export const wetHeroes = (g: Game) => living(g).filter((h) => !h.gear.includes('friesennerz') && h.hp > 1);

/** Ob eine Karte gerade etwas bewirken würde. Karten ohne Wirkung lassen sich nicht spielen. */
export function cardWorks(g: Game, id: GmEffect): boolean {
  switch (id) {
    case 'eile': return !g.gmEile && activeFoes(g).length > 0;
    case 'zorn': return !g.gmZorn && activeFoes(g).length > 0;
    case 'flicken': return !!hurtFoe(g);
    case 'schiet': return wetHeroes(g).length > 0;
    case 'verstaerkung': return spotsFar(g).length > 0;
    case 'falle': return spotsNear(g).length > 0;
    case 'klau': return living(g).some((h) => h.food > 0);
    case 'schlick': return !g.slow;
    case 'knoellchen': return true;
    default: return false;
  }
}

export function canPlayCard(g: Game, handIndex: number) {
  const c = g.gmHand[handIndex];
  return g.status === 'gm' && c !== undefined && costOf(g, c) <= g.tinte && cardWorks(g, cardOf(g, c).id);
}

const EFFECTS: Record<GmEffect, (g: Game, name: string) => void> = {
  eile: (g) => { g.gmEile = true; },
  zorn: (g) => { g.gmZorn = true; },
  flicken: (g) => {
    const m = hurtFoe(g)!, n = Math.min(3, m.maxHp - m.hp);
    m.hp += n;
    g.fx.push({ t: 'heal', who: mkey(m), n });
  },
  schiet: (g) => wetHeroes(g).forEach((h) => { h.hp--; g.fx.push({ t: 'hurt', who: hkey(h), n: 1 }); }),
  verstaerkung: (g) => { const s = pick(g, spotsFar(g)); spawn(g, 'knoellchen', s.x, s.y, 1); },
  falle: (g) => { g.traps.push(pick(g, spotsNear(g))); },
  klau: (g) => {
    const h = [...living(g)].sort((a, b) => b.food - a.food)[0];
    h.food--;
    g.fx.push({ t: 'float', at: { x: h.x, y: h.y }, text: '−1 Fischbrötchen' });
  },
  schlick: (g) => { g.slow = true; },
  knoellchen: (g, name) => addPunkte(g, 1, name),
};

/** Spielt eine Handkarte aus: Tinte bezahlen, Wirkung ausführen, ab auf die Ablage. */
export function playCard(g: Game, handIndex: number): boolean {
  if (!canPlayCard(g, handIndex)) return false;
  const c = g.gmHand[handIndex], card = cardOf(g, c), cost = costOf(g, c);
  g.gmHand.splice(handIndex, 1);
  g.gmPile.push(c);
  g.tinte -= cost;
  log(g, `📜 ${card.name} (${cost} Tinte): ${card.text}`);
  g.fx.push({ t: 'card', name: card.name, text: card.text, cost });
  EFFECTS[card.id](g, card.name);
  return true;
}
