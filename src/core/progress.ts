import {
  CHARGES, HAND_START, HEROES, HP_BONUS, HP_SCALE, MONSTER_CHARS, PROP_CHARS, SOLO_HP, START_FOOD, START_OERE, TINTE_START,
  type HeroId, type ShopItem,
} from '../content';
import { campaignById } from './catalog';
import { drawCard } from './gm/cards';
import { beginTurn } from './heroes';
import { shuffle } from './rng';
import { fire, look } from './scripts';
import { log } from './state';
import type { Game, Pos, Progress } from './types';
import { spawn } from './units';

/** Kampagnenfortschritt: neue Gruppe, Kapitel aufbauen und abschließen, Hafenkiosk. */

export function newProgress(ids: HeroId[], gmHuman = false, campaign?: string): Progress {
  return {
    oere: START_OERE, chapter: 0, gmHuman, campaign: campaign ?? campaignById().id,
    heroes: ids.map((id) => {
      const d = HEROES[id];
      return { id, att: d.att, arm: d.arm, spd: d.spd, food: START_FOOD, gear: [] };
    }),
  };
}

/** Baut ein Kapitel aus dem Plan auf. Gleicher Startwert und gleiche Handlungen ergeben dasselbe Spiel. */
export function startChapter(c: Progress, seed: number): Game {
  const def = campaignById(c.campaign), ch = def.chapters[c.chapter];
  const n = c.heroes.length;
  const g: Game = {
    chapter: c.chapter, w: ch.map[0].length, h: ch.map.length,
    fx: [], campaign: def.id, theme: ch.theme ?? c.chapter,
    scriptsDone: [], bossDead: false, gmHuman: !!c.gmHuman, gmActed: [], gmMoved: [],
    gmHand: [], gmDeck: [], gmPile: [], tinte: TINTE_START, gmEile: false, gmZorn: false, slow: false,
    tiles: [], seen: [], heroes: [], monsters: [], chests: [], traps: [], props: [],
    goal: null, goalTaken: false, exit: null,
    turn: 0, tiden: 0, steps: 0, attacked: false, specialUsed: false,
    round: 1, punkte: 0, oere: c.oere, nextUid: 1,
    status: 'play', lostReason: '', rng: seed | 0, log: [],
  };
  const starts: Pos[] = [];
  ch.map.forEach((row, y) => {
    g.tiles.push([]);
    g.seen.push(new Array(g.w).fill(false));
    [...row].forEach((c0, x) => {
      let t = '.';
      if ('#DHX'.includes(c0)) t = c0;
      else if (c0 === 'S') starts.push({ x, y });
      else if (c0 === 'T') g.chests.push({ x, y });
      else if (c0 === 't') g.traps.push({ x, y });
      else if (PROP_CHARS[c0]) g.props.push({ x, y, kind: PROP_CHARS[c0] });
      else if (c0 === 'G') g.goal = { x, y };
      else if (MONSTER_CHARS[c0]) spawn(g, MONSTER_CHARS[c0], x, y, HP_SCALE[n - 1]);
      if (c0 === 'X') g.exit = { x, y };
      g.tiles[y].push(t);
    });
  });
  g.heroes = c.heroes.map((h, i) => {
    const hp = HEROES[h.id].hp + HP_BONUS + (n === 1 ? SOLO_HP : 0);
    return { ...h, gear: [...h.gear], ...starts[i], hp, maxHp: hp, charges: CHARGES, down: false, pfoten: h.gear.includes('katzenohren') };
  });
  log(g, `Kapitel ${c.chapter + 1}: ${ch.title}`);
  g.gmDeck = shuffle(g, def.cards.map((_, i) => i));
  for (let i = 0; i < HAND_START; i++) drawCard(g);
  look(g);
  fire(g, { on: 'start' });
  beginTurn(g);
  return g;
}

/** Nach einem gewonnenen Kapitel: Öre und Fischbrötchen wandern weiter, das nächste Kapitel ist dran. */
export function finishChapter(c: Progress, g: Game): Progress {
  return {
    oere: g.oere,
    chapter: c.chapter + 1,
    campaign: c.campaign,
    gmHuman: c.gmHuman,
    heroes: c.heroes.map((h) => {
      const now = g.heroes.find((o) => o.id === h.id)!;
      return { ...h, food: now.food };
    }),
  };
}

/** Kauf im Hafenkiosk; einmalige Ausrüstung nur einmal je Figur. */
export function buy(c: Progress, heroId: HeroId, item: ShopItem): boolean {
  const h = c.heroes.find((o) => o.id === heroId);
  if (!h || c.oere < item.price || (item.once && h.gear.includes(item.id))) return false;
  c.oere -= item.price;
  if (item.id === 'fischbroetchen') h.food++;
  else h.gear.push(item.id);
  if (item.id === 'friesennerz') h.arm++;
  if (item.id === 'bootshaken') h.att++;
  if (item.id === 'gummistiefel') h.spd++;
  return true;
}
