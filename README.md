# off-wallet

Offline multi-chain address generator. A BIP-39 mnemonic (typed or generated) becomes addresses for 16 profiles across 13 networks, derived entirely in the browser. No network, no storage.

## Live Demo

**Try Off-Wallet:** https://off-wallet.vercel.app

## Run

Requires Node ≥ 22 and pnpm 11.1.2.

```bash
git clone https://github.com/aqzholsky/off-wallet.git
cd off-wallet
pnpm install
pnpm --filter web dev
```

Open the URL Vite prints (usually http://localhost:5173).

Production build:

```bash
pnpm build                      # output: apps/web/dist
pnpm --filter web preview       # http://127.0.0.1:4173
pnpm --filter web verify:dist   # asserts no external resources
```

## Structure

| Path | Description |
| --- | --- |
| `packages/crypto` | `@off-wallet/crypto`: DOM-free TypeScript derivation library, built only on `@noble/curves` and `@noble/hashes` |
| `apps/web` | React 19 + Vite app; derivation runs in a Web Worker |

## Crypto package

**Networks:** Bitcoin (Legacy, Native SegWit, Taproot), Ethereum, BNB Chain, Polygon, Arbitrum, Optimism, Base, Avalanche, TRON, Cosmos Hub, Osmosis, THORChain, Solana (2 path variants).

**Features:**
- BIP-39 mnemonics: 12 or 24 words, 10 languages, optional passphrase.
- BIP-32/BIP-44 for secp256k1 chains, SLIP-0010 for Solana.
- Keys are zeroed after use; errors carry only codes, never secrets.
- Tested against independent reference vectors (BIP-32/39/86, SLIP-0010, EIP-55, `bip_utils` oracle).

**Usage:**

```ts
import {
  generateMnemonic, validateMnemonic, mnemonicToSeed,
  registry, deriveAddress, wipe,
} from '@off-wallet/crypto';

const phrase = validateMnemonic(
  generateMnemonic({ language: 'english', words: 12 }),
  'english',
);
const seed = mnemonicToSeed(phrase, ''); // optional passphrase

try {
  for (const profile of registry.enabled()) {
    const { network, format, address, path } = deriveAddress(profile, seed, { account: 0, index: 0 });
    console.log(network, format, address, path);
  }
} finally {
  wipe(seed);
}
```

Other exports: `deriveKey`, `groupByAddressSpace`, `registry.get(id)`, `CryptoError`.

## Commands

| Command | What |
| --- | --- |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm lint` / `pnpm fix` | Biome check / auto-fix |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm build` | Production build |
| `pnpm --filter web e2e:install` | Install Playwright browsers (once) |
| `pnpm e2e` | Playwright on the production build (run `pnpm build` first) |

## License

[MIT](./LICENSE)
