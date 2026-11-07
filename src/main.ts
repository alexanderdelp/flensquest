import './ui/style.css';
import { CHAPTERS, HEROES, MONSTERS, PUNKTE_LIMIT, SHOP, type HeroId } from './game/data';
import * as E from './game/engine';
import type { Campaign, Game } from './game/engine';

const SAVE = 'flensquest:v1';
const CELL = 40;
const app = document.querySelector<HTMLDivElement>('#app')!;

let campaign: Campaign | null = load();
let game: Game | null = null;
let picked: HeroId[] = [];
let aiming = false;

function load(): Campaign | null {
  try { return JSON.parse(localStorage.getItem(SAVE) ?? 'null'); } catch { return null; }
}
function save() {
  try {
    if (campaign) localStorage.setItem(SAVE, JSON.stringify(campaign));
    else localStorage.removeItem(SAVE);
  } catch { /* Speichern ist optional */ }
}

function html(strings: string) { app.innerHTML = strings; }
function on(sel: string, fn: (el: HTMLElement) => void) {
  app.querySelectorAll<HTMLElement>(sel).forEach((el) => el.addEventListener('click', () => fn(el)));
}

/* ---------- Bildschirme ---------- */

function title() {
  const hasSave = campaign && campaign.chapter < CHAPTERS.length;
  html(`<main class="screen title">
    <h1>⚓ FlensQuest</h1>
    <p class="lead">Ein Kellerabenteuer zwischen Hafenspitze und Punktearchiv.<br>Für 1 bis 4 an einem Gerät. Den Spielleiter macht der Rechner.</p>
    <div class="row">
      <button class="primary" data-new>Neues Abenteuer</button>
      ${hasSave ? `<button data-go>Weiter: Kapitel ${campaign!.chapter + 1}</button>` : ''}
    </div>
    <section class="rules">
      <h2>So geht's</h2>
      <ul>
        <li>Pro Zug hast du <b>3 Tiden</b>. Eine Tide bringt dich so viele Felder weit, wie dein Schritt-Wert sagt, oder sie zahlt eine Aktion.</li>
        <li><b>Angriff</b>: 2 Würfel + Angriff, nötig sind 7 + Rüstung des Ziels. Einmal je Zug. 6+6 trifft doppelt, 1+1 nie.</li>
        <li><b>Türen</b> öffnen kostet nichts. <b>Suchen</b> entschärft Fallen und findet verborgene Türen.</li>
        <li>Der Oberpunktezähler sammelt <b>Punkte in Flensburg</b>. Bei ${PUNKTE_LIMIT} ist der Lappen weg, und das Kapitel ist verloren.</li>
      </ul>
    </section>
  </main>`);
  on('[data-new]', () => { picked = []; pick(); });
  on('[data-go]', () => chapterIntro());
}

function pick() {
  const ids = Object.keys(HEROES) as HeroId[];
  html(`<main class="screen">
    <h2>Wer geht mit in den Keller?</h2>
    <p class="lead">Wähle 1 bis 4 Figuren. Allein bekommst du eine Tide und 4 Lebenspunkte extra.</p>
    <div class="cards">${ids.map((id) => {
      const d = HEROES[id];
      return `<button class="card ${picked.includes(id) ? 'on' : ''}" data-hero="${id}" aria-pressed="${picked.includes(id)}">
        <span class="face" style="background:${d.color}">${d.icon}</span>
        <b>${d.name}</b><small>${d.title}</small>
        <span class="stats">❤️ ${d.hp} · ⚔️ ${d.att} · 🛡️ ${d.arm} · 👣 ${d.spd}</span>
        <small>${d.weapon}: ${d.dmg} Schaden, Reichweite ${d.range}</small>
        <small><b>${d.special}:</b> ${d.specialText}</small>
      </button>`;
    }).join('')}</div>
    <div class="row">
      <button data-back>Zurück</button>
      <button class="primary" data-start ${picked.length ? '' : 'disabled'}>Leinen los (${picked.length})</button>
    </div>
  </main>`);
  on('[data-hero]', (el) => {
    const id = el.dataset.hero as HeroId;
    picked = picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id];
    pick();
  });
  on('[data-back]', title);
  on('[data-start]', () => { campaign = E.newCampaign(picked); save(); chapterIntro(); });
}

