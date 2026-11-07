import type { HeroId } from '../content';
import type { Game, Progress } from '../core';
import { loadProgress, saveProgress } from '../platform/storage';

/** Zustand der laufenden Sitzung, geteilt von Bildschirmen und Spielansicht. */
export const session = {
  /** Kampagnenfortschritt, wird gespeichert. */
  progress: loadProgress() as Progress | null,
  /** Laufendes Kapitel, wird nicht gespeichert. */
  game: null as Game | null,
  /** Auswahl auf den Startbildschirmen. */
  picked: [] as HeroId[],
  chosen: '',
  gmHuman: false,
};

export const save = () => saveProgress(session.progress);
