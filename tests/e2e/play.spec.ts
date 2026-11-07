import { expect, test } from '@playwright/test';
import { game, screenOf, spoken, startGame, stubSpeech, waitIdle } from './helpers';

test.beforeEach(async ({ page }) => { await stubSpeech(page); await startGame(page); });

test('Pfeiltasten laufen ein Feld und kosten Schritte', async ({ page }) => {
  const before = await game(page);
  const h = before.heroes[before.turn];
  await page.keyboard.press('ArrowDown');
  await waitIdle(page);
  const after = await game(page);
  expect([after.heroes[after.turn].x, after.heroes[after.turn].y]).toEqual([h.x, h.y + 1]);
  expect(after.tiden).toBe(before.tiden - 1);
});

test('Tippen auf ein markiertes Feld läuft dorthin, ohne vorzulesen', async ({ page }) => {
  const g = await game(page);
  const h = g.heroes[g.turn];
  const p = await screenOf(page, h.x, h.y + 2);
  await page.mouse.click(p.x, p.y);
  await waitIdle(page);
  const after = await game(page);
  expect(after.heroes[after.turn].y).toBe(h.y + 2);
  expect(await spoken(page)).not.toMatch(/ist dran/);
});

test('Tooltip zeigt Werte der Figur unter der Maus', async ({ page }) => {
  const g = await game(page);
  const h = g.heroes[0];
  const p = await screenOf(page, h.x, h.y);
  await page.mouse.move(p.x, p.y);
  await expect(page.locator('.tip')).toBeVisible();
  await expect(page.locator('.tip')).toContainText('Juni');
  await page.mouse.move(5, 5);
  await expect(page.locator('.tip')).toBeHidden();
});

test('Zug beenden gibt an die nächste Figur weiter', async ({ page }) => {
  await page.locator('[data-end]').click();
  await waitIdle(page);
  const g = await game(page);
  expect(g.turn).toBe(1);
  await expect(page.locator('.side .turn')).toContainText('Jörn');
});
