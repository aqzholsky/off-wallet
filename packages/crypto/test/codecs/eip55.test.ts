import { hexToBytes } from '@noble/hashes/utils.js';
import { describe, expect, it } from 'vitest';
import { eip55, isEip55 } from '../../src/codecs/eip55.ts';
import vectors from '../fixtures/eip55-vectors.json';

describe('eip55', () => {
  it.each(vectors.valid)('reproduces the ERC-55 test case %s', (address) => {
    expect(eip55(hexToBytes(address.slice(2)))).toBe(address);
    expect(isEip55(address)).toBe(true);
  });

  it('rejects a wrong-case variant of a mixed-case address', () => {
    const flipped = '0x5aaeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
    expect(isEip55(flipped)).toBe(false);
    expect(isEip55('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'.toLowerCase())).toBe(false);
    expect(
      isEip55('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'.toUpperCase().replace('0X', '0x')),
    ).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(isEip55('5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed')).toBe(false);
    expect(isEip55('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAe')).toBe(false);
    expect(isEip55('0xZZAeb6053F3E94C9b9A09f33669435E7Ef1BeAed')).toBe(false);
  });

  it('requires exactly 20 bytes', () => {
    expect(() => eip55(new Uint8Array(19))).toThrowError(/ENCODING_FAILED/);
    expect(() => eip55(new Uint8Array(21))).toThrowError(/ENCODING_FAILED/);
  });

  it('formats the oracle EVM address for the abandon mnemonic', () => {
    expect(eip55(hexToBytes('9858effd232b4033e47d90003d41ec34ecaeda94'))).toBe(
      '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
    );
  });
});
