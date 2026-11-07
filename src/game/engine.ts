import {
  CHAPTERS, EVENTS, HEROES, MONSTERS, MONSTER_CHARS, PUNKTE_LIMIT, SHOP, TIDEN,
  type HeroId, type MonsterId, type ShopItem,
} from './data';

export interface Pos { x: number; y: number }

export interface CampaignHero {
  id: HeroId; att: number; arm: number; spd: number; food: number; gear: string[];
}
export interface Campaign { heroes: CampaignHero[]; oere: number; chapter: number }

export interface Hero extends CampaignHero, Pos {
  hp: number; maxHp: number; charges: number; down: boolean;
}
export interface Monster extends Pos {
  uid: number; kind: MonsterId; hp: number; maxHp: number; stuck: boolean;
}
export interface Game {
  chapter: number; w: number; h: number;
  tiles: string[][]; seen: boolean[][];
  heroes: Hero[]; monsters: Monster[];
  chests: Pos[]; traps: Pos[];
  goal: Pos | null; goalTaken: boolean; exit: Pos | null;
  turn: number; tiden: number; steps: number; attacked: boolean; specialUsed: boolean;
  round: number; punkte: number; oere: number; nextUid: number;
  status: 'play' | 'gm' | 'won' | 'lost'; lostReason: string;
  rng: number; log: string[];
}

const key = (x: number, y: number) => `${x},${y}`;
const walkable = (t: string) => t === '.' || t === 'O' || t === 'X';
const blocksSight = (t: string) => t === '#' || t === 'D' || t === 'H';
export const dist = (a: Pos, b: Pos) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function rand(g: Game): number {
  g.rng = (g.rng + 0x6d2b79f5) | 0;
  let t = g.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const d6 = (g: Game) => 1 + Math.floor(rand(g) * 6);

export function newCampaign(ids: HeroId[]): Campaign {
  return {
    oere: 20, chapter: 0,
    heroes: ids.map((id) => {
      const d = HEROES[id];
      return { id, att: d.att, arm: d.arm, spd: d.spd, food: 1, gear: [] };
    }),
  };
}

const HP_SCALE = [0.65, 1, 1.25, 1.5];

export function startChapter(c: Campaign, seed = Date.now()): Game {
  const ch = CHAPTERS[c.chapter];
  const n = c.heroes.length;
  const g: Game = {
    chapter: c.chapter, w: ch.map[0].length, h: ch.map.length,
    tiles: [], seen: [], heroes: [], monsters: [], chests: [], traps: [],
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
      else if (c0 === 'G') g.goal = { x, y };
      else if (MONSTER_CHARS[c0]) spawn(g, MONSTER_CHARS[c0], x, y, HP_SCALE[n - 1]);
      if (c0 === 'X') g.exit = { x, y };
      g.tiles[y].push(t);
    });
  });
  g.heroes = c.heroes.map((h, i) => {
    const hp = HEROES[h.id].hp + (n === 1 ? 4 : 0);
    return { ...h, gear: [...h.gear], ...starts[i], hp, maxHp: hp, charges: 2, down: false };
  });
  log(g, `Kapitel ${c.chapter + 1}: ${ch.title}`);
  reveal(g);
  beginTurn(g);
  return g;
}

function spawn(g: Game, kind: MonsterId, x: number, y: number, scale: number) {
  const hp = Math.max(1, Math.round(MONSTERS[kind].hp * scale));
  g.monsters.push({ uid: g.nextUid++, kind, x, y, hp, maxHp: hp, stuck: false });
}

export function log(g: Game, msg: string) { g.log.push(msg); }

export const activeHero = (g: Game) => g.heroes[g.turn];
export const living = (g: Game) => g.heroes.filter((h) => !h.down);
export const tile = (g: Game, x: number, y: number) => g.tiles[y]?.[x] ?? '#';
export const monsterAt = (g: Game, x: number, y: number) =>
  g.monsters.find((m) => m.x === x && m.y === y);
export const heroAt = (g: Game, x: number, y: number) =>
  g.heroes.find((h) => !h.down && h.x === x && h.y === y);
export const chestAt = (g: Game, x: number, y: number) =>
  g.chests.find((c) => c.x === x && c.y === y);

