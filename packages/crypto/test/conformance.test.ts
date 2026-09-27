import { hexToBytes } from '@noble/hashes/utils.js';
import { describe, expect, it } from 'vitest';
import { deriveAddress, deriveKey } from '../src/derive.ts';
import { MAX_INDEX } from '../src/primitives/path.ts';
import type { AddressProfile } from '../src/profiles/profile.ts';
import { registry } from '../src/registry.ts';
import oracle from './fixtures/oracle-addresses.json';

const SEED = hexToBytes(oracle.mnemonics.A.seed);
const REJECTED = [-1, 2147483648, 0.5, Number.NaN, Number.POSITIVE_INFINITY];

const TEMPLATES: Record<
  string,
  (profile: AddressProfile, account: number, index: number) => string
> = {
  ACCOUNT: (p, account) => `m/${p.purpose}'/${p.coinType}'/${account}'`,
  ACCOUNT_CHANGE_H: (p, account) => `m/${p.purpose}'/${p.coinType}'/${account}'/0'`,
  ACCOUNT_CHANGE_INDEX_H: (p, account, index) =>
    `m/${p.purpose}'/${p.coinType}'/${account}'/0'/${index}'`,
  BIP44_FULL: (p, account, index) => `m/${p.purpose}'/${p.coinType}'/${account}'/0/${index}`,
};

describe.each(registry.list().map((profile) => [profile.id, profile] as const))(
  'conformance — %s',
  (_id, profile) => {
    it('1. has a unique id and appears in exactly one chain', () => {
      expect(registry.list().filter((p) => p.id === profile.id)).toHaveLength(1);
      const owners = registry.chains().filter((c) => c.profiles.some((p) => p.id === profile.id));
      expect(owners).toHaveLength(1);
    });

    it('2. is reachable through registry.get and its chain is registered', () => {
      expect(registry.get(profile.id)).toBe(profile);
      expect(registry.chains().map((c) => c.id)).toContain(profile.chainId);
    });

    it('3. has at least two independent fixtures if it claims to be verified', () => {
      if (profile.status !== 'verified') return;
      const fixtures = oracle.records.filter((r) => r.profileId === profile.id);
      expect(fixtures.length).toBeGreaterThanOrEqual(2);
      const distinctParams = new Set(fixtures.map((r) => `${r.account}/${r.index}`));
      expect(distinctParams.size).toBeGreaterThanOrEqual(2);
    });

    it.each(REJECTED)('4. rejects out-of-range account and index %p', (bad) => {
      expect(() => profile.derivationPath(bad, 0)).toThrowError(/PATH_INDEX_RANGE/);
      expect(() => profile.derivationPath(0, bad)).toThrowError(/PATH_INDEX_RANGE/);
    });

    it('5. ignores the index entirely when supportsIndex is false', () => {
      if (profile.supportsIndex) return;
      expect(profile.derivationPath(2, 3)).toBe(profile.derivationPath(2, 0));
      expect(profile.derivationPath(2, MAX_INDEX)).toBe(profile.derivationPath(2, 0));
      const withIndex = deriveAddress(profile, SEED, { account: 2, index: 3 });
      const without = deriveAddress(profile, SEED, { account: 2, index: 0 });
      expect(withIndex.address).toBe(without.address);
      expect('index' in withIndex).toBe(false);
    });

    it('6. builds exactly the template its pathShape declares', () => {
      const template = TEMPLATES[profile.pathShape];
      expect(template).toBeDefined();
      for (const [account, index] of [
        [0, 0],
        [2, 3],
        [MAX_INDEX, MAX_INDEX],
      ] as const) {
        expect(profile.derivationPath(account, index)).toBe(template?.(profile, account, index));
      }
    });

    it('7. produces a stable addressSpace for the same inputs', () => {
      const first = deriveAddress(profile, SEED, { account: 1, index: 2 });
      const second = deriveAddress(profile, SEED, { account: 1, index: 2 });
      expect(first.addressSpace).toBe(second.addressSpace);
      expect(first.address).toBe(second.address);
      expect(first.addressSpace).toBe(
        profile.formatFamily === 'evm'
          ? `evm:${first.address.slice(2).toLowerCase()}`
          : `${profile.formatFamily}:${first.address}`,
      );
    });

    it('8. produces only hardened path components on ed25519', () => {
      if (profile.curve !== 'ed25519') return;
      const record = deriveAddress(profile, SEED, { account: 3, index: 0 });
      for (const segment of record.path.split('/').slice(1)) {
        expect(segment.endsWith("'")).toBe(true);
      }
      expect(() => profile.deriveLeaf(SEED, "m/44'/501'/0'/0")).toThrowError(
        /ED25519_NEEDS_HARDENED/,
      );
    });

    it('exports exactly one key kind per call, in the declared encoding', () => {
      const publicKey = deriveKey(profile, SEED, { account: 0, index: 0 }, 'public');
      const privateKey = deriveKey(profile, SEED, { account: 0, index: 0 }, 'private');
      expect(publicKey.encoding).toBe(profile.publicKeyEncoding);
      expect(privateKey.encoding).toBe(profile.privateKeyEncoding);
      expect(publicKey.bytes).toHaveLength(profile.curve === 'ed25519' ? 32 : 33);
      expect(privateKey.bytes).toHaveLength(32);
      expect(publicKey.path).toBe(privateKey.path);
    });

    it('never lets a concrete class override the final Template Method', () => {
      const owners: string[] = [];
      for (
        let prototype = Object.getPrototypeOf(profile);
        prototype !== null;
        prototype = Object.getPrototypeOf(prototype)
      ) {
        if (Object.getOwnPropertyNames(prototype).includes('derivationPath')) {
          owners.push(prototype.constructor.name);
        }
      }
      expect(owners).toEqual(['AddressProfile']);
    });
  },
);

describe('cross-profile invariants', () => {
  const EVM_IDS = ['eth', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche'];

  it('the seven EVM profiles share one address space for a given seed', () => {
    const spaces = new Set(
      EVM_IDS.map(
        (id) => deriveAddress(registry.get(id), SEED, { account: 2, index: 3 }).addressSpace,
      ),
    );
    expect(spaces.size).toBe(1);
  });

  it('TRON keccak-hashes too but never shares that space', () => {
    const evm = deriveAddress(registry.get('eth'), SEED, { account: 2, index: 3 }).addressSpace;
    const tron = deriveAddress(registry.get('tron'), SEED, { account: 2, index: 3 }).addressSpace;
    expect(tron).not.toBe(evm);
    expect(tron.startsWith('evm:')).toBe(false);
  });

  it('registry.enabled() holds exactly 16 profiles across 13 networks', () => {
    expect(registry.enabled()).toHaveLength(16);
    expect(new Set(registry.enabled().map((p) => p.chainId)).size).toBe(13);
  });
});