function chapterIntro() {
  const c = campaign!, ch = CHAPTERS[c.chapter];
  html(`<main class="screen narrow">
    <p class="kicker">Kapitel ${c.chapter + 1} von ${CHAPTERS.length} · ${ch.place}</p>
    <h2>${ch.title}</h2>
    <p class="story">${ch.intro}</p>
    <p class="goal"><b>Ziel:</b> ${ch.goalText}</p>
    <button class="primary" data-go>Rein da</button>
  </main>`);
  on('[data-go]', () => { game = E.startChapter(c); aiming = false; board(); });
}

function result() {
  const g = game!, c = campaign!, ch = CHAPTERS[g.chapter];
  if (g.status === 'lost') {
    html(`<main class="screen narrow">
      <h2>Das war nix</h2>
      <p class="story">${g.lostReason}</p>
      <p>Das Kapitel beginnt von vorn. Eure Öre aus diesem Versuch bleiben im Keller.</p>
      <button class="primary" data-retry>Nochmal</button>
    </main>`);
    on('[data-retry]', chapterIntro);
    return;
  }
  campaign = E.finishChapter(c, g);
  save();
  if (campaign.chapter >= CHAPTERS.length) {
    html(`<main class="screen narrow">
      <h2>⚓ Flensburg ist gerettet</h2>
      <p class="story">${ch.outro}</p>
      <p>Eure Kasse: ${campaign.oere} Öre. Ein Fischbrötchen geht aufs Haus.</p>
      <button class="primary" data-end>Zum Anfang</button>
    </main>`);
    on('[data-end]', () => { campaign = null; save(); title(); });
    return;
  }
  html(`<main class="screen narrow">
    <h2>Geschafft!</h2>
    <p class="story">${ch.outro}</p>
    <p>Belohnung: ${ch.reward} Öre.</p>
    <button class="primary" data-go>Zum Hafenkiosk</button>
  </main>`);
  on('[data-go]', shop);
}

function shop() {
  const c = campaign!;
  html(`<main class="screen">
    <h2>🛒 Hafenkiosk</h2>
    <p class="lead">Kasse: <b>${c.oere} Öre</b></p>
    <div class="shop">${c.heroes.map((h) => `<section class="shelf">
      <h3>${HEROES[h.id].icon} ${HEROES[h.id].name} <small>🥪 ${h.food}</small></h3>
      ${SHOP.map((s) => {
        const owned = s.once && h.gear.includes(s.id);
        return `<button data-buy="${h.id}:${s.id}" ${owned || c.oere < s.price ? 'disabled' : ''}>
          ${s.icon} ${s.name} <small>${owned ? 'hast du schon' : `${s.text} · ${s.price} Öre`}</small>
        </button>`;
      }).join('')}
    </section>`).join('')}</div>
    <button class="primary" data-go>Weiter zu Kapitel ${c.chapter + 1}</button>
  </main>`);
  on('[data-buy]', (el) => {
    const [id, item] = el.dataset.buy!.split(':');
    E.buy(c, id as HeroId, SHOP.find((s) => s.id === item)!);
    save();
    shop();
  });
  on('[data-go]', chapterIntro);
}

/* ---------- Spielbrett ---------- */

