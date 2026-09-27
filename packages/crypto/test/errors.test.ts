import { describe, expect, it } from 'vitest';
import { CRYPTO_ERROR_CODES, CryptoError, isCryptoError } from '../src/errors.ts';

describe('CryptoError', () => {
  it('lists all seventeen codes, without duplicates', () => {
    expect(CRYPTO_ERROR_CODES).toHaveLength(17);
    expect(new Set(CRYPTO_ERROR_CODES).size).toBe(17);
    expect(CRYPTO_ERROR_CODES).toContain('MNEMONIC_WORD_UNKNOWN');
    expect(CRYPTO_ERROR_CODES).toContain('RNG_UNAVAILABLE');
  });

  it('carries the code as message and freezes details', () => {
    const error = new CryptoError('MNEMONIC_WORD_UNKNOWN', { wordIndex: 7 });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('CryptoError');
    expect(error.code).toBe('MNEMONIC_WORD_UNKNOWN');
    expect(error.message).toBe('MNEMONIC_WORD_UNKNOWN');
    expect(error.details).toEqual({ wordIndex: 7 });
    expect(Object.isFrozen(error.details)).toBe(true);
  });

  it('leaves details undefined when none are given', () => {
    expect(new CryptoError('SEED_LENGTH').details).toBeUndefined();
  });

  it('narrows unknown values', () => {
    expect(isCryptoError(new CryptoError('PATH_INVALID'))).toBe(true);
    expect(isCryptoError(new Error('PATH_INVALID'))).toBe(false);
    expect(isCryptoError(null)).toBe(false);
  });
});
