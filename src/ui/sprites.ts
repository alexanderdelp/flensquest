import type { HeroId, MonsterId } from '../content';

/** Eigene Pixel-Art, zur Laufzeit gezeichnet und zwischengespeichert. Raster 32 × 32. */
export const SPRITE = 32;
export type Painter = (x: number, y: number, w: number, h: number, c: string) => void;

const cache = new Map<string, HTMLCanvasElement>();

function sprite(key: string, draw: (p: Painter) => void, flip = false): HTMLCanvasElement {
  const k = `${key}${flip ? ':f' : ''}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = SPRITE;
  const ctx = c.getContext('2d')!;
  if (flip) { ctx.translate(SPRITE, 0); ctx.scale(-1, 1); }
  draw((x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); });
  cache.set(k, c);
  return c;
}

export const toDataUrl = (c: HTMLCanvasElement) => c.toDataURL('image/png');

const SHADOW = 'rgba(0,0,0,.28)';
const SKIN = '#f0c39a';
const SKIN_D = '#d39a72';
const INK = '#23232d';

interface Look { shirt: string; shirtD: string; pants: string; boots: string }

function person(p: Painter, l: Look, frame: number, gear: string[]) {
  const d = frame === 1 ? 1 : 0;
  const stepL = frame === 2 ? 2 : 0, stepR = frame === 3 ? 2 : 0;
  const stiefel = gear.includes('gummistiefel');
  const nerz = gear.includes('friesennerz');
  p(7, 29, 18, 2, SHADOW);
  p(11, 23, 4, 6 - stepL, l.pants);
  p(17, 23, 4, 6 - stepR, l.pants);
  const boot = stiefel ? '#2e8b57' : l.boots, bootH = stiefel ? 6 : 3;
  p(10, 30 - bootH - stepL, 5, bootH, boot);
  p(17, 30 - bootH - stepR, 5, bootH, boot);
  if (stiefel) { p(10, 24 - stepL, 5, 1, '#57b47f'); p(17, 24 - stepR, 5, 1, '#57b47f'); }
  const coat = nerz ? '#f3c623' : l.shirt, coatD = nerz ? '#c99a12' : l.shirtD;
  p(9, 15 + d, 14, 9, coat);
  p(9, 21 + d, 14, 3, coatD);
  p(6, 16 + d, 3, 8, coatD);
  p(23, 16 + d, 3, 8, coatD);
  p(6, 24 + d, 3, 2, SKIN);
  p(23, 24 + d, 3, 2, SKIN);
  if (nerz) {
    p(15, 15 + d, 2, 9, '#c99a12');
    p(13, 17 + d, 1, 1, INK); p(13, 20 + d, 1, 1, INK);
    p(10, 14 + d, 12, 2, '#ffd94a');
  }
  p(10, 6 + d, 12, 9, SKIN);
  p(10, 13 + d, 12, 2, SKIN_D);
  p(12, 9 + d, 2, 2, INK);
  p(18, 9 + d, 2, 2, INK);
  return d;
}

function weapon(p: Painter, d: number, gear: string[], own: (d: number) => void) {
  if (!gear.includes('bootshaken')) { own(d); return; }
  p(27, 3 + d, 2, 27, '#8a5a2b');
  p(27, 3 + d, 4, 2, '#d9a441');
  p(30, 3 + d, 2, 5, '#d9a441');
  p(28, 7 + d, 2, 1, '#d9a441');
}

const HERO: Record<HeroId, (p: Painter, f: number, gear: string[]) => void> = {
  nordhexe(p, f, gear) {
    const a = f === 1 ? 1 : 0;
    // Langes blondes Haar mit Strähnen, hinter dem Körper
    p(7, 8 + a, 18, 17, '#e9c356');
    const d = person(p, { shirt: '#2a5fc4', shirtD: '#1b3f8c', pants: '#1b2f66', boots: '#141e3d' }, f, gear);
    if (!gear.includes('friesennerz')) {
      p(9, 22 + d, 14, 2, '#1b3f8c'); p(15, 15 + d, 2, 6, '#9fc3ff');
      p(10, 15 + d, 3, 1, '#e9c356'); p(19, 15 + d, 3, 1, '#e9c356');
    }
    p(8, 7 + d, 3, 18, '#e9c356'); p(21, 7 + d, 3, 18, '#e9c356');
    p(8, 9 + d, 1, 15, '#fff3b8'); p(10, 8 + d, 1, 14, '#c9942e');
    p(23, 9 + d, 1, 15, '#fff3b8'); p(21, 8 + d, 1, 14, '#c9942e');
    p(10, 6 + d, 12, 2, '#e9c356'); p(12, 6 + d, 1, 2, '#fff3b8'); p(18, 6 + d, 1, 2, '#fff3b8');
    // Spitzer Hut in Nordseeblau mit weißem Band
    p(5, 5 + d, 22, 2, '#1b2f66'); p(9, 3 + d, 14, 2, '#24479a');
    p(9, 4 + d, 14, 1, '#f4f6fb');
    p(11, 1 + d, 10, 2, '#24479a'); p(13, 0 + d, 6, 1, '#24479a'); p(18, -1 + d, 4, 2, '#24479a');
    p(21, 0 + d, 2, 1, '#e0ac3c');
    // Reisigbesen
    weapon(p, d, gear, (o) => {
      p(27, 4 + o, 1, 20, '#7a5230');
      p(25, 23 + o, 5, 3, '#c9a35a'); p(24, 26 + o, 7, 3, '#b08a45'); p(26, 25 + o, 1, 4, '#8a6a30');
    });
  },
  juni(p, f, gear) {
    // Das lange Haar liegt hinter dem Körper und fällt bis zur Taille.
    const a = f === 1 ? 1 : 0;
    p(7, 7 + a, 18, 18, '#e9c356');
    const d = person(p, { shirt: '#2f6fd6', shirtD: '#1f4fa8', pants: '#27408b', boots: '#1c2f66' }, f, gear);
    if (!gear.includes('friesennerz')) { p(14, 15 + d, 4, 9, '#7fb0f0'); p(9, 21 + d, 14, 1, '#f4f6fb'); }
    p(9, 3 + d, 14, 5, '#e9c356');
    p(8, 7 + d, 3, 18, '#e9c356'); p(21, 7 + d, 3, 18, '#e9c356');
    // Strähnen
    p(11, 3 + d, 1, 5, '#fff3b8'); p(15, 3 + d, 1, 4, '#fff3b8'); p(19, 3 + d, 1, 5, '#fff3b8');
    p(13, 3 + d, 1, 3, '#c9942e'); p(17, 3 + d, 1, 4, '#c9942e');
    p(8, 9 + d, 1, 15, '#fff3b8'); p(10, 8 + d, 1, 14, '#c9942e');
    p(23, 9 + d, 1, 15, '#fff3b8'); p(21, 8 + d, 1, 14, '#c9942e');
    p(9, 5 + d, 14, 1, '#2f6fd6');
    // Sturmlaterne
    p(3, 18 + d, 5, 1, '#1c2f66'); p(3, 19 + d, 1, 7, '#1c2f66'); p(7, 19 + d, 1, 7, '#1c2f66');
    p(4, 20 + d, 3, 5, f % 2 ? '#ffd76a' : '#ffb545'); p(5, 21 + d, 1, 3, '#fff2c0'); p(3, 26 + d, 5, 1, '#1c2f66');
    weapon(p, d, gear, (o) => {
      p(25, 16 + o, 4, 2, '#d8dde6'); p(28, 16 + o, 2, 3, '#1c2f66'); p(25, 15 + o, 2, 1, '#ff7a3c');
    });
  },
  frauke(p, f, gear) {
    const d = person(p, { shirt: '#2c6e8f', shirtD: '#1f5068', pants: '#3b3f55', boots: '#2b2b35' }, f, gear);
    if (!gear.includes('friesennerz')) { p(9, 17 + d, 14, 1, '#e8eef0'); p(9, 20 + d, 14, 1, '#e8eef0'); }
    p(9, 3 + d, 14, 5, '#b5473c'); p(9, 7 + d, 14, 1, '#7f2f28');
    p(8, 8 + d, 2, 12, '#d9783a'); p(22, 8 + d, 2, 8, '#d9783a');
    weapon(p, d, gear, (o) => {
      p(27, 2 + o, 1, 28, '#8a5a2b');
      p(26, 1 + o, 3, 2, '#c8d3d8'); p(27, 0 + o, 1, 1, '#eef4f6');
    });
  },
  joern(p, f, gear) {
    const d = person(p, { shirt: '#d9662b', shirtD: '#a84a1c', pants: '#c7551f', boots: '#3a2a1e' }, f, gear);
    if (!gear.includes('friesennerz')) { p(11, 15 + d, 2, 9, '#a84a1c'); p(19, 15 + d, 2, 9, '#a84a1c'); }
    p(10, 12 + d, 12, 4, '#d8b25a'); p(12, 11 + d, 8, 1, '#d8b25a');
    p(15, 12 + d, 2, 1, '#9b5a3c');
    p(9, 3 + d, 14, 5, '#f2f2ea'); p(8, 7 + d, 16, 1, '#c9c9bd');
    weapon(p, d, gear, (o) => {
      p(26, 12 + o, 2, 13, '#7c8a92');
      p(24, 9 + o, 6, 3, '#aeb9bf'); p(24, 12 + o, 2, 2, '#aeb9bf'); p(28, 12 + o, 2, 2, '#aeb9bf');
    });
  },
  maren(p, f, gear) {
    const d = person(p, { shirt: '#6f4aa0', shirtD: '#4f3377', pants: '#433255', boots: '#2d2438' }, f, gear);
    p(9, 4 + d, 14, 4, '#d7d9e3'); p(8, 7 + d, 2, 13, '#d7d9e3'); p(22, 7 + d, 2, 13, '#d7d9e3');
    p(20, 2 + d, 2, 5, '#fbfbf5'); p(21, 1 + d, 1, 2, '#9fb6c6');
    const w = f % 2;
    p(3, 11 + d, 6, 4, '#fbfbf5'); p(2, 12 + d - w, 3, 2, '#9fb6c6');
    p(8, 10 + d, 2, 2, '#fbfbf5'); p(10, 11 + d, 1, 1, '#f1a93b');
    weapon(p, d, gear, () => undefined);
  },
  hinnerk(p, f, gear) {
    const d = person(p, { shirt: '#f0ece0', shirtD: '#cfc8b5', pants: '#3a3026', boots: '#241b14' }, f, gear);
    if (!gear.includes('friesennerz')) {
      p(11, 15 + d, 10, 9, '#7b4f27'); p(15, 15 + d, 2, 9, '#f0ece0'); p(15, 15 + d, 2, 2, '#a83232');
    }
    p(11, 12 + d, 10, 2, '#5a3b1e');
    p(8, 5 + d, 16, 2, '#1f1b18'); p(10, 0 + d, 12, 5, '#2b2622'); p(10, 3 + d, 12, 1, '#a83232');
    p(4, 20 + d, 3, 6, '#7a3a14'); p(5, 18 + d, 1, 2, '#7a3a14'); p(4, 22 + d, 3, 2, '#e8dcc0');
    weapon(p, d, gear, (o) => {
      p(26, 11 + o, 1, 19, '#5a3b1e'); p(25, 9 + o, 3, 2, '#d9a441');
    });
  },
};

/** Laune nach Lebenspunkten: 0 unversehrt, 1 angeschlagen, 2 schwer angeschlagen. */
export const moodOf = (hp: number, maxHp: number) => (hp >= maxHp ? 0 : hp * 2 <= maxHp ? 2 : 1);

function moodFace(p: Painter, d: number, mood: number) {
  if (!mood) return;
  // finstere Brauen und heruntergezogene Mundwinkel
  p(11, 7 + d, 2, 1, INK); p(13, 8 + d, 2, 1, INK);
  p(19, 7 + d, 2, 1, INK); p(17, 8 + d, 2, 1, INK);
  p(14, 12 + d, 4, 1, '#6b2f22'); p(13, 13 + d, 1, 1, '#6b2f22'); p(18, 13 + d, 1, 1, '#6b2f22');
  if (mood < 2) return;
  // blaues Auge, Pflaster und Kopfverband
  p(17, 9 + d, 4, 3, '#6a4a86'); p(18, 9 + d, 2, 2, INK);
  p(11, 11 + d, 3, 2, '#f2e6cf'); p(12, 11 + d, 1, 2, '#c9a98a');
  p(9, 5 + d, 14, 2, '#f4f1e6'); p(21, 5 + d, 3, 1, '#d8d3c4'); p(23, 6 + d, 2, 1, '#d8d3c4');
}

function catEars(p: Painter, d: number) {
  const fur = '#3a3440', pink = '#f29ab8';
  for (const x of [8, 19]) {
    p(x, 3 + d, 5, 3, fur); p(x + 1, 2 + d, 3, 1, fur); p(x + 2, 1 + d, 1, 1, fur);
    p(x + 1, 4 + d, 3, 2, pink); p(x + 2, 3 + d, 1, 1, pink);
  }
}

/** Möwe Piet, der Begleiter der Nordhexe: klein, frech, im 32er-Raster mittig. */
export const piet = (frame: number, flip = false) => sprite(`o:piet:${frame % 2}`, (p) => {
  p(10, 14, 11, 6, '#fbfbf5'); p(10, 18, 11, 2, '#d9dfe3');
  p(18, 10, 6, 6, '#fbfbf5'); p(21, 12, 1, 1, INK);
  p(24, 13, 4, 2, '#f1a93b'); p(26, 15, 1, 1, '#d9483a');
  p(6, 15, 5, 2, '#9fb6c6'); p(5, 16, 2, 1, '#3c4650');
  if (frame % 2) { p(11, 7, 7, 8, '#9fb6c6'); p(11, 6, 3, 2, '#3c4650'); }
  else { p(11, 18, 7, 6, '#9fb6c6'); p(11, 23, 3, 1, '#3c4650'); }
  p(13, 20, 1, 3, '#f1a93b'); p(16, 20, 1, 3, '#f1a93b');
}, flip);

export function heroSprite(id: HeroId, gear: string[], frame: number, flip = false, mood = 0, familiar = true) {
  return sprite(`h:${id}:${[...gear].sort().join()}:${frame}:${mood}:${familiar}`, (p) => {
    HERO[id](p, frame, gear);
    // Für Porträts sitzt Piet auf der Schulter; auf dem Brett fliegt er selbst.
    if (id === 'nordhexe' && familiar) {
      const d = frame === 1 ? 1 : 0;
      p(23, 11 + d, 7, 4, '#fbfbf5'); p(27, 8 + d, 4, 4, '#fbfbf5'); p(29, 9 + d, 1, 1, INK);
      p(31, 10 + d, 1, 1, '#f1a93b'); p(23, 12 + d, 4, 2, '#9fb6c6'); p(21, 13 + d, 2, 1, '#3c4650');
    }
    moodFace(p, frame === 1 ? 1 : 0, mood);
    if (gear.includes('katzenohren')) catEars(p, frame === 1 ? 1 : 0);
  }, flip);
}

export function heroDown(id: HeroId, gear: string[]) {
  const key = `hd:${id}:${[...gear].sort().join()}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = SPRITE;
  const ctx = c.getContext('2d')!;
  ctx.translate(16, 24); ctx.rotate(Math.PI / 2); ctx.translate(-24, -16);
  ctx.drawImage(heroSprite(id, gear, 0), 0, 0);
  cache.set(key, c);
  return c;
}

