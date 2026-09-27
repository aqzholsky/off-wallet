import { hexToBytes } from '@noble/hashes/utils.js';
import { describe, expect, it } from 'vitest';
import { type AddressRecord, deriveAddress } from '../src/derive.ts';
import { groupByAddressSpace } from '../src/group.ts';
import { registry } from '../src/registry.ts';
import oracle from './fixtures/oracle-addresses.json';

const SEED = hexToBytes(oracle.mnemonics.A.seed);
const all = (account: number, index: number): AddressRecord[] =>
  registry.enabled().map((profile) => deriveAddress(profile, SEED, { account, index }));

describe('groupByAddressSpace', () => {
  it('collapses sixteen profiles into ten groups', () => {
    const groups = groupByAddressSpace(all(0, 0));
    expect(groups).toHaveLength(10);
  });

  it('merges the seven EVM networks into one group carrying every origin', () => {
    const groups = groupByAddressSpace(all(0, 0));
    const evm = groups.find((g) => g.addressSpace.startsWith('evm:'));
    expect(evm?.address).toBe('0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
    expect(evm?.origins.map((o) => o.profileId)).toEqual([
      'eth',
      'bsc',
      'polygon',
      'arbitrum',
      'optimism',
      'base',
      'avalanche',
    ]);
    expect(evm?.format).toBe('EOA · EIP-55 checksum');
  });

  it('keeps TRON out of the EVM group', () => {
    const groups = groupByAddressSpace(all(0, 0));
    const tron = groups.find((g) => g.origins[0]?.profileId === 'tron');
    expect(tron?.origins).toHaveLength(1);
    expect(tron?.addressSpace.startsWith('evm:')).toBe(false);
    expect(tron?.address).toBe('TUEZSdKsoDHQMeZwihtdoBiN46zxhGWYdH');
  });

  it('keeps Cosmos, Osmosis and THORChain apart despite one shared coin type', () => {
    const groups = groupByAddressSpace(all(0, 0));
    const addresses = groups.map((g) => g.address);
    expect(addresses).toContain('cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4');
    expect(addresses).toContain('osmo19rl4cm2hmr8afy4kldpxz3fka4jguq0a5m7df8');
    expect(addresses).toContain('thor1gm00vwsfcp48enm4uv9e5dhm37jtd0ye27wrx0');
  });

  it('preserves insertion order of first appearance', () => {
    const groups = groupByAddressSpace(all(0, 0));
    expect(groups.map((g) => g.origins[0]?.profileId)).toEqual([
      'btc-legacy',
      'btc-segwit',
      'btc-taproot',
      'eth',
      'tron',
      'cosmos',
      'osmosis',
      'thorchain',
      'solana-a',
      'solana-b',
    ]);
  });

  it('returns an empty array for no records', () => {
    expect(groupByAddressSpace([])).toEqual([]);
  });

  it('is stable across repeated derivations of the same inputs', () => {
    expect(groupByAddressSpace(all(2, 3))).toEqual(groupByAddressSpace(all(2, 3)));
  });

  it('groups by address space, not by address text', () => {
    const records = all(0, 0);
    const groups = groupByAddressSpace(records);
    for (const group of groups) {
      for (const origin of group.origins) {
        expect(origin.addressSpace).toBe(group.addressSpace);
      }
    }
  });
});
