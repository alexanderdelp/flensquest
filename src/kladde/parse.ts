import { GM_EFFECTS, GOAL_SPRITES, MONSTERS, THEME_COUNT, type GmCard, type GmEffect, type GoalSprite, type MonsterId } from '../content';
import type { CampaignDef, Chapter, Command, Goal, Pos, Script, Trigger } from '../core';
import { Report } from './diagnostics';
import { joined, type Node } from './lines';

/*
 Zweite Stufe: Einrückungsbaum in eine Kampagne übersetzen. Die Sprache ist zeilenbasiert und deutsch:
 Blöcke `kampagne`, `spielleiter`, `kapitel`; darin `schlüssel: wert`, `plan:` und Skripte `wenn …:`.
 Zeilennummern werden für die Prüfungen mitgeführt.
*/

export interface Where {
  campaign: number;
  chapters: { line: number; map: number; goal: number; scripts: { line: number; commands: number[] }[] }[];
}

/** Kennungen ohne Umlaute: „möwe“ und „moewe“ meinen dasselbe. */
const ascii = (s: string) => s.trim().toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
const monster = (s: string | undefined): MonsterId | null => (s && ascii(s) in MONSTERS ? ascii(s) as MonsterId : null);
const ID = /^[a-z0-9][a-z0-9-]*$/;

/** „schlüssel: wert“ zerlegen; Groß/Klein und ue/ü sind beim Schlüssel egal. */
function keyValue(text: string): [string, string] | null {
  const i = text.indexOf(':');
  if (i < 1) return null;
  return [norm(text.slice(0, i)), text.slice(i + 1).trim()];
}

const norm = (s: string) => s.trim().toLowerCase().replace(/ue/g, 'ü').replace(/oe/g, 'ö').replace(/ae/g, 'ä');

function coord(s: string): Pos | null {
  const m = s.trim().match(/^(\d+)\s*,\s*(\d+)$/);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
}

function number(s: string): number | null {
  const m = s.trim().match(/^[+-]?\d+$/);
  return m ? Number(s) : null;
}

const CAMPAIGN_KEYS: Record<string, keyof CampaignDef> = {
  titel: 'title', bild: 'image', klappentext: 'blurb', einleitung: 'intro', epilog: 'epilog', verloren: 'lostText', nochmal: 'retryText',
};

const CHAPTER_TEXT: Record<string, keyof Chapter> = {
  ort: 'place', einleitung: 'intro', lage: 'situation', abschluss: 'outro', überleitung: 'bridge', auftrag: 'goalText',
};

function parseGoal(value: string, line: number, r: Report): Goal | null {
  const words = value.split(/\s+/).filter(Boolean);
  const kind = norm(words.shift() ?? '');
  const take = (key: string) => {
    const i = words.findIndex((w) => norm(w) === key);
    if (i < 0) return undefined;
    const rest = words.splice(i);
    rest.shift();
    const stop = rest.findIndex((w) => ['bild', 'endgegner', 'gegenstand'].includes(norm(w)));
    const mine = stop < 0 ? rest : rest.slice(0, stop);
    words.push(...(stop < 0 ? [] : rest.slice(stop)));
    return mine;
  };
  const spriteWords = take('bild');
  const sprite = spriteWords?.[0] ? ascii(spriteWords[0]) as GoalSprite : undefined;
  if (sprite && !GOAL_SPRITES.includes(sprite)) r.error(line, `Unbekanntes Bild „${sprite}“. Erlaubt: ${GOAL_SPRITES.join(', ')}.`);
  const bossWords = take('endgegner');
  const itemWords = take('gegenstand');
  const boss = bossWords?.[0] !== undefined ? monster(bossWords[0]) : undefined;
  if (boss === null) { r.error(line, `Unbekannter Endgegner „${bossWords![0]}“.`); return null; }
  const item = (ws?: string[]) => (ws && ws.length >= 2 ? { item: ws.slice(0, -1).join(' '), icon: ws[ws.length - 1] } : null);
  if (kind === 'bergen') {
    const it = item(words);
    if (!it) { r.error(line, 'Ziel „bergen“ braucht Namen und Symbol, etwa: ziel: bergen FlensLogbuch 📖'); return null; }
    return { type: 'bergen', ...it, ...(sprite ? { sprite } : {}), ...(boss ? { boss } : {}) };
  }
  if (kind === 'besiegen') {
    const b = monster(words[0]);
    if (!b) { r.error(line, `Ziel „besiegen“ braucht einen bekannten Gegner, nicht „${words[0] ?? ''}“.`); return null; }
    if (words.length > 1) r.error(line, `Unerwartet nach dem Endgegner: „${words.slice(1).join(' ')}“.`);
    const it = itemWords ? item(itemWords) : null;
    if (itemWords && !it) r.error(line, 'Nach „gegenstand“ folgen Name und Symbol.');
    return { type: 'besiegen', boss: b, ...(it ?? {}), ...(sprite ? { sprite } : {}) };
  }
  r.error(line, 'Ziel beginnt mit „bergen“ oder „besiegen“.');
  return null;
}

