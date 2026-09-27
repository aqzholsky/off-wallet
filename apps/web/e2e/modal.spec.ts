import { expect, test } from '@playwright/test';
import {
  A00,
  cards,
  copied,
  copyPublicKeyButton,
  deriveA00,
  ETH_PRIVATE_KEY_A00,
  ETH_PUBLIC_KEY_A00,
  evmCard,
  expectAddress,
  expectCardCount,
  failNextCopy,
  openApp,
  openPrivateKeyDialog,
  readClipboard,
  settle,
} from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await deriveA00(page);
});

test('opening derives nothing and focuses Cancel', async ({ page }) => {
  const { dialog, cancel } = await openPrivateKeyDialog(page, evmCard(page));
  await expect(dialog).toHaveAttribute('aria-labelledby', /.+/);
  await expect(dialog).toHaveAttribute('aria-describedby', /.+/);
  await expect(dialog.getByText('Copy private key').first()).toBeVisible();
  await expect(
    dialog.getByText(
      'A private key grants full control of the funds it holds. It will be placed on your system clipboard.',
    ),
  ).toBeVisible();
  await expect(dialog).toContainText("m/44'/60'/0'/0/0");
  await expect(cancel).toBeFocused();
  await settle(page);
  expect(await copied(page)).toEqual([]);
  await expect(page.getByRole('button').filter({ hasText: 'Copied' })).toHaveCount(0);
});

test('Cancel dismisses without copying and returns focus to the opener', async ({ page }) => {
  const { opener, dialog, cancel } = await openPrivateKeyDialog(page, evmCard(page));
  await cancel.click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  expect(await copied(page)).toEqual([]);
});

test('Escape dismisses without copying and returns focus to the opener', async ({ page }) => {
  const { opener, dialog } = await openPrivateKeyDialog(page, evmCard(page));
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  expect(await copied(page)).toEqual([]);
});

test('backdrop click dismisses without copying', async ({ page }) => {
  const { dialog } = await openPrivateKeyDialog(page, evmCard(page));
  await page.getByTestId('dialog-backdrop').click({ position: { x: 8, y: 8 } });
  await expect(dialog).toBeHidden();
  expect(await copied(page)).toEqual([]);
});

test('confirm copies exactly the untouched raw private key', async ({ page, browserName }) => {
  const { dialog, confirm } = await openPrivateKeyDialog(page, evmCard(page));
  await confirm.click();
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('revealed-private-key')).toHaveText(ETH_PRIVATE_KEY_A00);
  await expect.poll(() => copied(page)).toEqual([ETH_PRIVATE_KEY_A00]);
  expect(await readClipboard(page, browserName)).toBe(ETH_PRIVATE_KEY_A00);
  expect(ETH_PRIVATE_KEY_A00).toMatch(/^[0-9a-f]{64}$/);
});

test('the revealed key stays until the modal is closed', async ({ page }) => {
  const { opener, dialog, confirm } = await openPrivateKeyDialog(page, evmCard(page));
  await confirm.click();
  const revealed = page.getByTestId('revealed-private-key');
  await expect(revealed).toHaveText(ETH_PRIVATE_KEY_A00);
  await expect(dialog).toContainText('Private key copied to the clipboard.');
  await expect
    .poll(() => page.evaluate(() => document.querySelector('[inert]') !== null))
    .toBe(true);
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await expect(page.getByTestId('revealed-private-key')).toHaveCount(0);
});

test('Tab is trapped in both directions', async ({ page }) => {
  const { cancel, confirm } = await openPrivateKeyDialog(page, evmCard(page));
  await confirm.focus();
  await page.keyboard.press('Tab');
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(confirm).toBeFocused();
  await cancel.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(confirm).toBeFocused();
});

test('the background is inert and scroll-locked while open, released after close', async ({
  page,
}) => {
  const { dialog } = await openPrivateKeyDialog(page, evmCard(page));
  const locked = () =>
    page.evaluate(
      () => document.querySelector('[inert]') !== null && document.body.style.overflow === 'hidden',
    );
  await expect.poll(locked).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.querySelector('[inert]') === null && document.body.style.overflow !== 'hidden',
      ),
    )
    .toBe(true);
});

test('an input change while the dialog is open dismisses it without copying', async ({ page }) => {
  const { dialog } = await openPrivateKeyDialog(page, evmCard(page));
  // The background is inert, so pointer and keyboard cannot reach the field; the change is
  // injected through React's value tracker the way a late paste or autofill would land.
  await page.getByTestId('index-input').evaluate((el) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, '1');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(dialog).toBeHidden();
  await expectCardCount(page, 7);
  expect(await copied(page)).toEqual([]);
});

test('Clear session while the dialog is open dismisses it without copying', async ({ page }) => {
  const { dialog } = await openPrivateKeyDialog(page, evmCard(page));
  await page.getByRole('button', { name: 'Clear session' }).dispatchEvent('click');
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('empty-state')).toBeVisible();
  expect(await copied(page)).toEqual([]);
});

test('a key response for a superseded revision is rejected', async ({ page }) => {
  const { dialog } = await openPrivateKeyDialog(page, evmCard(page));
  // Confirm and bump the revision in the same JavaScript tick so the worker's key response
  // is guaranteed to arrive after the revision changed and must be discarded.
  await page.evaluate(() => {
    const dialogEl = document.querySelector('[role="dialog"]');
    const buttons = dialogEl ? Array.from(dialogEl.querySelectorAll('button')) : [];
    const confirmEl = buttons.find((b) => b.textContent?.trim() === 'Copy private key');
    confirmEl?.click();
    const input = document.querySelector<HTMLInputElement>('[data-testid="index-input"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (input && setter) {
      setter.call(input, '2');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await expect(dialog).toBeHidden();
  await expectCardCount(page, 7);
  await settle(page);
  await settle(page);
  expect(await copied(page)).toEqual([]);
});

test('a clipboard failure is recoverable through a fresh modal', async ({ page }) => {
  await failNextCopy(page);
  const first = await openPrivateKeyDialog(page, evmCard(page));
  await first.confirm.click();
  await settle(page);
  expect(await copied(page)).toEqual([]);
  if (await first.dialog.isVisible()) {
    await page.keyboard.press('Escape');
    await expect(first.dialog).toBeHidden();
  }
  const second = await openPrivateKeyDialog(page, evmCard(page));
  await second.confirm.click();
  await expect(page.getByTestId('revealed-private-key')).toHaveText(ETH_PRIVATE_KEY_A00);
  await expect.poll(() => copied(page)).toEqual([ETH_PRIVATE_KEY_A00]);
});

test('Copy public key copies the compressed SEC1 key without a modal', async ({ page }) => {
  await copyPublicKeyButton(evmCard(page)).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => copied(page)).toEqual([ETH_PUBLIC_KEY_A00]);
  expect(ETH_PUBLIC_KEY_A00).toMatch(/^0[23][0-9a-f]{64}$/);
});

test('the Taproot entry states that exports are the untweaked leaf', async ({ page }) => {
  const bitcoin = cards(page).filter({ hasText: A00.btcTaproot });
  await expect(bitcoin).toContainText('untweaked BIP-32 leaf');
  await expectAddress(page, A00.btcTaproot);
});
