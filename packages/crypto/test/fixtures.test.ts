import { describe, expect, it } from 'vitest';
import patterns from './fixtures/address-patterns.json';
import bech32 from './fixtures/bech32-vectors.json';
import bip32 from './fixtures/bip32-vectors.json';
import bip86 from './fixtures/bip86-vectors.json';
import eip55 from './fixtures/eip55-vectors.json';
import oracle from './fixtures/oracle-addresses.json';
import slip10 from './fixtures/slip10-ed25519-vectors.json';
import trezor from './fixtures/trezor-bip39-vectors.json';

const PROFILE_IDS = [
  'btc-legacy',
  'btc-segwit',
  'btc-taproot',
  'eth',
  'bsc',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
  'tron',
  'cosmos',
  'osmosis',
  'thorchain',
  'solana-a',
  'solana-b',
] as const;

const LANGUAGES = [
  'english',
  'japanese',
  'korean',
  'spanish',
  'chinese_simplified',
  'chinese_traditional',
  'french',
  'italian',
  'czech',
  'portuguese',
] as const;

const HEX = /^[0-9a-f]+$/;

describe('oracle-addresses.json', () => {
  it('has 48 records, three per profile', () => {
    expect(oracle.records).toHaveLength(48);
    for (const id of PROFILE_IDS) {
      expect(oracle.records.filter((r) => r.profileId === id)).toHaveLength(3);
    }
  });

  it('has at least two set-A fixtures per profile (conformance gate for status verified)', () => {
    for (const id of PROFILE_IDS) {
      expect(
        oracle.records.filter((r) => r.set === 'A' && r.profileId === id).length,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('carries well-formed keys and seeds', () => {
    expect(oracle.mnemonics.A.seed).toMatch(HEX);
    expect(oracle.mnemonics.A.seed).toHaveLength(128);
    expect(oracle.mnemonics.B.seed).toHaveLength(128);
    for (const r of oracle.records) {
      expect(r.privateKey).toMatch(HEX);
      expect(r.privateKey).toHaveLength(64);
      expect(r.publicKey).toMatch(HEX);
      expect(r.publicKey).toHaveLength(r.profileId.startsWith('solana') ? 64 : 66);
      expect(r.path.startsWith('m/')).toBe(true);
    }
  });

  it('agrees with the BIP-86 reference on the first Taproot address', () => {
    const taproot = oracle.records.find(
      (r) => r.profileId === 'btc-taproot' && r.account === 0 && r.index === 0,
    );
    expect(taproot?.address).toBe(bip86.entries[0]?.address);
    expect(taproot?.publicKey.slice(2)).toBe(bip86.entries[0]?.internalKey);
  });
});

describe('reference vectors', () => {
  it('BIP-32 has four vectors with expected chain counts', () => {
    expect(bip32.vector1.chains).toHaveLength(6);
    expect(bip32.vector2.chains).toHaveLength(6);
    expect(bip32.vector3.chains).toHaveLength(2);
    expect(bip32.vector4.chains).toHaveLength(3);
  });

  it('SLIP-0010 has two ed25519 vectors of six chains each', () => {
    expect(slip10.vector1.chains).toHaveLength(6);
    expect(slip10.vector2.chains).toHaveLength(6);
    for (const c of [...slip10.vector1.chains, ...slip10.vector2.chains]) {
      expect(c.public.startsWith('00')).toBe(true);
      expect(c.public).toHaveLength(66);
    }
  });

  it('Trezor vectors cover all ten product languages with 12- and 24-word entries', () => {
    for (const lang of LANGUAGES) {
      const entries = trezor[lang];
      expect(entries.length).toBeGreaterThanOrEqual(16);
      expect(entries.filter((e) => e[0]?.length === 32).length).toBeGreaterThanOrEqual(8);
      expect(entries.filter((e) => e[0]?.length === 64).length).toBeGreaterThanOrEqual(8);
    }
  });

  it('bech32 and EIP-55 lists are non-empty', () => {
    expect(bech32.bech32Valid.length).toBeGreaterThan(0);
    expect(bech32.bech32Invalid.length).toBeGreaterThan(0);
    expect(bech32.bech32mValid.length).toBeGreaterThan(0);
    expect(bech32.bech32mInvalid.length).toBeGreaterThan(0);
    expect(bech32.segwitValid).toHaveLength(8);
    expect(bech32.segwitInvalid).toHaveLength(15);
    expect(eip55.valid).toHaveLength(8);
  });
});

describe('address-patterns.json', () => {
  it('has at least one compilable pattern per profile', () => {
    for (const id of PROFILE_IDS) {
      const list = patterns.patterns[id];
      expect(list.length).toBeGreaterThan(0);
      for (const p of list) expect(() => new RegExp(p.pattern)).not.toThrow();
    }
  });
});
