import { bytesToHex } from '@noble/hashes/utils.js';
import { afterAll, describe, expect, it } from 'vitest';
import {
  deriveAddress,
  deriveKey,
  mnemonicToSeed,
  registry,
  validateMnemonic,
  wipe,
} from '../src/index.ts';
import bip86 from './fixtures/bip86-vectors.json';

const seed = mnemonicToSeed(validateMnemonic(bip86.mnemonic, 'english'), '');
const taproot = registry.get('btc-taproot');

afterAll(() => {
  wipe(seed);
});

const RECEIVE_PATH = /^m\/86'\/0'\/0'\/0\/(\d+)$/;

const receiving = bip86.entries
  .map((entry) => ({ entry, match: RECEIVE_PATH.exec(entry.path) }))
  .filter(
    (x): x is { entry: (typeof bip86.entries)[number]; match: RegExpExecArray } => x.match !== null,
  )
  .map(({ entry, match }) => ({ ...entry, index: Number(match[1]) }));

describe('BIP-86 reference vectors through the btc-taproot profile', () => {
  it('uses the two receiving-branch entries and skips the change-branch entry', () => {
    // Profiles fix change = 0, so m/86'/0'/0'/1/0 is not reachable
    // through any profile and is intentionally left out of this suite.
    expect(bip86.entries).toHaveLength(3);
    expect(receiving).toHaveLength(2);
    expect(bip86.entries.some((e) => e.path === "m/86'/0'/0'/1/0")).toBe(true);
  });

  it.each(receiving)('$path → $address', ({ index, path, address }) => {
    const record = deriveAddress(taproot, seed, { account: 0, index });
    expect(record.path).toBe(path);
    expect(record.address).toBe(address);
  });

  it.each(receiving)(
    '$path public export is the untweaked internal key',
    ({ index, internalKey, outputKey }) => {
      // Taproot exports are the BIP-32 leaf, never the tweaked output key.
      // The compressed SEC1 key's x coordinate must therefore equal BIP-86's internal_key.
      const key = deriveKey(taproot, seed, { account: 0, index }, 'public');
      try {
        expect(key.bytes).toHaveLength(33);
        expect(bytesToHex(key.bytes.slice(1))).toBe(internalKey);
        expect(bytesToHex(key.bytes.slice(1))).not.toBe(outputKey);
        expect(key.encoding).toBe('SEC1 compressed · 33 bytes · hex');
      } finally {
        wipe(key.bytes);
      }
    },
  );

  it('the address encodes the tweaked output key, not the internal key', () => {
    const [first] = receiving;
    expect(first).toBeDefined();
    const record = deriveAddress(taproot, seed, { account: 0, index: first?.index ?? 0 });
    expect(record.address.startsWith('bc1p')).toBe(true);
    expect(record.address).toHaveLength(62);
    expect(record.address).toBe(first?.address);
  });
});