function gull(p: Painter, f: number) {
  p(9, 29, 14, 2, SHADOW);
  p(10, 15, 13, 8, '#fbfbf5'); p(10, 21, 13, 2, '#d9dfe3');
  p(20, 10, 7, 7, '#fbfbf5'); p(23, 12, 2, 2, INK);
  p(27, 13, 4, 2, '#f1a93b'); p(29, 15, 2, 1, '#d9483a');
  p(5, 17, 6, 3, '#9fb6c6'); p(3, 18, 3, 2, '#3c4650');
  if (f === 0) { p(11, 7, 8, 9, '#9fb6c6'); p(11, 5, 4, 3, '#3c4650'); }
  else { p(11, 19, 8, 7, '#9fb6c6'); p(11, 25, 4, 2, '#3c4650'); }
  p(13, 23, 2, 6, '#f1a93b'); p(17, 23, 2, 6, '#f1a93b');
}

/** Gemeinsamer Körperbau für menschliche Gegner. */
function clerk(p: Painter, f: number, suit: string, dark: string, skin = SKIN) {
  p(6, 29, 20, 2, SHADOW);
  p(11, 23, 4, 6, dark); p(17, 23, 4, 6, dark);
  p(10, 29, 6, 1, INK); p(16, 29, 6, 1, INK);
  p(8, 14 + f, 16, 10 - f, suit); p(6, 15 + f, 3, 8, dark); p(23, 15 + f, 3, 8, dark);
  p(10, 5 + f, 12, 9, skin); p(12, 8 + f, 2, 2, INK); p(18, 8 + f, 2, 2, INK);
  p(13, 12 + f, 6, 1, '#7a3a2a');
}

