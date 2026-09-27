import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { describe, expect, it } from 'vitest';
import { Base58PkhProfile } from '../../src/profiles/base58Pkh.ts';
import { CosmosProfile } from '../../src/profiles/cosmos.ts';
import { EvmProfile, evmAddressBytes } from '../../src/profiles/evm.ts';
import type { ProfileDefinition } from '../../src/profiles/profile.ts';
import { SegwitV0Profile } from '../../src/profiles/segwitV0.ts';
import { SolanaProfile } from '../../src/profiles/solana.ts';
import { TaprootProfile, taprootOutputKey } from '../../src/profiles/taproot.ts';
import { TronProfile } from '../../src/profiles/tron.ts';

const base = (overrides: Partial<ProfileDefinition>): ProfileDefinition => ({
  id: 'x',
  chainId: 'x',
  network: 'X',
  displayName: 'X',
  format: 'X',
  purpose: 44,
  coinType: 0,
  pathShape: 'BIP44_FULL',
  status: 'verified',
  ...overrides,
});

// Public keys from the oracle fixtures for the abandon mnemonic at (0,0).
const PUB = {
  btcLegacy: hexToBytes('03aaeb52dd7494c361049de67cc680e83ebcbbbdbeb13637d92cd845f70308af5e'),
  btcSegwit: hexToBytes('0330d54fd0dd420a6e5f8d3624f5f3482cae350f79d5f0753bf5beef9c2d91af3c'),
  btcTaproot: hexToBytes('03cc8a4bc64d897bddc5fbc2f670f7a8ba0b386779106cf1223c6fc5d7cd6fc115'),
  evm: hexToBytes('0237b0bb7a8288d38ed49a524b5dc98cff3eb5ca824c9f9dc0dfdb3d9cd600f299'),
  tron: hexToBytes('03ff21f8e64d3a3c0198edfbb7afdc79be959432e92e2f8a1984bb436a414b8edc'),
  cosmos: hexToBytes('024f4e2ad99c34d60b9ba6283c9431a8418af8673212961f97a77b6377fcd05b62'),
  thorchain: hexToBytes('02205c476a22d5fe10b74489db9479d0e36e25a32da393a771fcf12380136a451f'),
  solana: hexToBytes('e9b6062841bb977ad21de71ec961900633c26f21384e015b014a637a61499547'),
};

class Legacy extends Base58PkhProfile {
  readonly versionBytes = new Uint8Array([0x00]);
}
class Segwit extends SegwitV0Profile {
  readonly hrp = 'bc';
}
class Taproot extends TaprootProfile {
  readonly hrp = 'bc';
}
class Evm extends EvmProfile {}
class Cosmos extends CosmosProfile {
  readonly hrp = 'cosmos';
}
class Thor extends CosmosProfile {
  readonly hrp = 'thor';
}
class Tron extends TronProfile {}
class Solana extends SolanaProfile {}

describe('Base58PkhProfile', () => {
  it('encodes base58check(version ‖ hash160(pub)) and names its family', () => {
    const profile = new Legacy(base({}));
    expect(profile.encodeAddress(PUB.btcLegacy)).toBe('1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA');
    expect(profile.formatFamily).toBe('p2pkh');
    expect(profile.addressSpace('a')).toBe('p2pkh:a');
  });
});

describe('SegwitV0Profile', () => {
  it('encodes bech32 with witness version 0', () => {
    const profile = new Segwit(base({ purpose: 84 }));
    expect(profile.encodeAddress(PUB.btcSegwit)).toBe('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
    expect(profile.formatFamily).toBe('segwit-v0');
  });
});

describe('TaprootProfile', () => {
  it('encodes bech32m with the BIP-86 tweaked output key', () => {
    const profile = new Taproot(base({ purpose: 86 }));
    expect(profile.encodeAddress(PUB.btcTaproot)).toBe(
      'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr',
    );
    expect(profile.formatFamily).toBe('taproot');
  });

  it('tweaks the x-only key to the published BIP-86 output key', () => {
    expect(bytesToHex(taprootOutputKey(PUB.btcTaproot.slice(1)))).toBe(
      'a60869f0dbcf1dc659c9cecbaf8050135ea9e8cdc487053f1dc6880949dc684c',
    );
  });

  it('rejects an x-only value that is not on the curve', () => {
    expect(() => taprootOutputKey(new Uint8Array(32).fill(0xff))).toThrowError(/ENCODING_FAILED/);
  });

  it('rejects a wrong-length x-only value', () => {
    expect(() => taprootOutputKey(new Uint8Array(31))).toThrowError(/ENCODING_FAILED/);
  });
});

describe('EvmProfile', () => {
  const profile = new Evm(base({ coinType: 60 }));

  it('encodes the EIP-55 address', () => {
    expect(profile.encodeAddress(PUB.evm)).toBe('0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
    expect(profile.formatFamily).toBe('evm');
  });

  it('collapses every EVM network into one address space, case-insensitively', () => {
    expect(profile.addressSpace('0x9858EfFD232B4033E47d90003D41EC34EcaEda94')).toBe(
      'evm:9858effd232b4033e47d90003d41ec34ecaeda94',
    );
  });

  it('exposes the raw twenty address bytes', () => {
    expect(bytesToHex(evmAddressBytes(PUB.evm))).toBe('9858effd232b4033e47d90003d41ec34ecaeda94');
    expect(evmAddressBytes(PUB.evm)).toHaveLength(20);
  });
});

describe('CosmosProfile', () => {
  it('encodes bech32 with no witness version, for each hrp', () => {
    expect(new Cosmos(base({ coinType: 118 })).encodeAddress(PUB.cosmos)).toBe(
      'cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4',
    );
    expect(new Thor(base({ coinType: 931 })).encodeAddress(PUB.thorchain)).toBe(
      'thor1gm00vwsfcp48enm4uv9e5dhm37jtd0ye27wrx0',
    );
    expect(new Cosmos(base({})).formatFamily).toBe('cosmos');
  });
});

describe('TronProfile', () => {
  const profile = new Tron(base({ coinType: 195 }));

  it('encodes base58check(0x41 ‖ keccak tail)', () => {
    expect(profile.encodeAddress(PUB.tron)).toBe('TUEZSdKsoDHQMeZwihtdoBiN46zxhGWYdH');
    expect(profile.formatFamily).toBe('tron');
  });

  it('never shares an address space with EVM even though both keccak-hash', () => {
    const address = profile.encodeAddress(PUB.evm);
    expect(profile.addressSpace(address)).toBe(`tron:${address}`);
    expect(profile.addressSpace(address).startsWith('evm:')).toBe(false);
  });
});

describe('SolanaProfile', () => {
  it('encodes raw base58 with no checksum', () => {
    const profile = new Solana(base({ coinType: 501, pathShape: 'ACCOUNT' }));
    expect(profile.encodeAddress(PUB.solana)).toBe('GjJyeC1r2RgkuoCWMyPYkCWSGSGLcz266EaAkLA27AhL');
    expect(profile.formatFamily).toBe('solana');
  });
});
