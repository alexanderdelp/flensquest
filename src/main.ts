import './ui/style.css';
import { HEROES, MONSTERS, PUNKTE_LIMIT, SHOP, type HeroId } from './game/data';
import { CAMPAIGNS, campaignById } from './game/campaigns';
import * as E from './game/engine';
import type { Campaign, Game } from './game/engine';
import { LocalTransport } from './net/transport';
import { applyMusic, hush, play, saveSettings, say, settings, unlock, type Sound } from './ui/audio';
import { Board, type Mark } from './ui/board';
import { heroSprite, moodOf, objects, toDataUrl } from './ui/sprites';

const SAVE = 'flensquest:v1';
const ANGLE = 'flensquest:winkel';
const app = document.querySelector<HTMLDivElement>('#app')!;
const LOGO = '<img class="logo" src="img/schriftzug.webp" alt="FlensQuest">';

let campaign: Campaign | null = load();
let game: Game | null = null;
let picked: HeroId[] = [];
let chosen = CAMPAIGNS[0].id;
let gmHuman = false;
let gmSel: number | null = null;
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

/** Liest alles Sichtbare der aktuellen Ansicht vor. */
function readScreen() {
  hush();
  const sel = app.querySelector('.game')
    ? '.goal, .turn, .reach:not(.legend), .pc, .recap, .banner, .caption'
    : 'h1, h2, h3, .kicker, p, li, .card, [data-buy]';
  const parts = [...app.querySelectorAll<HTMLElement>(sel)]
    .filter((el) => !(el as HTMLElement).hidden)
    .map((el) => (el.dataset.say ?? el.textContent ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  void say(parts.join('. '));
}

/* ---------- Bildschirme ---------- */

function title() {
  const def = campaignById(campaign?.campaign);
  const hasSave = campaign && campaign.chapter < def.chapters.length;
  html(`<main class="screen title">
    <h1 class="sr">FlensQuest</h1>
    <img class="cover" src="img/titelbild.webp" alt="Titelbild: vier Abenteurer im Kellergewölbe am Flensburger Hafen">
    <p class="lead">Ein Kellerabenteuer zwischen Hafenspitze und Punktearchiv.<br>Für 1 bis 4 Figuren an einem Gerät. Den Spielleiter spielt der Rechner oder ein Mensch.</p>
    <div class="row">
      <button class="primary" data-new>Neues Abenteuer</button>
      ${hasSave ? `<button data-go>Weiter: ${def.title}, Kapitel ${campaign!.chapter + 1}</button>` : ''}
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
  on('[data-new]', () => { picked = []; choose(); readScreen(); });
  on('[data-go]', () => chapterIntro());
}

function choose() {
  html(`<main class="screen">
    ${LOGO}
    <h2>Welches Abenteuer soll es sein?</h2>
    <div class="cards campaigns">${CAMPAIGNS.map((c) => `<button class="card" data-campaign="${c.id}"
        data-say="${c.title}. ${c.chapters.length} Kapitel. ${c.blurb}">
      <img class="cimg" src="${c.image}" alt="${c.title}">
      <small><b>${c.chapters.length} Kapitel</b> · ${c.blurb}</small>
    </button>`).join('')}</div>
    <div class="row"><button data-back>Zurück</button></div>
  </main>`);
  on('[data-back]', title);
  on('[data-campaign]', (el) => { chosen = el.dataset.campaign!; pick(); readScreen(); });
}

function pick() {
  const ids = (Object.keys(HEROES) as HeroId[]).filter((id) => !HEROES[id].hidden);
  html(`<main class="screen">
    ${LOGO}
    <h2>Wer geht mit in den Keller?</h2>
    <p class="lead">Wähle 1 bis 4 von 5 Figuren. Allein bekommst du eine Tide und 4 Lebenspunkte extra.</p>
    <div class="cards">${ids.map((id) => {
      const d = HEROES[id];
      const full = picked.length >= 4 && !picked.includes(id);
      return `<button class="card ${picked.includes(id) ? 'on' : ''}" data-hero="${id}" aria-pressed="${picked.includes(id)}" ${full ? 'disabled' : ''}
        data-say="${d.name}, ${d.title}. ${d.hp} Lebenspunkte, Angriff ${d.att}, Rüstung ${d.arm}, ${d.spd} Schritte je Tide. ${d.weapon}: ${d.dmg} Schaden, Reichweite ${d.range}. ${d.special}: ${d.specialText}">
        <img class="face" alt="" src="${toDataUrl(heroSprite(id, [], 0))}">
        <b>${d.name}</b><small>${d.title}</small>
        <span class="stats">❤️ ${d.hp} · ⚔️ ${d.att} · 🛡️ ${d.arm} · 👣 ${d.spd}</span>
        <small>${d.weapon}: ${d.dmg} Schaden, Reichweite ${d.range}</small>
        <small><b>${d.special}:</b> ${d.specialText}</small>
      </button>`;
    }).join('')}</div>
    <div class="row seat" role="group" aria-label="Spielleiter">
      <b>Spielleiter:</b>
      <button class="${gmHuman ? '' : 'on'}" data-gm="0" aria-pressed="${!gmHuman}">🖥️ Rechner</button>
      <button class="${gmHuman ? 'on' : ''}" data-gm="1" aria-pressed="${gmHuman}">🧑 Mensch</button>
    </div>
    <div class="row">
      <button data-back>Zurück</button>
      <button class="primary" data-start ${picked.length ? '' : 'disabled'}>Leinen los (${picked.length})</button>
    </div>
  </main>`);
  on('[data-hero]', (el) => {
    const id = el.dataset.hero as HeroId;
    const adding = !picked.includes(id);
    picked = adding ? [...picked, id] : picked.filter((p) => p !== id);
    pick();
    hush();
    const d = HEROES[id];
    void say(adding ? `${d.name}, ${d.title}. ${d.special}: ${d.specialText}` : `${d.name} bleibt an Land.`);
  });
  on('[data-back]', choose);
  on('[data-gm]', (el) => { gmHuman = el.dataset.gm === '1'; pick(); });
  on('[data-start]', () => { campaign = E.newCampaign(picked, gmHuman, chosen); save(); campaignIntro(); });
}

function campaignIntro() {
  const def = campaignById(campaign!.campaign);
  if (!def.intro) { chapterIntro(); return; }
  html(`<main class="screen narrow">
    ${LOGO}
    <p class="kicker">Neue Kampagne</p>
    <h2>${def.title}</h2>
    <p class="story">${def.intro}</p>
    <button class="primary" data-go>Akte öffnen</button>
  </main>`);
  readScreen();
  on('[data-go]', chapterIntro);
}

function chapterIntro() {
  const c = campaign!, chapters = campaignById(c.campaign).chapters, ch = chapters[c.chapter];
  html(`<main class="screen narrow">
    ${LOGO}
    <p class="kicker">Kapitel ${c.chapter + 1} von ${chapters.length} · ${ch.place}</p>
    <h2>${ch.title}</h2>
    <p class="story">${ch.intro}</p>
    ${ch.situation ? `<p>${ch.situation}</p>` : ''}
    <p class="goal"><b>Ziel:</b> ${ch.goalText}</p>
    <button class="primary" data-go>Rein da</button>
  </main>`);
  readScreen();
  on('[data-go]', () => {
    hush();
    game = E.startChapter(c);
    aiming = false;
    spoken = 0;
    board();
    speakLog(game);
  });
}

function result() {
  const g = game!, c = campaign!, def = campaignById(c.campaign), ch = def.chapters[g.chapter];
  view?.stop(); view = null;
  play(g.status === 'lost' ? 'lose' : 'win');
  if (g.status === 'lost') {
    html(`<main class="screen narrow">
      ${LOGO}
      <h2>Das war nix</h2>
      <p class="story">${g.lostReason}</p>
      ${def.lostText ? `<p>${def.lostText}</p>` : ''}
      <p>Das Kapitel beginnt von vorn. Eure Öre aus diesem Versuch bleiben im Keller.</p>
      ${def.retryText ? `<p>${def.retryText}</p>` : ''}
      <button class="primary" data-retry>Nochmal</button>
    </main>`);
    readScreen();
    on('[data-retry]', chapterIntro);
    return;
  }
  campaign = E.finishChapter(c, g);
  save();
  if (campaign.chapter >= def.chapters.length) {
    html(`<main class="screen narrow">
      ${LOGO}
      <h2>Flensburg ist gerettet</h2>
      <p class="story">${ch.outro}</p>
      ${def.epilog ? `<p class="story">${def.epilog}</p>` : ''}
      <p>Eure Kasse: ${campaign.oere} Öre. Ein Fischbrötchen geht aufs Haus.</p>
      <button class="primary" data-end>Zum Anfang</button>
    </main>`);
    readScreen();
    on('[data-end]', () => { campaign = null; save(); title(); });
    return;
  }
  html(`<main class="screen narrow">
    ${LOGO}
    <h2>Geschafft!</h2>
    <p class="story">${ch.outro}</p>
    <p>Belohnung: ${ch.reward} Öre.</p>
    ${ch.bridge ? `<p class="goal">${ch.bridge}</p>` : ''}
    <button class="primary" data-go>Zum Hafenkiosk</button>
  </main>`);
  readScreen();
  on('[data-go]', () => { shop(); readScreen(); });
}

function shop() {
  const c = campaign!;
  html(`<main class="screen">
    ${LOGO}
    <h2>🛒 Hafenkiosk</h2>
    <p class="lead">Kasse: <b>${c.oere} Öre</b></p>
    <div class="shop">${c.heroes.map((h) => `<section class="shelf">
      <h3><img class="dot" alt="" src="${toDataUrl(heroSprite(h.id, h.gear, 0))}"> ${HEROES[h.id].name} <small>🥪 ${h.food}</small></h3>
      ${SHOP.map((s) => {
        const owned = s.once && h.gear.includes(s.id);
        return `<button data-buy="${h.id}:${s.id}" ${owned || c.oere < s.price ? 'disabled' : ''}
          data-say="${HEROES[h.id].name}: ${s.name}. ${owned ? 'Hast du schon' : `${s.text}, ${s.price} Öre`}">
          <img class="dot" alt="" src="${toDataUrl(objects[s.id]())}"> ${s.name} <small>${owned ? 'hast du schon' : `${s.text} · ${s.price} Öre`}</small>
        </button>`;
      }).join('')}
    </section>`).join('')}</div>
    <button class="primary" data-go>Weiter zu Kapitel ${c.chapter + 1}</button>
  </main>`);
  on('[data-buy]', (el) => {
    const [id, item] = el.dataset.buy!.split(':');
    const it = SHOP.find((s) => s.id === item)!;
    if (E.buy(c, id as HeroId, it)) {
      play('coin');
      hush();
      void say(`${HEROES[id as HeroId].name} kauft ${it.name}. Noch ${c.oere} Öre.`);
    }
    save();
    shop();
  });
  on('[data-go]', chapterIntro);
}

/* ---------- Spielbrett ---------- */

let view: Board | null = null;
let busy = false;
let logOpen = false;
let recap: string[] = [];
let gmOpen = false;
let spoken = 0;

function gmMarks(g: Game): Mark[] {
  const out: Mark[] = [];
  const sel = g.monsters.find((o) => o.uid === gmSel);
  for (const o of g.monsters) if (E.gmCanAct(g, o) && o !== sel) out.push({ x: o.x, y: o.y, kind: 'use', act: 'gmSelect' });
  if (!sel || !E.gmCanAct(g, sel)) return out;
  for (const k of E.gmReachable(g, sel).keys()) {
    const [x, y] = k.split(',').map(Number);
    out.push({ x, y, kind: 'walk', act: 'gmMove' });
  }
  for (const h of E.gmTargets(g, sel)) out.push({ x: h.x, y: h.y, kind: 'foe', act: 'gmAttack' });
  return out;
}

function marks(g: Game): Mark[] {
  const out: Mark[] = [];
  if (busy) return out;
  if (g.status === 'gm' && g.gmHuman) return gmMarks(g);
  if (g.status !== 'play') return out;
  if (!aiming) {
    for (const [k, path] of E.reachable(g)) {
      const [x, y] = k.split(',').map(Number);
      out.push({ x, y, kind: 'walk', act: 'move', steps: path.length, tides: E.tideCost(g, path.length) });
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
  if (busy) { if (view) view.speed = 5; hush(); return; }
  const mark = marks(g).find((m) => m.x === p.x && m.y === p.y);
  if (!mark) return;
  const m = E.monsterAt(g, p.x, p.y);
  if (mark.act === 'gmSelect' && m) { gmSel = m.uid; board(); return; }
  if (mark.act === 'gmMove' && gmSel !== null) act({ type: 'gmMove', uid: gmSel, ...p });
  if (mark.act === 'gmAttack' && gmSel !== null) {
    const h = E.heroAt(g, p.x, p.y);
    if (h) act({ type: 'gmAttack', uid: gmSel, hero: h.id });
  }
  if (mark.act === 'move') act({ type: 'move', ...p });
  if (mark.act === 'door') act({ type: 'door', ...p });
  if (mark.act === 'chest') act({ type: 'chest', ...p });
  if (mark.act === 'attack' && m) act({ type: 'attack', uid: m.uid });
  if (mark.act === 'special' && m) { aiming = false; act({ type: 'special', uid: m.uid }); }
}

/* Alle Handlungen laufen über die Verbindung, heute lokal, später zwischen Geräten. */
const DEVICE = 'dieses-geraet';
const ACTION_SOUND: Partial<Record<E.Action['type'], Sound>> = {
  door: 'door', chest: 'chest', search: 'search', eat: 'eat',
};
const net = new LocalTransport();
net.onMessage((msg) => {
  if (msg.kind !== 'request' || !game || busy || !E.dispatch(game, msg.action)) return;
  const sound = ACTION_SOUND[msg.action.type];
  if (sound) play(sound);
  hush();
  void after();
});

function act(action: E.Action) { net.send({ kind: 'request', device: DEVICE, action }); }

const portrait = (o: E.Hero) => toDataUrl(heroSprite(o.id, o.gear, 0, false, moodOf(o.hp, o.maxHp)));

function panel() {
  const g = game!, ch = E.chapterOf(g);
  const playing = g.status === 'play' && !busy;
  app.querySelector('.top')!.innerHTML = `
    <span class="brand"><img class="logo mini" src="img/schriftzug.webp" alt="FlensQuest"><b>${ch.title}</b></span>
    <span class="punkte" title="Punkte in Flensburg">${Array.from({ length: PUNKTE_LIMIT }, (_, i) => `<i class="${i < g.punkte ? 'on' : ''}"></i>`).join('')} <small>${g.punkte}/${PUNKTE_LIMIT} Punkte</small></span>
    <span>Runde ${g.round} · ${g.oere} Öre</span>
    <button class="mini" data-quit>Menü</button>`;
  app.querySelector('.side')!.innerHTML = `
    <p class="goal small">${ch.goalText}${g.goalTaken ? ' ✔ gefunden' : ''}${g.bossDead ? ' ✔ besiegt' : ''}</p>
    <div class="party">${g.heroes.map((o, i) => `<div class="pc ${i === g.turn && playing ? 'on' : ''} ${o.down ? 'down' : ''}"
      data-say="${HEROES[o.id].name}: ${o.hp} von ${o.maxHp} Lebenspunkten, ${o.food} Fischbrötchen, ${o.charges} mal Spezialkönnen${o.down ? ', gestürzt' : ''}">
      <img class="dot" alt="" src="${portrait(o)}">
      <span><b>${HEROES[o.id].name}</b><br><small>❤️ ${o.hp}/${o.maxHp} · 🥪 ${o.food} · ✨ ${o.charges}${o.pfoten ? ' · 🐾' : ''}</small></span>
    </div>`).join('')}</div>
    ${g.status === 'gm' && !g.gmHuman ? '<p class="turn">Der Oberpunktezähler stempelt …</p>' : g.status === 'gm' ? gmHint(g) : heroTurn(g)}
    ${g.status === 'gm' && g.gmHuman ? gmButtons(g) : heroButtons(g, playing)}
    <details class="verlauf" ${logOpen ? 'open' : ''}><summary>Verlauf</summary>
      <ol class="log">${g.log.slice(-40).reverse().map((l) => `<li>${l}</li>`).join('')}</ol>
    </details>`;
  app.querySelector<HTMLDetailsElement>('.verlauf')!.addEventListener('toggle', (e) => {
    logOpen = (e.target as HTMLDetailsElement).open;
  });
  on('[data-quit]', () => { hush(); view?.stop(); view = null; game = null; title(); });
  on('[data-search]', () => act({ type: 'search' }));
  on('[data-eat]', () => act({ type: 'eat' }));
  on('[data-end]', () => { aiming = false; act({ type: 'end' }); });
  on('[data-special]', () => {
    if (E.specialNeedsTarget(g)) { aiming = !aiming; board(); return; }
    act({ type: 'special' });
  });
  on('[data-card]', (el) => act({ type: 'gmCard', index: Number(el.dataset.card) }));
  on('[data-gmend]', () => { gmSel = null; act({ type: 'gmEnd' }); });
}

function heroTurn(g: Game) {
  const h = E.activeHero(g);
  const open = g.steps ? ` · ${g.steps} aus der laufenden Tide` : '';
  const legend = Array.from({ length: Math.min(g.tiden + (g.steps ? 1 : 0), 4) }, (_, i) => (
    `<i class="tide t${i + 1}"></i>${i + 1}`
  )).join(' ');
  return `<p class="turn"><b>${HEROES[h.id].name}</b> · ${'🌊'.repeat(g.tiden)}</p>
    <p class="reach">👣 <b>${E.stepsLeft(g)}</b> Schritte übrig · ${h.spd} je Tide${open}</p>
    ${g.tiden || g.steps ? `<p class="reach legend">Punkte zeigen die Tide: ${legend}</p>` : ''}`;
}

function heroButtons(g: Game, playing: boolean) {
  const h = E.activeHero(g), d = HEROES[h.id];
  return `<div class="actions">
    <button data-search ${playing && g.tiden > 0 ? '' : 'disabled'}>🔎 Suchen</button>
    <button data-eat ${playing && g.tiden > 0 && h.food > 0 && h.hp < h.maxHp ? '' : 'disabled'}>🥪 Essen</button>
    <button class="${aiming ? 'on' : ''}" data-special ${playing && E.canSpecial(g) ? '' : 'disabled'} title="${d.specialText}">✨ ${d.special}</button>
    <button class="primary" data-end ${playing ? '' : 'disabled'}>Zug beenden</button>
  </div>`;
}

function gmHint(g: Game) {
  const sel = g.monsters.find((o) => o.uid === gmSel);
  const open = g.monsters.filter((o) => E.gmCanAct(g, o)).length;
  return `<p class="turn"><b>Spielleiter</b> · ${sel && E.gmCanAct(g, sel) ? MONSTERS[sel.kind].name : `${open} Gegner bereit`}</p>`;
}

function gmButtons(g: Game) {
  const off = busy ? 'disabled' : '';
  return `<div class="cards-gm">${g.gmCards.map((c, i) => `<button data-card="${i}" ${g.gmCardPlayed ? 'disabled' : off}>
      📜 ${E.deckOf(g)[c].name}<small>${E.deckOf(g)[c].text}</small></button>`).join('')}</div>
    <button class="primary" data-gmend ${g.gmCardPlayed && !busy ? '' : 'disabled'}>Runde beenden</button>`;
}

function setupTilt(b: Board) {
  const input = app.querySelector<HTMLInputElement>('[data-tilt]')!;
  const label = app.querySelector<HTMLElement>('[data-angle]')!;
  const apply = (v: number) => { b.angle = v; input.value = String(v); label.textContent = `${v}°`; };
  let stored = 55;
  try { stored = Number(localStorage.getItem(ANGLE)) || 55; } catch { /* Speichern ist optional */ }
  apply(Math.min(90, Math.max(35, stored)));
  input.addEventListener('input', () => {
    apply(Number(input.value));
    try { localStorage.setItem(ANGLE, input.value); } catch { /* Speichern ist optional */ }
  });
}

function board() {
  const g = game!;
  if (!app.querySelector('.game')) {
    view?.stop();
    html(`<main class="game">
      <header class="top"></header>
      <div class="table">
        <div class="boardwrap">
          <canvas class="board" aria-label="Spielbrett"></canvas>
          <div class="banner" hidden></div>
          <div class="caption" hidden></div>
          <div class="recap" hidden></div>
          <label class="tilt"><span>Blick <b data-angle></b></span>
            <input type="range" min="35" max="90" step="5" data-tilt aria-label="Blickwinkel"></label>
        </div>
        <aside class="side"></aside>
      </div>
    </main>`);
    view = new Board(app.querySelector<HTMLCanvasElement>('.board')!, tapTile);
    if (import.meta.env.DEV) (window as unknown as { board: Board }).board = view;
    setupTilt(view);
    view.onStep = () => play('step');
  }
  const fresh = view!.game !== g;
  view!.game = g;
  if (fresh) view!.sync(g);
  view!.marks = marks(g);
  panel();
}

const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function setBox(sel: string, content: string | null) {
  const el = app.querySelector<HTMLElement>(sel);
  if (!el) return;
  el.hidden = content === null;
  if (content !== null) el.innerHTML = content;
}

function showRecap() {
  const lines = recap.slice(-6);
  setBox('.recap', lines.length ? `<b>Das war die Runde</b><ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul>` : null);
}

/** Beschreibt ein Ereignis in einem Satz; null, wenn es keine eigene Meldung braucht. */
function describe(f: E.Fx, v: Board): string | null {
  if (f.t === 'attack') {
    const a = v.label(f.who), t = v.label(f.target);
    const dice = f.a ? ` (${f.a}+${f.b}, nötig ${f.need})` : '';
    return f.hit ? `${a} trifft ${t}${dice}: ${f.dmg} Schaden` : `${a} verfehlt ${t}${dice}`;
  }
  if (f.t === 'die') return `${v.label(f.who)} ist erledigt`;
  return null;
}

/** Liest neue Einträge des Verlaufs vor. */
function speakLog(g: Game) {
  const lines = g.log.slice(spoken);
  spoken = g.log.length;
  lines.filter((l) => !l.startsWith('📍')).forEach((l) => { void say(l); });
}

function fxSound(f: E.Fx, v: Board) {
  if (f.t === 'attack') {
    play(v.label(f.who) === 'Pommes-Möwe' || f.shot === 'nordhexe' ? 'gull' : f.shot ? 'shot' : 'swing');
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

let speaking: Promise<void> = Promise.resolve();

async function announce(f: E.Fx, g: Game, v: Board) {
  const gm = g.status === 'gm';
  const voiced = gm && !g.gmHuman;
  speaking = Promise.resolve();
  if (f.t === 'card') {
    const line = voiced ? say(`${f.name}. ${f.text}`) : Promise.resolve();
    recap.push(`📜 ${f.name}: ${f.text}`);
    setBox('.banner', `<small>Ereigniskarte</small><b>${f.name}</b><span>${f.text}</span>`);
    await Promise.all([v.pause(4500), line]);
    setBox('.banner', null);
    return;
  }
  if (f.t === 'punkte') {
    const line = voiced ? say(`Plus ${f.n}. ${f.total} von ${PUNKTE_LIMIT} Punkten. ${f.why}`) : Promise.resolve();
    recap.push(`🔴 ${f.why || 'Punkt'}: +${f.n}, jetzt ${f.total} von ${PUNKTE_LIMIT}`);
    setBox('.banner', `<small>Punkte in Flensburg</small><b>+${f.n} · ${f.total} von ${PUNKTE_LIMIT}</b><span>${f.why}</span>`);
    panel();
    await Promise.all([v.pause(3200), line]);
    setBox('.banner', null);
    return;
  }
  if (f.t === 'note') {
    recap.push(`📍 ${f.title}`);
    const line = say(`${f.title}. ${f.text}`);
    setBox('.banner', `<small>${E.chapterOf(g).place}</small><b>${f.title}</b><span>${f.text}</span>`);
    await Promise.all([v.pause(Math.min(9000, 3000 + f.text.length * 50)), line]);
    setBox('.banner', null);
    return;
  }
  const text = describe(f, v);
  if (text && gm) {
    recap.push(text);
    setBox('.caption', text);
    if (voiced) speaking = say(text);
  }
}

/** Spielt alle offenen Ereignisse nacheinander ab. */
async function drain(g: Game) {
  const v = view;
  if (!v) return;
  while (g.fx.length) {
    const f = g.fx.shift()!;
    fxSound(f, v);
    await announce(f, g, v);
    await v.play(f);
    if (f.t === 'attack' && g.status === 'gm') await Promise.all([v.pause(1800), speaking]);
  }
  v.sync(g);
}

async function after() {
  const g = game!;
  busy = true;
  if (view) view.speed = calm() ? 5 : 1;
  setBox('.recap', null);
  board();
  await drain(g);
  busy = false;
  if (game !== g) return;
  if (g.status === 'won' || g.status === 'lost') { result(); return; }
  if (g.status === 'gm' && !g.gmHuman) { spoken = g.log.length; await runGm(g); return; }
  speakLog(g);
  if (g.status === 'gm' && !gmOpen) { gmOpen = true; recap = []; }
  if (g.status === 'play' && gmOpen) { gmOpen = false; setBox('.caption', null); showRecap(); }
  board();
}

async function runGm(g: Game) {
  busy = true;
  recap = [];
  if (view) view.speed = calm() ? 5 : 1;
  setBox('.caption', 'Der Oberpunktezähler ist dran … <small>Tippen macht es schneller</small>');
  void say('Der Oberpunktezähler ist dran.');
  board();
  for (const _ of E.gmTurn(g)) {
    void _;
    await drain(g);
    if (game !== g) return;
    board();
  }
  await drain(g);
  busy = false;
  setBox('.caption', null);
  if (game !== g) return;
  if (g.status === 'won' || g.status === 'lost') { result(); return; }
  if (!recap.length) recap.push('Alles ruhig in dieser Runde.');
  showRecap();
  spoken = g.log.length - 1;
  speakLog(g);
  board();
}

function audioBar() {
  const bar = document.createElement('div');
  bar.className = 'audiobar';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Ton');
  const items = [['sfx', '🔔', 'Geräusche'], ['music', '🌊', 'Ambiente'], ['voice', '🗣️', 'Sprachausgabe']] as const;
  const draw = () => {
    bar.innerHTML = items.map(([k, icon, label]) => (
      `<button class="${settings[k] ? 'on' : 'off'}" data-audio="${k}" aria-pressed="${settings[k]}" title="${label} ${settings[k] ? 'aus' : 'an'}">${icon}</button>`
    )).join('') + '<button data-read title="Vorlesen">📖</button>';
  };
  draw();
  bar.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    if (b.dataset.read !== undefined) { readScreen(); return; }
    const k = b.dataset.audio as keyof typeof settings;
    settings[k] = !settings[k];
    saveSettings();
    if (k === 'music') applyMusic();
    if (k === 'voice' && !settings.voice) hush();
    draw();
  });
  document.body.append(bar);
}

let unlocked = false;
document.addEventListener('pointerdown', () => {
  if (unlocked) return;
  unlocked = true;
  unlock();
}, { capture: true });
document.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('button')) play('click');
}, { capture: true });

audioBar();
title();
