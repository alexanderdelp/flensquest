import { applyMusic, hush, saveSettings, settings } from './audio';
import { readScreen } from './voice';

/** Leiste rechts unten: Geräusche, Ambiente und Sprache einzeln schalten, 📖 liest die Ansicht vor. */
export function installAudioBar() {
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
