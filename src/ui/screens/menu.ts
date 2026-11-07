import { HEROES, PUNKTE_LIMIT, type HeroId } from '../../content';
import { campaignById, campaigns, newProgress } from '../../core';
import { versionLabel } from '../../version';
import { esc, html, LOGO, on } from '../dom';
import { save, session } from '../session';
import { heroSprite, toDataUrl } from '../sprites';
import { campaignIntro, chapterIntro } from './story';

/** Startseite, Kampagnenauswahl und Figurenwahl. */

export function title() {
  const p = session.progress;
  const def = p ? campaignById(p.campaign) : null;
  const hasSave = p && def && p.chapter < def.chapters.length;
  html(`<main class="screen title">
    <h1 class="sr">FlensQuest</h1>
    <img class="cover" src="img/titelbild.webp" alt="Titelbild: vier Abenteurer im Kellergewölbe am Flensburger Hafen">
    <p class="lead">Ein Kellerabenteuer zwischen Hafenspitze und Punktearchiv.<br>Für 1 bis 4 Figuren an einem Gerät. Den Spielleiter spielt der Rechner oder ein Mensch.</p>
    <div class="row">
      <button class="primary" data-new>Neues Abenteuer</button>
      ${hasSave ? `<button data-go>Weiter: ${esc(def.title)}, Kapitel ${p.chapter + 1}</button>` : ''}
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
    <p class="version">${versionLabel()}</p>
  </main>`);
  on('[data-new]', () => { session.picked = []; choose(); });
  on('[data-go]', () => chapterIntro());
}

export function choose() {
  html(`<main class="screen">
    ${LOGO}
    <h2>Welches Abenteuer soll es sein?</h2>
    <div class="cards campaigns">${campaigns().map((c) => `<button class="card" data-campaign="${esc(c.id)}"
        data-say="${esc(`${c.title}. ${c.chapters.length} Kapitel. ${c.blurb}`)}">
      ${c.image ? `<img class="cimg" src="${esc(c.image)}" alt="${esc(c.title)}">` : `<b class="ctitle">${esc(c.title)}</b>`}
      <small><b>${c.chapters.length} Kapitel</b> · ${esc(c.blurb)}</small>
    </button>`).join('')}</div>
    <div class="row"><button data-back>Zurück</button></div>
    <p class="version">${versionLabel()}</p>
  </main>`);
  on('[data-back]', title);
  on('[data-campaign]', (el) => { session.chosen = el.dataset.campaign!; pick(); });
}

export function pick() {
  const { picked, gmHuman } = session;
  const ids = (Object.keys(HEROES) as HeroId[]).filter((id) => !HEROES[id].hidden);
  html(`<main class="screen">
    ${LOGO}
    <h2>Wer geht mit in den Keller?</h2>
    <p class="lead">Wähle 1 bis 4 von ${ids.length} Figuren. Allein bekommst du eine Tide und 4 Lebenspunkte extra.</p>
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
    session.picked = picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id];
    pick();
  });
  on('[data-back]', choose);
  on('[data-gm]', (el) => { session.gmHuman = el.dataset.gm === '1'; pick(); });
  on('[data-start]', () => {
    session.progress = newProgress(session.picked, session.gmHuman, session.chosen);
    save();
    campaignIntro();
  });
}