/** Aufdecken per Flutfüllung: geschlossene Türen begrenzen die Sicht. */
export function reveal(g: Game) {
  const stack: Pos[] = living(g).map((h) => ({ x: h.x, y: h.y }));
  const done = new Set<string>();
  while (stack.length) {
    const p = stack.pop()!;
    if (done.has(key(p.x, p.y))) continue;
    done.add(key(p.x, p.y));
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (g.seen[p.y + dy]?.[p.x + dx] !== undefined) g.seen[p.y + dy][p.x + dx] = true;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = p.x + dx, y = p.y + dy;
      if (walkable(tile(g, x, y)) && !done.has(key(x, y))) stack.push({ x, y });
    }
  }
}

export const isActive = (g: Game, m: Monster) => g.seen[m.y][m.x];

export function lineOfSight(g: Game, a: Pos, b: Pos): boolean {
  const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  for (let i = 1; i < n; i++) {
    const x = Math.round(a.x + ((b.x - a.x) * i) / n);
    const y = Math.round(a.y + ((b.y - a.y) * i) / n);
    if (blocksSight(tile(g, x, y))) return false;
  }
  return true;
}

export function beginTurn(g: Game) {
  const h = activeHero(g);
  g.tiden = TIDEN + (g.heroes.length === 1 ? 1 : 0);
  g.steps = 0;
  g.attacked = false;
  g.specialUsed = false;
  log(g, `${HEROES[h.id].name} ist dran.`);
}

/** Wege, die die aktive Figur mit ihren Schritten plus Tiden erreicht. */
export function reachable(g: Game): Map<string, Pos[]> {
  const h = activeHero(g);
  const max = g.steps + g.tiden * h.spd;
  const out = new Map<string, Pos[]>();
  const q: { p: Pos; path: Pos[] }[] = [{ p: { x: h.x, y: h.y }, path: [] }];
  const done = new Set([key(h.x, h.y)]);
  while (q.length) {
    const { p, path } = q.shift()!;
    if (path.length) {
      if (!heroAt(g, p.x, p.y)) out.set(key(p.x, p.y), path);
    }
    if (path.length >= max) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = p.x + dx, y = p.y + dy, k = key(x, y);
      if (done.has(k) || !walkable(tile(g, x, y)) || !g.seen[y][x]) continue;
      if (monsterAt(g, x, y) || chestAt(g, x, y)) continue;
      done.add(k);
      q.push({ p: { x, y }, path: [...path, { x, y }] });
    }
  }
  return out;
}

export function moveTo(g: Game, x: number, y: number): boolean {
  const path = reachable(g).get(key(x, y));
  if (!path || g.status !== 'play') return false;
  const h = activeHero(g);
  for (const p of path) {
    if (g.steps === 0) { g.tiden--; g.steps = h.spd; }
    g.steps--;
    h.x = p.x; h.y = p.y;
    const trap = g.traps.findIndex((t) => t.x === p.x && t.y === p.y);
    if (trap >= 0) {
      g.traps.splice(trap, 1);
      log(g, `Falle! ${HEROES[h.id].name} tritt in ein Fangnetz: 2 Schaden und 1 Punkt.`);
      addPunkte(g, 1);
      hurtHero(g, h, 2);
      break;
    }
    if (g.goal && !g.goalTaken && p.x === g.goal.x && p.y === g.goal.y) takeGoal(g);
  }
  reveal(g);
  checkExit(g, h);
  return true;
}

function takeGoal(g: Game) {
  const goal = CHAPTERS[g.chapter].goal;
  g.goalTaken = true;
  if (goal.type === 'bergen') log(g, `${goal.item} gefunden! Jetzt zum Ausgang.`);
}

function checkExit(g: Game, h: Hero) {
  if (g.status === 'play' && g.goalTaken && g.exit && h.x === g.exit.x && h.y === g.exit.y) win(g);
}

function win(g: Game) {
  g.status = 'won';
  g.oere += CHAPTERS[g.chapter].reward;
  log(g, 'Geschafft! Kapitel gewonnen.');
}

function lose(g: Game, why: string) {
  if (g.status === 'won' || g.status === 'lost') return;
  g.status = 'lost';
  g.lostReason = why;
  log(g, why);
}

