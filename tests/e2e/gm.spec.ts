import { expect, test } from '@playwright/test';
import { game, startGame, stubSpeech } from './helpers';

test('menschlicher Spielleiter spielt Karten mit Tinte und beendet die Runde', async ({ page }) => {
  await stubSpeech(page);
  await startGame(page, { gm: 'mensch' });
  await page.locator('[data-end]').click();
  await page.locator('[data-end]').click();
  await expect(page.locator('[data-gmend]')).toBeEnabled();
  const g = await game(page);
  expect(g.status).toBe('gm');
  await expect(page.locator('[data-card]')).toHaveCount(g.gmHand.length);
  const playable = page.locator('[data-card]:not([disabled])');
  if (await playable.count()) {
    await playable.first().click();
    await expect(page.locator('.banner')).toContainText('Spielleiter spielt');
    await expect.poll(async () => (await game(page)).tinte).toBeLessThan(g.tinte);
  }
  await page.locator('[data-gmend]').click();
  await expect.poll(async () => (await game(page)).status).toBe('play');
  expect((await game(page)).round).toBe(2);
});

test('Rechner als Spielleiter zieht durch und gibt die Runde zurück', async ({ page }) => {
  await stubSpeech(page);
  await startGame(page);
  await page.locator('[data-end]').click();
  await page.locator('[data-end]').click();
  await expect.poll(async () => (await game(page)).round, { timeout: 20_000 }).toBe(2);
  await expect(page.locator('.recap')).toBeVisible();
});