function tileSvg(g: Game, x: number, y: number): string {
  const px = x * CELL, py = y * CELL;
  if (!g.seen[y][x]) return `<rect x="${px}" y="${py}" width="${CELL}" height="${CELL}" class="fog"/>`;
  const t = g.tiles[y][x];
  const rect = (cls: string) => `<rect x="${px}" y="${py}" width="${CELL}" height="${CELL}" class="${cls}"/>`;
  if (t === '#' || t === 'H') return rect('wall');
  let out = rect((x + y) % 2 ? 'floor' : 'floor alt');
  if (t === 'D') out += `<rect x="${px + 4}" y="${py + 4}" width="${CELL - 8}" height="${CELL - 8}" rx="4" class="door"/>`;
  if (t === 'O') out += `<rect x="${px + 14}" y="${py + 14}" width="12" height="12" class="doorOpen"/>`;
  return out;
}

const glyph = (x: number, y: number, s: string, size = 24) =>
  `<text x="${x * CELL + CELL / 2}" y="${y * CELL + CELL / 2 + size * 0.36}" font-size="${size}" text-anchor="middle">${s}</text>`;

const goalIcon = (g: Game) => { const c = CHAPTERS[g.chapter].goal; return c.type === 'bergen' ? c.icon : ''; };

function boardSvg(g: Game): string {
  const parts: string[] = [];
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) parts.push(tileSvg(g, x, y));
  const hot: string[] = [];
  const mark = (x: number, y: number, cls: string, act: string) =>
    hot.push(`<rect x="${x * CELL + 2}" y="${y * CELL + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="6" class="hot ${cls}" data-act="${act}" data-x="${x}" data-y="${y}"/>`);

  if (g.exit && g.seen[g.exit.y][g.exit.x]) parts.push(glyph(g.exit.x, g.exit.y, '🚪'));
  if (g.goal && !g.goalTaken && g.seen[g.goal.y][g.goal.x]) parts.push(glyph(g.goal.x, g.goal.y, goalIcon(g)));
  for (const c of g.chests) if (g.seen[c.y][c.x]) parts.push(glyph(c.x, c.y, '🧰'));

  const playing = g.status === 'play';
  if (playing && !aiming) {
    for (const k of E.reachable(g).keys()) {
      const [x, y] = k.split(',').map(Number);
      mark(x, y, 'walk', 'move');
    }
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (E.canOpenDoor(g, x, y)) mark(x, y, 'use', 'door');
      if (E.canOpenChest(g, x, y)) mark(x, y, 'use', 'chest');
    }
  }
  parts.push(...hot.splice(0));

  for (const m of g.monsters) {
    if (!E.isActive(g, m)) continue;
    const d = MONSTERS[m.kind];
    const cx = m.x * CELL + CELL / 2, cy = m.y * CELL + CELL / 2;
    parts.push(`<circle cx="${cx}" cy="${cy}" r="16" class="tokenM"/>`, glyph(m.x, m.y, d.icon, 20));
    parts.push(`<rect x="${m.x * CELL + 6}" y="${m.y * CELL + 34}" width="${(28 * m.hp) / m.maxHp}" height="4" class="hpM"/>`);
    if (m.stuck) parts.push(glyph(m.x, m.y, '🕸️', 14));
    if (playing && (aiming ? E.canSpecialOn(g, m) : E.canAttack(g, m))) {
      mark(m.x, m.y, 'foe', aiming ? 'special' : 'attack');
    }
  }
  g.heroes.forEach((h, i) => {
    if (h.down) { parts.push(glyph(h.x, h.y, '💤', 18)); return; }
    const d = HEROES[h.id];
    const cx = h.x * CELL + CELL / 2, cy = h.y * CELL + CELL / 2;
    parts.push(`<circle cx="${cx}" cy="${cy}" r="17" fill="${d.color}" class="${i === g.turn && playing ? 'tokenH active' : 'tokenH'}"/>`, glyph(h.x, h.y, d.icon, 20));
  });
  parts.push(...hot);
  return `<svg viewBox="0 0 ${g.w * CELL} ${g.h * CELL}" class="board" role="img" aria-label="Spielbrett">${parts.join('')}</svg>`;
}