export function addPunkte(g: Game, n: number) {
  g.punkte += n;
  if (g.punkte >= PUNKTE_LIMIT) lose(g, '8 Punkte in Flensburg: der Lappen ist weg!');
}

function hurtHero(g: Game, h: Hero, dmg: number) {
  h.hp = Math.max(0, h.hp - dmg);
  if (h.hp === 0 && !h.down) {
    h.down = true;
    log(g, `${HEROES[h.id].name} geht zu Boden: 2 Punkte.`);
    addPunkte(g, 2);
    if (!living(g).length) lose(g, 'Alle liegen auf den Planken. Das war nix.');
  }
}

export function canAttack(g: Game, m: Monster): boolean {
  const h = activeHero(g);
  if (g.status !== 'play' || g.tiden < 1) return false;
  if (g.attacked || !isActive(g, m)) return false;
  return dist(h, m) <= HEROES[h.id].range && lineOfSight(g, h, m);
}

export interface Roll { a: number; b: number; total: number; need: number; hit: boolean; crit: boolean }

export function rollAttack(g: Game, att: number, arm: number): Roll {
  const a = d6(g), b = d6(g);
  const total = a + b + att, need = 7 + arm;
  const crit = a === 6 && b === 6;
  return { a, b, total, need, crit, hit: crit || (total >= need && !(a === 1 && b === 1)) };
}

function damageMonster(g: Game, m: Monster, dmg: number) {
  m.hp -= dmg;
  if (m.hp > 0) return;
  const d = MONSTERS[m.kind];
  g.monsters = g.monsters.filter((o) => o !== m);
  g.oere += d.reward;
  log(g, `${d.name} ist erledigt (+${d.reward} Öre).`);
  if (CHAPTERS[g.chapter].goal.type === 'besiegen' && (m.kind === 'klabauter' || m.kind === 'obermeister')) win(g);
}

export function attack(g: Game, m: Monster): Roll | null {
  if (!canAttack(g, m)) return null;
  const h = activeHero(g), def = HEROES[h.id], md = MONSTERS[m.kind];
  g.tiden--; g.attacked = true; g.steps = 0;
  const r = rollAttack(g, h.att, md.arm);
  const dmg = (r.crit ? 2 : 1) * def.dmg;
  log(g, `${def.name} → ${md.name}: 🎲 ${r.a}+${r.b}+${h.att} = ${r.total} (nötig ${r.need}) ${r.hit ? `Treffer, ${dmg} Schaden` : 'daneben'}`);
  if (r.hit) damageMonster(g, m, dmg);
  return r;
}

export function canOpenDoor(g: Game, x: number, y: number) {
  return g.status === 'play' && tile(g, x, y) === 'D' && dist(activeHero(g), { x, y }) === 1;
}

export function openDoor(g: Game, x: number, y: number): boolean {
  if (!canOpenDoor(g, x, y)) return false;
  g.tiles[y][x] = 'O';
  log(g, 'Tür auf.');
  reveal(g);
  return true;
}

export function canOpenChest(g: Game, x: number, y: number) {
  return g.status === 'play' && g.tiden > 0 && !!chestAt(g, x, y) && dist(activeHero(g), { x, y }) === 1;
}

export function openChest(g: Game, x: number, y: number): boolean {
  if (!canOpenChest(g, x, y)) return false;
  g.tiden--; g.steps = 0;
  g.chests = g.chests.filter((c) => !(c.x === x && c.y === y));
  const r = d6(g), h = activeHero(g);
  if (r === 1) {
    log(g, 'Die Truhe ist ein Mimik-Rumfass: 2 Schaden.');
    hurtHero(g, h, 2);
  } else if (r <= 4) {
    const o = 10 + r * 5;
    g.oere += o;
    log(g, `In der Truhe liegen ${o} Öre.`);
  } else {
    h.food++;
    log(g, 'In der Truhe liegt ein erstaunlich frisches Fischbrötchen.');
  }
  return true;
}

