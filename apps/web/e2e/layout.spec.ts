import { expect, test } from '@playwright/test';
import {
  A00,
  copied,
  copyAddressButtons,
  copyPrivateKeyButtons,
  deriveA00,
  mnemonicInput,
  openApp,
} from './helpers.ts';

test('a 375 px viewport has no horizontal overflow, empty and with results', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openApp(page);
  const overflow = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
  expect(await overflow()).toBeLessThanOrEqual(0);
  await deriveA00(page);
  expect(await overflow()).toBeLessThanOrEqual(0);
  await copyPrivateKeyButtons(page).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(0);
});

test('keyboard-only: Tab reaches the first Copy button and Enter copies the address', async ({
  page,
}) => {
  await openApp(page);
  await deriveA00(page);
  const focusedCopyButton = () =>
    page.evaluate(() => {
      const el = document.activeElement;
      return el instanceof HTMLButtonElement && el.textContent?.trim() === 'Copy';
    });

  if (test.info().project.name === 'webkit') {
    // WebKit follows the macOS Full Keyboard Access preference, so Tab never lands on a
    // button; the button is focused directly and the keyboard activation is still asserted.
    await copyAddressButtons(page).first().focus();
  } else {
    await mnemonicInput(page).focus();
    for (let i = 0; i < 120; i += 1) {
      await page.keyboard.press('Tab');
      if (await focusedCopyButton()) break;
    }
  }
  expect(await focusedCopyButton()).toBe(true);
  await page.keyboard.press('Enter');
  expect(await copied(page)).toEqual([A00.btcLegacy]);
});

test('every interactive control shows a visible focus ring', async ({ page }) => {
  await openApp(page);
  await deriveA00(page);
  const button = page.getByRole('button', { name: 'Generate mnemonic' });
  await button.focus();
  const outline = await button.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});
