import { describe, expect, it } from 'vitest';
import { applyZoom, makeView, panLimit, project, unproject } from '../../src/ui/projection';

describe('Kamera', () => {
  it('Bodenpunkte lassen sich aus Bildschirmkoordinaten zurückrechnen', () => {
    for (const angle of [35, 55, 75, 90]) {
      const v = makeView(24, 14, angle, 856, 760, 0.62);
      for (const [x, y] of [[0.5, 0.5], [12, 7], [23.5, 13.5], [3.2, 9.7]]) {
        const s = project(v, x, y);
        const back = unproject(v, s.x, s.y);
        expect(back.x).toBeCloseTo(x, 5);
        expect(back.y).toBeCloseTo(y, 5);
      }
    }
  });

  it('gekippt läuft das Brett nach hinten zusammen', () => {
    const v = makeView(24, 14, 50, 856, 760, 0.62);
    const hinten = project(v, 24, 0).x - project(v, 0, 0).x;
    const vorn = project(v, 24, 14).x - project(v, 0, 14).x;
    expect(vorn).toBeGreaterThan(hinten * 1.15);
  });

  it('das Brett bleibt innerhalb der Fläche', () => {
    for (const angle of [35, 55, 90]) {
      const v = makeView(24, 14, angle, 716, 700, 0.62);
      for (const [x, y] of [[0, 0], [24, 0], [0, 14], [24, 14]]) {
        for (const z of [0, 0.62]) {
          const p = project(v, x, y, z);
          expect(p.x).toBeGreaterThanOrEqual(-0.01);
          expect(p.x).toBeLessThanOrEqual(716.01);
          expect(p.y).toBeGreaterThanOrEqual(-0.01);
          expect(p.y).toBeLessThanOrEqual(700.01);
        }
      }
    }
  });

  it('Zoom vergrößert um die Mitte, Bodenpunkte bleiben zurückrechenbar', () => {
    const base = makeView(24, 14, 55, 856, 760, 0.62);
    const z = applyZoom(base, 2, 0, 0, 856, 760);
    const a = project(base, 12, 7), b = project(z, 12, 7);
    expect(b.x - 428).toBeCloseTo((a.x - 428) * 2, 5);
    expect(b.y - 380).toBeCloseTo((a.y - 380) * 2, 5);
    const back = unproject(z, b.x, b.y);
    expect(back.x).toBeCloseTo(12, 5);
    expect(back.y).toBeCloseTo(7, 5);
  });

  it('ohne Zoom gibt es nichts zu verschieben', () => {
    expect(panLimit(1, 800)).toBe(0);
    expect(panLimit(3, 800)).toBe(800);
  });
});