export function search(g: Game): boolean {
  if (g.status !== 'play' || g.tiden < 1) return false;
  g.tiden--; g.steps = 0;
  const h = activeHero(g);
  const before = g.traps.length;
  g.traps = g.traps.filter((t) => !(dist(h, t) <= 4 && g.seen[t.y][t.x]));
  let doors = 0;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (g.tiles[y][x] === 'H' && dist(h, { x, y }) <= 4 && g.seen[y][x]) { g.tiles[y][x] = 'D'; doors++; }
  }
  const traps = before - g.traps.length;
  log(g, doors || traps
    ? `Gefunden: ${doors ? `${doors} verborgene Tür(en) ` : ''}${traps ? `${traps} Falle(n) entschärft` : ''}`.trim()
    : 'Nichts gefunden. Nur alte Fischgräten.');
  return true;
}

export function eat(g: Game): boolean {
  const h = activeHero(g);
  if (g.status !== 'play' || g.tiden < 1 || h.food < 1 || h.hp >= h.maxHp) return false;
  g.tiden--; g.steps = 0; h.food--;
  h.hp = Math.min(h.maxHp, h.hp + 4);
  log(g, `${HEROES[h.id].name} isst ein Fischbrötchen (+4).`);
  return true;
}

export function specialNeedsTarget(g: Game) {
  const id = activeHero(g).id;
  return id === 'frauke' || id === 'joern';
}

export function canSpecialOn(g: Game, m: Monster) {
  const h = activeHero(g);
  if (!isActive(g, m)) return false;
  const r = h.id === 'frauke' ? 3 : 1;
  return dist(h, m) <= r && lineOfSight(g, h, m);
}

export function canSpecial(g: Game) {
  const h = activeHero(g);
  return g.status === 'play' && g.tiden > 0 && h.charges > 0 && !g.specialUsed;
}

export function special(g: Game, target?: Monster): boolean {
  if (!canSpecial(g)) return false;
  const h = activeHero(g), def = HEROES[h.id];
  if (specialNeedsTarget(g) && (!target || !canSpecialOn(g, target))) return false;
  if (h.id === 'hinnerk') {
    const near = g.heroes.filter((o) => dist(o, h) <= 1 && o.hp < o.maxHp).sort((a, b) => a.hp - b.hp);
    if (!near.length) return false;
    const o = near[0];
    o.hp = Math.min(o.maxHp, o.hp + 4);
    o.down = false;
    log(g, `Lütt un Lütt für ${HEROES[o.id].name} (+4).`);
  }
  if (h.id === 'maren') {
    const hit = g.monsters.filter((m) => isActive(g, m) && dist(h, m) <= 3 && lineOfSight(g, h, m));
    if (!hit.length) return false;
    log(g, `Schwarm über der Förde trifft ${hit.length} Gegner.`);
    hit.forEach((m) => damageMonster(g, m, 1));
  }
  if (h.id === 'frauke' && target) {
    log(g, `FlensNetz fesselt ${MONSTERS[target.kind].name}.`);
    target.stuck = true;
    damageMonster(g, target, 1);
  }
  if (h.id === 'joern' && target) {
    log(g, `Dicker Schlüssel trifft ${MONSTERS[target.kind].name}: 4 Schaden.`);
    damageMonster(g, target, 4);
  }
  g.tiden--; g.steps = 0; h.charges--; g.specialUsed = true;
  log(g, `${def.special}: noch ${h.charges}×.`);
  return true;
}

/** Nächste lebende Figur; nach der letzten ist der Spielleiter dran. */
export function endTurn(g: Game) {
  if (g.status !== 'play') return;
  for (let i = g.turn + 1; i < g.heroes.length; i++) {
    if (!g.heroes[i].down) { g.turn = i; beginTurn(g); return; }
  }
  g.status = 'gm';
}

function pathToward(g: Game, m: Monster, targets: Hero[], range: number): Pos[] | null {
  const inReach = (p: Pos) => targets.some((h) => dist(p, h) <= range && lineOfSight(g, p, h));
  if (inReach(m)) return [];
  const q: { p: Pos; path: Pos[] }[] = [{ p: { x: m.x, y: m.y }, path: [] }];
  const done = new Set([key(m.x, m.y)]);
  while (q.length) {
    const { p, path } = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = p.x + dx, y = p.y + dy, k = key(x, y);
      if (done.has(k) || !walkable(tile(g, x, y))) continue;
      if (monsterAt(g, x, y) || heroAt(g, x, y) || chestAt(g, x, y)) continue;
      done.add(k);
      const next = [...path, { x, y }];
      if (inReach({ x, y })) return next;
      q.push({ p: { x, y }, path: next });
    }
  }
  return null;
}

