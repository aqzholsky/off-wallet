import { hexToBytes } from '@noble/hashes/utils.js';
import { describe, expect, it } from 'vitest';
import {
  AddressProfile,
  Ed25519Profile,
  type ProfileDefinition,
  Secp256k1Profile,
} from '../../src/profiles/profile.ts';

const SEED = hexToBytes('000102030405060708090a0b0c0d0e0f');

const definition = (overrides: Partial<ProfileDefinition> = {}): ProfileDefinition => ({
  id: 'test',
  chainId: 'testchain',
  network: 'Test Chain',
  displayName: 'Test Profile',
  format: 'Test Format',
  purpose: 44,
  coinType: 0,
  pathShape: 'BIP44_FULL',
  status: 'verified',
  ...overrides,
});

class TestSecp extends Secp256k1Profile {
  readonly formatFamily = 'test-secp';
  encodeAddress(publicKey: Uint8Array): string {
    return `secp:${publicKey.length}`;
  }
}

class TestEd extends Ed25519Profile {
  readonly formatFamily = 'test-ed';
  encodeAddress(publicKey: Uint8Array): string {
    return `ed:${publicKey.length}`;
  }
}

describe('AddressProfile', () => {
  it('copies every field of its definition', () => {
    const profile = new TestSecp(definition());
    expect(profile.id).toBe('test');
    expect(profile.chainId).toBe('testchain');
    expect(profile.network).toBe('Test Chain');
    expect(profile.displayName).toBe('Test Profile');
    expect(profile.format).toBe('Test Format');
    expect(profile.purpose).toBe(44);
    expect(profile.coinType).toBe(0);
    expect(profile.pathShape).toBe('BIP44_FULL');
    expect(profile.status).toBe('verified');
    expect(profile).toBeInstanceOf(AddressProfile);
  });

  it('builds its path from the declared shape and never from a subclass', () => {
    expect(new TestSecp(definition()).derivationPath(2, 3)).toBe("m/44'/0'/2'/0/3");
    expect(new TestSecp(definition({ purpose: 84, coinType: 0 })).derivationPath(0, 0)).toBe(
      "m/84'/0'/0'/0/0",
    );
    expect(
      new TestEd(definition({ purpose: 44, coinType: 501, pathShape: 'ACCOUNT' })).derivationPath(
        1,
        9,
      ),
    ).toBe("m/44'/501'/1'");
  });

  it('derives supportsIndex from the shape', () => {
    expect(new TestSecp(definition()).supportsIndex).toBe(true);
    expect(new TestEd(definition({ pathShape: 'ACCOUNT' })).supportsIndex).toBe(false);
    expect(new TestEd(definition({ pathShape: 'ACCOUNT_CHANGE_H' })).supportsIndex).toBe(false);
  });

  it('ignores the index when the shape does not carry one', () => {
    const profile = new TestEd(definition({ pathShape: 'ACCOUNT' }));
    expect(profile.derivationPath(2, 3)).toBe(profile.derivationPath(2, 0));
  });

  it('validates account and index before building a path', () => {
    const profile = new TestSecp(definition());
    for (const bad of [-1, 2147483648, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => profile.derivationPath(bad, 0)).toThrowError(/PATH_INDEX_RANGE/);
      expect(() => profile.derivationPath(0, bad)).toThrowError(/PATH_INDEX_RANGE/);
    }
  });

  it('defaults addressSpace to family plus address', () => {
    expect(new TestSecp(definition()).addressSpace('abc')).toBe('test-secp:abc');
  });
});

describe('Secp256k1Profile', () => {
  const profile = new TestSecp(definition());

  it('declares the curve and the two key encodings', () => {
    expect(profile.curve).toBe('secp256k1');
    expect(profile.publicKeyEncoding).toBe('SEC1 compressed · 33 bytes · hex');
    expect(profile.privateKeyEncoding).toBe('Raw 32-byte scalar · 64 hex · no 0x');
  });

  it('derives through BIP-32 and returns a 33-byte compressed key', () => {
    const { node, path } = profile.deriveLeaf(SEED, profile.derivationPath(0, 0));
    expect(path).toBe("m/44'/0'/0'/0/0");
    expect(profile.publicKeyFromLeaf(node.key)).toHaveLength(33);
  });
});

describe('Ed25519Profile', () => {
  const profile = new TestEd(definition({ purpose: 44, coinType: 501, pathShape: 'ACCOUNT' }));

  it('declares the curve and the two key encodings', () => {
    expect(profile.curve).toBe('ed25519');
    expect(profile.publicKeyEncoding).toBe('Raw ed25519 public key · 32 bytes · hex');
    expect(profile.privateKeyEncoding).toBe('Raw SLIP-0010 leaf seed · 32 bytes · hex');
  });

  it('derives through SLIP-0010 and returns a 32-byte key', () => {
    const { node, path } = profile.deriveLeaf(SEED, profile.derivationPath(0, 0));
    expect(path).toBe("m/44'/501'/0'");
    expect(profile.publicKeyFromLeaf(node.key)).toHaveLength(32);
  });

  it('refuses a non-hardened path', () => {
    expect(() => profile.deriveLeaf(SEED, "m/44'/501'/0'/0")).toThrowError(
      /ED25519_NEEDS_HARDENED/,
    );
  });
});
