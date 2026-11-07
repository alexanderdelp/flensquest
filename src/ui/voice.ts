import { hush, say } from './audio';
import { app } from './dom';

/** Liest Questtexte vor: Kampagnenstart, Kapitelbeginn und Kapitelende. Sonst schweigt die Stimme. */
export function tell(...texts: (string | undefined)[]) {
  hush();
  void say(texts.filter(Boolean).join(' '));
}

/** Liest auf Wunsch (📖) alles Sichtbare der aktuellen Ansicht vor. */
export function readScreen() {
  hush();
  const sel = app.querySelector('.game')
    ? '.goal, .turn, .reach:not(.legend), .pc, .recap, .banner, .caption'
    : 'h1, h2, h3, .kicker, p, li, .card, [data-buy]';
  const parts = [...app.querySelectorAll<HTMLElement>(sel)]
    .filter((el) => !el.hidden)
    .map((el) => (el.dataset.say ?? el.textContent ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  void say(parts.join('. '));
}
