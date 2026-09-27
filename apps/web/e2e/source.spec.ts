import { expect, test } from '@playwright/test';
import {
  A00,
  cards,
  expectAddress,
  expectCardCount,
  MNEMONIC_A,
  mnemonicInput,
  openApp,
  typeMnemonic,
} from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('the phrase survives a wordlist switch and derives again when switched back', async ({
  page,
}) => {
  await typeMnemonic(page, MNEMONIC_A);
  await expectCardCount(page, 7);
  const language = page.getByLabel('Mnemonic language');
  await language.selectOption({ label: 'French' });
  await expect(mnemonicInput(page)).toHaveValue(MNEMONIC_A);
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByTestId('mnemonic-error')).toBeVisible();
  await language.selectOption({ label: 'English' });
  await expect(mnemonicInput(page)).toHaveValue(MNEMONIC_A);
  await expectCardCount(page, 7);
  await expectAddress(page, A00.evm);
});

test('the phrase survives a length switch', async ({ page }) => {
  await typeMnemonic(page, MNEMONIC_A);
  await expectCardCount(page, 7);
  await page.getByText('24 words', { exact: true }).click();
  await expect(page.getByRole('radio', { name: '24 words' })).toBeChecked();
  await expect(mnemonicInput(page)).toHaveValue(MNEMONIC_A);
  await expectCardCount(page, 7);
  await page.getByText('12 words', { exact: true }).click();
  await expect(page.getByRole('radio', { name: '12 words' })).toBeChecked();
  await expect(mnemonicInput(page)).toHaveValue(MNEMONIC_A);
  await expectCardCount(page, 7);
});

test('Generate mnemonic with 24 words fills the textarea and derives', async ({ page }) => {
  await page.getByText('24 words', { exact: true }).click();
  await page.getByRole('button', { name: 'Generate mnemonic' }).click();
  await expect(mnemonicInput(page)).not.toHaveValue('');
  const value = await mnemonicInput(page).inputValue();
  expect(value.trim().split(/\s+/u)).toHaveLength(24);
  await expectCardCount(page, 7);
  await expect(page.getByTestId('mnemonic-error')).toHaveCount(0);
});

test('Generate mnemonic with 12 words fills the textarea and derives', async ({ page }) => {
  await page.getByRole('button', { name: 'Generate mnemonic' }).click();
  await expectCardCount(page, 7);
  const value = await mnemonicInput(page).inputValue();
  expect(value.trim().split(/\s+/u)).toHaveLength(12);
});

test('two generations differ', async ({ page }) => {
  const generate = page.getByRole('button', { name: 'Generate mnemonic' });
  await generate.click();
  await expectCardCount(page, 7);
  const first = await mnemonicInput(page).inputValue();
  await generate.click();
  await expect(mnemonicInput(page)).not.toHaveValue(first);
  await expectCardCount(page, 7);
});

test('Japanese generation separates words with U+3000 and derives', async ({ page }) => {
  await page.getByLabel('Mnemonic language').selectOption({ label: 'Japanese' });
  await page.getByRole('button', { name: 'Generate mnemonic' }).click();
  await expectCardCount(page, 7);
  const value = await mnemonicInput(page).inputValue();
  expect(value).toContain('　');
  expect(value.split('　')).toHaveLength(12);
});

test('own mnemonic typed in a non-English language derives', async ({ page }) => {
  await page.getByLabel('Mnemonic language').selectOption({ label: 'Japanese' });
  const japanese = Array(11).fill('あいこくしん').concat('あおぞら').join('　');
  await typeMnemonic(page, japanese);
  await expectCardCount(page, 7);
});
