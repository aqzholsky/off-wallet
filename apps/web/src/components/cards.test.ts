import { deriveAddress, groupByAddressSpace, mnemonicToSeed, registry } from '@off-wallet/crypto';
import { describe, expect, it } from 'vitest';
import { copy } from '../i18n/en.ts';
import { buildCards, entryNotes } from './cards.ts';

const seed = mnemonicToSeed(
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  '',
);
const groups = groupByAddressSpace(
  registry.enabled().map((profile) => deriveAddress(profile, seed, { account: 0, index: 0 })),
);

describe('buildCards', () => {
  it('produces seven cards in registry order with the EVM networks merged', () => {
    const cards = buildCards(groups);
    expect(cards.map((c) => c.title)).toEqual([
      'Bitcoin',
      'Ethereum and 6 EVM networks',
      'TRON',
      'Cosmos Hub',
      'Osmosis',
      'THORChain',
      'Solana',
    ]);
    expect(cards.map((c) => c.tag)).toEqual(['BTC', 'EVM', 'TRX', 'ATOM', 'OSMO', 'RUNE', 'SOL']);
    expect(cards[0]?.entries).toHaveLength(3);
    expect(cards[0]?.meta).toBe('3 profiles · secp256k1');
    expect(cards[1]?.entries).toHaveLength(1);
    expect(cards[1]?.chainIds).toHaveLength(7);
    expect(cards[1]?.meta).toBe(copy.evmCardMeta);
    expect(cards[6]?.meta).toBe('2 profiles · ed25519 · hardened-only');
  });

  it('titles a partial EVM selection by its first network', () => {
    const partial = groupByAddressSpace(
      registry
        .enabled()
        .filter((profile) => profile.id !== 'eth')
        .map((profile) => deriveAddress(profile, seed, { account: 0, index: 0 })),
    );
    const evm = buildCards(partial).find((c) => c.tag === 'EVM');
    expect(evm?.title).toBe('BNB Smart Chain and 5 EVM networks');
  });
});

describe('entryNotes', () => {
  it('flags ignored index and the taproot export caveat', () => {
    expect(entryNotes(registry.get('solana-a'))).toEqual([copy.indexIgnored]);
    expect(entryNotes(registry.get('btc-taproot'))).toEqual([copy.profileNotes['btc-taproot']]);
    expect(entryNotes(registry.get('eth'))).toEqual([]);
  });
});
