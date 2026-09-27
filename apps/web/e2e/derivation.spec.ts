import { expect, test } from '@playwright/test';
import {
  A00,
  A23,
  ALL_A00_ADDRESSES,
  addresses,
  B15,
  cards,
  copied,
  copyAddressButtons,
  deriveA00,
  evmCard,
  expectAddress,
  expectCardCount,
  expectNoAddress,
  MNEMONIC_B,
  openApp,
  setNumber,
  typeMnemonic,
} from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('derives 7 cards and 10 unique addresses for the fixture mnemonic', async ({ page }) => {
  await deriveA00(page);
  await expect(addresses(page)).toHaveCount(10);
  for (const address of ALL_A00_ADDRESSES) {
    await expectAddress(page, address);
  }
  const texts = await addresses(page).allTextContents();
  expect(new Set(texts.map((t) => t.trim())).size).toBe(10);
  await expect(page.getByTestId('result-summary')).toContainText('7 cards');
  await expect(page.getByTestId('result-summary')).toContainText('10 addresses');
  await expect(page.getByTestId('result-summary')).toContainText('16 profiles');
});

test('collapses the seven EVM networks into one card with seven origins', async ({ page }) => {
  await deriveA00(page);
  const card = evmCard(page);
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Ethereum and 6 EVM networks');
  await expect(card.getByTestId('address')).toHaveCount(1);
  await expect(card.getByTestId('origin-chip')).toHaveCount(7);
  for (const name of [
    'Ethereum',
    'BNB Smart Chain',
    'Polygon PoS',
    'Arbitrum One',
    'OP Mainnet',
    'Base',
    'Avalanche C-Chain',
  ]) {
    await expect(card.getByTestId('origin-chip').filter({ hasText: name })).toHaveCount(1);
  }
  await expect(cards(page).filter({ hasText: 'TRON' }).getByTestId('address')).toHaveText(A00.tron);
});

test('renders the independently sourced EIP-55 address exactly', async ({ page }) => {
  await deriveA00(page);
  await expect(evmCard(page).getByTestId('address')).toHaveText(A00.evm);
});

test('account and index changes derive new addresses', async ({ page }) => {
  await deriveA00(page);
  await setNumber(page, 'Account', 2);
  await setNumber(page, 'Address index', 3);
  await expectCardCount(page, 7);
  await expectAddress(page, A23.evm);
  await expectAddress(page, A23.btcSegwit);
  await expectAddress(page, A23.solanaA);
  await expectNoAddress(page, A00.evm);
  await expectNoAddress(page, A00.btcSegwit);
});

test('passphrase and a 24-word mnemonic produce the oracle address', async ({ page }) => {
  await typeMnemonic(page, MNEMONIC_B);
  const passphrase = page.getByLabel(/BIP-39 passphrase/);
  await passphrase.click();
  await page.keyboard.type('TREZOR');
  await setNumber(page, 'Account', 1);
  await setNumber(page, 'Address index', 5);
  await expectCardCount(page, 7);
  await expectAddress(page, B15.evm);
});

test('the address Copy button copies the address and shows Copied', async ({ page }) => {
  await deriveA00(page);
  const firstCopy = copyAddressButtons(page).first();
  await firstCopy.click();
  await expect(firstCopy).toHaveText(/Copied/);
  expect(await copied(page)).toEqual([A00.btcLegacy]);
});
