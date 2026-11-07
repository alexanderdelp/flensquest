import { CHAPTERS } from '../game/data';
import type { Fx, Game, Pos } from '../game/engine';
import { activeHero, hkey, isActive, mkey } from '../game/engine';
import { HEROES, MONSTERS, type HeroId, type MonsterId } from '../game/data';
import {
  SPRITE, THEMES, floorTile, heroDown, heroSprite, monsterSprite, moodOf, objects, wallFace,
} from './sprites';
import { makeView, project, unproject, type View } from './projection';

export interface Mark extends Pos { kind: 'walk' | 'use' | 'foe'; act: string; steps?: number; tides?: number }

/** Farbe der Punkte: gleiche Farbe, gleiche Tide. */
const TIDE_DOT = ['#fff2c0', '#fff2c0', '#7fe3cf', '#9db6ff', '#e0a8ff'];

const MARK_COLOR = { walk: 'rgba(90,200,170,', use: 'rgba(240,190,70,', foe: 'rgba(235,70,55,' };

interface Vis {
  key: string; x: number; y: number; flip: boolean; walking: boolean;
  dx: number; dy: number; alpha: number; shake: number;
  hero?: HeroId; monster?: MonsterId; hp: number; maxHp: number; down: boolean; stuck: boolean; blind: boolean; gear: string[];
}
interface Floater { x: number; y: number; text: string; color: string; start: number; dur: number }
interface Shot { x: number; y: number; color: string; size: number }

const SHOT_COLOR: Record<string, string> = {
  frauke: '#dfe9ee', maren: '#fbfbf5', netz: '#f5ebcd', stempel: '#b5302a', juni: '#ffb545', licht: '#ffe27a',
};

const WALL = 0.62;
const DOOR = 0.78;

interface Box {
  x0: number; y0: number; x1: number; y1: number; h: number;
  top: string; side: string; front: HTMLCanvasElement | null; culled?: { e: boolean; w: boolean; s: boolean };
}

const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

/** Zeichnet das Spielbrett auf ein Canvas und übersetzt Klicks in Felder. */
export class Board {
  game: Game | null = null;
  marks: Mark[] = [];
  hover: Pos | null = null;
  private ctx: CanvasRenderingContext2D;
  private view: View = makeView(24, 14, 55, 100, 100, WALL);
  private floor = document.createElement('canvas');
  private floorKey = '';
  /** Blickwinkel in Grad: 90 = von oben. */
  angle = 55;
  private raf = 0;
  private time = 0;
  private vis = new Map<string, Vis>();
  private floats: Floater[] = [];
  private shots: Shot[] = [];
  /** Tempo der Animationen; Tippen während des Spielleiter-Zugs erhöht es. */
  speed = 1;

  constructor(readonly canvas: HTMLCanvasElement, private onTile: (p: Pos) => void) {
    this.ctx = canvas.getContext('2d')!;
    canvas.addEventListener('click', (e) => {
      const p = this.tileAt(e.clientX, e.clientY);
      if (p) this.onTile(p);
    });
    canvas.addEventListener('mousemove', (e) => { this.hover = this.tileAt(e.clientX, e.clientY); });
    canvas.addEventListener('mouseleave', () => { this.hover = null; });
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement!);
    this.resize();
    const loop = (t: number) => {
      this.time = t;
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { cancelAnimationFrame(this.raf); }

  private resize() {
    const r = this.canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.canvas.style.width = `${r.width}px`;
    this.canvas.style.height = `${r.height}px`;
  }

  private layout(g: Game) {
    this.view = makeView(g.w, g.h, this.angle, this.canvas.width, this.canvas.height, DOOR);
  }

  private p(x: number, y: number, z = 0) { return project(this.view, x, y, z); }

  private solid(g: Game, x: number, y: number) {
    const t = g.tiles[y]?.[x] ?? '#';
    return t === '#' || t === 'H';
  }

  tileAt(cx: number, cy: number): Pos | null {
    const g = this.game;
    if (!g) return null;
    this.layout(g);
    const r = this.canvas.getBoundingClientRect();
    const sx = ((cx - r.left) / r.width) * this.canvas.width;
    const sy = ((cy - r.top) / r.height) * this.canvas.height;
    // Aufrechte Ziele (Gegner, Türen, Truhen) lassen sich auch oben antippen.
    const upright = this.marks.filter((m) => m.kind !== 'walk').sort((a, b2) => b2.y - a.y);
    for (const m of upright) {
      const f = this.p(m.x + 0.5, m.y + 0.7);
      if (Math.abs(sx - f.x) < f.s * 0.55 && sy < f.y + f.s * 0.3 && sy > f.y - f.s * 1.15) return { x: m.x, y: m.y };
    }
    const q = unproject(this.view, sx, sy);
    const x = Math.floor(q.x), y = Math.floor(q.y);
    return x >= 0 && y >= 0 && x < g.w && y < g.h ? { x, y } : null;
  }

  /** Bildschirmmitte eines Felds in CSS-Pixeln, für Tests. */
  screenOf(x: number, y: number) {
    if (this.game) this.layout(this.game);
    const f = this.p(x + 0.5, y + 0.5);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + (f.x / this.canvas.width) * r.width, y: r.top + (f.y / this.canvas.height) * r.height };
  }

