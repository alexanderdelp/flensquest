import { parseSettings, sentences, speechText, type AudioSettings } from './speech-text';

/** Geräusche und Ambiente entstehen im Browser, Sprache kommt vom Gerät. Keine Audiodateien. */
export type Sound =
  | 'click' | 'step' | 'door' | 'chest' | 'search' | 'eat' | 'swing' | 'miss' | 'shot' | 'hit' | 'heal'
  | 'die' | 'coin' | 'card' | 'stamp' | 'gull' | 'win' | 'lose';

const KEY = 'flensquest:audio';

export const settings: AudioSettings = (() => {
  try { return parseSettings(localStorage.getItem(KEY)); } catch { return parseSettings(null); }
})();

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambient: { stop: () => void } | null = null;
let voice: SpeechSynthesisVoice | null = null;

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* Speichern ist optional */ }
}

function context() {
  if (ctx) return ctx;
  const AC = window.AudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
  return ctx;
}

function noiseBuffer(c: AudioContext, seconds: number, brown = false) {
  const b = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return b;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = freq, delay = 0) {
  const c = context();
  if (!c || !master) return;
  const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.015, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, freq: number, vol: number, delay = 0, type: BiquadFilterType = 'lowpass') {
  const c = context();
  if (!c || !master) return;
  const t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noiseBuffer(c, Math.max(0.05, dur));
  f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t);
}

const SOUNDS: Record<Sound, () => void> = {
  click: () => tone(520, 0.04, 'triangle', 0.05),
  step: () => noise(0.06, 500, 0.1),
  door: () => { tone(90, 0.35, 'sawtooth', 0.06, 140); noise(0.1, 900, 0.14, 0.3); },
  chest: () => { noise(0.08, 1200, 0.12); tone(220, 0.25, 'square', 0.04, 330, 0.08); },
  search: () => { noise(0.15, 2200, 0.05, 0, 'bandpass'); noise(0.15, 1800, 0.05, 0.2, 'bandpass'); },
  eat: () => { noise(0.08, 1500, 0.1); noise(0.08, 1200, 0.1, 0.14); noise(0.08, 1000, 0.1, 0.28); },
  swing: () => noise(0.16, 1400, 0.1, 0, 'bandpass'),
  miss: () => tone(420, 0.22, 'sine', 0.06, 180),
  shot: () => tone(900, 0.2, 'triangle', 0.07, 220),
  hit: () => { noise(0.1, 700, 0.25); tone(130, 0.14, 'square', 0.08, 60); },
  heal: () => [523, 659, 784].forEach((f, i) => tone(f, 0.22, 'sine', 0.07, f, i * 0.09)),
  die: () => tone(300, 0.5, 'sawtooth', 0.07, 50),
  coin: () => { tone(988, 0.08, 'square', 0.04); tone(1319, 0.22, 'square', 0.04, 1319, 0.08); },
  card: () => { noise(0.2, 3000, 0.06, 0, 'highpass'); tone(330, 0.3, 'sine', 0.05, 440, 0.1); },
  stamp: () => { noise(0.08, 400, 0.35); tone(70, 0.2, 'sine', 0.2, 40); },
  gull: () => { [0, 0.2, 0.4].forEach((d) => tone(1500, 0.16, 'sawtooth', 0.025, 900, d)); },
  win: () => [392, 494, 587, 784].forEach((f, i) => tone(f, 0.35, 'triangle', 0.09, f, i * 0.16)),
  lose: () => [330, 262, 196, 147].forEach((f, i) => tone(f, 0.4, 'sawtooth', 0.05, f, i * 0.2)),
};

export function play(s: Sound) {
  if (settings.sfx) SOUNDS[s]();
}

/** Eigenes Ambiente: Wellen, Grundton, ferne Möwen und ab und zu ein Schiffshorn. */
function startAmbient() {
  const c = context();
  if (!c || !master || ambient) return;
  const bus = c.createGain();
  bus.gain.value = 0.0001;
  bus.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 3);
  bus.connect(master);

  const sea = c.createBufferSource();
  sea.buffer = noiseBuffer(c, 6, true); sea.loop = true;
  const low = c.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 520;
  const swell = c.createGain(); swell.gain.value = 0.3;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.09;
  const depth = c.createGain(); depth.gain.value = 0.2;
  lfo.connect(depth).connect(swell.gain);
  sea.connect(low).connect(swell).connect(bus);

  const drones = [55, 82.5].map((f, i) => {
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = f; o.detune.value = i * 4; g.gain.value = 0.035;
    o.connect(g).connect(bus);
    o.start();
    return o;
  });
  sea.start(); lfo.start();

  const far = (freq: number, slide: number, dur: number, type: OscillatorType, vol: number, delay = 0) => {
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  };
  let timer = 0;
  const next = () => {
    timer = window.setTimeout(() => {
      if (Math.random() < 0.8) [0, 0.3, 0.6].forEach((d) => far(1250, 800, 0.24, 'sine', 0.012, d));
      else far(98, 92, 3.5, 'sawtooth', 0.02);
      next();
    }, 14000 + Math.random() * 26000);
  };
  next();

  ambient = {
    stop() {
      clearTimeout(timer);
      const t = c.currentTime;
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), t);
      bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      [sea, lfo, ...drones].forEach((n) => n.stop(t + 0.9));
      setTimeout(() => bus.disconnect(), 1000);
    },
  };
}

export function applyMusic() {
  if (settings.music) startAmbient();
  else { ambient?.stop(); ambient = null; }
}

/** Beim ersten Tippen freischalten; Browser erlauben Ton erst nach einer Geste. */
export function unlock() {
  void context()?.resume();
  applyMusic();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }
}

function germanVoice() {
  if (voice) return voice;
  const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('de'));
  voice = all.find((v) => /anna|katja|petra|google|neural|online/i.test(v.name)) ?? all[0] ?? null;
  return voice;
}

/** Liest Text vor; das Versprechen endet mit dem Vorlesen, beim Abbruch oder nach einer Höchstzeit. */
export function say(text: string): Promise<void> {
  if (!settings.voice || !('speechSynthesis' in window)) return Promise.resolve();
  const parts = sentences(`${speechText(text)}.`.replace(/([.!?])\.$/, '$1'));
  if (!parts.length) return Promise.resolve();
  const synth = window.speechSynthesis;
  return Promise.all(parts.map((p) => new Promise<void>((res) => {
    const u = new SpeechSynthesisUtterance(p);
    const v = germanVoice();
    if (v) u.voice = v;
    u.lang = 'de-DE';
    u.rate = 1.05;
    const limit = setTimeout(res, 2500 + p.length * 140 * parts.length);
    u.onend = u.onerror = () => { clearTimeout(limit); res(); };
    synth.speak(u);
  }))).then(() => undefined);
}

export function hush() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export const voiceAvailable = () => 'speechSynthesis' in window;
