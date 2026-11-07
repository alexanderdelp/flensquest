import { expect, test, type Page } from '@playwright/test';
import { startGame, stubSpeech } from './helpers';

/*
 * Bildprüfungen fürs Brett: Wir halten die Animation an, zeichnen ein Bild mit und ohne Figur
 * und vergleichen Pixel an Stellen, die eine Wand zeigen muss. So fallen Fehler in der
 * Zeichenreihenfolge auf, ohne von Schriftarten oder Bildschirmgrößen abzuhängen.
 */

type Setup = { door: [number, number]; actor: 'ratte' | 'moewe' | 'juni' };

/** Zeichnet die Szene einmal mit Figur im Durchgang und einmal ohne; liefert Pixel an Wandpunkten. */
function wallPixels(page: Page, s: Setup) {
  return page.evaluate((s) => {
    type B = { stop(): void; draw(): void; sync(g: unknown): void; zoomAt(f: number): void; focusTile(x: number, y: number): void; canvasPoint(x: number, y: number, z?: number): { x: number; y: number }; time: number };
    const f = (window as unknown as { __flens: { board: B; game: any } }).__flens;
    const b = f.board, g = f.game;
    b.stop();
    g.seen = g.seen.map((r: boolean[]) => r.map(() => true));
    const [dx, dy] = s.door;
    g.tiles[dy][dx] = 'O';
    for (let i = 0; i < 4; i++) b.zoomAt(1.4);
    b.focusTile(dx, dy);
    const park = () => { g.heroes.forEach((h: any, i: number) => { h.x = 1 + i; h.y = 1; }); g.monsters.forEach((m: any, i: number) => { m.x = 20 - i; m.y = 1; }); };
    const place = () => {
      park();
      if (s.actor === 'juni') { const h = g.heroes.find((o: any) => o.id === 'nordhexe'); h.x = dx; h.y = dy; g.turn = g.heroes.indexOf(h); }
      else { const m = g.monsters[0]; m.kind = s.actor; m.x = dx; m.y = dy; }
    };
    const ctx = (document.querySelector('canvas.board') as HTMLCanvasElement).getContext('2d')!;
    // Punkte auf beiden Nachbarwänden: Deckel und Seiten unterhalb der Wandkante, vor der Standtiefe.
    const pts: [number, number, number][] = [];
    for (const wx of [dx - 1, dx + 1]) {
      for (const fx of [0.05, 0.15, 0.3]) for (const fy of [0.75, 0.85, 0.95]) {
        const x = wx === dx - 1 ? dx - fx : dx + 1 + fx;
        pts.push([x, dy + fy, 0.62], [x, dy + fy, 0.3]);
      }
    }
    const read = () => {
      b.sync(g); b.time = 123_456; b.draw();
      return pts.map(([x, y, z]) => { const p = b.canvasPoint(x, y, z); return Array.from(ctx.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data).join(','); });
    };
    park();
    const without = read();
    place();
    const withActor = read();
    return { without, withActor };
  }, s);
}

test.beforeEach(async ({ page }) => { await stubSpeech(page); await startGame(page); });

for (const actor of ['ratte', 'moewe', 'juni'] as const) {
  for (const door of [[3, 4], [15, 7]] as [number, number][]) {
    test(`${actor} im Durchgang ${door} malt nicht über die Nachbarwände`, async ({ page }) => {
      const { without, withActor } = await wallPixels(page, { door, actor });
      expect(withActor).toEqual(without);
    });
  }
}