const MONSTER: Record<MonsterId, (p: Painter, f: number) => void> = {
  moewenraeuber(p, f) {
    gull(p, f);
    p(19, 11, 9, 2, '#23232d'); p(22, 11, 4, 3, '#23232d'); p(17, 12, 3, 1, '#b5302a');
  },
  krischan(p, f) {
    gull(p, f);
    p(5, 21, 5, 2, '#b5302a');
    p(18, 8, 11, 3, '#1f3355'); p(20, 5, 7, 3, '#1f3355'); p(22, 6, 3, 1, '#e0ac3c'); p(28, 10, 3, 1, '#111d33');
    p(12, 17, 3, 2, '#e0ac3c'); p(16, 17, 3, 2, '#e0ac3c');
  },
  kellerkassierer(p, f) {
    clerk(p, f, '#4c6152', '#2f3f34', '#b9c98f');
    p(10, 3 + f, 12, 3, '#2b2622');
    p(12, 16 + f, 8, 6, '#7a4a22'); p(15, 18 + f, 2, 2, '#e0ac3c');
    p(25, 18 + f, 4, 4, '#e0ac3c'); p(26, 19 + f, 2, 2, '#b58a2a');
  },
  punktepruefer(p, f) {
    clerk(p, f, '#6a6f7c', '#454954');
    p(10, 4 + f, 12, 2, '#3a3a42');
    p(11, 7 + f, 4, 3, '#eef6f8'); p(17, 7 + f, 4, 3, '#eef6f8'); p(12, 8 + f, 2, 2, INK); p(18, 8 + f, 2, 2, INK);
    p(14, 14 + f, 4, 7, '#f4f4ee'); p(15, 15 + f, 2, 6, '#2a4a7c');
    p(24, 14 + f, 6, 9, '#7a5a34'); p(25, 15 + f, 4, 7, '#f4f0e0'); p(26, 17 + f, 2, 1, '#b5302a');
  },
  schlurfer(p, f) {
    p(5, 28, 22, 3, 'rgba(70,120,140,.5)');
    p(11, 23, 4, 6, '#2d5a5a'); p(17, 23, 4, 6, '#2d5a5a');
    p(8, 13 + f, 16, 11 - f, '#3e7a78'); p(5, 15 + f, 4, 11, '#336765'); p(23, 15 + f, 4, 11, '#336765');
    p(10, 5 + f, 12, 9, '#7fb2a2'); p(12, 8 + f, 3, 2, '#e8f2c0'); p(18, 8 + f, 3, 2, '#e8f2c0');
    p(13, 12 + f, 6, 1, '#234a48');
    p(10, 3 + f, 12, 3, '#2f5f46'); p(8, 6 + f, 2, 6, '#2f5f46'); p(22, 6 + f, 2, 5, '#2f5f46');
    p(7, 26 + f, 2, 2, '#9fd8e8'); p(24, 27 - f, 2, 2, '#9fd8e8');
  },
  kalle(p, f) {
    clerk(p, f, '#2a3f6b', '#1b2a4a');
    p(10, 10 + f, 12, 5, '#3a2a1e');
    p(9, 2 + f, 14, 4, '#1b2a4a'); p(8, 5 + f, 16, 1, '#111a30'); p(14, 3 + f, 4, 2, '#e0ac3c');
    p(8, 17 + f, 16, 1, '#e8eef0'); p(8, 20 + f, 16, 1, '#e8eef0');
    p(25, 6 + f, 4, 9, '#7a3a14'); p(26, 3 + f, 2, 3, '#7a3a14'); p(25, 9 + f, 4, 2, '#e8dcc0');
  },
  fiete(p, f) {
    clerk(p, f, '#efe6d0', '#c9bda0');
    p(10, 3 + f, 12, 3, '#5a4a3a');
    p(11, 7 + f, 4, 3, '#eef6f8'); p(17, 7 + f, 4, 3, '#eef6f8'); p(12, 8 + f, 2, 2, INK); p(18, 8 + f, 2, 2, INK);
    p(10, 15 + f, 12, 9 - f, '#2b3a5a');
    p(6, 21 + f, 3, 3, '#1b2a4a'); p(23, 21 + f, 3, 3, '#1b2a4a'); p(12, 18 + f, 3, 3, '#1b2a4a');
    p(25, 10 + f, 6, 8, '#f4f0e0'); p(26, 12 + f, 4, 1, '#b5302a'); p(26, 14 + f, 3, 1, '#8a8a8a');
  },
  waechter(p, f) {
    p(4, 29, 24, 2, SHADOW);
    p(7, 4 + f, 18, 25 - f, '#6e7480'); p(7, 4 + f, 18, 2, '#8d939e');
    for (const y of [8, 15, 22]) {
      p(9, y + f, 14, 6, '#585e6a'); p(14, y + 2 + f, 4, 2, '#e0ac3c'); p(10, y + 1 + f, 3, 1, '#f4f0e0');
    }
    p(11, 5 + f, 3, 2, '#ff5a3c'); p(18, 5 + f, 3, 2, '#ff5a3c');
    p(2, 12 + f, 5, 12, '#585e6a'); p(25, 12 - f, 5, 12, '#585e6a');
  },
  proehl(p, f) {
    clerk(p, f, '#8a5a2b', '#5f3d1c');
    p(8, 3 + f, 16, 13, '#b58a3a'); p(10, 6 + f, 12, 7, '#a9d8e8'); p(10, 6 + f, 12, 1, '#7a5a2a');
    p(12, 8 + f, 2, 2, INK); p(18, 8 + f, 2, 2, INK); p(14, 1 + f, 4, 2, '#7a5a2a');
    p(26, 12 + f, 2, 12, '#7c8a92'); p(24, 9 + f, 6, 3, '#aeb9bf');
    p(4, 25, 2, 2, '#9fd8e8');
  },
  oberarchivar(p, f) {
    p(4, 29, 24, 2, SHADOW);
    p(8, 14 + f, 16, 15 - f, '#3a2a5a'); p(5, 15 + f, 4, 10, '#2b1f45'); p(23, 15 + f, 4, 10, '#2b1f45');
    p(5, 21 + f, 4, 3, '#f4f0e0'); p(23, 21 + f, 4, 3, '#f4f0e0');
    p(14, 14 + f, 4, 12, '#e0ac3c');
    p(10, 4 + f, 12, 10, SKIN); p(10, 3 + f, 12, 2, '#d7d7cf'); p(9, 5 + f, 2, 4, '#d7d7cf'); p(21, 5 + f, 2, 4, '#d7d7cf');
    p(11, 7 + f, 4, 3, '#eef6f8'); p(17, 7 + f, 4, 3, '#eef6f8'); p(15, 8 + f, 2, 1, '#e0ac3c');
    p(12, 8 + f, 2, 2, '#b5302a'); p(18, 8 + f, 2, 2, '#b5302a');
    p(13, 12 + f, 6, 1, '#7a3a2a');
    p(26, 4 + f * 2, 3, 7, '#6b3a16'); p(24, 11 + f * 2, 7, 4, '#2b2b35'); p(24, 15 + f * 2, 7, 1, '#b5302a');
  },
  ratte(p, f) {
    const b = '#6d6258', l = '#857a6e';
    p(6, 28, 21, 2, SHADOW);
    p(8, 19, 15, 8, b); p(10, 17, 10, 3, l);
    p(20, 16, 8, 8, l); p(27, 19, 3, 3, '#f0a8b0'); p(23, 18, 2, 2, '#ff5a48');
    p(20, 13, 4, 4, '#f0a8b0'); p(21, 14, 2, 2, b);
    p(10, 27, 3, 2, '#f0a8b0'); p(19, 27, 3, 2, '#f0a8b0');
    p(2, 21 + f, 6, 2, '#f0a8b0'); p(0, 23 - f, 3, 2, '#f0a8b0');
  },
  schmuggler(p, f) {
    const d = f;
    p(7, 29, 18, 2, SHADOW);
    p(11, 23, 4, 6, '#2d2a33'); p(17, 23, 4, 6, '#2d2a33');
    p(10, 28, 5, 2, '#17151b'); p(17, 28, 5, 2, '#17151b');
    p(9, 15 + d, 14, 9 - d, '#1f4a52'); p(9, 22, 14, 2, '#7a3a14');
    p(10, 6 + d, 12, 9, SKIN); p(10, 10 + d, 12, 5, '#2b2622');
    p(12, 8 + d, 2, 2, INK); p(18, 8 + d, 2, 2, INK);
    p(9, 3 + d, 14, 4, '#7c1f2a'); p(22, 4 + d, 4, 2, '#7c1f2a');
    p(5, 16 + d, 4, 7, '#1f4a52');
    p(23, 12 + d, 3, 11, '#1f4a52');
    p(24, 5 + d, 4, 8, '#3f7a3a'); p(25, 3 + d, 2, 2, '#3f7a3a'); p(24, 8 + d, 4, 2, '#e8dcc0');
  },
  krabbe(p, f) {
    const d = f;
    p(4, 28, 24, 2, SHADOW);
    p(8, 14, 16, 12, '#c8452e'); p(10, 12, 12, 3, '#df6a4a'); p(11, 16, 3, 2, '#df6a4a'); p(18, 19, 3, 2, '#a93421');
    p(11, 8, 2, 5, '#a93421'); p(19, 8, 2, 5, '#a93421');
    p(10, 6, 4, 3, '#fbfbf5'); p(18, 6, 4, 3, '#fbfbf5'); p(12, 7, 1, 1, INK); p(20, 7, 1, 1, INK);
    p(13, 22, 6, 1, INK);
    for (const x of [5, 3]) { p(x, 22 + d, 4, 1, '#a93421'); p(32 - x - 4, 22 + d, 4, 1, '#a93421'); }
    p(5, 24, 3, 4, '#a93421'); p(24, 24, 3, 4, '#a93421');
    p(1, 13 - d, 7, 6, '#c8452e'); p(0, 11 - d, 3, 4, '#df6a4a'); p(5, 11 - d, 3, 4, '#df6a4a');
    p(24, 13 + d, 7, 6, '#c8452e'); p(24, 11 + d, 3, 4, '#df6a4a'); p(29, 11 + d, 3, 4, '#df6a4a');
  },
  moewe(p, f) {
    p(9, 29, 14, 2, SHADOW);
    p(10, 15, 13, 8, '#fbfbf5'); p(10, 21, 13, 2, '#d9dfe3');
    p(20, 10, 7, 7, '#fbfbf5'); p(23, 12, 2, 2, INK);
    p(27, 13, 4, 2, '#f1a93b'); p(29, 15, 2, 1, '#d9483a');
    p(5, 17, 6, 3, '#9fb6c6'); p(3, 18, 3, 2, '#3c4650');
    if (f === 0) { p(11, 7, 8, 9, '#9fb6c6'); p(11, 5, 4, 3, '#3c4650'); }
    else { p(11, 19, 8, 7, '#9fb6c6'); p(11, 25, 4, 2, '#3c4650'); }
    p(13, 23, 2, 6, '#f1a93b'); p(17, 23, 2, 6, '#f1a93b');
    p(27, 16, 1, 5, '#f6d65a'); p(29, 16, 1, 4, '#f6d65a');
  },
  knoellchen(p, f) {
    const d = f;
    p(8, 29, 16, 2, SHADOW);
    p(12, 24, 3, 5, '#2a3a52'); p(18, 24, 3, 5, '#2a3a52');
    p(10, 15 + d, 13, 10 - d, '#2f4a73'); p(15, 15 + d, 3, 4, '#f4f0e0');
    p(10, 7 + d, 13, 9, '#7fae57'); p(8, 9 + d, 2, 4, '#7fae57'); p(23, 9 + d, 2, 4, '#7fae57');
    p(12, 10 + d, 3, 2, '#ffe16a'); p(18, 10 + d, 3, 2, '#ffe16a');
    p(13, 11 + d, 1, 1, INK); p(19, 11 + d, 1, 1, INK);
    p(13, 14 + d, 7, 1, '#3d5a2b');
    p(9, 4 + d, 15, 4, '#1f3355'); p(8, 7 + d, 17, 1, '#111d33'); p(14, 5 + d, 4, 2, '#e0ac3c');
    p(24, 15 + d, 6, 9, '#fbf7e6'); p(25, 17 + d, 4, 1, '#b5473c');
    p(25, 19 + d, 4, 1, '#8a8a8a'); p(25, 21 + d, 3, 1, '#8a8a8a');
  },
  rumgeist(p, f) {
    const d = f === 0 ? 0 : 2;
    p(10, 29, 12, 2, 'rgba(0,0,0,.18)');
    const a = 'rgba(232,190,110,.82)', b = 'rgba(190,125,50,.82)';
    p(10, 5 + d, 12, 16, a); p(8, 9 + d, 16, 11, a);
    p(9, 20 + d, 4, 5, a); p(14, 20 + d, 4, 3, a); p(19, 20 + d, 4, 5, a);
    p(12, 10 + d, 3, 4, INK); p(18, 10 + d, 3, 4, INK);
    p(14, 16 + d, 5, 2, INK);
    p(4, 13 + d, 4, 3, b); p(24, 13 + d, 4, 3, b);
    p(13, 25, 7, 5, '#6b3a16'); p(15, 23, 3, 2, '#6b3a16'); p(14, 27, 5, 2, '#e8dcc0');
  },
  qualle(p, f) {
    p(7, 29, 18, 2, 'rgba(0,0,0,.18)');
    const a = 'rgba(232,120,176,.85)', b = 'rgba(255,190,220,.9)';
    p(10, 5, 12, 2, a); p(7, 7, 18, 3, a); p(5, 10, 22, 7, a); p(8, 8, 8, 3, b);
    p(11, 12, 2, 2, INK); p(19, 12, 2, 2, INK);
    for (let i = 0; i < 5; i++) {
      const o = (i + f) % 2 ? 1 : -1, x = 7 + i * 4 + o;
      p(x, 17, 2, 6, a); p(x + o, 23, 2, 5, b);
    }
  },
  klabauter(p, f) {
    const d = f;
    p(7, 29, 18, 2, SHADOW);
    p(11, 24, 4, 5, '#2b2f4a'); p(17, 24, 4, 5, '#2b2f4a');
    p(10, 29, 5, 1, INK); p(17, 29, 5, 1, INK);
    p(9, 15 + d, 14, 9 - d, '#39456b'); p(9, 17 + d, 14, 1, '#d8d8e6'); p(9, 20 + d, 14, 1, '#d8d8e6');
    p(10, 6 + d, 12, 10, '#9fb86b'); p(7, 9 + d, 3, 3, '#9fb86b'); p(22, 9 + d, 3, 3, '#9fb86b');
    p(12, 9 + d, 3, 2, '#ff5a3c'); p(18, 9 + d, 3, 2, '#ff5a3c');
    p(11, 13 + d, 10, 3, '#e8e8dc'); p(13, 13 + d, 1, 2, INK); p(18, 13 + d, 1, 2, INK);
    p(9, 2 + d, 14, 5, '#b5302a'); p(20, 0 + d, 6, 4, '#b5302a'); p(25, 3 + d, 2, 2, '#f4f0e0');
    p(25, 10 + d, 2, 15, '#7a4a22'); p(22, 7 + d, 8, 4, '#54606a');
  },
  obermeister(p, f) {
    const d = f;
    p(5, 29, 22, 2, SHADOW);
    p(11, 23, 4, 6, '#3c4049'); p(17, 23, 4, 6, '#3c4049');
    p(10, 29, 6, 1, INK); p(16, 29, 6, 1, INK);
    p(7, 13 + d, 18, 11 - d, '#5a606c'); p(14, 13 + d, 4, 8, '#f4f4ee'); p(15, 14 + d, 2, 7, '#a82d2d');
    p(9, 3 + d, 14, 10, SKIN); p(9, 11 + d, 14, 2, SKIN_D);
    p(9, 3 + d, 14, 1, '#b8b8b0');
    p(10, 6 + d, 5, 3, '#eef6f8'); p(17, 6 + d, 5, 3, '#eef6f8'); p(15, 7 + d, 2, 1, INK);
    p(12, 7 + d, 2, 2, INK); p(19, 7 + d, 2, 2, INK);
    p(13, 11 + d, 6, 1, '#7a3a2a');
    p(26, 8 + d * 2, 3, 6, '#6b3a16'); p(24, 14 + d * 2, 7, 3, '#2b2b35'); p(24, 17 + d * 2, 7, 1, '#b5302a');
    p(25, 18, 3, 6, '#5a606c'); p(4, 14 + d, 3, 10, '#5a606c');
  },
};

