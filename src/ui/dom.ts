/** Kleine DOM-Helfer für die Bildschirme. Alles hängt am Element #app. */

export const app = document.querySelector<HTMLDivElement>('#app')!;

export const LOGO = '<img class="logo" src="img/schriftzug.webp" alt="FlensQuest">';

export function html(markup: string) { app.innerHTML = markup; }

export function on(sel: string, fn: (el: HTMLElement) => void) {
  app.querySelectorAll<HTMLElement>(sel).forEach((el) => el.addEventListener('click', () => fn(el)));
}

/** Zeigt oder versteckt einen Kasten über dem Brett (Banner, Zeile, Rückblick, Tooltip). */
export function setBox(sel: string, content: string | null) {
  const el = app.querySelector<HTMLElement>(sel);
  if (!el) return;
  el.hidden = content === null;
  if (content !== null) el.innerHTML = content;
}

/** Schützt Texte aus eigenen Kampagnen vor HTML. */
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
