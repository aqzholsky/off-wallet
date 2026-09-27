import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { describe, expect, it } from 'vitest';
import { hash160 } from '../../src/codecs/hash160.ts';

describe('hash160', () => {
  it('hashes the secp256k1 generator point to the BIP-173 example program', () => {
    const generator = hexToBytes(
      '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    );
    expect(bytesToHex(hash160(generator))).toBe('751e76e8199196d454941c45d1b3a323f1433bd6');
  });

  it('hashes the empty input to ripemd160(sha256(""))', () => {
    expect(bytesToHex(hash160(new Uint8Array()))).toBe('b472a266d0bd89c13706a4132ccfb16f7c3b9fcb');
  });

  it('always returns 20 bytes', () => {
    expect(hash160(new Uint8Array(100))).toHaveLength(20);
  });
});
