import { expect, type Page, test } from '@playwright/test';
import {
  A00,
  copyAddressButtons,
  deriveA00,
  expectAddress,
  expectCardCount,
  openApp,
  settle,
} from './helpers.ts';

async function waitForIdle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

test('makes no HTTP request after load during derivation and copy', async ({ page }) => {
  await openApp(page);
  await waitForIdle(page);
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith('http')) {
      requests.push(request.url());
    }
  });
  await deriveA00(page);
  await copyAddressButtons(page).first().click();
  await settle(page);
  expect(requests).toEqual([]);
});

test('works with the network unavailable before the first derivation', async ({
  page,
  context,
}) => {
  await openApp(page);
  await waitForIdle(page);
  const attempted: string[] = [];
  if (test.info().project.name === 'webkit') {
    // Playwright WebKit refuses to start even a local Blob worker under setOffline(true),
    // so for WebKit every HTTP(S) request is aborted by routing instead and its absence
    // asserted separately. This shows operation without network resources but is not the
    // same as physically disabling the network in Safari.
    await context.route('**/*', (route) => {
      const url = route.request().url();
      // The inlined worker is a blob: URL; aborting it would disable derivation itself, which
      // is the very thing this test needs to keep working without the network.
      if (!url.startsWith('http')) return route.continue();
      attempted.push(url);
      return route.abort();
    });
  } else {
    await context.setOffline(true);
    page.on('request', (request) => {
      if (request.url().startsWith('http')) {
        attempted.push(request.url());
      }
    });
  }
  await deriveA00(page);
  await expectCardCount(page, 7);
  await expectAddress(page, A00.btcTaproot);
  await expectAddress(page, A00.solanaB);
  expect(attempted).toEqual([]);
  if (test.info().project.name !== 'webkit') {
    await context.setOffline(false);
  }
});
