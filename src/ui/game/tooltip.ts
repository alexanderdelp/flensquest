import { HEROES, MONSTERS, type PropKind } from '../../content';
import * as E from '../../core';
import type { Game, Pos } from '../../core';
import { app, esc } from '../dom';

const PROPS: Record<PropKind, string> = {
  fass: '🛢️ <b>Rumfass</b><small>Voll, zu, im Weg. Hier kommt keiner durch.</small>',
  kiste: '📦 <b>Frachtkiste</b><small>Zugenagelt. Steht im Weg.</small>',
  pumpe: '🚰 <b>Lenzpumpe</b><small>Quietscht und steht im Weg.</small>',
  regal: '🗄️ <b>Aktenregal</b><small>Bis oben voll mit Vorgängen. Steht im Weg.</small>',
};

/** Tooltip-Text für ein sichtbares Feld: Gegner, Figuren und Gegenstände. Verborgenes (Fallen, verborgene Türen) bleibt verborgen. */
export function tipFor(g: Game, p: Pos): string | null {
  if (!g.seen[p.y]?.[p.x]) return null;
  const ch = E.chapterOf(g);
  const m = E.monsterAt(g, p.x, p.y);
  if (m && E.isActive(g, m)) {
    const d = MONSTERS[m.kind];
    const state = [m.blind ? 'geblendet' : m.stuck ? 'gefesselt' : '', d.boss ? 'Endgegner' : ''].filter(Boolean).join(' · ');
    const note = E.foeNote(ch, m.kind);
    return `${d.icon} <b>${d.name}</b>${state ? ` <em>${state}</em>` : ''}
      <span>❤️ ${m.hp}/${m.maxHp} · ⚔️ ${d.att} · 🛡️ ${d.arm} · 👣 ${d.spd}</span>
      <span>${d.dmg} Schaden, Reichweite ${d.range} · ${d.reward} Öre</span>
      ${note ? `<small>${esc(note)}</small>` : ''}`;
  }
  const h = E.heroAt(g, p.x, p.y);
  if (h) {
    const d = HEROES[h.id];
    return `${d.icon} <b>${d.name}</b> <em>${h.down ? 'gestürzt' : d.title}</em>
      <span>❤️ ${h.hp}/${h.maxHp} · ⚔️ ${h.att} · 🛡️ ${h.arm} · 👣 ${E.spdOf(g, h)}</span>
      <span>🥪 ${h.food} · ✨ ${d.special} noch ${h.charges}×</span>`;
  }
  if (E.chestAt(g, p.x, p.y)) return '🧰 <b>Truhe</b><small>Öre, ein Fischbrötchen oder ein Mimik-Rumfass. Öffnen kostet eine Tide.</small>';
  const t = E.tile(g, p.x, p.y);
  if (t === 'D') return '🚪 <b>Tür</b><small>Öffnen kostet nichts. Dahinter wartet, was eben wartet.</small>';
  if (t === 'O') return '🚪 <b>Offene Tür</b>';
  if (g.goal && !g.goalTaken && g.goal.x === p.x && g.goal.y === p.y) {
    return `${esc(ch.goal.icon ?? '⭐')} <b>${esc(ch.goal.item ?? 'Ziel')}</b><small>${esc(ch.goalText)}</small>`;
  }
  if (g.exit && g.exit.x === p.x && g.exit.y === p.y) {
    return `🪜 <b>Ausgang</b><small>${g.goalTaken || ch.goal.type === 'besiegen' ? 'Hier geht es raus.' : 'Erst den Auftrag erledigen.'}</small>`;
  }
  const prop = E.propAt(g, p.x, p.y);
  return prop ? PROPS[prop.kind] : null;
}

/** Zeigt den Tooltip neben dem Mauszeiger, innerhalb des Bretts. */
export function showTip(text: string | null, cx: number, cy: number) {
  const box = app.querySelector<HTMLElement>('.tip'), wrap = app.querySelector<HTMLElement>('.boardwrap');
  if (!box || !wrap || !text) { if (box) box.hidden = true; return; }
  box.innerHTML = text;
  box.hidden = false;
  const r = wrap.getBoundingClientRect();
  const x = Math.min(cx - r.left + 16, r.width - box.offsetWidth - 6);
  const y = cy - r.top + 18 + box.offsetHeight > r.height ? cy - r.top - box.offsetHeight - 12 : cy - r.top + 18;
  box.style.left = `${Math.max(6, x)}px`;
  box.style.top = `${Math.max(6, y)}px`;
}
