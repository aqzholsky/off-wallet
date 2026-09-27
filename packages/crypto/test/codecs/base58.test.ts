import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { describe, expect, it } from 'vitest';
import {
  BASE58_ALPHABET,
  base58,
  base58check,
  decode58,
  decode58check,
} from '../../src/codecs/base58.ts';
import { CryptoError } from '../../src/errors.ts';

// Bitcoin Core src/test/data/base58_encode_decode.json plus the two-zero-byte edge case.
const VECTORS: Array<[hex: string, text: string]> = [
  ['', ''],
  ['61', '2g'],
  ['626262', 'a3gV'],
  ['636363', 'aPEr'],
  ['73696d706c792061206c6f6e6720737472696e67', '2cFupjhnEsSn59qHXstmK2ffpLv2'],
  ['00eb15231dfceb60925886b67d065299925915aeb172c06647', '1NS17iag9jJgTHD1VXjvLCEnZuQ3rJDE9L'],
  ['516b6fcd0f', 'ABnLTmg'],
  ['bf4f89001e670274dd', '3SEo3LWLoPntC'],
  ['572e4794', '3EFU7m'],
  ['ecac89cad93923c02321', 'EJDM8drfXA6uyA'],
  ['10c8511e', 'Rt5zm'],
  ['00000000000000000000', '1111111111'],
  ['0000', '11'],
];

describe('base58', () => {
  it('uses the Bitcoin alphabet', () => {
    expect(BASE58_ALPHABET).toBe('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
    expect(BASE58_ALPHABET).toHaveLength(58);
  });

  it.each(VECTORS)('encodes %s to %s and back', (hex, text) => {
    expect(base58(hexToBytes(hex))).toBe(text);
    expect(bytesToHex(decode58(text))).toBe(hex);
  });

  it('rejects characters outside the alphabet with ENCODING_FAILED', () => {
    for (const bad of ['0', 'O', 'I', 'l', '2g+', ' 2g']) {
      expect(() => decode58(bad)).toThrowError(CryptoError);
      expect(() => decode58(bad)).toThrowError(/ENCODING_FAILED/);
    }
  });

  it('round-trips random buffers including ones with leading zeros', () => {
    for (let n = 0; n < 40; n++) {
      const bytes = new Uint8Array(n);
      for (let i = 0; i < n; i++) bytes[i] = (i * 37 + n * 11) % 256;
      if (n > 2) bytes[0] = 0;
      expect(bytesToHex(decode58(base58(bytes)))).toBe(bytesToHex(bytes));
    }
  });
});

describe('base58check', () => {
  const p2pkh = '1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA';

  it('decodes a mainnet P2PKH address to version byte 0x00 plus a 20-byte hash', () => {
    const body = decode58check(p2pkh);
    expect(body).toHaveLength(21);
    expect(body[0]).toBe(0);
  });

  it('re-encodes the decoded body to the same address', () => {
    expect(base58check(decode58check(p2pkh))).toBe(p2pkh);
  });

  it('rejects a corrupted checksum character', () => {
    const corrupted = `${p2pkh.slice(0, -1)}${p2pkh.endsWith('A') ? 'B' : 'A'}`;
    expect(() => decode58check(corrupted)).toThrowError(/ENCODING_FAILED/);
  });

  it('rejects a corrupted payload character', () => {
    const corrupted = `${p2pkh.slice(0, 5)}${p2pkh[5] === 'S' ? 'T' : 'S'}${p2pkh.slice(6)}`;
    expect(() => decode58check(corrupted)).toThrowError(/ENCODING_FAILED/);
  });

  it('rejects inputs shorter than a checksum', () => {
    expect(() => decode58check('1111')).toThrowError(/ENCODING_FAILED/);
    expect(() => decode58check('')).toThrowError(/ENCODING_FAILED/);
  });

  it('never puts input data into the error details', () => {
    try {
      decode58check('1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabB');
      throw new Error('expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(CryptoError);
      expect(JSON.stringify((error as CryptoError).details ?? {})).not.toContain('1LqB');
    }
  });
});
