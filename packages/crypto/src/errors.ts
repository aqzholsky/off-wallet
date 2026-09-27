export const CRYPTO_ERROR_CODES = [
  'MNEMONIC_LENGTH',
  'MNEMONIC_WORD_UNKNOWN',
  'MNEMONIC_CHECKSUM',
  'MNEMONIC_ENTROPY_LENGTH',
  'LANGUAGE_UNKNOWN',
  'PATH_INVALID',
  'PATH_INDEX_RANGE',
  'SEED_LENGTH',
  'ED25519_NEEDS_HARDENED',
  'BIP32_INVALID_MASTER',
  'BIP32_CHILD_EXHAUSTED',
  'PROFILE_UNKNOWN',
  'PROFILE_NOT_VERIFIED',
  'KEY_KIND_INVALID',
  'KEY_DERIVATION_FAILED',
  'ENCODING_FAILED',
  'RNG_UNAVAILABLE',
] as const;

export type CryptoErrorCode = (typeof CRYPTO_ERROR_CODES)[number];

export class CryptoError extends Error {
  override readonly name = 'CryptoError' as const;
  readonly code: CryptoErrorCode;
  readonly details: Readonly<Record<string, unknown>> | undefined;

  constructor(code: CryptoErrorCode, details?: Record<string, unknown>) {
    // The message is the bare code so that no caller can accidentally
    // surface secret material through Error.message or a stack trace.
    super(code);
    this.code = code;
    this.details = details === undefined ? undefined : Object.freeze({ ...details });
  }
}

export function isCryptoError(value: unknown): value is CryptoError {
  return value instanceof CryptoError;
}
