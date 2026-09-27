import { expect, type Page, test } from '@playwright/test';
import { cards, copyAddressButtons, deriveA00, mnemonicInput, openApp } from './helpers.ts';

async function storageState(page: Page) {
  return page.evaluate(async () => {
    const databases =
      typeof indexedDB.databases === 'function' ? (await indexedDB.databases()).length : 0;
    return {
      local: localStorage.length,
      session: sessionStorage.length,
      cookie: document.cookie,
      databases,
      search: location.search,
      hash: location.hash,
    };
  });
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('Clear session empties every field and result', async ({ page }) => {
  await deriveA00(page);
  const passphrase = page.getByLabel(/BIP-39 passphrase/);
  await passphrase.click();
  await page.keyboard.type('x');
  await page.getByRole('button', { name: 'Clear session' }).click();
  await expect(mnemonicInput(page)).toHaveValue('');
  await expect(passphrase).toHaveValue('');
  await expect(page.getByLabel('Account', { exact: true })).toHaveValue('0');
  await expect(page.getByLabel('Address index', { exact: true })).toHaveValue('0');
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('a reload restores nothing', async ({ page }) => {
  await deriveA00(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'One phrase. Your addresses.' })).toBeVisible();
  await expect(mnemonicInput(page)).toHaveValue('');
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('no web storage, cookies, databases or URL state are written', async ({ page }) => {
  await deriveA00(page);
  await copyAddressButtons(page).first().click();
  expect(await storageState(page)).toEqual({
    local: 0,
    session: 0,
    cookie: '',
    databases: 0,
    search: '',
    hash: '',
  });
  await page.getByRole('button', { name: 'Clear session' }).click();
  expect(await storageState(page)).toEqual({
    local: 0,
    session: 0,
    cookie: '',
    databases: 0,
    search: '',
    hash: '',
  });
});
