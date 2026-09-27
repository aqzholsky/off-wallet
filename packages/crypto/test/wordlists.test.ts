import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { describe, expect, it } from 'vitest';
import { CryptoError } from '../src/errors.ts';
import { getWordlist, isLanguage, LANGUAGES, wordSeparator } from '../src/wordlists/index.ts';

// The sha256 of each upstream bip-0039/<language>.txt at the commit PROVENANCE.md pins.
// Asserting them here is what stops a single altered word from passing the shape checks.
const UPSTREAM_SHA256: Record<(typeof LANGUAGES)[number], string> = {
  english: '2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda',
  japanese: '2eed0aef492291e061633d7ad8117f1a2b03eb80a29d0e4e3117ac2528d05ffd',
  korean: '9e95f86c167de88f450f0aaf89e87f6624a57f973c67b516e338e8e8b8897f60',
  spanish: '46846a5a0139d1e3cb77293e521c2865f7bcdb82c44e8d0a06a2cd0ecba48c0b',
  chinese_simplified: '5c5942792bd8340cb8b27cd592f1015edf56a8c5b26276ee18a482428e7c5726',
  chinese_traditional: '417b26b3d8500a4ae3d59717d7011952db6fc2fb84b807f3f94ac734e89c1b5f',
  french: 'ebc3959ab7801a1df6bac4fa7d970652f1df76b683cd2f4003c941c63d517e59',
  italian: 'd392c49fdb700a24cd1fceb237c1f65dcc128f6b34a8aacb58b59384b5c648c2',
  czech: '7e80e161c3e93d9554c2efb78d4e3cebf8fc727e9c52e03b83b94406bdcc95fc',
  portuguese: '2685e9c194c82ae67e10ba59d9ea5345a23dc093e92276fc5361f6667d79cd3f',
};

describe('LANGUAGES', () => {
  it('lists the ten official BIP-39 languages in spec order', () => {
    expect(LANGUAGES).toEqual([
      'english',
      'japanese',
      'korean',
      'spanish',
      'chinese_simplified',
      'chinese_traditional',
      'french',
      'italian',
      'czech',
      'portuguese',
    ]);
  });
});

describe('getWordlist', () => {
  it.each(LANGUAGES)('%s has 2048 unique NFKD words', (language) => {
    const words = getWordlist(language);
    expect(words).toHaveLength(2048);
    expect(new Set(words).size).toBe(2048);
    for (const word of words) {
      expect(word).toBe(word.normalize('NFKD'));
      expect(word).not.toContain(' ');
      expect(word).not.toContain('　');
    }
  });

  // Upstream orders each list with its own locale collation, so six of the ten break a
  // code-unit sort. Word lookup must therefore stay a linear scan; a binary search here
  // would silently fail to find valid words in those six languages.
  it('shares a code-unit sort with only four of the ten lists', () => {
    const codeUnitSorted = LANGUAGES.filter((language) => {
      const words = getWordlist(language);
      return words.every((word, i) => i === 0 || (words[i - 1] as string) <= word);
    });
    expect(codeUnitSorted).toEqual(['english', 'korean', 'italian', 'portuguese']);
  });

  it('starts and ends the English list with the published words', () => {
    const english = getWordlist('english');
    expect(english[0]).toBe('abandon');
    expect(english[2047]).toBe('zoo');
    expect(english[3]).toBe('about');
  });

  it.each(LANGUAGES)('%s still hashes to its pinned upstream file', (language) => {
    const rejoined = `${getWordlist(language).join('\n')}\n`;
    expect(bytesToHex(sha256(utf8ToBytes(rejoined)))).toBe(UPSTREAM_SHA256[language]);
  });

  it('rejects an unknown language', () => {
    expect(() => getWordlist('klingon' as never)).toThrowError(CryptoError);
    expect(() => getWordlist('klingon' as never)).toThrowError(/LANGUAGE_UNKNOWN/);
  });
});

describe('isLanguage', () => {
  it('narrows only the ten supported names', () => {
    expect(isLanguage('english')).toBe(true);
    expect(isLanguage('chinese_traditional')).toBe(true);
    expect(isLanguage('russian')).toBe(false);
    expect(isLanguage('')).toBe(false);
  });
});

describe('wordSeparator', () => {
  it('is an ideographic space for Japanese and a plain space otherwise', () => {
    expect(wordSeparator('japanese')).toBe('　');
    for (const language of LANGUAGES.filter((l) => l !== 'japanese')) {
      expect(wordSeparator(language)).toBe(' ');
    }
  });
});
