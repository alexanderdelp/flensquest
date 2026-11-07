import { MAP_CHARS, MONSTER_CHARS, PROP_CHARS } from '../content';
import type { CampaignDef, Chapter, Pos } from '../core';
import type { Report } from './diagnostics';
import type { Where } from './parse';

/*
 Dritte Stufe: inhaltliche Prüfung einer übersetzten Kampagne. Alles, was beim Spielen schiefgehen
 würde, soll hier mit Zeilennummer auffallen: kaputte Pläne, unerreichbare Ziele, Skripte ins Leere.
*/

const MIN_STARTS = 4;
const known = (c: string) => c in MAP_CHARS || c in MONSTER_CHARS;

function findAll(map: string[], ch: string): Pos[] {
  const out: Pos[] = [];
  map.forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) out.push({ x, y }); }));
  return out;
}

/** Felder, die von den Startfeldern aus erreichbar sind, wenn alle Türen offen und Verstecke gefunden sind. */
function reachableArea(map: string[]): Set<string> {
  const open = new Set<string>();
  const stack = findAll(map, 'S');
  while (stack.length) {
    const p = stack.pop()!;
    const k = `${p.x},${p.y}`;
    const c = map[p.y]?.[p.x];
    if (open.has(k) || c === undefined || c === '#' || c in PROP_CHARS) continue;
    open.add(k);
    stack.push({ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 });
  }
  return open;
}

function checkChapter(ch: Chapter, w: Where['chapters'][number], r: Report) {
  const map = ch.map, line = w.map;
  if (!map.length) { r.error(line, 'Der Plan ist leer.'); return; }
  const width = map[0].length;
  map.forEach((row, y) => {
    if (row.length !== width) r.error(line + y + 1, `Planzeile ${y + 1} ist ${row.length} Zeichen breit, die erste ${width}.`);
    [...row].forEach((c, x) => { if (!known(c)) r.error(line + y + 1, `Unbekanntes Zeichen „${c}“ bei ${x},${y}.`); });
  });
  if (r.errors.length) return;
  const starts = findAll(map, 'S'), goals = findAll(map, 'G'), exits = findAll(map, 'X');
  if (starts.length < MIN_STARTS) r.error(line, `Der Plan braucht mindestens ${MIN_STARTS} Startfelder S, hat ${starts.length}.`);
  if (goals.length > 1) r.error(line, 'Höchstens ein Ziel-Gegenstand G je Plan.');
  if (exits.length > 1) r.error(line, 'Höchstens ein Ausgang X je Plan.');
  const at = (p: Pos) => map[p.y]?.[p.x];
  const inside = (p: Pos) => p.y >= 0 && p.y < map.length && p.x >= 0 && p.x < width;
  const spawned = new Set(ch.scripts.flatMap((s) => s.then.flatMap((c) => (c.do === 'rufe' ? [c.kind] : []))));
  const onMap = new Set([...map.join('')].filter((c) => c in MONSTER_CHARS).map((c) => MONSTER_CHARS[c]));
  const goal = ch.goal;
  if (goal.type === 'bergen' && !goals.length) r.error(w.goal, 'Ziel „bergen“ braucht ein G im Plan.');
  if (goal.type === 'bergen' && !exits.length) r.error(w.goal, 'Ziel „bergen“ braucht einen Ausgang X im Plan.');
  if (goal.type === 'besiegen' && goal.item && !goals.length) r.error(w.goal, 'Mit „gegenstand“ braucht der Plan ein G.');
  if (goal.boss && !onMap.has(goal.boss) && !spawned.has(goal.boss)) {
    r.error(w.goal, `Endgegner „${goal.boss}“ steht weder im Plan noch wird er gerufen.`);
  }
  const area = reachableArea(map);
  const reach = (p: Pos, what: string, l: number) => { if (!area.has(`${p.x},${p.y}`)) r.error(l, `${what} bei ${p.x},${p.y} ist von den Startfeldern aus nicht erreichbar.`); };
  goals.forEach((p) => reach(p, 'Der Ziel-Gegenstand', w.goal));
  if (goal.type === 'bergen') exits.forEach((p) => reach(p, 'Der Ausgang', w.goal));
  if (goal.boss) {
    const ch0 = Object.entries(MONSTER_CHARS).find(([, id]) => id === goal.boss)?.[0];
    if (ch0) findAll(map, ch0).forEach((p) => reach(p, 'Der Endgegner', w.goal));
  }
  ch.scripts.forEach((s, i) => {
    const sl = w.scripts[i]?.line ?? w.line;
    if (s.when.on === 'tuer') {
      for (const p of s.when.at) {
        if (!inside(p)) r.error(sl, `Tür ${p.x},${p.y} liegt außerhalb des Plans.`);
        else if (at(p) !== 'D' && at(p) !== 'H') r.error(sl, `Bei ${p.x},${p.y} ist keine Tür (D oder H), sondern „${at(p)}“.`);
      }
    }
    if (s.when.on === 'halb' && !s.when.kind && !goal.boss) r.error(sl, '„endgegner halb“ braucht ein Ziel mit Endgegner.');
    if (s.when.on === 'sieht' && !onMap.has(s.when.kind) && !spawned.has(s.when.kind)) {
      r.warn(sl, `„${s.when.kind}“ taucht in diesem Kapitel nie auf.`);
    }
    s.then.forEach((c, k) => {
      const cl = w.scripts[i]?.commands[k] ?? sl;
      if (c.do === 'rufe' && !inside(c.at)) r.error(cl, `Ruf-Feld ${c.at.x},${c.at.y} liegt außerhalb des Plans.`);
      else if (c.do === 'rufe' && at(c.at) === '#') r.warn(cl, `Ruf-Feld ${c.at.x},${c.at.y} ist eine Wand; der Gegner erscheint im nächsten freien Feld.`);
    });
  });
}

export function checkCampaign(def: CampaignDef, where: Where, r: Report) {
  def.chapters.forEach((ch, i) => checkChapter(ch, where.chapters[i], r));
  if (!def.cards.length) r.warn(where.campaign, 'Keine Spielleiterkarten: Der Spielleiter spielt nur mit seinen Gegnern.');
}
