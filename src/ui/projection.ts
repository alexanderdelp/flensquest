/** Einfache Kamera: Sie steht südlich über dem Brett und blickt im eingestellten Winkel darauf. */
export interface View {
  sin: number; cos: number; depth: number; f: number; ox: number; oy: number; cx: number; cy: number;
}

export interface Screen { x: number; y: number; s: number }

export function project(v: View, x: number, y: number, z = 0): Screen {
  const X = x - v.cx, Y = y - v.cy;
  const k = v.f / (v.depth - Y * v.cos - z * v.sin);
  return { x: v.ox + X * k, y: v.oy + (Y * v.sin - z * v.cos) * k, s: k };
}

/** Bildschirmpunkt zurück auf den Boden (z = 0). */
export function unproject(v: View, sx: number, sy: number) {
  const a = (sx - v.ox) / v.f, b = (sy - v.oy) / v.f;
  const Y = (b * v.depth) / (v.sin + b * v.cos);
  const X = a * (v.depth - Y * v.cos);
  return { x: X + v.cx, y: Y + v.cy };
}

/** Kamera so einstellen, dass das ganze Brett samt Wandhöhe ins Bild passt. */
export function makeView(w: number, h: number, angle: number, cw: number, ch: number, wall: number): View {
  const rad = (angle * Math.PI) / 180;
  const v: View = {
    sin: Math.sin(rad), cos: Math.cos(rad), depth: Math.max(w, h) * 1.05,
    f: 1, ox: 0, oy: 0, cx: w / 2, cy: h / 2,
  };
  const pts = [[0, 0], [w, 0], [0, h], [w, h]].flatMap(([x, y]) => [project(v, x, y), project(v, x, y, wall)]);
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  v.f = Math.min((cw * 0.98) / (x1 - x0), (ch * 0.98) / (y1 - y0));
  v.ox = cw / 2 - (v.f * (x0 + x1)) / 2;
  v.oy = ch / 2 - (v.f * (y0 + y1)) / 2;
  return v;
}
