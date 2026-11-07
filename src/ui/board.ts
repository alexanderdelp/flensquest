import { CHAPTERS } from '../game/data';
import type { Fx, Game, Pos } from '../game/engine';
import { activeHero, chestAt, hkey, isActive, mkey } from '../game/engine';
import { MONSTERS, type HeroId, type MonsterId } from '../game/data';
import {
  SPRITE, THEMES, floorTile, heroDown, heroSprite, monsterSprite, objects, wallFace, wallTop,
} from './sprites';

export interface Mark extends Pos { kind: 'walk' | 'use' | 'foe'; act: string }

const MARK_COLOR = { walk: 'rgba(90,200,170,', use: 'rgba(240,190,70,', foe: 'rgba(235,70,55,' };

interface Vis {
  key: string; x: number; y: number; flip: boolean; walking: boolean;
  dx: number; dy: number; alpha: number; shake: number;
  hero?: HeroId; monster?: MonsterId; hp: number; maxHp: number; down: boolean; stuck: boolean; gear: string[];
}
interface Floater { x: number; y: number; text: string; color: string; start: number; dur: number }
interface Shot { x: number; y: number; color: string; size: number }

const SHOT_COLOR: Record<string, string> = {
  frauke: '#dfe9ee', maren: '#fbfbf5', netz: '#f5ebcd', stempel: '#b5302a',
};

const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