function parseTrigger(text: string, line: number, r: Report): Trigger | null {
  const t = text.replace(/:$/, '').trim();
  const words = t.split(/\s+/);
  const w0 = norm(words[0] ?? '');
  if (t === 'start') return { on: 'start' };
  if (norm(t) === 'ziel gefunden') return { on: 'ziel' };
  if (w0 === 'runde') {
    const n = number(words[1] ?? '');
    if (n === null || n < 1 || words.length !== 2) { r.error(line, 'So geht es: wenn runde 5:'); return null; }
    return { on: 'runde', n };
  }
  if (w0 === 'tür' || w0 === 'tur') {
    if (norm(words[words.length - 1]) !== 'aufgeht') { r.error(line, 'So geht es: wenn tür 16,6 aufgeht:'); return null; }
    const at = t.slice(t.indexOf(' ') + 1, t.lastIndexOf(' ')).split(/\s+oder\s+/i).map(coord);
    if (at.some((p) => !p)) { r.error(line, 'Türen als x,y angeben, mehrere mit „oder“: wenn tür 3,4 oder 5,6 aufgeht:'); return null; }
    return { on: 'tuer', at: at as Pos[] };
  }
  if (words.length === 2 && norm(words[1]) === 'auftaucht') {
    const kind = monster(words[0]);
    if (!kind) { r.error(line, `Unbekannter Gegner „${words[0]}“.`); return null; }
    return { on: 'sieht', kind };
  }
  if (words.length === 2 && norm(words[1]) === 'halb') {
    if (w0 === 'endgegner') return { on: 'halb' };
    const kind = monster(words[0]);
    if (!kind) { r.error(line, `Unbekannter Gegner „${words[0]}“.`); return null; }
    return { on: 'halb', kind };
  }
  r.error(line, `Unbekannter Auslöser „${t}“. Möglich: start, tür x,y aufgeht, <gegner> auftaucht, endgegner halb, ziel gefunden, runde n.`);
  return null;
}

