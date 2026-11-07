import { reveal } from './map';
import { addPunkte } from './outcome';
import { chapterOf, hkey, isActive, living, log } from './state';
import type { Chapter, Command, Game, Monster, Pos, Trigger } from './types';
import { placeSpawn } from './units';

/*
 Skripte der Kapitel: Auslöser und Befehle aus der Kladde. Jedes Skript läuft einmal je Kapitel.
 Die Regeln melden Ereignisse hierher; was daraufhin passiert, steht ganz in den Kampagnendaten.
*/

export type Event =
  | { on: 'start' }
  | { on: 'tuer'; at: Pos }
  | { on: 'sieht'; kind: Monster['kind'] }
  | { on: 'halb'; kind: Monster['kind'] }
  | { on: 'ziel' }
  | { on: 'runde'; n: number };

function matches(t: Trigger, e: Event, g: Game): boolean {
  if (t.on !== e.on) return false;
  switch (t.on) {
    case 'tuer': return e.on === 'tuer' && t.at.some((p) => p.x === e.at.x && p.y === e.at.y);
    case 'sieht': return e.on === 'sieht' && t.kind === e.kind;
    case 'halb': return e.on === 'halb' && (t.kind ?? chapterOf(g).goal.boss) === e.kind;
    case 'runde': return e.on === 'runde' && t.n === e.n;
    default: return true;
  }
}

function run(g: Game, c: Command) {
  switch (c.do) {
    case 'zeige':
      log(g, `📍 ${c.title}`);
      g.fx.push({ t: 'note', title: c.title, text: c.text });
      break;
    case 'rufe': placeSpawn(g, c.kind, c.at); break;
    case 'oere':
      g.oere = Math.max(0, g.oere + c.n);
      log(g, `${c.n > 0 ? '+' : ''}${c.n} Öre.`);
      break;
    case 'punkte': addPunkte(g, c.n, c.n > 0 ? 'Vom Amt' : 'Gestrichen'); break;
    case 'heile':
      living(g).forEach((h) => {
        const n = Math.min(c.n, h.maxHp - h.hp);
        if (n > 0) { h.hp += n; g.fx.push({ t: 'heal', who: hkey(h), n }); }
      });
      break;
    default:
  }
}

/** Meldet ein Ereignis; passende, noch nicht gelaufene Skripte laufen der Reihe nach. */
export function fire(g: Game, e: Event) {
  chapterOf(g).scripts.forEach((s, i) => {
    if (g.scriptsDone.includes(i) || !matches(s.when, e, g)) return;
    g.scriptsDone.push(i);
    s.then.forEach((c) => run(g, c));
  });
}

/** Gegner, die gerade ins Blickfeld geraten, lösen ihr „sieht“ aus. */
export function noticeFoes(g: Game) {
  for (const m of [...g.monsters]) if (isActive(g, m)) fire(g, { on: 'sieht', kind: m.kind });
}

/** Text, den ein Kapitel zum ersten Auftauchen eines Gegners zeigt, etwa für Tooltips. */
export function foeNote(ch: Chapter, kind: Monster['kind']): string | undefined {
  const s = ch.scripts.find((o) => o.when.on === 'sieht' && o.when.kind === kind);
  const c = s?.then.find((o) => o.do === 'zeige');
  return c?.do === 'zeige' ? c.text : undefined;
}

/** Aufdecken und neu gesehene Gegner melden; nach jeder Bewegung und jeder Tür. */
export function look(g: Game) {
  reveal(g);
  if (g.heroes.length) noticeFoes(g);
}
