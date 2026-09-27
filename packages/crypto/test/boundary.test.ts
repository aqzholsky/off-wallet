import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import { VERSION } from '../src/index.ts';
import tsconfig from '../tsconfig.json';

describe('crypto package boundary', () => {
  it('depends on exactly the two noble packages', () => {
    expect(Object.keys(pkg.dependencies).sort()).toEqual(['@noble/curves', '@noble/hashes']);
    expect('devDependencies' in pkg).toBe(false);
  });

  it('typechecks without the DOM lib', () => {
    expect(tsconfig.compilerOptions.lib).toEqual(['ES2022']);
    expect(tsconfig.compilerOptions.types).toEqual([]);
  });

  it('exposes the package version', () => {
    expect(VERSION).toBe(pkg.version);
  });

  // src/index.ts is a closed list: nothing else is importable by the app.
  // Pinning it here is what makes an accidental re-export fail loudly.
  it('exports only the pinned runtime names', async () => {
    const surface = Object.keys(await import('../src/index.ts')).sort();
    expect(surface).toEqual([
      'AddressProfile',
      'CRYPTO_ERROR_CODES',
      'CryptoError',
      'HARDENED_OFFSET',
      'LANGUAGES',
      'MAX_INDEX',
      'VERSION',
      'deriveAddress',
      'deriveKey',
      'generateMnemonic',
      'groupByAddressSpace',
      'isCryptoError',
      'isLanguage',
      'mnemonicToSeed',
      'registry',
      'splitMnemonic',
      'validateMnemonic',
      'wipe',
      'wordSeparator',
    ]);
  });
});