export function monsterSprite(id: MonsterId, frame: number, flip = false) {
  return sprite(`m:${id}:${frame % 2}`, (p) => MONSTER[id](p, frame % 2), flip);
}

export const objects = {
  chest: () => sprite('o:chest', (p) => {
    p(5, 27, 22, 3, SHADOW);
    p(6, 12, 20, 7, '#9a5f2a'); p(6, 18, 20, 10, '#7a4620'); p(6, 18, 20, 1, '#2b1a0e');
    p(6, 12, 2, 16, '#d9a441'); p(24, 12, 2, 16, '#d9a441'); p(14, 16, 4, 6, '#f1cf6a'); p(15, 19, 2, 2, INK);
    p(8, 13, 16, 1, '#b97a3a');
  }),
  door: () => sprite('o:door', (p) => {
    // Randlos: Die Zarge füllt das ganze Feld, sonst sieht man zwischen Tür und Wand durch.
    p(0, 0, 32, 32, '#3a2211');
    p(2, 2, 28, 28, '#4a2d16');
    for (let x = 4; x < 28; x += 6) p(x, 3, 5, 26, '#7c4d26');
    p(2, 9, 28, 2, '#2a2a30'); p(2, 21, 28, 2, '#2a2a30');
    p(23, 14, 3, 4, '#e0ac3c');
  }),
  exit: () => sprite('o:exit', (p) => {
    p(3, 4, 26, 25, '#2a1c12');
    p(5, 6, 22, 5, '#b09a78'); p(7, 11, 18, 4, '#937d5e'); p(9, 15, 14, 4, '#755f45');
    p(11, 19, 10, 4, '#574533'); p(13, 23, 6, 4, '#3c2e22');
    p(3, 4, 26, 2, '#e0ac3c');
  }),
  logbuch: () => sprite('o:logbuch', (p) => {
    p(6, 26, 20, 3, SHADOW);
    p(7, 8, 18, 19, '#7a2f2a'); p(9, 8, 2, 19, '#541f1b'); p(12, 11, 11, 7, '#f0e4c6');
    p(13, 13, 9, 1, '#7a6a4a'); p(13, 15, 7, 1, '#7a6a4a'); p(23, 9, 2, 17, '#f0e4c6');
  }),
  schluessel: () => sprite('o:schluessel', (p) => {
    p(7, 26, 18, 3, SHADOW);
    p(9, 7, 11, 11, '#e0ac3c'); p(12, 10, 5, 5, '#3a2b1e');
    p(16, 15, 3, 3, '#f1cf6a'); p(18, 17, 3, 3, '#e0ac3c'); p(20, 19, 3, 3, '#e0ac3c');
    p(22, 21, 3, 3, '#e0ac3c'); p(20, 23, 2, 3, '#e0ac3c'); p(24, 19, 3, 2, '#e0ac3c');
  }),
  karte: () => sprite('o:karte', (p) => {
    p(5, 26, 22, 3, SHADOW);
    p(5, 8, 22, 18, '#ecdcae'); p(5, 8, 22, 2, '#c9b47d'); p(5, 24, 22, 2, '#c9b47d');
    p(9, 12, 7, 3, '#7fb0a8'); p(14, 15, 6, 3, '#7fb0a8');
    p(21, 17, 3, 1, '#b5302a'); p(22, 16, 1, 3, '#b5302a');
  }),
  netz: () => sprite('o:netz', (p) => {
    const c = 'rgba(245,235,205,.9)';
    for (let i = 7; i < 27; i += 5) { p(i, 7, 1, 21, c); p(5, i, 23, 1, c); }
  }),
  fischbroetchen: () => sprite('o:fisch', (p) => {
    p(5, 24, 22, 3, SHADOW);
    p(5, 11, 22, 5, '#d99f58'); p(7, 9, 18, 3, '#e8b873');
    p(4, 16, 24, 3, '#79a65a'); p(6, 18, 20, 2, '#c9d3da'); p(25, 17, 4, 3, '#a9b6bf');
    p(5, 20, 22, 4, '#c98b47');
  }),
  friesennerz: () => sprite('o:nerz', (p) => {
    p(9, 8, 14, 18, '#f3c623'); p(5, 9, 4, 13, '#c99a12'); p(23, 9, 4, 13, '#c99a12');
    p(11, 5, 10, 4, '#ffd94a'); p(15, 9, 2, 17, '#c99a12');
  }),
  bootshaken: () => sprite('o:haken', (p) => {
    p(15, 7, 2, 23, '#8a5a2b'); p(15, 4, 8, 3, '#d9a441'); p(21, 4, 3, 7, '#d9a441'); p(18, 9, 4, 2, '#d9a441');
  }),
  katzenohren: () => sprite('o:katze', (p) => {
    p(6, 24, 20, 3, '#3a3440'); p(5, 22, 2, 3, '#3a3440'); p(25, 22, 2, 3, '#3a3440');
    catEars((x, y, w, h, c) => p(x - 2, y + 11, w + 1, h + 1, c), 0);
    catEars((x, y, w, h, c) => p(x + 2, y + 11, w + 1, h + 1, c), 0);
  }),
  gummistiefel: () => sprite('o:stiefel', (p) => {
    p(11, 6, 8, 18, '#2e8b57'); p(11, 22, 15, 5, '#2e8b57'); p(11, 27, 16, 2, '#1d5c39'); p(11, 6, 8, 2, '#57b47f');
  }),
  akte: () => sprite('o:akte', (p) => {
    p(6, 26, 20, 3, SHADOW);
    p(7, 8, 18, 19, '#d9c06a'); p(7, 8, 8, 2, '#c4a84f'); p(9, 12, 14, 12, '#f4f0e0');
    p(11, 14, 10, 1, '#7a6a4a'); p(11, 17, 8, 1, '#7a6a4a'); p(16, 20, 5, 3, '#b5302a');
  }),
  feder: () => sprite('o:feder', (p) => {
    p(7, 26, 18, 3, SHADOW);
    p(7, 10, 18, 15, '#ecdcae'); p(9, 13, 12, 1, '#7a6a4a'); p(9, 16, 10, 1, '#7a6a4a');
    p(19, 4, 3, 12, '#fbfbf5'); p(17, 6, 2, 8, '#9fb6c6'); p(18, 16, 2, 5, '#3c4650');
  }),
  stempel: () => sprite('o:stempel', (p) => {
    p(6, 27, 20, 3, SHADOW);
    p(13, 5, 6, 3, '#7a4a22'); p(14, 8, 4, 8, '#9a6732');
    p(8, 16, 16, 7, '#e0ac3c'); p(8, 16, 16, 2, '#f1cf6a'); p(7, 23, 18, 3, '#b5302a');
  }),
  pumpe: () => sprite('o:pumpe', (p) => {
    p(5, 27, 22, 3, SHADOW);
    p(8, 12, 16, 16, '#5f7078'); p(8, 12, 16, 2, '#83949c'); p(14, 5, 4, 8, '#7c5a3a');
    p(9, 4, 14, 2, '#b5532f'); p(24, 18, 6, 4, '#5f7078'); p(10, 18, 12, 2, '#3e4c52');
  }),
  regal: () => sprite('o:regal', (p) => {
    p(4, 28, 24, 2, SHADOW);
    p(5, 3, 22, 26, '#6b4a2a');
    for (const y of [5, 13, 21]) {
      p(7, y, 18, 6, '#3f2c18');
      for (let x = 8; x < 24; x += 3) p(x, y + 1, 2, 5, ['#c9b47d', '#a8452c', '#7fa8c0', '#e8dcc0'][(x + y) % 4]);
    }
  }),
  fass: () => sprite('o:fass', (p) => {
    p(6, 27, 20, 3, SHADOW);
    p(8, 7, 16, 21, '#8a5a2b'); p(6, 11, 20, 13, '#9a6732'); p(10, 5, 12, 2, '#6b4420');
    p(6, 11, 20, 2, '#3a3a42'); p(6, 22, 20, 2, '#3a3a42');
    p(11, 7, 1, 21, '#6b4420'); p(16, 7, 1, 21, '#6b4420'); p(21, 7, 1, 21, '#6b4420');
  }),
  kiste: () => sprite('o:kiste', (p) => {
    p(4, 27, 24, 3, SHADOW);
    p(5, 10, 22, 18, '#b58a4f'); p(5, 10, 22, 2, '#d0a766'); p(5, 26, 22, 2, '#8a6538');
    p(5, 10, 2, 18, '#8a6538'); p(25, 10, 2, 18, '#8a6538');
    p(8, 14, 16, 2, '#8a6538'); p(8, 20, 16, 2, '#8a6538'); p(14, 12, 4, 14, '#8a6538');
  }),
  sterne: (f: number) => sprite(`o:sterne:${f % 2}`, (p) => {
    const c = '#ffe27a', o = f % 2 ? 2 : 0;
    p(7 + o, 6, 2, 2, c); p(21 - o, 4, 2, 2, c); p(14, 2 + o, 2, 2, c); p(25 - o, 9, 1, 1, c); p(5 + o, 11, 1, 1, c);
  }),
  wolke: (f: number) => sprite(`o:wolke:${f % 2}`, (p) => {
    p(9, 12, 15, 7, '#4b5563'); p(6, 14, 22, 6, '#5d6775'); p(12, 9, 9, 5, '#6d7786');
    p(11, 21, 2, 3, '#7fb7d9'); p(18, 21, 2, 3, '#7fb7d9');
    if (f % 2) { p(15, 21, 2, 4, '#ffd76a'); p(14, 25, 2, 3, '#ffd76a'); }
    else { p(14, 21, 2, 3, '#7fb7d9'); p(22, 21, 2, 3, '#7fb7d9'); }
  }),
  lanterne: (f: number) => sprite(`o:lanterne:${f % 2}`, (p) => {
    p(12, 8, 8, 2, '#2b2b35'); p(13, 10, 6, 10, '#2b2b35');
    p(14, 11, 4, 8, f % 2 ? '#ffd76a' : '#ffb545'); p(15, 13, 2, 4, '#fff2c0'); p(12, 20, 8, 2, '#2b2b35');
  }),
};

