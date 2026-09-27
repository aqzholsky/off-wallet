import { expect, type Locator, type Page } from '@playwright/test';

declare global {
  interface Window {
    __copied: string[];
    __failNextCopy: boolean;
  }
}

export const MNEMONIC_A =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
export const MNEMONIC_B =
  'legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth title';

export const A00 = {
  btcLegacy: '1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA',
  btcSegwit: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu',
  btcTaproot: 'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr',
  evm: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
  tron: 'TUEZSdKsoDHQMeZwihtdoBiN46zxhGWYdH',
  cosmos: 'cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4',
  osmosis: 'osmo19rl4cm2hmr8afy4kldpxz3fka4jguq0a5m7df8',
  thorchain: 'thor1gm00vwsfcp48enm4uv9e5dhm37jtd0ye27wrx0',
  solanaA: 'GjJyeC1r2RgkuoCWMyPYkCWSGSGLcz266EaAkLA27AhL',
  solanaB: 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk',
} as const;

export const A23 = {
  evm: '0x954716F967d4C90F47fd03655319C4d18ff36F69',
  btcSegwit: 'bc1qzdl22z6yd4wx92k043hy2uaa9jrtctlhm8nd4w',
  solanaA: 'Ag74i82rUZBTgMGLacCA1ZLnotvAca8CLscXcrG6Nwem',
} as const;

export const B15 = {
  evm: '0x103D186e7Ef1d00A2539dd323FBc3098999BBa6F',
} as const;

export const ETH_PRIVATE_KEY_A00 =
  '1ab42cc412b618bdea3a599e3c9bae199ebf030895b039e9db1e30dafb12b727';
export const ETH_PUBLIC_KEY_A00 =
  '0237b0bb7a8288d38ed49a524b5dc98cff3eb5ca824c9f9dc0dfdb3d9cd600f299';

export const ALL_A00_ADDRESSES: readonly string[] = Object.values(A00);

function installClipboardRecorder(): void {
  window.__copied = [];
  window.__failNextCopy = false;
  const real = navigator.clipboard;
  const realWrite = real?.writeText?.bind(real);
  const realRead = real?.readText?.bind(real);
  const writeText = async (text: string): Promise<void> => {
    if (window.__failNextCopy) {
      window.__failNextCopy = false;
      throw new DOMException('Clipboard write was denied', 'NotAllowedError');
    }
    window.__copied.push(text);
    if (realWrite) {
      try {
        await realWrite(text);
      } catch {
        // The recorder is the assertion surface; a real-clipboard refusal in Firefox or
        // WebKit must not turn a successful app-side copy into a test failure.
      }
    }
  };
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText, readText: realRead },
  });
}

export async function openApp(page: Page): Promise<void> {
  await page.addInitScript(installClipboardRecorder);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'One phrase. Your addresses.' })).toBeVisible();
}

export function mnemonicInput(page: Page): Locator {
  return page.getByLabel('BIP-39 mnemonic', { exact: true });
}

export async function clearMnemonic(page: Page): Promise<void> {
  const input = mnemonicInput(page);
  await input.click();
  await input.selectText();
  await page.keyboard.press('Backspace');
}

export async function typeMnemonic(page: Page, phrase: string): Promise<void> {
  await clearMnemonic(page);
  await page.keyboard.insertText(phrase);
}

export async function setNumber(
  page: Page,
  label: 'Account' | 'Address index',
  value: number,
): Promise<void> {
  const input = page.getByLabel(label, { exact: true });
  await input.click();
  await input.selectText();
  await page.keyboard.type(String(value));
}

export function cards(page: Page): Locator {
  return page.getByTestId('result-card');
}

export function addresses(page: Page): Locator {
  return page.getByTestId('address');
}

// Every key and address button carries an aria-label that names the format, so the suite
// locates them by the stable suffix rather than by the visible word alone.
export function copyAddressButtons(page: Page): Locator {
  return page.getByRole('button', { name: /^Copy .+ address$/ });
}

export function copyPublicKeyButton(scope: Locator): Locator {
  return scope.getByRole('button', { name: /^Copy .+ public key$/ });
}

export function copyPrivateKeyButtons(scope: Locator | Page): Locator {
  return scope.getByRole('button', { name: /^Copy .+ private key$/ });
}

export async function expectCardCount(page: Page, count: number): Promise<void> {
  await expect(cards(page)).toHaveCount(count);
}

export async function expectAddress(page: Page, text: string): Promise<void> {
  await expect(addresses(page).filter({ hasText: text })).toHaveCount(1);
}

export async function expectNoAddress(page: Page, text: string): Promise<void> {
  await expect(addresses(page).filter({ hasText: text })).toHaveCount(0);
}

export async function deriveA00(page: Page): Promise<void> {
  await typeMnemonic(page, MNEMONIC_A);
  await expectCardCount(page, 7);
  await expectAddress(page, A00.evm);
}

export function copied(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__copied);
}

export async function readClipboard(page: Page, browserName: string): Promise<string> {
  if (browserName === 'chromium') {
    return page.evaluate(() => navigator.clipboard.readText());
  }
  const values = await copied(page);
  return values.at(-1) ?? '';
}

export function failNextCopy(page: Page): Promise<void> {
  return page.evaluate(() => {
    window.__failNextCopy = true;
  });
}

export function settle(page: Page): Promise<void> {
  return page.waitForTimeout(400);
}

export function evmCard(page: Page): Locator {
  return cards(page).filter({ hasText: 'Ethereum' });
}

export async function openPrivateKeyDialog(
  page: Page,
  card: Locator,
): Promise<{ opener: Locator; dialog: Locator; cancel: Locator; confirm: Locator }> {
  const opener = copyPrivateKeyButtons(card).first();
  await opener.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  return {
    opener,
    dialog,
    cancel: dialog.getByRole('button', { name: 'Cancel' }),
    confirm: dialog.getByRole('button', { name: 'Copy private key' }),
  };
}
