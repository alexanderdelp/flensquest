export interface AudioSettings { sfx: boolean; music: boolean; voice: boolean }

const DEFAULTS: AudioSettings = { sfx: true, music: true, voice: true };

/** Gespeicherte Einstellungen lesen; Fehlendes oder Kaputtes fällt auf die Vorgabe zurück. */
export function parseSettings(raw: string | null): AudioSettings {
  try {
    const v = JSON.parse(raw ?? '{}') as Partial<AudioSettings>;
    return {
      sfx: typeof v.sfx === 'boolean' ? v.sfx : DEFAULTS.sfx,
      music: typeof v.music === 'boolean' ? v.music : DEFAULTS.music,
      voice: typeof v.voice === 'boolean' ? v.voice : DEFAULTS.voice,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Macht Anzeigetext vorlesbar: ohne Markup, Emojis und Würfelrechnung. */
export function speechText(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/^(.+?) → (.+?): .*?\(nötig \d+\)\s*(.*)$/u, '$1 gegen $2: $3')
    .replace(/\p{Extended_Pictographic}|️|‍/gu, '')
    .replace(/\s*\(\d+\+\d+, nötig \d+\)/g, '')
    .replace(/(^|[\s(])\+(\d)/g, '$1plus $2')
    .replace(/(\d)×/g, '$1 mal')
    .replace(/\s*[·—…]\s*/g, ', ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?:])/g, '$1')
    .replace(/([.!?:])\.+/g, '$1')
    .trim();
}

/** Teilt langen Text in Sätze, weil Browser sehr lange Äußerungen abbrechen. */
export function sentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?"“]*\s*/g) ?? []).map((s) => s.trim()).filter((s) => /\p{L}|\d/u.test(s));
}
