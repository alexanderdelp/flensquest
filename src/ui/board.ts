import { CHAPTERS } from '../game/data';
import type { Game, Pos } from '../game/engine';
import { activeHero, chestAt, isActive } from '../game/engine';
import { MONSTERS } from '../game/data';
import {
  SPRITE, THEMES, floorTile, heroDown, heroSprite, monsterSprite, objects, wallFace, wallTop,
} from './sprites';

export interface Mark extends Pos { kind: 'walk' | 'use' | 'foe'; act: string }

const MARK_COLOR = { walk: 'rgba(90,200,170,', use: 'rgba(240,190,70,', foe: 'rgba(235,70,55,' };

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
    g.monsters.forEach((m, i) => {
      if (!isActive(g, m)) return;
      list.push({ y: m.y, draw: () => {
        place(monsterSprite(m.kind, beat + i), m);
        if (m.stuck) place(objects.netz(), m);
        this.bar(m.x, m.y, m.hp / m.maxHp);
      } });
    });
    const active = activeHero(g);
    g.heroes.forEach((h, i) => {
      list.push({ y: h.y, draw: () => {
        if (h.down) { place(heroDown(h.id, h.gear), h); return; }
        if (h === active && g.status === 'play') this.ring(h);
        place(heroSprite(h.id, h.gear, (beat + i) % 2), h);
      } });
    });
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
  }
}

export const nameOf = (g: Game, p: Pos) => {
  const m = g.monsters.find((o) => o.x === p.x && o.y === p.y);
  return m && isActive(g, m) ? `${MONSTERS[m.kind].name} ${m.hp}/${m.maxHp}` : '';
};

export const spriteSize = SPRITE;
