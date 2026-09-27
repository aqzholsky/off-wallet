import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { describe, expect, it, vi } from 'vitest';
import { deriveAddress, deriveKey } from '../src/derive.ts';
import { CryptoError } from '../src/errors.ts';
import type { HdNode } from '../src/primitives/bip32.ts';
import type { AddressProfile } from '../src/profiles/profile.ts';
import { taprootOutputKey } from '../src/profiles/taproot.ts';
import { registry } from '../src/registry.ts';
import oracle from './fixtures/oracle-addresses.json';

const SEED = hexToBytes(oracle.mnemonics.A.seed);
const eth = registry.get('eth');
const solanaA = registry.get('solana-a');
const taproot = registry.get('btc-taproot');

const ZERO32 = '00'.repeat(32);

// The leaf never escapes deriveAddress / deriveKey, so the only way to observe the wipe
// is to hold a reference to the node the profile handed back.
function captureLeaves(profile: AddressProfile): { nodes: HdNode[]; restore: () => void } {
  const nodes: HdNode[] = [];
  const original = profile.deriveLeaf.bind(profile);
  const spy = vi.spyOn(profile, 'deriveLeaf').mockImplementation((seed, path) => {
    const leaf = original(seed, path);
    nodes.push(leaf.node);
    return leaf;
  });
  return { nodes, restore: () => spy.mockRestore() };
}

describe('deriveAddress', () => {
  it('returns the full record for an EVM profile', () => {
    expect(deriveAddress(eth, SEED, { account: 0, index: 0 })).toEqual({
      profileId: 'eth',
      chainId: 'ethereum',
      displayName: 'Ethereum',
      network: 'Ethereum',
      format: 'EOA · EIP-55 checksum',
      address: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
      addressSpace: 'evm:9858effd232b4033e47d90003d41ec34ecaeda94',
      path: "m/44'/60'/0'/0/0",
      account: 0,
      index: 0,
    });
  });

  it('omits index for a profile that does not support one', () => {
    const record = deriveAddress(solanaA, SEED, { account: 0, index: 7 });
    expect(record.address).toBe('GjJyeC1r2RgkuoCWMyPYkCWSGSGLcz266EaAkLA27AhL');
    expect(record.path).toBe("m/44'/501'/0'");
    expect(record.account).toBe(0);
    expect('index' in record).toBe(false);
  });

  it('reports the path it actually derived, not the one requested', () => {
    expect(deriveAddress(taproot, SEED, { account: 2, index: 3 }).path).toBe("m/86'/0'/2'/0/3");
  });

  it('validates params before touching the seed', () => {
    for (const bad of [-1, 2147483648, 0.5, Number.NaN]) {
      expect(() => deriveAddress(eth, SEED, { account: bad, index: 0 })).toThrowError(
        /PATH_INDEX_RANGE/,
      );
      expect(() => deriveAddress(eth, SEED, { account: 0, index: bad })).toThrowError(
        /PATH_INDEX_RANGE/,
      );
    }
  });

  it('rejects an out-of-range seed', () => {
    expect(() => deriveAddress(eth, new Uint8Array(8), { account: 0, index: 0 })).toThrowError(
      /SEED_LENGTH/,
    );
  });

  it('never returns key material', () => {
    const record = deriveAddress(eth, SEED, { account: 0, index: 0 }) as unknown as Record<
      string,
      unknown
    >;
    expect(Object.keys(record)).not.toContain('bytes');
    expect(JSON.stringify(record)).not.toContain(
      '1ab42cc412b618bdea3a599e3c9bae199ebf030895b039e9db1e30dafb12b727',
    );
  });

  it('is deterministic across repeated calls', () => {
    const a = deriveAddress(eth, SEED, { account: 1, index: 2 });
    const b = deriveAddress(eth, SEED, { account: 1, index: 2 });
    expect(a).toEqual(b);
  });
});

