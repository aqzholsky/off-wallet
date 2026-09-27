import { expect, test } from '@playwright/test';
import {
  A00,
  A23,
  cards,
  expectAddress,
  expectCardCount,
  expectNoAddress,
  MNEMONIC_A,
  mnemonicInput,
  openApp,
  setNumber,
  settle,
  typeMnemonic,
} from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('rapid edits never leave stale results on screen', async ({ page }) => {
  await typeMnemonic(page, MNEMONIC_A);
  await setNumber(page, 'Account', 2);
  await setNumber(page, 'Address index', 3);
  await expectCardCount(page, 7);
  await expectAddress(page, A23.evm);
  await expectNoAddress(page, A00.evm);
  await settle(page);
  await expectAddress(page, A23.evm);
  await expectNoAddress(page, A00.evm);
  await expect(cards(page)).toHaveCount(7);
});

test('an unknown word clears results and shows an inline error', async ({ page }) => {
  await typeMnemonic(page, MNEMONIC_A);
  await expectCardCount(page, 7);
  await mnemonicInput(page).click();
  await page.keyboard.press('End');
  await page.keyboard.insertText(' zzzz');
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByTestId('empty-state')).toBeVisible();
  const error = page.getByTestId('mnemonic-error');
  await expect(error).toBeVisible();
  await expect(error).toHaveAttribute('role', 'alert');
  await expect(error).not.toContainText('zzzz');
});

test('a wrong word count reports the length error and shows no addresses', async ({ page }) => {
  const elevenWords = MNEMONIC_A.split(' ').slice(0, 11).join(' ');
  await typeMnemonic(page, elevenWords);
  await settle(page);
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByTestId('mnemonic-error')).toBeVisible();
  await expect(page.getByTestId('mnemonic-error')).toContainText(/12|24/);
});

test('a bad checksum reports an error and shows no addresses', async ({ page }) => {
  const badChecksum = MNEMONIC_A.replace(/about$/, 'abandon');
  await typeMnemonic(page, badChecksum);
  await settle(page);
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByTestId('mnemonic-error')).toBeVisible();
});

test('results disappear immediately on input change, before new results arrive', async ({
  page,
}) => {
  await typeMnemonic(page, MNEMONIC_A);
  await expectCardCount(page, 7);
  await mnemonicInput(page).click();
  await page.keyboard.press('End');
  await page.keyboard.insertText(' ');
  await expect(cards(page)).toHaveCount(0);
  await expectCardCount(page, 7);
  await expectAddress(page, A00.evm);
});
