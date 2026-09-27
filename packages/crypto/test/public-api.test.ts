import { describe, expect, it } from 'vitest';
import * as api from '../src/index.ts';

const ABANDON =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// The export surface itself is pinned once, in boundary.test.ts; this file covers behaviour.
describe('public API', () => {
  it('exposes a working end-to-end path from phrase to grouped addresses', () => {
    const phrase = api.validateMnemonic(ABANDON, 'english');
    const seed = api.mnemonicToSeed(phrase, '');
    try {
      const records = api.registry
        .enabled()
        .map((profile) => api.deriveAddress(profile, seed, { account: 0, index: 0 }));
      const groups = api.groupByAddressSpace(records);
      expect(records).toHaveLength(16);
      expect(groups).toHaveLength(10);
      expect(groups.map((g) => g.address)).toContain('0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
    } finally {
      api.wipe(seed);
    }
  });

  it('is synchronous and returns no promises', () => {
    const seed = api.mnemonicToSeed(ABANDON, '');
    const record = api.deriveAddress(api.registry.get('eth'), seed, { account: 0, index: 0 });
    expect(record).not.toBeInstanceOf(Promise);
    api.wipe(seed);
  });
});
