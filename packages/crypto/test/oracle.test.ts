import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { afterAll, describe, expect, it } from 'vitest';
import {
  deriveAddress,
  deriveKey,
  mnemonicToSeed,
  registry,
  validateMnemonic,
  wipe,
} from '../src/index.ts';
import oracle from './fixtures/oracle-addresses.json';

type SetName = 'A' | 'B';

const seeds: Record<SetName, Uint8Array> = {
  A: hexToBytes(oracle.mnemonics.A.seed),
  B: hexToBytes(oracle.mnemonics.B.seed),
};

afterAll(() => {
  wipe(seeds.A, seeds.B);
});

describe('oracle mnemonics reproduce the bip_utils seeds', () => {
  it.each(['A', 'B'] as const)('set %s', (name) => {
    const fixture = oracle.mnemonics[name];
    const canonical = validateMnemonic(fixture.mnemonic, 'english');
    const seed = mnemonicToSeed(canonical, fixture.passphrase);
    try {
      expect(bytesToHex(seed)).toBe(fixture.seed);
    } finally {
      wipe(seed);
    }
  });
});

describe('oracle sanity anchors', () => {
  it('eth (0,0) from the abandon mnemonic is the well-known address', () => {
    const record = deriveAddress(registry.get('eth'), seeds.A, { account: 0, index: 0 });
    expect(record.address).toBe('0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
  });

  it('btc-taproot (0,0) equals the first BIP-86 reference address', () => {
    const record = deriveAddress(registry.get('btc-taproot'), seeds.A, { account: 0, index: 0 });
    expect(record.address).toBe('bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr');
  });
});

describe('every bip_utils record', () => {
  it('covers 48 records across 16 profiles', () => {
    expect(oracle.records).toHaveLength(48);
    expect(new Set(oracle.records.map((r) => r.profileId)).size).toBe(16);
  });

  describe.each(oracle.records)('$set $profileId ($account,$index)', (r) => {
    const profile = registry.get(r.profileId);
    const seed = seeds[r.set as SetName];
    const params = { account: r.account, index: r.index };

    it('derives the same address, path and identity', () => {
      const record = deriveAddress(profile, seed, params);
      expect(record.address).toBe(r.address);
      expect(record.path).toBe(r.path);
      expect(record.chainId).toBe(r.chainId);
      expect(record.profileId).toBe(r.profileId);
      expect(record.account).toBe(r.account);
      if (profile.supportsIndex) {
        expect(record.index).toBe(r.index);
      } else {
        expect('index' in record).toBe(false);
      }
    });

    it('exports the same public key', () => {
      const key = deriveKey(profile, seed, params, 'public');
      try {
        expect(bytesToHex(key.bytes)).toBe(r.publicKey);
        expect(key.keyKind).toBe('public');
        expect(key.path).toBe(r.path);
        expect(key.encoding).toBe(profile.publicKeyEncoding);
      } finally {
        wipe(key.bytes);
      }
    });

    it('exports the same private key', () => {
      const key = deriveKey(profile, seed, params, 'private');
      try {
        expect(bytesToHex(key.bytes)).toBe(r.privateKey);
        expect(key.keyKind).toBe('private');
        expect(key.path).toBe(r.path);
        expect(key.encoding).toBe(profile.privateKeyEncoding);
      } finally {
        wipe(key.bytes);
      }
    });
  });
});

describe('address spaces across the oracle records', () => {
  const EVM = ['eth', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche'];

  it('all seven EVM profiles share one addressSpace for set A (0,0), and TRON does not', () => {
    const spaces = EVM.map(
      (id) => deriveAddress(registry.get(id), seeds.A, { account: 0, index: 0 }).addressSpace,
    );
    expect(new Set(spaces).size).toBe(1);
    const tron = deriveAddress(registry.get('tron'), seeds.A, { account: 0, index: 0 });
    expect(spaces).not.toContain(tron.addressSpace);
  });

  it('EVM records in the fixture file already agree on the address per (set, account, index)', () => {
    const evmRecords = oracle.records.filter((r) => EVM.includes(r.profileId));
    const byParams = new Map<string, Set<string>>();
    for (const r of evmRecords) {
      const key = `${r.set}:${r.account}:${r.index}`;
      const set = byParams.get(key) ?? new Set<string>();
      set.add(r.address);
      byParams.set(key, set);
    }
    for (const [, addresses] of byParams) {
      expect(addresses.size).toBe(1);
    }
  });
});