function board() {
  const g = game!, ch = CHAPTERS[g.chapter], h = E.activeHero(g), d = HEROES[h.id];
  const playing = g.status === 'play';
  html(`<main class="game">
    <header class="top">
      <b>⚓ ${ch.title}</b>
      <span class="punkte" title="Punkte in Flensburg">${Array.from({ length: PUNKTE_LIMIT }, (_, i) => `<i class="${i < g.punkte ? 'on' : ''}"></i>`).join('')} <small>${g.punkte}/${PUNKTE_LIMIT} Punkte</small></span>
      <span>Runde ${g.round} · 💰 ${g.oere} Öre</span>
      <button class="mini" data-quit>Menü</button>
    </header>
    <div class="table">
      <div class="boardwrap">${boardSvg(g)}</div>
      <aside class="side">
        <p class="goal small">${ch.goalText}${g.goalTaken && ch.goal.type === 'bergen' ? ' ✔ gefunden' : ''}</p>
        <div class="party">${g.heroes.map((o, i) => `<div class="pc ${i === g.turn && playing ? 'on' : ''} ${o.down ? 'down' : ''}">
          <span class="dot" style="background:${HEROES[o.id].color}">${HEROES[o.id].icon}</span>
          <span><b>${HEROES[o.id].name}</b><br><small>❤️ ${o.hp}/${o.maxHp} · 🥪 ${o.food} · ✨ ${o.charges}</small></span>
        </div>`).join('')}</div>
        ${playing ? `<p class="turn"><b>${d.name}</b> · ${'🌊'.repeat(g.tiden)}${g.steps ? ` · 👣 ${g.steps}` : ''}</p>` : '<p class="turn">Der Oberpunktezähler stempelt …</p>'}
        <div class="actions">
          <button data-search ${playing && g.tiden > 0 ? '' : 'disabled'}>🔎 Suchen</button>
          <button data-eat ${playing && g.tiden > 0 && h.food > 0 && h.hp < h.maxHp ? '' : 'disabled'}>🥪 Essen</button>
          <button class="${aiming ? 'on' : ''}" data-special ${playing && E.canSpecial(g) ? '' : 'disabled'} title="${d.specialText}">✨ ${d.special}</button>
          <button class="primary" data-end ${playing ? '' : 'disabled'}>Zug beenden</button>
        </div>
        <ol class="log" aria-live="polite">${g.log.slice(-40).reverse().map((l) => `<li>${l}</li>`).join('')}</ol>
      </aside>
    </div>
  </main>`);
  on('[data-quit]', () => { game = null; title(); });
  on('[data-search]', () => { E.search(g); after(); });
  on('[data-eat]', () => { E.eat(g); after(); });
  on('[data-end]', () => { aiming = false; E.endTurn(g); after(); });
  on('[data-special]', () => {
    if (E.specialNeedsTarget(g)) { aiming = !aiming; board(); return; }
    E.special(g); after();
  });
  app.querySelectorAll<SVGElement>('[data-act]').forEach((el) => el.addEventListener('click', () => {
    const x = Number(el.dataset.x), y = Number(el.dataset.y), act = el.dataset.act;
    const m = E.monsterAt(g, x, y);
    if (act === 'move') E.moveTo(g, x, y);
    if (act === 'door') E.openDoor(g, x, y);
    if (act === 'chest') E.openChest(g, x, y);
    if (act === 'attack' && m) E.attack(g, m);
    if (act === 'special' && m) { E.special(g, m); aiming = false; }
    after();
  }));
}

function after() {
  const g = game!;
  if (g.status === 'gm') { board(); runGm(g); return; }
  if (g.status === 'won' || g.status === 'lost') { result(); return; }
  board();
}

function runGm(g: Game) {
  const steps = E.gmTurn(g);
  const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 60 : 450;
  const tick = () => {
    const done = steps.next().done;
    if (g.status === 'won' || g.status === 'lost') { result(); return; }
    board();
    if (!done) setTimeout(tick, delay);
  };
  setTimeout(tick, delay);
}

title();