export interface Theme { floor: [string, string]; line: string; top: string; face: string; mortar: string; fog: string }

export const THEMES: Theme[] = [
  { floor: ['#b48a58', '#a97f4e'], line: '#7c5a34', top: '#6e7c86', face: '#8b3f2a', mortar: '#5e2a1c', fog: '#0d2c3a' },
  { floor: ['#a9a297', '#9c9589'], line: '#6f695f', top: '#8a4a38', face: '#a8452c', mortar: '#6d2c1b', fog: '#1a1420' },
  { floor: ['#8f8d82', '#83817a'], line: '#5e5c56', top: '#59585c', face: '#6e675f', mortar: '#47423d', fog: '#101114' },
  { floor: ['#b98a54', '#a87a47'], line: '#7a5430', top: '#e4dcc8', face: '#6f8a7a', mortar: '#4f675a', fog: '#141a24' },
  { floor: ['#a5a9a4', '#989d99'], line: '#73787a', top: '#c8c9c0', face: '#8f938a', mortar: '#6b6f68', fog: '#14171a' },
  { floor: ['#6f8a90', '#647e85'], line: '#465e66', top: '#4d6168', face: '#5a6f6a', mortar: '#3b4c49', fog: '#071a22' },
];

/** Hellt eine Farbe auf (k > 0) oder dunkelt sie ab (k < 0), k zwischen -1 und 1. */
export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k)));
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Kleiner Zufall aus einer Zahl, damit jede Variante gleich aussieht, egal wann sie gezeichnet wird. */
const rnd = (seed: number) => {
  let s = seed * 2654435761 >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
};

