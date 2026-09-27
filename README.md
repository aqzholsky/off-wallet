# off-wallet

Offline multi-chain address generator. A BIP-39 mnemonic (typed or generated) becomes
addresses for 16 profiles across 13 networks, derived entirely in the browser.

- `packages/crypto` — `@off-wallet/crypto`, a framework-agnostic, DOM-free TypeScript library
  built only on `@noble/curves` and `@noble/hashes`.
- `apps/web` — React 19 + Vite reference app. English UI. No network, no storage.

## Commands

| Command | What |
|---|---|
| `pnpm install` | install |
| `pnpm typecheck` | `tsc --noEmit` for every package |
| `pnpm lint` | Biome lint + format check |
| `pnpm fix` | Biome auto-fix (run before commit) |
| `pnpm test` | Vitest, all projects |
| `pnpm build` | production build of `apps/web` into `apps/web/dist` |
| `pnpm e2e` | Playwright against the production build |

Test fixtures use public test mnemonics. Their addresses must never hold funds.

## Toolchain

Node 22, pnpm 11.1.2, TypeScript 5.9.3, Biome 2.5.14, Vitest 4.1.11, Vite 7.3.6, React 19.3.0.
`packages/crypto` typechecks with `lib: ["ES2022"]` and no DOM types on purpose: the library
must stay portable to non-browser runtimes.

## Browser suite

`pnpm build && pnpm e2e` runs Playwright serially against the production build in four
engines: Google Chrome (system install), Chromium, Firefox and WebKit. Install the managed
browsers once with `pnpm --filter web e2e:install`.

Known engine constraints:

- Playwright WebKit refuses to start even a local Blob worker under `setOffline(true)`, so the
  WebKit offline test aborts every HTTP(S) request by routing and asserts none was attempted.
  That demonstrates operation without network resources; it is not the same as physically
  disabling the network in Safari.
- WebKit follows the macOS Full Keyboard Access preference, so `Tab` never lands on a button.
  The keyboard test focuses the button directly on WebKit and asserts activation from there.
- Firefox can crash its content process after a clipboard copy when `locator.fill` is used, so
  the suite types with native keyboard events only.
- Firefox and WebKit do not grant clipboard permissions to automation. Clipboard assertions read
  an init-script recorder installed on every engine; Chromium-based projects also read the real
  clipboard.

`pnpm --filter web verify:dist` checks that `dist/` references no external resource and that the
worker and all ten wordlists are inlined into the bundle.
