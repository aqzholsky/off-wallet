import { hexToBytes } from '@noble/hashes/utils.js';
import { afterAll, describe, expect, it } from 'vitest';
import { deriveAddress, registry, wipe } from '../src/index.ts';
import patterns from './fixtures/address-patterns.json';
import oracle from './fixtures/oracle-addresses.json';

type PatternEntry = { pattern: string; source: string; note: string; applyTo?: string };

const table: Record<string, PatternEntry[]> = patterns.patterns;
const seedA = hexToBytes(oracle.mnemonics.A.seed);

afterAll(() => {
  wipe(seedA);
});

function subject(address: string, entry: PatternEntry): string {
  return entry.applyTo === 'lowercase' ? address.toLowerCase() : address;
}

function matches(address: string, entry: PatternEntry): boolean {
  return new RegExp(entry.pattern).test(subject(address, entry));
}

describe('address-patterns.json covers exactly the registered profiles', () => {
  it('has one entry list per registry id and nothing else', () => {
    const registered = registry
      .list()
      .map((p) => p.id)
      .sort();
    expect(Object.keys(table).sort()).toEqual(registered);
  });

  it('every pattern compiles and is anchored at both ends', () => {
    for (const entries of Object.values(table)) {
      for (const entry of entries) {
        expect(() => new RegExp(entry.pattern)).not.toThrow();
        expect(entry.pattern.startsWith('^')).toBe(true);
        expect(entry.pattern.endsWith('$')).toBe(true);
      }
    }
  });
});

describe('oracle records match at least one mainnet pattern of their profile', () => {
  it.each(oracle.records)('$set $profileId ($account,$index) $address', (r) => {
    const entries = table[r.profileId];
    expect(entries).toBeDefined();
    const hit = (entries ?? []).some((entry) => matches(r.address, entry));
    expect(hit).toBe(true);
  });
});

const FRESH_PARAMS = [
  { account: 0, index: 0 },
  { account: 1, index: 0 },
  { account: 0, index: 7 },
  { account: 3, index: 3 },
];

describe('freshly derived addresses match every pattern of their profile', () => {
  describe.each(registry.list())('$id', (profile) => {
    it.each(FRESH_PARAMS)('(account $account, index $index)', (params) => {
      const record = deriveAddress(profile, seedA, params);
      for (const entry of table[profile.id] ?? []) {
        expect(matches(record.address, entry), `${record.address} vs ${entry.pattern}`).toBe(true);
      }
    });
  });
});

describe('EVM addresses carry an EIP-55 checksum, which the upstream pattern deliberately rejects', () => {
  const evm = registry.list().filter((p) => p.formatFamily === 'evm');

  it('has seven EVM profiles', () => {
    expect(evm).toHaveLength(7);
  });

  it('produces 0x + 40 hex, mixed case for at least one fresh address', () => {
    const addresses = FRESH_PARAMS.map(
      (params) => deriveAddress(registry.get('eth'), seedA, params).address,
    );
    for (const address of addresses) {
      expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
    expect(addresses.some((a) => a !== a.toLowerCase())).toBe(true);
  });

  it('upstream pattern rejects the checksummed form and accepts the lowercased form', () => {
    const [entry] = table.eth ?? [];
    expect(entry?.applyTo).toBe('lowercase');
    const address = deriveAddress(registry.get('eth'), seedA, { account: 0, index: 0 }).address;
    expect(address).toBe('0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
    const regex = new RegExp(entry?.pattern ?? '');
    expect(regex.test(address)).toBe(false);
    expect(regex.test(address.toLowerCase())).toBe(true);
  });
});

describe('Cosmos-family patterns are the derived ones and fit the 20-byte program length', () => {
  it.each(['cosmos', 'osmosis', 'thorchain'])('%s', (id) => {
    const entries = table[id] ?? [];
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) expect(entry.source).toBe('derived');
    const record = deriveAddress(registry.get(id), seedA, { account: 0, index: 0 });
    const [, data] = record.address.split('1');
    expect(data).toHaveLength(38);
  });
});