  private floorStrips(c: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number) {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = this.p(x, y + i / n), e = this.p(x + 1, y + i / n), d = this.p(x, y + (i + 1) / n);
      c.drawImage(img, 0, (i * SPRITE) / n, SPRITE, SPRITE / n, a.x, a.y, e.x - a.x + 0.6, d.y - a.y + 0.6);
    }
  }

  private buildFloor(g: Game, key: string) {
    const f = this.floor;
    f.width = this.canvas.width; f.height = this.canvas.height;
    const c = f.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.fillStyle = THEMES[g.chapter].fog;
    c.fillRect(0, 0, f.width, f.height);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (!g.seen[y][x] || this.solid(g, x, y)) continue;
      this.floorStrips(c, floorTile(g.chapter, hash(x, y)), x, y);
    }
    if (g.exit && g.seen[g.exit.y][g.exit.x]) this.floorStrips(c, objects.exit(), g.exit.x, g.exit.y);
    this.floorKey = key;
  }

  private poly(pts: { x: number; y: number }[], fill: string) {
    const { ctx } = this;
    ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineWidth = 1;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  /** Quader mit sichtbaren Seiten, Vorderseite und Deckel. */
  private box(b: Box) {
    const { x0, y0, x1, y1, h } = b, cx = this.view.cx, cull = b.culled;
    if (x1 < cx && !cull?.e) this.poly([this.p(x1, y0, h), this.p(x1, y1, h), this.p(x1, y1), this.p(x1, y0)], b.side);
    if (x0 > cx && !cull?.w) this.poly([this.p(x0, y0, h), this.p(x0, y1, h), this.p(x0, y1), this.p(x0, y0)], b.side);
    if (!cull?.s && this.p(x0, y1).y > this.p(x0, y1, h).y + 0.5) {
      if (b.front) {
        const n = 5;
        for (let i = 0; i < n; i++) {
          const a = this.p(x0, y1, h * (1 - i / n)), e = this.p(x1, y1, h * (1 - i / n)), d = this.p(x0, y1, h * (1 - (i + 1) / n));
          this.ctx.drawImage(b.front, 0, (i * SPRITE) / n, SPRITE, SPRITE / n, a.x, a.y, e.x - a.x + 0.6, d.y - a.y + 0.6);
        }
      } else {
        this.poly([this.p(x0, y1, h), this.p(x1, y1, h), this.p(x1, y1), this.p(x0, y1)], b.side);
      }
    }
    this.poly([this.p(x0, y0, h), this.p(x1, y0, h), this.p(x1, y1, h), this.p(x0, y1, h)], b.top);
  }

  private drawWall(g: Game, x: number, y: number) {
    const th = THEMES[g.chapter], v = hash(x, y);
    const culled = { e: this.solid(g, x + 1, y), w: this.solid(g, x - 1, y), s: this.solid(g, x, y + 1) };
    this.box({ x0: x, y0: y, x1: x + 1, y1: y + 1, h: WALL, top: th.top, side: th.mortar, front: wallFace(g.chapter, v), culled });
    if (!culled.s && v % 7 === 0) {
      const f = this.p(x + 0.5, y + 1, WALL * 0.62), s = f.s * 0.5;
      if (this.angle < 85) this.ctx.drawImage(objects.lanterne(Math.floor(this.time / 260) + x), f.x - s / 2, f.y - s / 2, s, s);
    }
  }

  /** Türen stehen im Durchgang: quer zur Laufrichtung, offen klappt das Blatt zur Seite. */
  private drawDoor(g: Game, x: number, y: number) {
    const northSouth = this.solid(g, x - 1, y) && this.solid(g, x + 1, y);
    const open = g.tiles[y][x] === 'O';
    const leaf = { h: DOOR, top: '#5c3a1c', side: '#7c4d26' };
    if (!open) {
      if (northSouth) this.box({ ...leaf, x0: x + 0.02, y0: y + 0.42, x1: x + 0.98, y1: y + 0.58, front: objects.door() });
      else this.box({ ...leaf, x0: x + 0.42, y0: y + 0.02, x1: x + 0.58, y1: y + 0.98, front: null });
    } else if (northSouth) {
      this.box({ ...leaf, x0: x + 0.03, y0: y + 0.08, x1: x + 0.13, y1: y + 0.92, front: null });
    } else {
      this.box({ ...leaf, x0: x + 0.08, y0: y + 0.03, x1: x + 0.92, y1: y + 0.13, front: null });
    }
  }

  private floorQuad(x: number, y: number, inset: number, fill: string, stroke?: string) {
    const pts = [this.p(x + inset, y + inset), this.p(x + 1 - inset, y + inset), this.p(x + 1 - inset, y + 1 - inset), this.p(x + inset, y + 1 - inset)];
    const { ctx } = this;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke(); }
  }

  private drawMarks() {
    const pulse = 0.5 + 0.5 * Math.sin(this.time / 300);
    for (const m of this.marks) {
      if (m.kind === 'walk') continue;
      const col = MARK_COLOR[m.kind];
      const on = this.hover?.x === m.x && this.hover?.y === m.y;
      this.floorQuad(m.x, m.y, 0.05, `${col}${on ? 0.55 : 0.14})`, `${col}${0.6 + pulse * 0.4})`);
    }
    this.drawReach(pulse);
  }

  /** Die laufende Tide zählt als 1; sonst ist die erste neue Tide die 1. */
  private dotTier(m: Mark) {
    const g = this.game!;
    return (m.tides ?? 0) + (g.steps ? 1 : 0);
  }

  /** Wegkosten am Feld unter der Maus. */
  private drawHoverInfo() {
    const m = this.marks.find((o) => o.kind === 'walk' && o.x === this.hover?.x && o.y === this.hover?.y);
    if (!m?.steps) return;
    const { ctx } = this;
    const t = m.tides ?? 0;
    const text = `${m.steps} ${m.steps === 1 ? 'Schritt' : 'Schritte'} · ${t ? `${t} ${t === 1 ? 'Tide' : 'Tiden'}` : 'keine neue Tide'}`;
    const f = this.p(m.x + 0.5, m.y + 0.5, 0.75);
    ctx.font = `bold ${Math.max(14, f.s * 0.4)}px 'Trebuchet MS', system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,20,28,.92)';
    ctx.strokeText(text, f.x, f.y);
    ctx.fillStyle = '#fff2c0';
    ctx.fillText(text, f.x, f.y);
  }

  /** Reichweite: leuchtender Rand um das Gebiet und ein Punkt auf jedem Feld. */
  private drawReach(pulse: number) {
    const g = this.game, { ctx } = this;
    const walk = this.marks.filter((m) => m.kind === 'walk');
    if (!g || !walk.length) return;
    const inside = new Set(walk.map((m) => `${m.x},${m.y}`));
    const a = activeHero(g);
    if (g.status === 'play') inside.add(`${a.x},${a.y}`);
    const has = (x: number, y: number) => inside.has(`${x},${y}`);
    for (const m of walk) {
      if (this.hover?.x === m.x && this.hover?.y === m.y) this.floorQuad(m.x, m.y, 0.04, 'rgba(255,240,170,.6)', '#fff2c0');
      const f = this.p(m.x + 0.5, m.y + 0.5);
      ctx.globalAlpha = 0.75 + pulse * 0.25;
      ctx.fillStyle = TIDE_DOT[Math.min(this.dotTier(m), 4)];
      ctx.strokeStyle = 'rgba(30,40,45,.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.s * 0.13, f.s * 0.13 * Math.max(0.45, this.view.sin), 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const edges: [number, number, number, number][] = [];
    for (const m of inside) {
      const [x, y] = m.split(',').map(Number);
      if (!has(x, y - 1)) edges.push([x, y, x + 1, y]);
      if (!has(x, y + 1)) edges.push([x, y + 1, x + 1, y + 1]);
      if (!has(x - 1, y)) edges.push([x, y, x, y + 1]);
      if (!has(x + 1, y)) edges.push([x + 1, y, x + 1, y + 1]);
    }
    for (const [width, color] of [[7, 'rgba(20,30,35,.7)'], [3.5, '#fff2c0']] as const) {
      ctx.lineWidth = width; ctx.strokeStyle = color; ctx.lineCap = 'round';
      ctx.beginPath();
      for (const [x0, y0, x1, y1] of edges) {
        const s = this.p(x0, y0), e = this.p(x1, y1);
        ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y);
      }
      ctx.stroke();
    }
  }

  /** Hüpfender Pfeil über Zielen, damit sie auch hinter Wänden auffallen. */
  private drawArrows() {
    const { ctx } = this;
    const bob = Math.sin(this.time / 220) * 0.08;
    for (const m of this.marks) {
      if (m.kind === 'walk') continue;
      const f = this.p(m.x + 0.5, m.y + 0.7, 1.15 + bob), s = f.s * 0.16;
      ctx.fillStyle = m.kind === 'foe' ? '#ff5a48' : '#ffd76a';
      ctx.strokeStyle = 'rgba(10,20,28,.85)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(f.x - s, f.y - s); ctx.lineTo(f.x + s, f.y - s); ctx.lineTo(f.x, f.y + s); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  }

  private goalSprite(g: Game) {
    const goal = CHAPTERS[g.chapter].goal;
    if (goal.type !== 'bergen') return null;
    if (goal.item.includes('Schlüssel')) return objects.schluessel();
    if (goal.item.includes('Karte')) return objects.karte();
    return objects.logbuch();
  }

  /** Figurenliste an den Spielzustand angleichen. */
  sync(g: Game) {
    const next = new Map<string, Vis>();
    const put = (key: string, p: Pos, o: Partial<Vis>) => {
      const old = this.vis.get(key);
      next.set(key, {
        key, flip: old?.flip ?? false, walking: false, dx: 0, dy: 0, alpha: 1, shake: 0,
        hp: 1, maxHp: 1, down: false, stuck: false, blind: false, gear: [], ...o, x: p.x, y: p.y,
      });
    };
    g.heroes.forEach((h) => put(hkey(h), h, { hero: h.id, down: h.down, gear: h.gear, hp: h.hp, maxHp: h.maxHp }));
    g.monsters.forEach((m) => { if (isActive(g, m)) put(mkey(m), m, { monster: m.kind, hp: m.hp, maxHp: m.maxHp, stuck: m.stuck, blind: !!m.blind }); });
    this.vis = next;
  }

  private tween(ms: number, fn: (p: number) => void): Promise<void> {
    let done = 0, last = performance.now();
    return new Promise((res) => {
      const step = () => {
        const now = performance.now();
        done += (now - last) * this.speed;
        last = now;
        const p = Math.min(1, done / ms);
        fn(p);
        if (p < 1) setTimeout(step, 16); else res();
      };
      step();
    });
  }

  private floatText(x: number, y: number, text: string, color: string, dur = 2200) {
    this.floats.push({ x, y, text, color, start: performance.now(), dur: dur / this.speed });
  }

  pause(ms: number) { return this.tween(ms, () => undefined); }

  /** Anzeigename einer Figur, auch wenn sie gerade aus dem Spiel geht. */
  label(key: string) {
    const v = this.vis.get(key);
    if (v?.hero) return HEROES[v.hero].name;
    if (v?.monster) return MONSTERS[v.monster].name;
    return '';
  }

  /** Spielt ein Ereignis ab und wartet, bis es zu sehen war. */
  async play(f: Fx): Promise<void> {
    const v = 'who' in f ? this.vis.get(f.who) : undefined;
    const target = 'target' in f ? this.vis.get(f.target) : undefined;
    switch (f.t) {
      case 'move': {
        if (!v) return;
        v.walking = true;
        for (const p of f.path) {
          const sx = v.x, sy = v.y;
          if (p.x !== sx) v.flip = p.x < sx;
          await this.tween(130, (k) => { v.x = sx + (p.x - sx) * k; v.y = sy + (p.y - sy) * k; });
        }
        v.walking = false;
        return;
      }
      case 'attack':
      case 'shot': {
        if (!v || !target) return;
        if (target.x !== v.x) v.flip = target.x < v.x;
        if (f.shot) await this.fly(v, target, f.shot);
        else await this.lunge(v, target);
        if (f.t === 'attack' && f.a) this.floatText(v.x, v.y - 0.3, `🎲 ${f.a}+${f.b}`, '#fff2c0', 2000);
        if (f.t === 'attack' && !f.hit) {
          this.floatText(target.x, target.y, 'daneben', '#d7e3e8');
          await this.tween(800, () => undefined);
        }
        return;
      }
      case 'hurt': {
        if (!v) return;
        v.hp = Math.max(0, v.hp - f.n);
        this.floatText(v.x, v.y, `-${f.n}`, '#ff6b5a');
        await this.tween(320, (k) => { v.shake = (1 - k) * 0.12 * Math.sin(k * 30); });
        v.shake = 0;
        return;
      }
      case 'heal': {
        if (!v) return;
        v.hp = Math.min(v.maxHp, v.hp + f.n);
        this.floatText(v.x, v.y, `+${f.n}`, '#7be0a8');
        await this.tween(800, () => undefined);
        return;
      }
      case 'die': {
        if (!v) return;
        await this.tween(320, (k) => { v.alpha = 1 - k; });
        this.vis.delete(f.who);
        return;
      }
      case 'float':
        this.floatText(f.at.x, f.at.y, f.text, '#ffd76a');
        await this.tween(900, () => undefined);
        return;
      default:
    }
  }

  private async lunge(v: Vis, t: Vis) {
    const nx = t.x - v.x, ny = t.y - v.y;
    await this.tween(150, (k) => { v.dx = nx * 0.45 * k; v.dy = ny * 0.45 * k; });
    await this.tween(130, (k) => { v.dx = nx * 0.45 * (1 - k); v.dy = ny * 0.45 * (1 - k); });
  }

  private async fly(v: Vis, t: Vis, kind: string) {
    const s: Shot = { x: v.x, y: v.y, color: SHOT_COLOR[kind] ?? '#fff', size: kind === 'stempel' ? 0.24 : 0.14 };
    this.shots.push(s);
    await this.tween(230, (k) => { s.x = v.x + (t.x - v.x) * k; s.y = v.y + (t.y - v.y) * k; });
    this.shots = this.shots.filter((o) => o !== s);
  }

  private overlay() {
    const { ctx } = this;
    const now = performance.now();
    for (const s of this.shots) {
      const f = this.p(s.x + 0.5, s.y + 0.6, 0.55), r = f.s * s.size;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(f.x - r - 1, f.y - r - 1, r * 2 + 2, r * 2 + 2);
      ctx.fillStyle = s.color;
      ctx.fillRect(f.x - r, f.y - r, r * 2, r * 2);
    }
    this.floats = this.floats.filter((f) => now - f.start < f.dur);
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    for (const f of this.floats) {
      const k = (now - f.start) / f.dur;
      const q = this.p(f.x + 0.5, f.y + 0.7, 1.05 + k * 0.7);
      ctx.font = `bold ${Math.max(15, q.s * 0.5)}px 'Trebuchet MS', system-ui, sans-serif`;
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.lineWidth = Math.max(3, q.s * 0.12);
      ctx.strokeStyle = 'rgba(10,20,28,.9)';
      ctx.strokeText(f.text, q.x, q.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, q.x, q.y);
    }
    ctx.globalAlpha = 1;
  }

  /** Aufrechtes Bild, das mit den Füßen auf dem Feld steht. */
  private place(i: CanvasImageSource, p: Pos, up = 0) {
    const f = this.p(p.x + 0.5, p.y + 0.7), s = f.s * 1.2;
    this.ctx.drawImage(i, f.x - s / 2, f.y - s * 0.95 - up * f.s, s, s);
  }

  private drawActor(g: Game, v: Vis, n: number, ghost: boolean) {
    const beat = Math.floor(this.time / 420);
    const pos = { x: v.x + v.dx + v.shake, y: v.y + v.dy };
    this.ctx.globalAlpha = v.alpha * (ghost ? 0.38 : 1);
    if (v.hero) {
      if (v.down) this.place(heroDown(v.hero, v.gear), pos);
      else {
        if (!ghost && v.key === hkey(activeHero(g)) && g.status === 'play') this.ring(pos);
        const walk = 2 + (Math.floor(this.time / 110) % 2);
        const mood = moodOf(v.hp, v.maxHp);
        this.place(heroSprite(v.hero, v.gear, v.walking ? walk : (beat + n) % 2, v.flip, mood), pos);
        if (mood === 2) this.place(objects.wolke(beat + n), pos, 0.85);
      }
    } else if (v.monster) {
      const frame = v.walking ? Math.floor(this.time / 110) : beat + n;
      this.place(monsterSprite(v.monster, frame, v.flip), pos);
      if (v.blind) this.place(objects.sterne(beat + n), pos, 0.45);
      else if (v.stuck) this.place(objects.netz(), pos);
      if (!ghost) this.bar(pos, v.hp / v.maxHp);
    }
    this.ctx.globalAlpha = 1;
  }

  /** Von hinten nach vorn zeichnen, damit Wände wirklich davorstehen können. */
  private scene(g: Game) {
    const list: { key: number; draw: () => void }[] = [];
    const cx = this.view.cx;
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (!g.seen[y][x]) continue;
      const t = g.tiles[y][x];
      const toward = 0.01 * (1 - Math.abs(x + 0.5 - cx) / g.w);
      if (t === '#' || t === 'H') list.push({ key: y + 1 + toward, draw: () => this.drawWall(g, x, y) });
      if (t === 'D' || t === 'O') list.push({ key: y + 0.6, draw: () => this.drawDoor(g, x, y) });
    }
    for (const c of g.chests) {
      if (g.seen[c.y][c.x]) list.push({ key: c.y + 0.7, draw: () => this.place(objects.chest(), c) });
    }
    if (g.goal && !g.goalTaken && g.seen[g.goal.y][g.goal.x]) {
      const s = this.goalSprite(g), p = g.goal;
      if (s) list.push({ key: p.y + 0.7, draw: () => this.place(s, p) });
    }
    const actors = [...this.vis.values()];
    actors.forEach((v, n) => list.push({ key: v.y + 0.75, draw: () => this.drawActor(g, v, n, false) }));
    list.sort((a, c) => a.key - c.key).forEach((i) => i.draw());
    // Figuren hinter Wänden bleiben schwach sichtbar.
    actors.forEach((v, n) => {
      const south = g.tiles[Math.round(v.y) + 1]?.[Math.round(v.x)];
      if (south === '#' || south === 'H' || south === 'D') this.drawActor(g, v, n, true);
    });
  }

  private ring(p: Pos) {
    const { ctx } = this;
    const f = this.p(p.x + 0.5, p.y + 0.7);
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = Math.max(2, f.s * 0.07);
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, f.s * 0.42, f.s * 0.42 * Math.max(0.35, this.view.sin), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  private bar(p: Pos, part: number) {
    const { ctx } = this;
    const f = this.p(p.x + 0.5, p.y + 0.7);
    const X = f.x - f.s * 0.35, Y = f.y + f.s * 0.08, w = f.s * 0.7, h = Math.max(3, f.s * 0.09);
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(X, Y, w, h);
    ctx.fillStyle = '#e8554a';
    ctx.fillRect(X, Y, w * Math.max(0, part), h);
  }

  draw() {
    const g = this.game, { ctx } = this;
    if (!g) return;
    this.layout(g);
    ctx.imageSmoothingEnabled = false;
    const key = [
      this.canvas.width, this.canvas.height, this.angle, g.chapter,
      g.seen.map((r) => r.map(Number).join('')).join(), g.tiles.map((r) => r.join('')).join(),
    ].join('|');
    if (key !== this.floorKey) this.buildFloor(g, key);
    ctx.drawImage(this.floor, 0, 0);
    this.drawMarks();
    this.scene(g);
    this.drawArrows();
    this.drawHoverInfo();
    this.overlay();
  }
}
