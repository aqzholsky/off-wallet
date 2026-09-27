import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';

// Firefox and WebKit reject clipboard permission grants, so only the Chromium-based
// projects receive them; the other engines are observed through the init-script recorder.
const clipboardPermissions = ['clipboard-read', 'clipboard-write'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  webServer: {
    command: 'pnpm preview',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', permissions: clipboardPermissions },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], permissions: clipboardPermissions },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
