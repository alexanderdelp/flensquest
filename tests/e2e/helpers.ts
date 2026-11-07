import { expect, type Page } from '@playwright/test';

/** Sprachausgabe abfangen: Gesprochenes landet in window.__spoken, das Vorlesen endet sofort. */
export async function stubSpeech(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __spoken: string[] };
    w.__spoken = [];
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      w.__spoken.push(u.text);
      setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 0);
    };
    window.speechSynthesis.cancel = () => undefined;
  });
}

export const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.join(' | '));

/** Von der Startseite bis aufs Brett. */
export async function startGame(page: Page, opts: { campaign?: string; heroes?: string[]; gm?: 'mensch' | 'rechner' } = {}) {
  await page.goto('/');
  await page.locator('[data-new]').click();
  await page.locator(`[data-campaign="${opts.campaign ?? 'hafen'}"]`).click();
  for (const id of opts.heroes ?? ['nordhexe', 'joern']) await page.locator(`[data-hero="${id}"]`).click();
  if (opts.gm === 'mensch') await page.locator('[data-gm="1"]').click();
  await page.locator('[data-start]').click();
  const open = page.locator('[data-go]');
  while (await open.isVisible()) { await open.click(); }
  await expect(page.locator('canvas.board')).toBeVisible();
  await waitIdle(page);
}

/** Wartet, bis keine Animation mehr läuft und Handlungen wieder möglich sind. */
export async function waitIdle(page: Page) {
  await expect(page.locator('[data-end], [data-gmend]').first()).toBeEnabled({ timeout: 15_000 });
}

type Flens = { game: Record<string, unknown> & { heroes: { id: string; x: number; y: number }[]; turn: number }; board: unknown };
export const game = (page: Page) => page.evaluate(() => {
  const g = (window as unknown as { __flens: Flens }).__flens.game;
  return JSON.parse(JSON.stringify({ ...g, fx: [] })) as Flens['game'] & Record<string, any>;
});

/** Bildschirmmitte eines Felds in Seitenkoordinaten. */
export const screenOf = (page: Page, x: number, y: number) => page.evaluate(([x, y]) => {
  const b = (window as unknown as { __flens: { board: { screenOf(x: number, y: number): { x: number; y: number } } } }).__flens.board;
  return b.screenOf(x, y);
}, [x, y] as const);