/** Zeichnet das Spielbrett auf ein Canvas und übersetzt Klicks in Felder. */
export class Board {
  game: Game | null = null;
  marks: Mark[] = [];
  hover: Pos | null = null;
  private ctx: CanvasRenderingContext2D;
  private cell = 32;
  private row = 32;
  private face = 0;
  /** Blickwinkel in Grad: 90 = von oben. */
  angle = 60;
  private ox = 0;
  private oy = 0;
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
    const cw = this.canvas.width, ch = this.canvas.height;
    const rad = (this.angle * Math.PI) / 180, sin = Math.sin(rad), cos = Math.cos(rad);
    this.cell = Math.min(cw / g.w, ch / (g.h * sin));
    this.row = this.cell * sin;
    // Wände bleiben im eigenen Feld: so verdeckt keine Wand das Feld dahinter.
    this.face = Math.min(this.row * 0.75, Math.max(this.row * 0.18, this.cell * 0.8 * cos));
    this.ox = (cw - this.cell * g.w) / 2;
    this.oy = (ch - this.row * g.h) / 2;
  }

  tileAt(cx: number, cy: number): Pos | null {
    const g = this.game;
    if (!g) return null;
    this.layout(g);
    const r = this.canvas.getBoundingClientRect();
    const sx = ((cx - r.left) / r.width) * this.canvas.width;
    const sy = ((cy - r.top) / r.height) * this.canvas.height;
    const x = Math.floor((sx - this.ox) / this.cell), y = Math.floor((sy - this.oy) / this.row);
    return x >= 0 && y >= 0 && x < g.w && y < g.h ? { x, y } : null;
  }

  private img(i: CanvasImageSource, x: number, y: number, w = this.cell, h = this.cell) {
    this.ctx.drawImage(i, x, y, w, h);
  }

  private px(x: number) { return this.ox + x * this.cell; }
  private py(y: number) { return this.oy + y * this.row; }

  private drawTile(g: Game, x: number, y: number) {
    const t = g.chapter, c = this.cell, r = this.row, X = this.px(x), Y = this.py(y);
    const tile = g.tiles[y][x], v = hash(x, y);
    if (tile === '#' || tile === 'H') {
      const southOpen = y + 1 < g.h && g.seen[y + 1][x] && g.tiles[y + 1][x] !== '#' && g.tiles[y + 1][x] !== 'H';
      if (southOpen) {
        const top = r - this.face;
        this.img(wallTop(t), X, Y, c, top);
        this.img(wallFace(t, v), X, Y + top, c, this.face);
        if (v % 7 === 0) {
          const h = Math.min(this.face * 1.1, c * 0.7);
          this.img(objects.lanterne(Math.floor(this.time / 260) + x), X + (c - h) / 2, Y + top + (this.face - h) / 2, h, h);
        }
      } else {
        this.img(wallTop(t), X, Y, c, r);
      }
      return;
    }
    this.img(floorTile(t, v), X, Y, c, r);
    if (tile === 'D') {
      const h = Math.max(this.face, r * 0.6);
      this.img(wallTop(t), X, Y, c, r - h);
      this.img(objects.door(), X, Y + r - h, c, h);
    }
    if (tile === 'O') this.img(objects.doorOpen(), X, Y, c, r);
  }

  private shadeEdges(g: Game, x: number, y: number) {
    if (g.tiles[y][x] === '#' || g.tiles[y][x] === 'H') return;
    if (y > 0 && (g.tiles[y - 1][x] === '#' || g.tiles[y - 1][x] === 'H')) {
      this.ctx.fillStyle = 'rgba(0,0,0,.22)';
      this.ctx.fillRect(this.px(x), this.py(y), this.cell, this.row * 0.16);
    }
  }

  private drawMarks() {
    const { ctx, cell: c } = this;
    const pulse = 0.5 + 0.5 * Math.sin(this.time / 300);
    for (const m of this.marks) {
      const col = MARK_COLOR[m.kind];
      const on = this.hover?.x === m.x && this.hover?.y === m.y;
      const X = this.px(m.x) + c * 0.05, Y = this.py(m.y) + this.row * 0.05, s = c * 0.9, h = this.row * 0.9;
      ctx.fillStyle = `${col}${on ? 0.55 : m.kind === 'walk' ? 0.2 : 0.12})`;
      ctx.fillRect(X, Y, s, h);
      if (m.kind !== 'walk') {
        ctx.strokeStyle = `${col}${0.6 + pulse * 0.4})`;
        ctx.lineWidth = Math.max(2, c * 0.07);
        ctx.strokeRect(X, Y, s, h);
      }
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
        hp: 1, maxHp: 1, down: false, stuck: false, gear: [], ...o, x: p.x, y: p.y,
      });
    };
    g.heroes.forEach((h) => put(hkey(h), h, { hero: h.id, down: h.down, gear: h.gear, hp: h.hp, maxHp: h.maxHp }));
    g.monsters.forEach((m) => { if (isActive(g, m)) put(mkey(m), m, { monster: m.kind, hp: m.hp, maxHp: m.maxHp, stuck: m.stuck }); });
    this.vis = next;
  }

  private tween(ms: number, fn: (p: number) => void): Promise<void> {
    const dur = ms / this.speed, start = performance.now();
    return new Promise((res) => {
      const step = () => {
        const p = Math.min(1, (performance.now() - start) / dur);
        fn(p);
        if (p < 1) setTimeout(step, 16); else res();
      };
      step();
    });
  }

  private floatText(x: number, y: number, text: string, color: string, dur = 1100) {
    this.floats.push({ x, y, text, color, start: performance.now(), dur: dur / this.speed });
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
        if (f.t === 'attack' && f.a) this.floatText(v.x, v.y - 0.3, `🎲 ${f.a}+${f.b}`, '#fff2c0', 900);
        if (f.t === 'attack' && !f.hit) {
          this.floatText(target.x, target.y, 'daneben', '#d7e3e8');
          await this.tween(300, () => undefined);
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
        await this.tween(300, () => undefined);
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
        await this.tween(260, () => undefined);
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
    const { ctx, cell: c } = this;
    const now = performance.now();
    for (const s of this.shots) {
      const X = this.px(s.x + 0.5), Y = this.py(s.y + 0.5) - c * 0.3, r = c * s.size;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(X - r - 1, Y - r - 1, r * 2 + 2, r * 2 + 2);
      ctx.fillStyle = s.color;
      ctx.fillRect(X - r, Y - r, r * 2, r * 2);
    }
    this.floats = this.floats.filter((f) => now - f.start < f.dur);
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    for (const f of this.floats) {
      const k = (now - f.start) / f.dur;
      const X = this.px(f.x + 0.5), Y = this.py(f.y) - c * 0.35 - k * c * 0.7;
      ctx.font = `bold ${Math.max(15, c * 0.48)}px 'Trebuchet MS', system-ui, sans-serif`;
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.lineWidth = Math.max(3, c * 0.12);
      ctx.strokeStyle = 'rgba(10,20,28,.9)';
      ctx.strokeText(f.text, X, Y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, X, Y);
    }
    ctx.globalAlpha = 1;
  }

  private actors(g: Game) {
    const beat = Math.floor(this.time / 420);
    const list: { y: number; draw: () => void }[] = [];
    const size = this.cell * 1.15;
    const place = (i: CanvasImageSource, p: Pos) => {
      this.img(i, this.px(p.x) + (this.cell - size) / 2, this.py(p.y) + this.row * 0.92 - size, size, size);
    };
    for (const c of g.chests) {
      if (g.seen[c.y][c.x]) list.push({ y: c.y, draw: () => place(objects.chest(), c) });
    }
    if (g.exit && g.seen[g.exit.y][g.exit.x]) {
      const e = g.exit;
      list.push({ y: e.y - 0.5, draw: () => this.img(objects.exit(), this.px(e.x), this.py(e.y), this.cell, this.row) });
    }
    if (g.goal && !g.goalTaken && g.seen[g.goal.y][g.goal.x]) {
      const s = this.goalSprite(g), p = g.goal;
      if (s) list.push({ y: p.y, draw: () => place(s, p) });
    }
    const active = hkey(activeHero(g));
    let i = 0;
    for (const v of this.vis.values()) {
      const n = i++;
      const pos = { x: v.x + v.dx + v.shake, y: v.y + v.dy };
      list.push({ y: v.y, draw: () => {
        this.ctx.globalAlpha = v.alpha;
        if (v.hero) {
          if (v.down) place(heroDown(v.hero, v.gear), pos);
          else {
            if (v.key === active && g.status === 'play') this.ring(pos);
            const walk = 2 + (Math.floor(this.time / 110) % 2);
            place(heroSprite(v.hero, v.gear, v.walking ? walk : (beat + n) % 2, v.flip), pos);
          }
        } else if (v.monster) {
          const frame = v.walking ? Math.floor(this.time / 110) : beat + n;
          place(monsterSprite(v.monster, frame, v.flip), pos);
          if (v.stuck) place(objects.netz(), pos);
          this.bar(pos.x, pos.y, v.hp / v.maxHp);
        }
        this.ctx.globalAlpha = 1;
      } });
    }
    list.sort((a, b) => a.y - b.y).forEach((a) => a.draw());
  }

  private ring(p: Pos) {
    const { ctx, cell: c } = this;
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = Math.max(2, c * 0.06);
    ctx.beginPath();
    ctx.ellipse(this.px(p.x) + c / 2, this.py(p.y) + this.row * 0.82, c * 0.42, this.row * 0.16, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  private bar(x: number, y: number, f: number) {
    const { ctx, cell: c } = this;
    const X = this.px(x) + c * 0.15, Y = this.py(y) + this.row * 0.94, w = c * 0.7, h = Math.max(3, c * 0.08);
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(X, Y, w, h);
    ctx.fillStyle = '#e8554a';
    ctx.fillRect(X, Y, w * Math.max(0, f), h);
  }

  draw() {
    const g = this.game, { ctx } = this;
    if (!g) return;
    this.layout(g);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = THEMES[g.chapter].fog;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (!g.seen[y][x]) continue;
      if (chestAt(g, x, y) || g.tiles[y][x] !== undefined) this.drawTile(g, x, y);
      this.shadeEdges(g, x, y);
    }
    this.drawMarks();
    this.actors(g);
    this.overlay();
  }
}

export const nameOf = (g: Game, p: Pos) => {
  const m = g.monsters.find((o) => o.x === p.x && o.y === p.y);
  return m && isActive(g, m) ? `${MONSTERS[m.kind].name} ${m.hp}/${m.maxHp}` : '';
};

export const spriteSize = SPRITE;