function parseCommand(n: Node, r: Report): Command | null {
  const [head, ...rest] = n.text.split(/\s+/);
  const verb = norm(head);
  const arg = n.text.slice(head.length).trim();
  if (verb === 'zeige') {
    const full = joined(arg, n);
    const i = full.indexOf(':');
    if (i < 1) { r.error(n.line, 'So geht es: zeige Überschrift: Text'); return null; }
    return { do: 'zeige', title: full.slice(0, i).trim(), text: full.slice(i + 1).trim() };
  }
  if (n.children.length) r.error(n.children[0].line, `„${head}“ hat keine Fortsetzungszeilen.`);
  if (verb === 'rufe') {
    const at = coord(rest.slice(1).join(''));
    const kind = monster(rest[0]);
    if (!kind) { r.error(n.line, `Unbekannter Gegner „${rest[0] ?? ''}“.`); return null; }
    if (!at) { r.error(n.line, 'So geht es: rufe ratte 17,6'); return null; }
    return { do: 'rufe', kind, at };
  }
  if (verb === 'öre' || verb === 'punkte' || verb === 'heile') {
    const v = number(arg);
    if (v === null) { r.error(n.line, `„${head}“ braucht eine Zahl, etwa: ${head} +5`); return null; }
    if (verb === 'heile' && v < 1) { r.error(n.line, 'heile braucht eine positive Zahl.'); return null; }
    return verb === 'öre' ? { do: 'oere', n: v } : verb === 'punkte' ? { do: 'punkte', n: v } : { do: 'heile', n: v };
  }
  r.error(n.line, `Unbekannter Befehl „${head}“. Möglich: zeige, rufe, öre, punkte, heile.`);
  return null;
}

function parseCard(value: string, line: number, r: Report): GmCard[] {
  const m = value.match(/^(?:(\d+)\s*[×x]\s+)?([a-zäöü]+)\s*:\s*(.+)$/i);
  if (!m) { r.error(line, 'So geht es: karte eile: Name | Text   oder   karte 2× eile: Name | Text'); return []; }
  const count = Number(m[1] ?? 1), id = ascii(m[2]) as GmEffect;
  const [name, ...text] = m[3].split('|');
  if (!GM_EFFECTS.includes(id)) { r.error(line, `Unbekannte Kartenwirkung „${m[2]}“. Möglich: ${GM_EFFECTS.join(', ')}.`); return []; }
  if (!text.length || !name.trim()) { r.error(line, 'Karte braucht Name und Text, getrennt durch |'); return []; }
  if (count < 1 || count > 9) { r.error(line, 'Anzahl einer Karte zwischen 1 und 9.'); return []; }
  return Array.from({ length: count }, () => ({ id, name: name.trim(), text: text.join('|').trim() }));
}

function parseChapter(n: Node, r: Report, where: Where['chapters'][number]): Chapter | null {
  const title = n.text.slice('kapitel'.length).trim();
  if (!title) r.error(n.line, 'Kapitel braucht einen Titel: kapitel Moin an der Hafenspitze');
  const ch: Partial<Chapter> & { scripts: Script[] } = { title, scripts: [] };
  for (const c of n.children) {
    if (/^wenn\s/i.test(c.text)) {
      if (!c.text.endsWith(':')) r.error(c.line, 'Ein Skript endet mit Doppelpunkt: wenn start:');
      const when = parseTrigger(c.text.slice(5), c.line, r);
      const commands = c.children.map((k) => ({ cmd: parseCommand(k, r), line: k.line }));
      if (!c.children.length) r.error(c.line, 'Skript ohne Befehle.');
      if (when) {
        ch.scripts.push({ when, then: commands.filter((k) => k.cmd).map((k) => k.cmd!) });
        where.scripts.push({ line: c.line, commands: commands.filter((k) => k.cmd).map((k) => k.line) });
      }
      continue;
    }
    const kv = keyValue(c.text);
    if (!kv) { r.error(c.line, `Unverständlich: „${c.text}“`); continue; }
    const [key, value] = kv;
    if (key === 'plan') {
      if (value) r.error(c.line, 'Der Plan beginnt in der Zeile nach „plan:“.');
      ch.map = c.children.map((row) => row.text);
      where.map = c.line;
      c.children.forEach((row) => { if (row.children.length) r.error(row.children[0].line, 'Planzeilen gleich weit einrücken.'); });
    } else if (key === 'ziel') {
      where.goal = c.line;
      const goal = parseGoal(joined(value, c), c.line, r);
      if (goal) ch.goal = goal;
    } else if (key === 'belohnung' || key === 'thema') {
      const v = number(value);
      if (v === null || v < 0) { r.error(c.line, `${key} braucht eine Zahl.`); continue; }
      if (key === 'thema' && v >= THEME_COUNT) { r.error(c.line, `Thema von 0 bis ${THEME_COUNT - 1}.`); continue; }
      if (key === 'belohnung') ch.reward = v; else ch.theme = v;
    } else if (key in CHAPTER_TEXT) {
      (ch as Record<string, unknown>)[CHAPTER_TEXT[key]] = joined(value, c);
    } else {
      r.error(c.line, `Unbekannter Eintrag „${key}“ im Kapitel.`);
    }
  }
  const need: [keyof Chapter, string][] = [['place', 'ort'], ['intro', 'einleitung'], ['outro', 'abschluss'], ['goalText', 'auftrag'], ['goal', 'ziel'], ['reward', 'belohnung'], ['map', 'plan']];
  for (const [k, word] of need) if (ch[k] === undefined) r.error(n.line, `Im Kapitel „${title}“ fehlt „${word}:“.`);
  return r.errors.length ? null : ch as Chapter;
}

