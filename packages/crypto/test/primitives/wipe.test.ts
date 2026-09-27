import { describe, expect, it } from 'vitest';
import { wipe } from '../../src/primitives/wipe.ts';

describe('wipe', () => {
  it('zeroes every buffer it is given and tolerates undefined', () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([9, 9]);
    wipe(a, undefined, b);
    expect(Array.from(a)).toEqual([0, 0, 0]);
    expect(Array.from(b)).toEqual([0, 0]);
  });

  it('zeroes a subarray view without touching the rest of the backing buffer', () => {
    const backing = new Uint8Array([1, 2, 3, 4]);
    wipe(backing.subarray(1, 3));
    expect(Array.from(backing)).toEqual([1, 0, 0, 4]);
  });
});
