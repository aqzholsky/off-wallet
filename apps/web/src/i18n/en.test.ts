import { CRYPTO_ERROR_CODES, LANGUAGES } from '@off-wallet/crypto';
import { describe, expect, it } from 'vitest';
import {
  copy,
  errorMessage,
  evmCardTitle,
  languageLabels,
  resultSummary,
  selectedSummary,
} from './en.ts';

describe('errorMessage', () => {
  it('has a sentence for every crypto error code', () => {
    for (const code of CRYPTO_ERROR_CODES) {
      const text = errorMessage(code);
      expect(text.length).toBeGreaterThan(10);
      expect(text.endsWith('.')).toBe(true);
    }
  });

  it('names the unknown word by 1-based position and never by value', () => {
    const text = errorMessage('MNEMONIC_WORD_UNKNOWN', { wordIndex: 6, word: 'zebra' });
    expect(text).toContain('7');
    expect(text).not.toContain('zebra');
  });

  it('falls back to a generic sentence when the position is missing', () => {
    expect(errorMessage('MNEMONIC_WORD_UNKNOWN')).toContain('not in the');
  });
});

describe('copy', () => {
  it('pins the reference copy verbatim', () => {
    expect(copy.heading).toBe('One phrase. Your addresses.');
    expect(copy.eyebrow).toBe('MULTI-NETWORK GENERATOR');
    expect(copy.intro).toBe(
      'Generate and verify addresses across blockchains. No wallet connection, no sign-up, no RPC.',
    );
    expect(copy.localBadge).toBe('Everything stays on your device');
    expect(copy.sectionSource).toBe('Source data');
    expect(copy.sectionNetworks).toBe('Networks and profiles');
    expect(copy.sectionAddresses).toBe('Your addresses');
    expect(copy.mnemonicLabel).toBe('BIP-39 mnemonic');
    expect(copy.mnemonicPlaceholder).toBe('Enter 12 or 24 words');
    expect(copy.languageLabel).toBe('Mnemonic language');
    expect(copy.lengthLabel).toBe('Next generation');
    expect(copy.words12).toBe('12 words');
    expect(copy.words24).toBe('24 words');
    expect(copy.passphraseLabel).toBe('BIP-39 passphrase · optional');
    expect(copy.passphraseHint).toBe(
      'Any character, including a space, changes every address. This is not an application password.',
    );
    expect(copy.accountLabel).toBe('Account');
    expect(copy.indexLabel).toBe('Address index');
    expect(copy.generate).toBe('Generate mnemonic');
    expect(copy.clear).toBe('Clear session');
    expect(copy.selectAll).toBe('Select all');
    expect(copy.clearAll).toBe('Clear all');
    expect(copy.copyAddress).toBe('Copy');
    expect(copy.copied).toBe('Copied');
    expect(copy.copyPublicKey).toBe('Copy public key');
    expect(copy.copyPrivateKey).toBe('Copy private key');
    expect(copy.derivationDetails).toBe('Derivation parameters');
    expect(copy.emptyTitle).toBe('Start with a mnemonic');
    expect(copy.emptyBody).toBe(
      'Addresses for the selected networks appear here. Matching addresses are merged into one card.',
    );
    expect(copy.modalTitle).toBe('Copy private key');
    expect(copy.modalWarning).toBe(
      'A private key grants full control of the funds it holds. It will be placed on your system clipboard.',
    );
    expect(copy.modalCancel).toBe('Cancel');
    expect(copy.modalConfirm).toBe('Copy private key');
  });

  it('labels every language', () => {
    for (const language of LANGUAGES) {
      expect(languageLabels[language].length).toBeGreaterThan(0);
    }
    expect(languageLabels.chinese_simplified).toBe('Chinese Simplified');
  });

  it('formats summaries and card titles', () => {
    expect(selectedSummary(16, 16, 13)).toBe('16 of 16 profiles selected across 13 networks');
    expect(selectedSummary(1, 16, 1)).toBe('1 of 16 profiles selected across 1 network');
    expect(resultSummary(7, 12, 16, 14)).toBe('7 cards · 12 addresses · 16 profiles · 14 ms');
    expect(resultSummary(1, 1, 1, 3)).toBe('1 card · 1 address · 1 profile · 3 ms');
    expect(evmCardTitle('Ethereum', 7)).toBe('Ethereum and 6 EVM networks');
    expect(evmCardTitle('Ethereum', 2)).toBe('Ethereum and 1 EVM network');
    expect(evmCardTitle('Polygon PoS', 1)).toBe('Polygon PoS');
  });
});
