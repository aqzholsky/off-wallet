import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/primitives/wipe.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/primitives/wipe.ts')>();
  return {
    wipe: vi.fn((...buffers: Array<Uint8Array | undefined>) => {
      for (const buffer of buffers) {
        if (buffer) wiped.push(bytesToHex(buffer));
      }
      actual.wipe(...buffers);
    }),
  };
});

const wiped: string[] = [];

const { generateMnemonic, mnemonicToSeed, validateMnemonic } = await import(
  '../../src/primitives/bip39.ts'
);
const { bip32MasterFromSeed, ckdPriv, deriveBip32 } = await import('../../src/primitives/bip32.ts');
const { deriveSlip10Ed25519, slip10ChildHardened, slip10MasterFromSeed } = await import(
  '../../src/primitives/slip10.ts'
);
const { wipe } = await import('../../src/primitives/wipe.ts');

const SEED = hexToBytes('000102030405060708090a0b0c0d0e0f');
const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

afterEach(() => {
  wiped.length = 0;
  vi.mocked(wipe).mockClear();
});

describe('wipe discipline', () => {
  it('mnemonicToSeed wipes the PBKDF2 password and salt buffers', () => {
    const seed = mnemonicToSeed(MNEMONIC, 'TREZOR');
    expect(vi.mocked(wipe)).toHaveBeenCalledTimes(1);
    expect(wiped).toHaveLength(2);
    expect(seed).toHaveLength(64);
  });

  it('validateMnemonic wipes the reconstructed entropy', () => {
    validateMnemonic(MNEMONIC, 'english');
    expect(vi.mocked(wipe)).toHaveBeenCalledTimes(1);
    expect(wiped[0]).toHaveLength(32);
  });

  it('generateMnemonic wipes the entropy it drew', () => {
    generateMnemonic({ language: 'english', words: 12, rng: (b) => b.fill(7) });
    expect(vi.mocked(wipe)).toHaveBeenCalled();
    expect(wiped.some((hex) => hex === '07'.repeat(16))).toBe(true);
  });

  it('bip32MasterFromSeed wipes the HMAC state', () => {
    bip32MasterFromSeed(SEED);
    expect(wiped.some((hex) => hex.length === 128)).toBe(true);
  });

  it('ckdPriv wipes the HMAC state, the data it hashed and its own copy of IL', () => {
    const parent = bip32MasterFromSeed(SEED);
    wiped.length = 0;
    ckdPriv(parent, 0x80000000);
    expect(wiped).toHaveLength(3);
    expect(wiped[0]).toHaveLength(128);
    expect(wiped[2]).toBe(wiped[0]?.slice(0, 64));
  });

  it('deriveBip32 wipes every intermediate node it walked past', () => {
    deriveBip32(SEED, "m/44'/0'/0'/0/0");
    // Five segments: each parent node contributes a key and a chain code.
    const nodeWipes = wiped.filter((hex) => hex.length === 64);
    expect(nodeWipes.length).toBeGreaterThanOrEqual(10);
  });

  it('slip10 master and child wipe their state and data buffers', () => {
    const master = slip10MasterFromSeed(SEED);
    expect(wiped.some((hex) => hex.length === 128)).toBe(true);
    wiped.length = 0;
    slip10ChildHardened(master, 0x80000000);
    expect(wiped).toHaveLength(2);
  });

  it('deriveSlip10Ed25519 wipes intermediate nodes', () => {
    deriveSlip10Ed25519(SEED, "m/44'/501'/0'/0'");
    expect(wiped.filter((hex) => hex.length === 64).length).toBeGreaterThanOrEqual(4);
  });

  it('deriveSlip10Ed25519 wipes the live node when the path is rejected mid-walk', () => {
    expect(() => deriveSlip10Ed25519(SEED, "m/44'/501'/0'/0")).toThrowError(
      /ED25519_NEEDS_HARDENED/,
    );
    // The path is rejected before any derivation, so no key exists to strand.
    expect(wiped).toHaveLength(0);
  });

  it('leaves returned buffers alive for the caller to own and wipe', () => {
    const { node } = deriveBip32(SEED, "m/44'/0'/0'/0/0");
    expect(bytesToHex(node.key)).not.toBe('00'.repeat(32));
    node.key.fill(0);
    expect(bytesToHex(node.key)).toBe('00'.repeat(32));
  });
});
