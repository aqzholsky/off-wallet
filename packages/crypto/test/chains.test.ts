import { describe, expect, it } from 'vitest';
import { arbitrum } from '../src/chains/arbitrum.ts';
import { avalanche } from '../src/chains/avalanche.ts';
import { base } from '../src/chains/base.ts';
import { bitcoin } from '../src/chains/bitcoin.ts';
import { bsc } from '../src/chains/bsc.ts';
import { cosmos } from '../src/chains/cosmos.ts';
import { ethereum } from '../src/chains/ethereum.ts';
import { optimism } from '../src/chains/optimism.ts';
import { osmosis } from '../src/chains/osmosis.ts';
import { polygon } from '../src/chains/polygon.ts';
import { solana } from '../src/chains/solana.ts';
import { thorchain } from '../src/chains/thorchain.ts';
import { tron } from '../src/chains/tron.ts';
import { AddressProfile } from '../src/profiles/profile.ts';

const CHAINS = [
  bitcoin,
  ethereum,
  bsc,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  tron,
  cosmos,
  osmosis,
  thorchain,
  solana,
];

const EXPECTED: Array<[chainId: string, displayName: string, profileIds: string[]]> = [
  ['bitcoin', 'Bitcoin', ['btc-legacy', 'btc-segwit', 'btc-taproot']],
  ['ethereum', 'Ethereum', ['eth']],
  ['bsc', 'BNB Smart Chain', ['bsc']],
  ['polygon', 'Polygon PoS', ['polygon']],
  ['arbitrum', 'Arbitrum One', ['arbitrum']],
  ['optimism', 'OP Mainnet', ['optimism']],
  ['base', 'Base', ['base']],
  ['avalanche', 'Avalanche C-Chain', ['avalanche']],
  ['tron', 'TRON', ['tron']],
  ['cosmos', 'Cosmos Hub', ['cosmos']],
  ['osmosis', 'Osmosis', ['osmosis']],
  ['thorchain', 'THORChain', ['thorchain']],
  ['solana', 'Solana', ['solana-a', 'solana-b']],
];

describe('chains', () => {
  it.each(EXPECTED.map((row, i) => [row[0], row[1], row[2], CHAINS[i]] as const))(
    '%s is named %s and carries %j',
    (chainId, displayName, profileIds, chain) => {
      expect(chain?.id).toBe(chainId);
      expect(chain?.displayName).toBe(displayName);
      expect(chain?.profiles.map((p) => p.id)).toEqual(profileIds);
      for (const profile of chain?.profiles ?? []) {
        expect(profile).toBeInstanceOf(AddressProfile);
        expect(profile.chainId).toBe(chainId);
        expect(profile.network).toBe(displayName);
        expect(profile.status).toBe('verified');
      }
    },
  );

  it('covers 13 chains and 16 profiles', () => {
    expect(CHAINS).toHaveLength(13);
    expect(CHAINS.flatMap((c) => c.profiles)).toHaveLength(16);
  });

  it('declares the expected purposes, coin types and shapes', () => {
    const rows = CHAINS.flatMap((c) => c.profiles).map((p) => [
      p.id,
      p.purpose,
      p.coinType,
      p.pathShape,
    ]);
    expect(rows).toEqual([
      ['btc-legacy', 44, 0, 'BIP44_FULL'],
      ['btc-segwit', 84, 0, 'BIP44_FULL'],
      ['btc-taproot', 86, 0, 'BIP44_FULL'],
      ['eth', 44, 60, 'BIP44_FULL'],
      ['bsc', 44, 60, 'BIP44_FULL'],
      ['polygon', 44, 60, 'BIP44_FULL'],
      ['arbitrum', 44, 60, 'BIP44_FULL'],
      ['optimism', 44, 60, 'BIP44_FULL'],
      ['base', 44, 60, 'BIP44_FULL'],
      ['avalanche', 44, 60, 'BIP44_FULL'],
      ['tron', 44, 195, 'BIP44_FULL'],
      ['cosmos', 44, 118, 'BIP44_FULL'],
      ['osmosis', 44, 118, 'BIP44_FULL'],
      ['thorchain', 44, 931, 'BIP44_FULL'],
      ['solana-a', 44, 501, 'ACCOUNT'],
      ['solana-b', 44, 501, 'ACCOUNT_CHANGE_H'],
    ]);
  });

  it('carries the display names and formats the UI shows', () => {
    const byId = new Map(CHAINS.flatMap((c) => c.profiles).map((p) => [p.id, p]));
    expect(byId.get('btc-legacy')?.displayName).toBe('Legacy P2PKH');
    expect(byId.get('btc-segwit')?.displayName).toBe('Native SegWit');
    expect(byId.get('btc-taproot')?.displayName).toBe('Taproot BIP-86');
    expect(byId.get('eth')?.format).toBe('EOA · EIP-55 checksum');
    expect(byId.get('avalanche')?.displayName).toBe('Avalanche C-Chain');
    expect(byId.get('tron')?.displayName).toBe('Base58Check');
    expect(byId.get('cosmos')?.format).toBe('Bech32 · cosmos');
    expect(byId.get('osmosis')?.displayName).toBe('Bech32 osmo');
    expect(byId.get('thorchain')?.format).toBe('Bech32 · thor');
    expect(byId.get('solana-a')?.displayName).toBe('Ed25519 A');
    expect(byId.get('solana-b')?.format).toBe('Ed25519 B');
  });

  it('never lets a concrete chain class own an encoder', () => {
    for (const profile of CHAINS.flatMap((c) => c.profiles)) {
      const own = Object.getOwnPropertyNames(Object.getPrototypeOf(profile));
      expect(own).not.toContain('encodeAddress');
      expect(own).not.toContain('derivationPath');
    }
  });
});
