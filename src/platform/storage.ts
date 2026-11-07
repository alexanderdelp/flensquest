import type { Progress } from '../core';

/*
 Ablage im Browser. Alles ist optional: Ohne Speicher (privates Fenster, gesperrt) läuft das Spiel trotzdem.
 Schlüssel bleiben stabil, damit alte Spielstände weiterlaufen.
*/

export const KEYS = {
  progress: 'flensquest:v1',
  campaigns: 'flensquest:kampagnen',
} as const;

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* Speichern ist optional */ }
}

export function loadProgress(): Progress | null {
  try { return JSON.parse(read(KEYS.progress) ?? 'null') as Progress | null; } catch { return null; }
}

export function saveProgress(p: Progress | null) {
  write(KEYS.progress, p ? JSON.stringify(p) : null);
}

/** Eigene Kampagnen als Kladde-Quelltexte. */
export function loadCampaignSources(): string[] {
  try {
    const list = JSON.parse(read(KEYS.campaigns) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string') : [];
  } catch { return []; }
}

export function saveCampaignSources(list: string[]) {
  write(KEYS.campaigns, list.length ? JSON.stringify(list) : null);
}
