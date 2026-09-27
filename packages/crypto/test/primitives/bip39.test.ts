import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CryptoError } from '../../src/errors.ts';
import {
  defaultRng,
  entropyToMnemonic,
  generateMnemonic,
  mnemonicToSeed,
  splitMnemonic,
  validateMnemonic,
} from '../../src/primitives/bip39.ts';
import { getWordlist, LANGUAGES, wordSeparator } from '../../src/wordlists/index.ts';
import vectors from '../fixtures/trezor-bip39-vectors.json';

type Vector = [entropy: string, mnemonic: string, seed: string, xprv: string];

const productVectors = (language: (typeof LANGUAGES)[number]): Vector[] =>
  (vectors[language] as Vector[]).filter(
    ([entropy]) => entropy.length === 32 || entropy.length === 64,
  );

describe('splitMnemonic', () => {
  it('normalises to NFKD and splits on any run of spaces or ideographic spaces', () => {
    expect(splitMnemonic('  abandon   about \n zoo ')).toEqual(['abandon', 'about', 'zoo']);
    expect(splitMnemonic('あいこくしん　あおぞら')).toEqual(
      ['あいこくしん', 'あおぞら'].map((word) => word.normalize('NFKD')),
    );
  });

  it('returns an empty array for an empty phrase', () => {
    expect(splitMnemonic('   ')).toEqual([]);
  });
});

describe.each(LANGUAGES)('BIP-39 vectors — %s', (language) => {
  const cases = productVectors(language);

  it('has both 12- and 24-word cases', () => {
    expect(cases.filter(([e]) => e.length === 32).length).toBeGreaterThan(0);
    expect(cases.filter(([e]) => e.length === 64).length).toBeGreaterThan(0);
  });

  it.each(cases)(
    'entropy %s builds and validates its mnemonic and seed',
    (entropy, mnemonic, seed) => {
      // Normalising the whole phrase instead would fold the Japanese U+3000 joiner to a space.
      const canonical = splitMnemonic(mnemonic).join(wordSeparator(language));
      expect(entropyToMnemonic(hexToBytes(entropy), language)).toBe(canonical);
      expect(validateMnemonic(mnemonic, language)).toBe(canonical);
      expect(bytesToHex(mnemonicToSeed(canonical, 'TREZOR'))).toBe(seed);
    },
  );
});

// Array.prototype.with would read better but is ES2023; this package pins lib to ES2022.
const replaceWord = (phrase: string, at: number, word: string): string => {
  const words = phrase.split(' ');
  words[at] = word;
  return words.join(' ');
};

describe('validateMnemonic', () => {
  const twelve =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

  it('returns the canonical form with the language separator', () => {
    expect(validateMnemonic(`  ${twelve.toUpperCase().toLowerCase()}  `, 'english')).toBe(twelve);
    const japanese = validateMnemonic((vectors.japanese as Vector[])[0]?.[1] ?? '', 'japanese');
    expect(japanese).toContain(wordSeparator('japanese'));
    expect(japanese).not.toContain(' ');
  });

  it('rejects word counts other than 12 and 24', () => {
    const words = twelve.split(' ');
    for (const count of [0, 1, 11, 13, 15, 18, 21, 23, 25]) {
      const phrase = Array.from({ length: count }, (_, i) => words[i % 12]).join(' ');
      expect(() => validateMnemonic(phrase, 'english')).toThrowError(/MNEMONIC_LENGTH/);
    }
  });

  it('reports the position of the first unknown word and never the word itself', () => {
    const phrase = replaceWord(twelve, 6, 'notaword');
    try {
      validateMnemonic(phrase, 'english');
      throw new Error('expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(CryptoError);
      expect((error as CryptoError).code).toBe('MNEMONIC_WORD_UNKNOWN');
      expect((error as CryptoError).details).toEqual({ wordIndex: 6 });
      expect(JSON.stringify((error as CryptoError).details)).not.toContain('notaword');
    }
  });

  it('rejects a valid word in the wrong language', () => {
    expect(() => validateMnemonic(twelve, 'french')).toThrowError(/MNEMONIC_WORD_UNKNOWN/);
  });

  it('rejects a bad checksum', () => {
    const broken = replaceWord(twelve, 11, 'ability');
    expect(() => validateMnemonic(broken, 'english')).toThrowError(/MNEMONIC_CHECKSUM/);
  });
});

describe('mnemonicToSeed', () => {
  const twelve =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

  it('produces 64 bytes', () => {
    expect(mnemonicToSeed(twelve, '')).toHaveLength(64);
  });

  it('matches the published seed without a passphrase', () => {
    expect(bytesToHex(mnemonicToSeed(twelve, ''))).toBe(
      '5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4',
    );
  });

  it('changes completely when a single space is added to the passphrase', () => {
    const a = bytesToHex(mnemonicToSeed(twelve, ''));
    const b = bytesToHex(mnemonicToSeed(twelve, ' '));
    expect(b).not.toBe(a);
  });

  it('NFKD-normalises the passphrase, so composed and decomposed forms agree', () => {
    const composed = mnemonicToSeed(twelve, 'é');
    const decomposed = mnemonicToSeed(twelve, 'é');
    expect(bytesToHex(composed)).toBe(bytesToHex(decomposed));
  });

  it('treats the Japanese ideographic separator as equivalent to a space', () => {
    const japanese = (vectors.japanese as Vector[])[0];
    const canonical = validateMnemonic(japanese?.[1] ?? '', 'japanese');
    expect(bytesToHex(mnemonicToSeed(canonical, 'TREZOR'))).toBe(japanese?.[2]);
  });
});

describe('entropyToMnemonic', () => {
  it('rejects entropy that is not 16 or 32 bytes', () => {
    for (const length of [0, 15, 17, 24, 31, 33]) {
      expect(() => entropyToMnemonic(new Uint8Array(length), 'english')).toThrowError(
        /MNEMONIC_ENTROPY_LENGTH/,
      );
    }
  });
});

describe('generateMnemonic', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('produces a valid phrase of the requested length in the requested language', () => {
    for (const words of [12, 24] as const) {
      for (const language of LANGUAGES) {
        const phrase = generateMnemonic({ language, words });
        expect(splitMnemonic(phrase)).toHaveLength(words);
        expect(validateMnemonic(phrase, language)).toBe(phrase);
        for (const word of splitMnemonic(phrase)) {
          expect(getWordlist(language)).toContain(word);
        }
      }
    }
  });

  it('uses the injected rng and asks for the right number of bytes', () => {
    const sizes: number[] = [];
    const rng = (bytes: Uint8Array) => {
      sizes.push(bytes.length);
      bytes.fill(0);
    };
    expect(generateMnemonic({ language: 'english', words: 12, rng })).toBe(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
    expect(generateMnemonic({ language: 'english', words: 24, rng })).toBe(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
    );
    expect(sizes).toEqual([16, 32]);
  });

  it('throws RNG_UNAVAILABLE when no source of randomness exists', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => defaultRng()).toThrowError(/RNG_UNAVAILABLE/);
    expect(() => generateMnemonic({ language: 'english', words: 12 })).toThrowError(
      /RNG_UNAVAILABLE/,
    );
  });

  it('prefers the injected rng over the host even when the host has one', () => {
    const rng = (bytes: Uint8Array) => bytes.fill(255);
    const phrase = generateMnemonic({ language: 'english', words: 12, rng });
    expect(phrase.startsWith('zoo zoo zoo')).toBe(true);
  });
});
