import type { HeroId, MonsterId } from '../game/data';

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

export function heroSprite(id: HeroId, gear: string[], frame: number, flip = false, mood = 0) {
  return sprite(`h:${id}:${[...gear].sort().join()}:${frame}:${mood}`, (p) => {
    HERO[id](p, frame, gear);
    moodFace(p, frame === 1 ? 1 : 0, mood);
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

const MONSTER: Record<MonsterId, (p: Painter, f: number) => void> = {
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
  gummistiefel: () => sprite('o:stiefel', (p) => {
    p(11, 6, 8, 18, '#2e8b57'); p(11, 22, 15, 5, '#2e8b57'); p(11, 27, 16, 2, '#1d5c39'); p(11, 6, 8, 2, '#57b47f');
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
];

export function floorTile(t: number, variant: number) {
  const th = THEMES[t], v = variant % 4;
  return sprite(`t:f:${t}:${v}`, (p) => {
    p(0, 0, 32, 32, th.floor[v % 2]);
    p(0, 31, 32, 1, th.line); p(31, 0, 1, 32, th.line);
    if (t === 0 || t === 3) {
      p(0, 10, 32, 1, th.line); p(0, 21, 32, 1, th.line);
      p(8 + v * 5, 0, 1, 10, th.line); p(20 - v * 3, 11, 1, 10, th.line); p(4 + v * 6, 22, 1, 9, th.line);
    } else {
      p(15, 0, 1, 15, th.line); p(0, 15, 32, 1, th.line); p(7, 16, 1, 15, th.line); p(23, 16, 1, 15, th.line);
    }
    if (v === 1) p(5, 6, 3, 2, th.line);
    if (v === 2) p(22, 24, 4, 2, th.line);
  });
}

export function wallFace(t: number, variant: number) {
  const th = THEMES[t];
  return sprite(`t:wf:${t}:${variant % 2}`, (p) => {
    p(0, 0, 32, 32, th.face);
    for (let row = 0; row < 4; row++) {
      p(0, row * 8 + 7, 32, 1, th.mortar);
      for (let x = (row + variant) % 2 ? 0 : 8; x < 32; x += 16) p(x, row * 8, 1, 8, th.mortar);
    }
    p(0, 0, 32, 2, 'rgba(0,0,0,.2)');
  });
}