/** Bodenfliesen: 24 Varianten, die meisten schlicht, einzelne mit Riss, Pfütze, Gräte, Fleck, Kies oder Muschel. */
export function floorTile(t: number, variant: number) {
  const th = THEMES[t], v = variant % 24;
  return sprite(`t:f:${t}:${v}`, (p) => {
    const r = rnd(v * 31 + t);
    p(0, 0, 32, 32, shade(th.floor[v % 2], (r() - 0.5) * 0.08));
    p(0, 31, 32, 1, th.line); p(31, 0, 1, 32, th.line);
    if (t === 0 || t === 3) {
      // Holzdielen mit versetzten Stößen
      p(0, 10, 32, 1, th.line); p(0, 21, 32, 1, th.line);
      p(8 + (v % 4) * 5, 0, 1, 10, th.line); p(20 - (v % 4) * 3, 11, 1, 10, th.line); p(4 + (v % 4) * 6, 22, 1, 9, th.line);
      if (v % 3 === 0) p(3 + (v % 5) * 4, 4 + (v % 2) * 12, 1, 1, th.line);
      if (v % 4 === 1) p(12 + (v % 3) * 5, 15, 5, 1, shade(th.floor[0], -0.12));
    } else {
      // Steinplatten in vier Teilen, jede leicht anders getönt
      const k = () => (r() - 0.5) * 0.1;
      p(0, 0, 15, 15, shade(th.floor[v % 2], k())); p(16, 0, 15, 15, shade(th.floor[v % 2], k()));
      p(0, 16, 7, 15, shade(th.floor[v % 2], k())); p(8, 16, 15, 15, shade(th.floor[v % 2], k())); p(24, 16, 7, 15, shade(th.floor[v % 2], k()));
      p(15, 0, 1, 15, th.line); p(0, 15, 32, 1, th.line); p(7, 16, 1, 15, th.line); p(23, 16, 1, 15, th.line);
    }
    if (t === 5 && v % 2 === 0) { p(6, 8 + (v % 4) * 3, 14, 5, 'rgba(120,190,215,.55)'); p(9, 9 + (v % 4) * 3, 6, 1, 'rgba(225,245,250,.7)'); }
    switch (v) {
      case 5: // Riss
        p(6, 5, 1, 3, th.line); p(7, 8, 1, 2, th.line); p(8, 10, 1, 3, th.line); p(9, 13, 2, 1, th.line); p(11, 14, 1, 2, th.line);
        break;
      case 9: // Pfütze
        p(17, 19, 9, 4, 'rgba(110,170,200,.45)'); p(19, 18, 5, 1, 'rgba(110,170,200,.45)'); p(19, 20, 3, 1, 'rgba(230,245,250,.6)');
        break;
      case 11: // Fischgräte
        p(9, 21, 9, 1, '#e9e2cf'); for (let i = 0; i < 4; i++) { p(10 + i * 2, 19, 1, 2, '#e9e2cf'); p(10 + i * 2, 22, 1, 2, '#e9e2cf'); }
        p(18, 20, 2, 3, '#e9e2cf'); p(7, 20, 2, 3, '#e9e2cf');
        break;
      case 13: // Rumfleck
        p(20, 6, 6, 4, 'rgba(70,30,15,.25)'); p(21, 5, 4, 6, 'rgba(70,30,15,.25)');
        break;
      case 14: // Kies und Sand
        p(4, 25, 2, 2, shade(th.line, 0.2)); p(9, 27, 1, 1, shade(th.line, 0.2)); p(26, 4, 2, 1, shade(th.line, 0.2)); p(23, 8, 1, 1, shade(th.line, 0.2));
        break;
      case 15: // Muschel
        p(24, 24, 4, 3, '#efe3d0'); p(25, 23, 2, 1, '#efe3d0'); p(25, 25, 1, 2, '#c9b79c'); p(26, 25, 1, 2, '#c9b79c');
        break;
      default:
    }
  });
}

