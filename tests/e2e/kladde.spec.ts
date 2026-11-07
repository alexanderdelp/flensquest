import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { stubSpeech } from './helpers';

/* Eigene Kampagnen über die Oberfläche: laden, Fehler sehen, speichern, spielen, entfernen. */

const hafen = readFileSync('kampagnen/hafen.kladde', 'utf-8');
const own = hafen.replace('kampagne hafen', 'kampagne testlauf').replace('titel: Der Fall Hafenlogbuch', 'titel: Testlauf im Keller')
  .replace(/  bild: .*\n/, '');

async function upload(page: import('@playwright/test').Page, name: string, text: string) {
  await page.locator('[data-file]').setInputFiles({ name, mimeType: 'text/plain', buffer: Buffer.from(text) });
}

test.beforeEach(async ({ page }) => {
  await stubSpeech(page);
  await page.goto('/');
  await page.locator('[data-new]').click();
});

test('eigene Kampagne laden, spielen und nach dem Neuladen wiederfinden', async ({ page }) => {
  await upload(page, 'testlauf.kladde', own);
  await expect(page.locator('.notice.ok')).toContainText('„Testlauf im Keller“ ist geladen: 5 Kapitel.');
  await expect(page.locator('[data-campaign="testlauf"]')).toContainText('eigene');
  await page.reload();
  await page.locator('[data-new]').click();
  await page.locator('[data-campaign="testlauf"]').click();
  await page.locator('[data-hero="joern"]').click();
  await page.locator('[data-start]').click();
  await expect(page.locator('h2')).toHaveText('Moin an der Hafenspitze');
});

test('fehlerhafte Datei zeigt Fehler mit Zeilennummer und lädt nichts', async ({ page }) => {
  const broken = own.replace('ziel: bergen FlensLogbuch 📖', 'ziel: bergen').replace('belohnung: 30', 'belohnung: viel');
  await upload(page, 'kaputt.kladde', broken);
  const box = page.locator('.notice.bad');
  await expect(box).toContainText('Die Kampagne ließ sich nicht laden.');
  await expect(box).toContainText(/Zeile \d+: Ziel „bergen“ braucht Namen und Symbol/);
  await expect(box).toContainText(/Zeile \d+: belohnung braucht eine Zahl/);
  await expect(page.locator('[data-campaign="testlauf"]')).toHaveCount(0);
});

test('HTML in einer Datei wird abgelehnt', async ({ page }) => {
  await upload(page, 'boese.kladde', own.replace('titel: Testlauf im Keller', 'titel: <img src=x onerror=alert(1)>'));
  await expect(page.locator('.notice.bad')).toContainText('Spitze Klammern');
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
});

test('mitgelieferte Kampagne als Kladde-Datei speichern', async ({ page }) => {
  const download = page.waitForEvent('download');
  await page.locator('[data-export="akte"]').click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('akte.kladde');
  const text = readFileSync(await file.path(), 'utf-8');
  expect(text).toContain('kampagne akte');
});

test('eigene Kampagne entfernen', async ({ page }) => {
  await upload(page, 'testlauf.kladde', own);
  page.once('dialog', (d) => d.accept());
  await page.locator('[data-remove="testlauf"]').click();
  await expect(page.locator('.notice.ok')).toContainText('ist entfernt');
  await expect(page.locator('[data-campaign="testlauf"]')).toHaveCount(0);
  await expect(page.locator('[data-remove="hafen"]')).toHaveCount(0);
});
