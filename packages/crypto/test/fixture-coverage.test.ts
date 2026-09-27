import { describe, expect, it } from 'vitest';
import { registry } from '../src/index.ts';
import oracle from './fixtures/oracle-addresses.json';

describe('status gating: verified requires independent fixtures', () => {
  it.each(registry.enabled())('$id has at least two set-A oracle records', (profile) => {
    // A profile may only be marked verified when independent fixtures exist for it.
    // Set A is the (0,0)/(2,3) pair every profile carries.
    const count = oracle.records.filter((r) => r.set === 'A' && r.profileId === profile.id).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('every listed profile is verified in this release, so enabled() equals list()', () => {
    expect(registry.enabled().map((p) => p.id)).toEqual(registry.list().map((p) => p.id));
    for (const profile of registry.list()) expect(profile.status).toBe('verified');
  });

  it('no oracle record refers to an unregistered profile', () => {
    const ids = new Set(registry.list().map((p) => p.id));
    for (const r of oracle.records) expect(ids.has(r.profileId)).toBe(true);
  });
});
