import './ui/style.css';
import { registerBuiltins, registerOwn } from './campaigns';
import { campaigns } from './core';
import { loadCampaignSources } from './platform/storage';
import { play, unlock } from './ui/audio';
import { installAudioBar } from './ui/audiobar';
import { currentView, installKeys } from './ui/game/controller';
import { title } from './ui/screens/menu';
import { session } from './ui/session';

/* Start: Kampagnen eintragen, Bedienelemente anhängen, Startseite zeigen. */

registerBuiltins();
registerOwn(loadCampaignSources());
session.chosen = campaigns()[0].id;

let unlocked = false;
document.addEventListener('pointerdown', () => {
  if (unlocked) return;
  unlocked = true;
  unlock();
}, { capture: true });
document.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('button')) play('click');
}, { capture: true });

installAudioBar();
installKeys();
title();

/* Nur im Entwicklungsmodus: Zugriff für E2E-Tests und Fehlersuche. */
if (import.meta.env.DEV) {
  Object.defineProperty(window, '__flens', {
    value: { get board() { return currentView(); }, get game() { return session.game; }, get campaign() { return session.progress; } },
  });
}