function monsterAct(g: Game, m: Monster) {
  const d = MONSTERS[m.kind];
  if (m.stuck) { m.stuck = false; log(g, `${d.name} zappelt im Netz.`); return; }
  const path = pathToward(g, m, living(g), d.range);
  if (path === null) return;
  const walk = path.slice(0, d.spd);
  if (walk.length) { m.x = walk[walk.length - 1].x; m.y = walk[walk.length - 1].y; }
  const t = living(g).filter((h) => dist(m, h) <= d.range && lineOfSight(g, m, h))
    .sort((a, b) => a.hp - b.hp)[0];
  if (!t) return;
  const r = rollAttack(g, d.att, t.arm);
  log(g, `${d.name} → ${HEROES[t.id].name}: 🎲 ${r.a}+${r.b}+${d.att} = ${r.total} (nötig ${r.need}) ${r.hit ? `Treffer, ${d.dmg} Schaden` : 'daneben'}`);
  if (!r.hit) return;
  hurtHero(g, t, d.dmg);
  if (m.kind === 'knoellchen' && d6(g) === 6) {
    log(g, 'Der Kobold klebt ein Knöllchen an: 1 Punkt.');
    addPunkte(g, 1);
  }
}

function playEvent(g: Game) {
  const e = EVENTS[Math.floor(rand(g) * EVENTS.length)];
  log(g, `📜 ${e.name}: ${e.text}`);
  if (e.id === 'moin') living(g).forEach((h) => { h.hp = Math.min(h.maxHp, h.hp + 1); });
  if (e.id === 'schiet') living(g).filter((h) => !h.gear.includes('friesennerz')).forEach((h) => { if (h.hp > 1) h.hp--; });
  if (e.id === 'klau') { const h = living(g).find((o) => o.food > 0); if (h) h.food--; }
  if (e.id === 'knoellchen') addPunkte(g, 1);
  if (e.id === 'verstaerkung') {
    const spots: Pos[] = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (g.seen[y][x] && walkable(g.tiles[y][x]) && !monsterAt(g, x, y) && !heroAt(g, x, y) && !chestAt(g, x, y)
        && Math.min(...living(g).map((h) => dist(h, { x, y }))) >= 4) spots.push({ x, y });
    }
    if (spots.length) {
      const s = spots[Math.floor(rand(g) * spots.length)];
      spawn(g, 'knoellchen', s.x, s.y, 1);
    }
  }
}

/** Spielleiter-Zug als Generator, damit die Oberfläche Schritt für Schritt zeichnen kann. */
export function* gmTurn(g: Game): Generator<void> {
  if (g.status !== 'gm') return;
  log(g, '— Der Oberpunktezähler ist dran —');
  for (const m of [...g.monsters]) {
    if (!isActive(g, m) || !g.monsters.includes(m)) continue;
    monsterAct(g, m);
    reveal(g);
    yield;
    if (g.status !== 'gm') return;
  }
  playEvent(g);
  if (g.round % 3 === 0) {
    log(g, 'Der Stempel fällt: 1 Punkt in Flensburg.');
    addPunkte(g, 1);
  }
  yield;
  if (g.status !== 'gm') return;
  g.round++;
  g.status = 'play';
  g.heroes.forEach((h) => { if (h.down && h.hp > 0) h.down = false; });
  g.turn = g.heroes.findIndex((h) => !h.down);
  beginTurn(g);
}

export function finishChapter(c: Campaign, g: Game): Campaign {
  return {
    oere: g.oere,
    chapter: c.chapter + 1,
    heroes: c.heroes.map((h) => {
      const now = g.heroes.find((o) => o.id === h.id)!;
      return { ...h, food: now.food };
    }),
  };
}

export function buy(c: Campaign, heroId: HeroId, item: ShopItem): boolean {
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

export { SHOP };
