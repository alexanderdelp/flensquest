/** Reine Bildschirmgeometrie fürs Brett, ohne Canvas: testbar und wiederverwendbar. */

export type Pt = { x: number; y: number };

/** Konvexe Hülle (monotone Kette): der Bildschirmumriss eines Quaders. */
export function hull(pts: Pt[]) {
  type P = Pt;
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: P, a: P, b: P) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list: P[]) => {
    const out: P[] = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
      out.push(q);
    }
    return out.slice(0, -1);
  };
  return [...half(p), ...half([...p].reverse())];
}

/** Weicher Übergang 0 bis 1. */
export const ease = (k: number) => k * k * (3 - 2 * k);
