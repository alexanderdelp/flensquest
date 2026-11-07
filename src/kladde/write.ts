import { MONSTERS } from '../content';
import type { CampaignDef, Chapter, Command, Goal, Script, Trigger } from '../core';

/*
 Rückweg: Kampagne als Kladde-Text. Dient zum Weitergeben eingebauter Kampagnen als Vorlage
 und garantiert per Test, dass Übersetzen und Zurückschreiben verlustfrei sind.
*/

const WIDTH = 100;

/** Langen Text an Leerzeichen umbrechen; Fortsetzungen werden tiefer eingerückt und nie zum Kommentar. */
function wrap(first: string, text: string, indent: string): string[] {
  const lines: string[] = [];
  let cur = first, fresh = true;
  for (const w of text.split(' ')) {
    if (!fresh && cur.length + 1 + w.length > WIDTH && !w.startsWith('--')) {
      lines.push(cur);
      cur = `${indent}  ${w}`;
    } else cur += (fresh ? '' : ' ') + w;
    fresh = false;
  }
  lines.push(cur);
  return lines;
}

const field = (indent: string, key: string, value: string | number | undefined) =>
  (value === undefined || value === '' ? [] : wrap(`${indent}${key}: `, String(value), indent));

function goalText(g: Goal): string {
  const sprite = g.sprite ? ` bild ${g.sprite}` : '';
  if (g.type === 'bergen') return `bergen ${g.item} ${g.icon}${sprite}${g.boss ? ` endgegner ${g.boss}` : ''}`;
  return `besiegen ${g.boss}${g.item ? ` gegenstand ${g.item} ${g.icon}` : ''}${sprite}`;
}

function triggerText(t: Trigger): string {
  switch (t.on) {
    case 'start': return 'start';
    case 'tuer': return `tür ${t.at.map((p) => `${p.x},${p.y}`).join(' oder ')} aufgeht`;
    case 'sieht': return `${t.kind} auftaucht`;
    case 'halb': return `${t.kind ?? 'endgegner'} halb`;
    case 'ziel': return 'ziel gefunden';
    case 'runde': return `runde ${t.n}`;
    default: return '';
  }
}

function commandLines(c: Command, indent: string): string[] {
  switch (c.do) {
    case 'zeige': return wrap(`${indent}zeige ${c.title}: `, c.text, indent);
    case 'rufe': return [`${indent}rufe ${c.kind} ${c.at.x},${c.at.y}`];
    case 'oere': return [`${indent}öre ${c.n > 0 ? '+' : ''}${c.n}`];
    case 'punkte': return [`${indent}punkte ${c.n > 0 ? '+' : ''}${c.n}`];
    case 'heile': return [`${indent}heile ${c.n}`];
    default: return [];
  }
}

const scriptLines = (s: Script) => [`  wenn ${triggerText(s.when)}:`, ...s.then.flatMap((c) => commandLines(c, '    '))];

function chapterLines(ch: Chapter): string[] {
  return [
    `kapitel ${ch.title}`,
    ...field('  ', 'ort', ch.place),
    ...field('  ', 'thema', ch.theme),
    ...field('  ', 'einleitung', ch.intro),
    ...field('  ', 'lage', ch.situation),
    ...field('  ', 'auftrag', ch.goalText),
    ...field('  ', 'ziel', goalText(ch.goal)),
    ...field('  ', 'belohnung', ch.reward),
    ...field('  ', 'abschluss', ch.outro),
    ...field('  ', 'überleitung', ch.bridge),
    '  plan:',
    ...ch.map.map((row) => `    ${row}`),
    ...ch.scripts.flatMap(scriptLines),
  ];
}

/** Fasst gleiche Karten zusammen: „karte 2× eile: …“. */
function cardLines(def: CampaignDef): string[] {
  const out: string[] = [];
  def.cards.forEach((c, i) => {
    const prev = def.cards[i - 1];
    if (prev && prev.id === c.id && prev.name === c.name && prev.text === c.text) return;
    let n = 1;
    while (def.cards[i + n] && def.cards[i + n].id === c.id && def.cards[i + n].name === c.name && def.cards[i + n].text === c.text) n++;
    out.push(...wrap(`  karte ${n > 1 ? `${n}× ` : ''}${c.id}: `, `${c.name} | ${c.text}`, '  '));
  });
  return out;
}

export function writeKladde(def: CampaignDef): string {
  const monsters = Object.keys(MONSTERS).length;
  return [
    `-- ${def.title}`,
    `-- Kampagne für FlensQuest in der Sprache Kladde (siehe docs/kladde.md). ${monsters} Gegnerarten stehen bereit.`,
    '',
    `kampagne ${def.id}`,
    ...field('  ', 'titel', def.title),
    ...field('  ', 'bild', def.image),
    ...field('  ', 'klappentext', def.blurb),
    ...field('  ', 'einleitung', def.intro),
    ...field('  ', 'epilog', def.epilog),
    ...field('  ', 'verloren', def.lostText),
    ...field('  ', 'nochmal', def.retryText),
    '',
    'spielleiter',
    ...cardLines(def),
    ...def.idle.flatMap((t) => wrap('  pause: ', t, '  ')),
    ...def.chapters.flatMap((ch) => ['', ...chapterLines(ch)]),
    '',
  ].join('\n');
}