describe('deriveKey', () => {
  it('exports the compressed public key with its encoding descriptor', () => {
    const exported = deriveKey(eth, SEED, { account: 0, index: 0 }, 'public');
    expect(bytesToHex(exported.bytes)).toBe(
      '0237b0bb7a8288d38ed49a524b5dc98cff3eb5ca824c9f9dc0dfdb3d9cd600f299',
    );
    expect(exported.bytes).toHaveLength(33);
    expect(exported.keyKind).toBe('public');
    expect(exported.path).toBe("m/44'/60'/0'/0/0");
    expect(exported.encoding).toBe('SEC1 compressed · 33 bytes · hex');
  });

  it('exports the raw private scalar with its encoding descriptor', () => {
    const exported = deriveKey(eth, SEED, { account: 0, index: 0 }, 'private');
    expect(bytesToHex(exported.bytes)).toBe(
      '1ab42cc412b618bdea3a599e3c9bae199ebf030895b039e9db1e30dafb12b727',
    );
    expect(exported.bytes).toHaveLength(32);
    expect(exported.keyKind).toBe('private');
    expect(exported.encoding).toBe('Raw 32-byte scalar · 64 hex · no 0x');
  });

  it('exports raw 32-byte ed25519 material for Solana', () => {
    const pub = deriveKey(solanaA, SEED, { account: 0, index: 0 }, 'public');
    const priv = deriveKey(solanaA, SEED, { account: 0, index: 0 }, 'private');
    expect(bytesToHex(pub.bytes)).toBe(
      'e9b6062841bb977ad21de71ec961900633c26f21384e015b014a637a61499547',
    );
    expect(bytesToHex(priv.bytes)).toBe(
      'ec252c5d95bcf80a4b22df119cedd4ae1aed07364578e8d43bdfa0435625dbd1',
    );
    expect(pub.encoding).toBe('Raw ed25519 public key · 32 bytes · hex');
    expect(priv.encoding).toBe('Raw SLIP-0010 leaf seed · 32 bytes · hex');
  });

  it('exports the untweaked leaf for Taproot, not the output key', () => {
    const exported = deriveKey(taproot, SEED, { account: 0, index: 0 }, 'public');
    expect(bytesToHex(exported.bytes)).toBe(
      '03cc8a4bc64d897bddc5fbc2f670f7a8ba0b386779106cf1223c6fc5d7cd6fc115',
    );
    expect(bytesToHex(taprootOutputKey(exported.bytes.slice(1)))).not.toBe(
      bytesToHex(exported.bytes.slice(1)),
    );
  });

  it('returns exactly one kind and never both', () => {
    const exported = deriveKey(eth, SEED, { account: 0, index: 0 }, 'public') as unknown as Record<
      string,
      unknown
    >;
    expect(Object.keys(exported).sort()).toEqual(['bytes', 'encoding', 'keyKind', 'path']);
  });

  it('rejects an unknown key kind', () => {
    expect(() => deriveKey(eth, SEED, { account: 0, index: 0 }, 'both' as never)).toThrowError(
      CryptoError,
    );
    expect(() => deriveKey(eth, SEED, { account: 0, index: 0 }, 'both' as never)).toThrowError(
      /KEY_KIND_INVALID/,
    );
  });

  it('hands the caller a buffer it owns and can wipe', () => {
    const exported = deriveKey(eth, SEED, { account: 0, index: 0 }, 'private');
    exported.bytes.fill(0);
    expect(bytesToHex(exported.bytes)).toBe('00'.repeat(32));
    const again = deriveKey(eth, SEED, { account: 0, index: 0 }, 'private');
    expect(bytesToHex(again.bytes)).toBe(
      '1ab42cc412b618bdea3a599e3c9bae199ebf030895b039e9db1e30dafb12b727',
    );
  });

  it('wipes the derivation leaf even when the encoder throws', () => {
    const leaves = captureLeaves(eth);
    const spy = vi.spyOn(eth, 'publicKeyFromLeaf').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => deriveKey(eth, SEED, { account: 0, index: 0 }, 'public')).toThrow();
    spy.mockRestore();
    leaves.restore();
    expect(leaves.nodes).toHaveLength(1);
    expect(bytesToHex(leaves.nodes[0]?.key as Uint8Array)).toBe(ZERO32);
    expect(bytesToHex(leaves.nodes[0]?.chainCode as Uint8Array)).toBe(ZERO32);
  });
});

describe('wipe discipline', () => {
  it.each([
    ['eth', eth],
    ['solana-a', solanaA],
    ['btc-taproot', taproot],
  ] as const)('deriveAddress zeroes the %s leaf and chain code', (_id, profile) => {
    const leaves = captureLeaves(profile);
    try {
      deriveAddress(profile, SEED, { account: 0, index: 0 });
    } finally {
      leaves.restore();
    }
    expect(leaves.nodes).toHaveLength(1);
    expect(bytesToHex(leaves.nodes[0]?.key as Uint8Array)).toBe(ZERO32);
    expect(bytesToHex(leaves.nodes[0]?.chainCode as Uint8Array)).toBe(ZERO32);
  });

  it.each(['public', 'private'] as const)('deriveKey zeroes the leaf for kind %s', (kind) => {
    const leaves = captureLeaves(eth);
    let exported: ReturnType<typeof deriveKey>;
    try {
      exported = deriveKey(eth, SEED, { account: 0, index: 0 }, kind);
    } finally {
      leaves.restore();
    }
    expect(bytesToHex(leaves.nodes[0]?.key as Uint8Array)).toBe(ZERO32);
    expect(bytesToHex(leaves.nodes[0]?.chainCode as Uint8Array)).toBe(ZERO32);
    expect(bytesToHex(exported.bytes)).not.toBe(ZERO32);
  });

  it('copies the private scalar instead of handing back the leaf buffer', () => {
    const leaves = captureLeaves(eth);
    let exported: ReturnType<typeof deriveKey>;
    try {
      exported = deriveKey(eth, SEED, { account: 0, index: 0 }, 'private');
    } finally {
      leaves.restore();
    }
    expect(exported.bytes).not.toBe(leaves.nodes[0]?.key);
    expect(exported.bytes.buffer).not.toBe(leaves.nodes[0]?.key.buffer);
    expect(bytesToHex(exported.bytes)).toBe(
      '1ab42cc412b618bdea3a599e3c9bae199ebf030895b039e9db1e30dafb12b727',
    );
  });
});
