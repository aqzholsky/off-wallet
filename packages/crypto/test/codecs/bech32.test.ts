import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { describe, expect, it } from 'vitest';
import {
  BECH32_CHARSET,
  bech32,
  bech32m,
  convertBits,
  decodeBech32,
} from '../../src/codecs/bech32.ts';
import { CryptoError } from '../../src/errors.ts';
import vectors from '../fixtures/bech32-vectors.json';

// Segwit address rules from BIP-173 / BIP-350, kept in the test because the
// product only encodes; decoding segwit exists here to prove the codec end to end.
function decodeSegwit(address: string): { version: number; program: Uint8Array } {
  const { hrp, words, encoding } = decodeBech32(address);
  if (hrp !== 'bc' && hrp !== 'tb') throw new Error('hrp');
  const version = words[0];
  if (version === undefined || version > 16) throw new Error('version');
  if ((version === 0) !== (encoding === 'bech32')) throw new Error('encoding');
  const program = Uint8Array.from(convertBits(words.slice(1), 5, 8, false));
  if (program.length < 2 || program.length > 40) throw new Error('program length');
  if (version === 0 && program.length !== 20 && program.length !== 32) throw new Error('v0 length');
  return { version, program };
}

describe('charset', () => {
  it('is the BIP-173 charset', () => {
    expect(BECH32_CHARSET).toBe('qpzry9x8gf2tvdw0s3jn54khce6mua7l');
  });
});

describe('convertBits', () => {
  it('converts 8→5 with padding and back without padding', () => {
    const bytes = hexToBytes('751e76e8199196d454941c45d1b3a323f1433bd6');
    const words = convertBits(bytes, 8, 5, true);
    expect(words).toHaveLength(32);
    expect(bytesToHex(Uint8Array.from(convertBits(words, 5, 8, false)))).toBe(bytesToHex(bytes));
  });

  it('rejects non-zero padding when pad is false', () => {
    expect(() => convertBits([1], 5, 8, false)).toThrowError(/ENCODING_FAILED/);
  });

  it('rejects values outside the source width', () => {
    expect(() => convertBits([32], 5, 8, true)).toThrowError(/ENCODING_FAILED/);
    expect(() => convertBits([256], 8, 5, true)).toThrowError(/ENCODING_FAILED/);
  });
});

describe('bech32 (BIP-173)', () => {
  it.each(vectors.bech32Valid)('decodes and re-encodes %s', (text) => {
    const { hrp, words, encoding } = decodeBech32(text);
    expect(encoding).toBe('bech32');
    expect(bech32(hrp, words)).toBe(text.toLowerCase());
  });

  it.each(vectors.bech32Invalid)('rejects %j', (text) => {
    expect(() => decodeBech32(text)).toThrowError(CryptoError);
  });

  it('rejects mixed case', () => {
    expect(() => decodeBech32('A12uel5l')).toThrowError(/ENCODING_FAILED/);
  });

  it('rejects a single flipped data character', () => {
    expect(() => decodeBech32('abcdef1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxx')).toThrowError(
      /ENCODING_FAILED/,
    );
  });
});

describe('bech32m (BIP-350)', () => {
  it.each(vectors.bech32mValid)('decodes and re-encodes %s', (text) => {
    const { hrp, words, encoding } = decodeBech32(text);
    expect(encoding).toBe('bech32m');
    expect(bech32m(hrp, words)).toBe(text.toLowerCase());
  });

  it.each(vectors.bech32mInvalid)('rejects %j', (text) => {
    expect(() => decodeBech32(text)).toThrowError(CryptoError);
  });

  it('a bech32 string is never valid bech32m and vice versa', () => {
    expect(decodeBech32('a12uel5l').encoding).toBe('bech32');
    expect(decodeBech32('a1lqfn3a').encoding).toBe('bech32m');
    expect(bech32('a', [])).not.toBe(bech32m('a', []));
  });
});

describe('segwit addresses', () => {
  it.each(vectors.segwitValid)('decodes $address to $scriptPubKey', ({ address, scriptPubKey }) => {
    const { version, program } = decodeSegwit(address);
    const opcode = version === 0 ? '00' : (0x50 + version).toString(16);
    const push = program.length.toString(16).padStart(2, '0');
    expect(`${opcode}${push}${bytesToHex(program)}`).toBe(scriptPubKey);
  });

  it.each(vectors.segwitInvalid)('rejects %s', (address) => {
    expect(() => decodeSegwit(address)).toThrow();
  });

  it('encodes the BIP-173 v0 and BIP-350 v1 examples', () => {
    const v0 = hexToBytes('751e76e8199196d454941c45d1b3a323f1433bd6');
    expect(bech32('bc', [0, ...convertBits(v0, 8, 5, true)])).toBe(
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    );
    const v1 = hexToBytes('79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798');
    expect(bech32m('bc', [1, ...convertBits(v1, 8, 5, true)])).toBe(
      'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0',
    );
  });
});

describe('encoder input validation', () => {
  it('rejects an empty or over-long hrp and out-of-range words', () => {
    expect(() => bech32('', [])).toThrowError(/ENCODING_FAILED/);
    expect(() => bech32('a'.repeat(84), [])).toThrowError(/ENCODING_FAILED/);
    expect(() => bech32('bc', [32])).toThrowError(/ENCODING_FAILED/);
    expect(() => bech32('b c', [])).toThrowError(/ENCODING_FAILED/);
  });

  it('lower-cases an upper-case hrp on encode', () => {
    expect(bech32('BC', [])).toBe(bech32('bc', []));
  });
});
