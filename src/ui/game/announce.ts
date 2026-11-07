import { PUNKTE_LIMIT } from '../../content';
import type { Fx } from '../../core';
import { play } from '../audio';
import { esc } from '../text';

/** Was über dem Brett erscheint und was man hört. Reine Textbausteine plus Geräusch je Ereignis. */

/** Beschreibt einen Angriff oder Sturz in einem Satz; null, wenn es keine eigene Zeile braucht. label liefert Namen. */
export function describe(f: Fx, label: (who: string) => string): string | null {
  if (f.t === 'attack') {
    const a = label(f.who), t = label(f.target);
    const dice = f.a ? ` (${f.a}+${f.b}, nötig ${f.need})` : '';
    return f.hit ? `${a} trifft ${t}${dice}: ${f.dmg} Schaden` : `${a} verfehlt ${t}${dice}`;
  }
  if (f.t === 'die') return `${label(f.who)} ist erledigt`;
  return null;
}

/** Banner für Karten, Punkte und Raumtexte: Überschrift, Inhalt, Rückblickzeile und Anzeigedauer. */
export function bannerFor(f: Fx, place: string): { html: string; recap: string; ms: number } | null {
  if (f.t === 'card') {
    return {
      html: `<small>Spielleiter spielt · ${f.cost} Tinte</small><b>${esc(f.name)}</b><span>${esc(f.text)}</span>`,
      recap: `📜 ${esc(f.name)}: ${esc(f.text)}`,
      ms: 4500,
    };
  }
  if (f.t === 'punkte') {
    return {
      html: `<small>Punkte in Flensburg</small><b>+${f.n} · ${f.total} von ${PUNKTE_LIMIT}</b><span>${esc(f.why)}</span>`,
      recap: `🔴 ${esc(f.why || 'Punkt')}: +${f.n}, jetzt ${f.total} von ${PUNKTE_LIMIT}`,
      ms: 3200,
    };
  }
  if (f.t === 'note') {
    return {
      html: `<small>${esc(place)}</small><b>${esc(f.title)}</b><span>${esc(f.text)}</span>`,
      recap: `📍 ${esc(f.title)}`,
      ms: Math.min(9000, 3000 + f.text.length * 50),
    };
  }
  return null;
}

export function recapHtml(lines: string[]) {
  const last = lines.slice(-6);
  return last.length ? `<b>Das war die Runde</b><ul>${last.map((l) => `<li>${l}</li>`).join('')}</ul>` : null;
}

export function fxSound(f: Fx, label: (who: string) => string) {
  if (f.t === 'attack') {
    play(label(f.who) === 'Pommes-Möwe' || f.shot === 'nordhexe' ? 'gull' : f.shot ? 'shot' : 'swing');
    if (!f.hit) play('miss');
  }
  if (f.t === 'shot') play(f.shot === 'nordhexe' ? 'gull' : 'shot');
  if (f.t === 'hurt') play('hit');
  if (f.t === 'heal') play('heal');
  if (f.t === 'die') play('die');
  if (f.t === 'float') play('coin');
  if (f.t === 'card' || f.t === 'note') play('card');
  if (f.t === 'punkte') play('stamp');
}
