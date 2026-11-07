import { registerBuiltins } from '../../src/campaigns';
import type { HeroId, MonsterId } from '../../src/content';
import { newProgress, registerCampaign, startChapter, type Game, type Monster } from '../../src/core';
import { rand } from '../../src/core/rng';
import { compile } from '../../src/kladde';
import source from './pruefstand.kladde?raw';

/*
 Gemeinsame Testhilfen: der Prüfstand (kleine Kladde-Kampagne), Spielaufbau und erzwungene Würfel.
 Die mitgelieferten Kampagnen sind ebenfalls eingetragen.
*/

const compiled = compile(source);
if (!compiled.campaign) throw new Error(`Prüfstand: ${JSON.stringify(compiled.errors)}`);
export const PRUEFSTAND = compiled.campaign;
registerBuiltins();
registerCampaign(PRUEFSTAND);

export const ALL: HeroId[] = ['frauke', 'joern', 'maren', 'hinnerk'];

/** Startet ein Kapitel; Standard: Prüfstand, Kapitel 1, Jörn und Maren. */
export function play(opts: { heroes?: HeroId[]; chapter?: number; seed?: number; campaign?: string; gm?: boolean } = {}): Game {
  const p = newProgress(opts.heroes ?? ['joern', 'maren'], !!opts.gm, opts.campaign ?? 'pruefstand');
  p.chapter = opts.chapter ?? 0;
  const g = startChapter(p, opts.seed ?? 1);
  g.fx = [];
  return g;
}

/** Alles aufdecken. */
export function seeAll(g: Game) { g.seen = g.seen.map((r) => r.map(() => true)); }

/** Gegner an ein Feld setzen (vorhandenen wiederverwenden oder neu anlegen). */
export function foe(g: Game, kind: MonsterId, x: number, y: number, hp?: number): Monster {
  const m: Monster = { uid: g.nextUid++, kind, x, y, hp: hp ?? 3, maxHp: hp ?? 3, stuck: false };
  g.monsters.push(m);
  g.seen[y][x] = true;
  return m;
}

/** Nur diese Gegner auf dem Brett. */
export function clearFoes(g: Game) { g.monsters = []; }

/**
 * Erzwingt die nächsten Würfelaugen: sucht einen Zufallszustand, der genau diese W6-Folge liefert.
 * So prüfen Tests Treffer, Doppelsechs oder Truhenergebnisse ohne Glück.
 */
export function forceDice(g: Game, ...faces: number[]) {
  for (let seed = 0; seed < 5_000_000; seed++) {
    const probe = { rng: seed };
    if (faces.every((f) => 1 + Math.floor(rand(probe) * 6) === f)) { g.rng = seed; return; }
  }
  throw new Error(`Keine Würfelfolge ${faces.join(',')} gefunden`);
}

/** Ereignisse eines Typs aus g.fx. */
export const fxOf = <T extends Game['fx'][number]['t']>(g: Game, t: T) =>
  g.fx.filter((f): f is Extract<Game['fx'][number], { t: T }> => f.t === t);