/** Übersetzt den Baum einer Kladde-Datei. Gibt null zurück, wenn Fehler auftraten. */
export function parseTree(nodes: Node[], r: Report): { def: CampaignDef; where: Where } | null {
  const def: Partial<CampaignDef> & { chapters: Chapter[]; cards: GmCard[]; idle: string[] } = { chapters: [], cards: [], idle: [] };
  const where: Where = { campaign: 0, chapters: [] };
  for (const n of nodes) {
    if (n.indent > 0) { r.error(n.line, 'Blöcke (kampagne, spielleiter, kapitel) beginnen ganz links.'); continue; }
    const [head, ...rest] = n.text.split(/\s+/);
    const kind = norm(head);
    if (kind === 'kampagne') {
      if (def.id) { r.error(n.line, 'Nur ein Block „kampagne“ je Datei.'); continue; }
      const id = rest.join(' ');
      if (!ID.test(id)) r.error(n.line, 'Kennung der Kampagne in Kleinbuchstaben, Ziffern und Bindestrich: kampagne meine-kampagne');
      def.id = id;
      where.campaign = n.line;
      for (const c of n.children) {
        const kv = keyValue(c.text);
        if (!kv || !(kv[0] in CAMPAIGN_KEYS)) { r.error(c.line, `Unbekannter Eintrag „${kv?.[0] ?? c.text}“. Möglich: ${Object.keys(CAMPAIGN_KEYS).join(', ')}.`); continue; }
        (def as Record<string, unknown>)[CAMPAIGN_KEYS[kv[0]]] = joined(kv[1], c);
      }
    } else if (kind === 'spielleiter') {
      for (const c of n.children) {
        const [k, ...v] = c.text.split(/\s+/);
        if (norm(k) === 'karte') def.cards.push(...parseCard(joined(v.join(' '), c), c.line, r));
        else if (norm(k) === 'pause:') def.idle.push(joined(v.join(' '), c));
        else r.error(c.line, `Unbekannter Eintrag „${k}“. Möglich: karte, pause.`);
      }
    } else if (kind === 'kapitel') {
      const w = { line: n.line, map: n.line, goal: n.line, scripts: [] as Where['chapters'][number]['scripts'] };
      const ch = parseChapter(n, r, w);
      if (ch) { def.chapters.push(ch); where.chapters.push(w); }
    } else {
      r.error(n.line, `Unbekannter Block „${head}“. Möglich: kampagne, spielleiter, kapitel.`);
    }
  }
  if (!def.id) r.error(1, 'Es fehlt der Block „kampagne <kennung>“.');
  if (!def.title) r.error(where.campaign || 1, 'Die Kampagne braucht „titel:“.');
  if (!def.chapters.length && !r.errors.length) r.error(where.campaign || 1, 'Die Kampagne braucht mindestens ein Kapitel.');
  def.blurb ??= '';
  return r.errors.length ? null : { def: def as CampaignDef, where };
}
