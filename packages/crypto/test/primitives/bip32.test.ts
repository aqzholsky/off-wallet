import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { describe, expect, it } from 'vitest';
import { base58, decode58check } from '../../src/codecs/base58.ts';
import { CryptoError } from '../../src/errors.ts';
import {
  bip32MasterFromSeed,
  ckdPriv,
  deriveBip32,
  secp256k1PublicKey,
} from '../../src/primitives/bip32.ts';
import { parsePath } from '../../src/primitives/path.ts';
import vectors from '../fixtures/bip32-vectors.json';

type VectorSet = { seed: string; chains: { path: string; xpub: string; xprv: string }[] };

// An extended key is 78 bytes: version(4) depth(1) fingerprint(4) childNumber(4)
// chainCode(32) keyData(33). The chain code and the private scalar are what this
// package computes, so the test compares only those two slices.
const chainCodeOf = (xprv: string) => bytesToHex(decode58check(xprv).slice(13, 45));
const privateKeyOf = (xprv: string) => bytesToHex(decode58check(xprv).slice(46, 78));

describe.each(Object.entries(vectors as Record<string, VectorSet>))('BIP-32 %s', (_name, set) => {
  it.each(set.chains)('derives $path', ({ path, xprv }) => {
    const { node, path: actual } = deriveBip32(hexToBytes(set.seed), path);
    expect(actual).toBe(path);
    expect(bytesToHex(node.chainCode)).toBe(chainCodeOf(xprv));
    expect(bytesToHex(node.key)).toBe(privateKeyOf(xprv));
  });
});

describe('bip32MasterFromSeed', () => {
  it('produces a 32-byte key and 32-byte chain code', () => {
    const node = bip32MasterFromSeed(hexToBytes('000102030405060708090a0b0c0d0e0f'));
    expect(node.key).toHaveLength(32);
    expect(node.chainCode).toHaveLength(32);
  });

  it('rejects seeds outside 16..64 bytes with SEED_LENGTH', () => {
    for (const length of [0, 15, 65, 128]) {
      expect(() => bip32MasterFromSeed(new Uint8Array(length))).toThrowError(CryptoError);
      expect(() => bip32MasterFromSeed(new Uint8Array(length))).toThrowError(/SEED_LENGTH/);
    }
  });

  it('accepts the boundary lengths', () => {
    expect(() => bip32MasterFromSeed(new Uint8Array(16))).not.toThrow();
    expect(() => bip32MasterFromSeed(new Uint8Array(64))).not.toThrow();
  });
});

describe('ckdPriv', () => {
  const parent = bip32MasterFromSeed(hexToBytes('000102030405060708090a0b0c0d0e0f'));

  it('derives hardened and non-hardened children', () => {
    expect(ckdPriv(parent, 0x80000000)?.key).toHaveLength(32);
    expect(ckdPriv(parent, 0)?.key).toHaveLength(32);
  });

  it('is deterministic', () => {
    expect(bytesToHex(ckdPriv(parent, 7)?.key ?? new Uint8Array())).toBe(
      bytesToHex(ckdPriv(parent, 7)?.key ?? new Uint8Array(1)),
    );
  });
});

describe('deriveBip32', () => {
  const seed = hexToBytes('000102030405060708090a0b0c0d0e0f');

  it('returns the path it actually derived', () => {
    expect(deriveBip32(seed, "m/44'/0'/0'/0/0").path).toBe("m/44'/0'/0'/0/0");
  });

  it('derives the master node for the bare path', () => {
    const master = bip32MasterFromSeed(seed);
    const derived = deriveBip32(seed, 'm');
    expect(bytesToHex(derived.node.key)).toBe(bytesToHex(master.key));
    expect(derived.path).toBe('m');
  });

  it('rejects an invalid path', () => {
    expect(() => deriveBip32(seed, 'x/0')).toThrowError(/PATH_INVALID/);
  });

  it('parses every path it derives', () => {
    expect(parsePath(deriveBip32(seed, "m/84'/0'/1'/0/9").path)).toHaveLength(5);
  });
});

describe('secp256k1PublicKey', () => {
  it('produces a 33-byte compressed key with a 02 or 03 prefix', () => {
    const { node } = deriveBip32(hexToBytes('000102030405060708090a0b0c0d0e0f'), "m/44'/0'/0'/0/0");
    const pub = secp256k1PublicKey(node.key);
    expect(pub).toHaveLength(33);
    expect([2, 3]).toContain(pub[0]);
  });

  it('matches the BIP-32 vector-1 master public key', () => {
    const master = bip32MasterFromSeed(hexToBytes('000102030405060708090a0b0c0d0e0f'));
    const expected = decode58check(
      'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8',
    ).slice(45, 78);
    expect(bytesToHex(secp256k1PublicKey(master.key))).toBe(bytesToHex(expected));
  });

  it('encodes something base58 can carry, proving byte output not hex', () => {
    const { node } = deriveBip32(hexToBytes('000102030405060708090a0b0c0d0e0f'), 'm');
    expect(base58(secp256k1PublicKey(node.key)).length).toBeGreaterThan(40);
  });
});
