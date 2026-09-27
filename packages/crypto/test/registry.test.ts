import { describe, expect, it } from 'vitest';
import { CryptoError } from '../src/errors.ts';
import type { AddressProfile } from '../src/profiles/profile.ts';
import { registry } from '../src/registry.ts';

describe('registry', () => {
  it('lists 13 chains in catalog order', () => {
    expect(registry.chains().map((c) => c.id)).toEqual([
      'bitcoin',
      'ethereum',
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
      'solana',
    ]);
  });

  it('lists 16 profiles in chain order', () => {
    expect(registry.list().map((p) => p.id)).toEqual([
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
    ]);
  });

  it('enables exactly the verified profiles, which today is all sixteen', () => {
    expect(registry.enabled()).toHaveLength(16);
    expect(registry.enabled().every((p) => p.status === 'verified')).toBe(true);
    expect(registry.enabled().map((p) => p.id)).toEqual(registry.list().map((p) => p.id));
  });

  it('gets a profile by id and returns the same instance the chain holds', () => {
    const profile = registry.get('btc-taproot');
    expect(profile.chainId).toBe('bitcoin');
    expect(registry.chains()[0]?.profiles).toContain(profile);
    expect(registry.get('btc-taproot')).toBe(profile);
  });

  it('throws PROFILE_UNKNOWN with the requested id in details', () => {
    expect(() => registry.get('doge')).toThrowError(CryptoError);
    try {
      registry.get('doge');
    } catch (error) {
      expect((error as CryptoError).code).toBe('PROFILE_UNKNOWN');
      expect((error as CryptoError).details).toEqual({ profileId: 'doge' });
    }
  });

  it('gives every profile a unique id and puts it in exactly one chain', () => {
    const ids = registry.list().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const profile of registry.list()) {
      const owners = registry.chains().filter((c) => c.profiles.some((p) => p.id === profile.id));
      expect(owners).toHaveLength(1);
      expect(owners[0]?.id).toBe(profile.chainId);
    }
  });

  it('returns frozen lists so a consumer cannot mutate the catalog', () => {
    expect(Object.isFrozen(registry.list())).toBe(true);
    expect(Object.isFrozen(registry.enabled())).toBe(true);
    expect(Object.isFrozen(registry.chains())).toBe(true);
    for (const chain of registry.chains()) {
      expect(Object.isFrozen(chain)).toBe(true);
      expect(Object.isFrozen(chain.profiles)).toBe(true);
    }
  });

  it('refuses a push into a chain that would desynchronise chains() from list()', () => {
    const [chain] = registry.chains();
    if (!chain) throw new Error('registry.chains() is empty');
    const profiles = chain.profiles as AddressProfile[];
    expect(() => profiles.push(registry.get('eth'))).toThrowError(TypeError);
    expect(chain.profiles).toHaveLength(3);
    expect(registry.list()).toHaveLength(16);
  });
});
