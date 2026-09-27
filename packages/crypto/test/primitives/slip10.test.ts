import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { describe, expect, it } from 'vitest';
import { CryptoError } from '../../src/errors.ts';
import { HARDENED_OFFSET } from '../../src/primitives/path.ts';
import {
  deriveSlip10Ed25519,
  ed25519PublicKey,
  slip10ChildHardened,
  slip10MasterFromSeed,
} from '../../src/primitives/slip10.ts';
import vectors from '../fixtures/slip10-ed25519-vectors.json';

type VectorSet = {
  seed: string;
  chains: { path: string; chainCode: string; private: string; public: string }[];
};

describe.each(Object.entries(vectors as Record<string, VectorSet>))(
  'SLIP-0010 ed25519 %s',
  (_name, set) => {
    it.each(set.chains)('derives $path', ({ path, chainCode, private: priv, public: pub }) => {
      const { node, path: actual } = deriveSlip10Ed25519(hexToBytes(set.seed), path);
      expect(actual).toBe(path);
      expect(bytesToHex(node.chainCode)).toBe(chainCode);
      expect(bytesToHex(node.key)).toBe(priv);
      // SLIP-0010 prints ed25519 public keys with a leading zero byte.
      expect(`00${bytesToHex(ed25519PublicKey(node.key))}`).toBe(pub);
    });
  },
);

describe('hardened-only rule', () => {
  const seed = hexToBytes('000102030405060708090a0b0c0d0e0f');

  it('rejects a non-hardened segment anywhere in the path', () => {
    for (const path of ["m/44'/501'/0'/0", 'm/44/501', "m/0/1'"]) {
      expect(() => deriveSlip10Ed25519(seed, path)).toThrowError(CryptoError);
      expect(() => deriveSlip10Ed25519(seed, path)).toThrowError(/ED25519_NEEDS_HARDENED/);
    }
  });

  it('rejects a non-hardened index passed straight to the child function', () => {
    const master = slip10MasterFromSeed(seed);
    expect(() => slip10ChildHardened(master, 0)).toThrowError(/ED25519_NEEDS_HARDENED/);
    expect(() => slip10ChildHardened(master, HARDENED_OFFSET - 1)).toThrowError(
      /ED25519_NEEDS_HARDENED/,
    );
    expect(() => slip10ChildHardened(master, HARDENED_OFFSET)).not.toThrow();
  });

  it('accepts the two Solana shapes', () => {
    expect(deriveSlip10Ed25519(seed, "m/44'/501'/0'").path).toBe("m/44'/501'/0'");
    expect(deriveSlip10Ed25519(seed, "m/44'/501'/0'/0'").path).toBe("m/44'/501'/0'/0'");
  });
});

describe('slip10MasterFromSeed', () => {
  it('rejects seeds outside 16..64 bytes', () => {
    for (const length of [0, 15, 65]) {
      expect(() => slip10MasterFromSeed(new Uint8Array(length))).toThrowError(/SEED_LENGTH/);
    }
  });

  it('never rejects a seed for curve reasons, unlike secp256k1', () => {
    for (let byte = 0; byte < 4; byte++) {
      expect(() => slip10MasterFromSeed(new Uint8Array(32).fill(byte))).not.toThrow();
    }
  });
});

describe('ed25519PublicKey', () => {
  it('produces 32 bytes', () => {
    const { node } = deriveSlip10Ed25519(
      hexToBytes('000102030405060708090a0b0c0d0e0f'),
      "m/44'/501'/0'",
    );
    expect(ed25519PublicKey(node.key)).toHaveLength(32);
  });
});