/** Wandfront: Ziegel einzeln getönt, dazu ab und zu Moos, ein Riss, eine nasse Spur oder ein Aushang. */
export function wallFace(t: number, variant: number) {
  const th = THEMES[t], v = variant % 12;
  return sprite(`t:wf:${t}:${v}`, (p) => {
    const r = rnd(v * 17 + t * 5);
    p(0, 0, 32, 32, th.mortar);
    for (let row = 0; row < 4; row++) {
      const off = (row + v) % 2 ? 0 : 8;
      for (let x = off - 16; x < 32; x += 16) {
        const x0 = Math.max(0, x + 1), x1 = Math.min(32, x + 16);
        if (x1 > x0) p(x0, row * 8, x1 - x0, 7, shade(th.face, (r() - 0.5) * 0.18));
      }
    }
    p(0, 0, 32, 2, 'rgba(0,0,0,.2)');
    switch (v) {
      case 3: // Moos am Fuß
        p(0, 27, 7, 5, 'rgba(70,110,50,.75)'); p(2, 25, 3, 2, 'rgba(70,110,50,.6)'); p(20, 29, 9, 3, 'rgba(70,110,50,.7)');
        break;
      case 5: // Riss
        p(18, 3, 1, 4, 'rgba(0,0,0,.45)'); p(17, 7, 1, 3, 'rgba(0,0,0,.45)'); p(18, 10, 1, 5, 'rgba(0,0,0,.45)'); p(19, 15, 1, 3, 'rgba(0,0,0,.45)');
        break;
      case 7: // Nasse Spur
        p(10, 2, 2, 24, 'rgba(40,60,80,.4)'); p(10, 26, 3, 2, 'rgba(120,180,210,.5)');
        break;
      case 9: // Aushang vom Amt
        p(11, 9, 10, 12, '#efe8d6'); p(12, 11, 8, 1, '#7a6a4a'); p(12, 13, 6, 1, '#7a6a4a'); p(12, 15, 7, 1, '#7a6a4a');
        p(16, 18, 4, 2, '#b5302a'); p(15, 9, 2, 1, '#9a9a9a');
        break;
      case 11: // Fehlender Ziegel
        p(17, 16, 14, 7, 'rgba(20,10,8,.55)');
        break;
      default:
    }
  });
}
