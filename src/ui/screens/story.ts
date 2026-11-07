import { campaignById, finishChapter, startChapter } from '../../core';
import { hush, play } from '../audio';
import { esc, html, LOGO, on } from '../dom';
import { openGame } from '../game/controller';
import { save, session } from '../session';
import { tell } from '../voice';
import { title } from './menu';
import { shop } from './shop';

/** Erzähltexte: Kampagnenbeginn, Kapitelbeginn und Kapitelende. Nur hier spricht die Stimme von selbst. */

export function campaignIntro() {
  const def = campaignById(session.progress!.campaign);
  if (!def.intro) { chapterIntro(); return; }
  html(`<main class="screen narrow">
    ${LOGO}
    <p class="kicker">Neue Kampagne</p>
    <h2>${esc(def.title)}</h2>
    <p class="story">${esc(def.intro)}</p>
    <button class="primary" data-go>Akte öffnen</button>
  </main>`);
  tell(def.title, def.intro);
  on('[data-go]', chapterIntro);
}

export function chapterIntro() {
  const c = session.progress!, chapters = campaignById(c.campaign).chapters, ch = chapters[c.chapter];
  html(`<main class="screen narrow">
    ${LOGO}
    <p class="kicker">Kapitel ${c.chapter + 1} von ${chapters.length} · ${esc(ch.place)}</p>
    <h2>${esc(ch.title)}</h2>
    <p class="story">${esc(ch.intro)}</p>
    ${ch.situation ? `<p>${esc(ch.situation)}</p>` : ''}
    <p class="goal"><b>Ziel:</b> ${esc(ch.goalText)}</p>
    <button class="primary" data-go>Rein da</button>
  </main>`);
  tell(`Kapitel ${c.chapter + 1}: ${ch.title}.`, ch.intro, ch.situation, `Ziel: ${ch.goalText}`);
  on('[data-go]', () => {
    hush();
    session.game = startChapter(c, Date.now());
    openGame();
  });
}

/** Nach Sieg oder Niederlage: Text, Speichern und weiter zum Kiosk oder nochmal. */
export function result() {
  const g = session.game!, c = session.progress!, def = campaignById(c.campaign), ch = def.chapters[g.chapter];
  play(g.status === 'lost' ? 'lose' : 'win');
  if (g.status === 'lost') {
    html(`<main class="screen narrow">
      ${LOGO}
      <h2>Das war nix</h2>
      <p class="story">${esc(g.lostReason)}</p>
      ${def.lostText ? `<p>${esc(def.lostText)}</p>` : ''}
      <p>Das Kapitel beginnt von vorn. Eure Öre aus diesem Versuch bleiben im Keller.</p>
      ${def.retryText ? `<p>${esc(def.retryText)}</p>` : ''}
      <button class="primary" data-retry>Nochmal</button>
    </main>`);
    tell(g.lostReason, def.lostText, def.retryText);
    on('[data-retry]', chapterIntro);
    return;
  }
  session.progress = finishChapter(c, g);
  save();
  if (session.progress.chapter >= def.chapters.length) {
    html(`<main class="screen narrow">
      ${LOGO}
      <h2>Flensburg ist gerettet</h2>
      <p class="story">${esc(ch.outro)}</p>
      ${def.epilog ? `<p class="story">${esc(def.epilog)}</p>` : ''}
      <p>Eure Kasse: ${session.progress.oere} Öre. Ein Fischbrötchen geht aufs Haus.</p>
      <button class="primary" data-end>Zum Anfang</button>
    </main>`);
    tell(ch.outro, def.epilog);
    on('[data-end]', () => { session.progress = null; save(); title(); });
    return;
  }
  html(`<main class="screen narrow">
    ${LOGO}
    <h2>Geschafft!</h2>
    <p class="story">${esc(ch.outro)}</p>
    <p>Belohnung: ${ch.reward} Öre.</p>
    ${ch.bridge ? `<p class="goal">${esc(ch.bridge)}</p>` : ''}
    <button class="primary" data-go>Zum Hafenkiosk</button>
  </main>`);
  tell(ch.outro, ch.bridge);
  on('[data-go]', () => { hush(); shop(); });
}
