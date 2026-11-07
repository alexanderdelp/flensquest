import './ui/style.css';
import { CHAPTERS, HEROES, PUNKTE_LIMIT, SHOP, type HeroId } from './game/data';
import * as E from './game/engine';
import type { Campaign, Game } from './game/engine';
import { Board, type Mark } from './ui/board';
import { heroSprite, objects, toDataUrl } from './ui/sprites';

const SAVE = 'flensquest:v1';
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
        <img class="face" alt="" src="${toDataUrl(heroSprite(id, [], 0))}">
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
  view?.stop(); view = null;
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
      <h3><img class="dot" alt="" src="${toDataUrl(heroSprite(h.id, h.gear, 0))}"> ${HEROES[h.id].name} <small>🥪 ${h.food}</small></h3>
      ${SHOP.map((s) => {
        const owned = s.once && h.gear.includes(s.id);
        return `<button data-buy="${h.id}:${s.id}" ${owned || c.oere < s.price ? 'disabled' : ''}>
          <img class="dot" alt="" src="${toDataUrl(objects[s.id]())}"> ${s.name} <small>${owned ? 'hast du schon' : `${s.text} · ${s.price} Öre`}</small>
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

let view: Board | null = null;

function marks(g: Game): Mark[] {
  const out: Mark[] = [];
  if (g.status !== 'play') return out;
  if (!aiming) {
    for (const k of E.reachable(g).keys()) {
      const [x, y] = k.split(',').map(Number);
      out.push({ x, y, kind: 'walk', act: 'move' });
    }
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (E.canOpenDoor(g, x, y)) out.push({ x, y, kind: 'use', act: 'door' });
      if (E.canOpenChest(g, x, y)) out.push({ x, y, kind: 'use', act: 'chest' });
    }
  }
  for (const m of g.monsters) {
    if (aiming ? E.canSpecialOn(g, m) : E.canAttack(g, m)) {
      out.push({ x: m.x, y: m.y, kind: 'foe', act: aiming ? 'special' : 'attack' });
    }
  }
  return out;
}

function tapTile(p: { x: number; y: number }) {
  const g = game;
  if (!g) return;
  const mark = marks(g).find((m) => m.x === p.x && m.y === p.y);
  if (!mark) return;
  const m = E.monsterAt(g, p.x, p.y);
  if (mark.act === 'move') E.moveTo(g, p.x, p.y);
  if (mark.act === 'door') E.openDoor(g, p.x, p.y);
  if (mark.act === 'chest') E.openChest(g, p.x, p.y);
  if (mark.act === 'attack' && m) E.attack(g, m);
  if (mark.act === 'special' && m) { E.special(g, m); aiming = false; }
  after();
}

const portrait = (o: E.Hero) => toDataUrl(heroSprite(o.id, o.gear, 0));

function panel() {
  const g = game!, ch = CHAPTERS[g.chapter], h = E.activeHero(g), d = HEROES[h.id];
  const playing = g.status === 'play';
  app.querySelector('.top')!.innerHTML = `
    <b>⚓ ${ch.title}</b>
    <span class="punkte" title="Punkte in Flensburg">${Array.from({ length: PUNKTE_LIMIT }, (_, i) => `<i class="${i < g.punkte ? 'on' : ''}"></i>`).join('')} <small>${g.punkte}/${PUNKTE_LIMIT} Punkte</small></span>
    <span>Runde ${g.round} · ${g.oere} Öre</span>
    <button class="mini" data-quit>Menü</button>`;
  app.querySelector('.side')!.innerHTML = `
    <p class="goal small">${ch.goalText}${g.goalTaken && ch.goal.type === 'bergen' ? ' ✔ gefunden' : ''}</p>
    <div class="party">${g.heroes.map((o, i) => `<div class="pc ${i === g.turn && playing ? 'on' : ''} ${o.down ? 'down' : ''}">
      <img class="dot" alt="" src="${portrait(o)}">
      <span><b>${HEROES[o.id].name}</b><br><small>❤️ ${o.hp}/${o.maxHp} · 🥪 ${o.food} · ✨ ${o.charges}</small></span>
    </div>`).join('')}</div>
    ${playing ? `<p class="turn"><b>${d.name}</b> · ${'🌊'.repeat(g.tiden)}${g.steps ? ` · 👣 ${g.steps}` : ''}</p>` : '<p class="turn">Der Oberpunktezähler stempelt …</p>'}
    <div class="actions">
      <button data-search ${playing && g.tiden > 0 ? '' : 'disabled'}>🔎 Suchen</button>
      <button data-eat ${playing && g.tiden > 0 && h.food > 0 && h.hp < h.maxHp ? '' : 'disabled'}>🥪 Essen</button>
      <button class="${aiming ? 'on' : ''}" data-special ${playing && E.canSpecial(g) ? '' : 'disabled'} title="${d.specialText}">✨ ${d.special}</button>
      <button class="primary" data-end ${playing ? '' : 'disabled'}>Zug beenden</button>
    </div>
    <ol class="log" aria-live="polite">${g.log.slice(-40).reverse().map((l) => `<li>${l}</li>`).join('')}</ol>`;
  on('[data-quit]', () => { view?.stop(); view = null; game = null; title(); });
  on('[data-search]', () => { E.search(g); after(); });
  on('[data-eat]', () => { E.eat(g); after(); });
  on('[data-end]', () => { aiming = false; E.endTurn(g); after(); });
  on('[data-special]', () => {
    if (E.specialNeedsTarget(g)) { aiming = !aiming; board(); return; }
    E.special(g); after();
  });
}

function board() {
  const g = game!;
  if (!app.querySelector('.game')) {
    view?.stop();
    html(`<main class="game">
      <header class="top"></header>
      <div class="table">
        <div class="boardwrap"><canvas class="board" aria-label="Spielbrett"></canvas></div>
        <aside class="side"></aside>
      </div>
    </main>`);
    view = new Board(app.querySelector<HTMLCanvasElement>('.board')!, tapTile);
  }
  view!.game = g;
  view!.marks = marks(g);
  panel();
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
