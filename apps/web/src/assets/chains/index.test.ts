import { registry } from '@off-wallet/crypto';
import { describe, expect, it } from 'vitest';
import { chainLogo } from './index.ts';

describe('chainLogo', () => {
  it('has a bundled logo for every registered chain', () => {
    for (const chain of registry.chains()) {
      expect(typeof chainLogo[chain.id]).toBe('string');
      expect(chainLogo[chain.id]?.length).toBeGreaterThan(0);
    }
  });

  it('never points at a remote host', () => {
    for (const url of Object.values(chainLogo)) {
      expect(url.startsWith('http')).toBe(false);
    }
  });
});
