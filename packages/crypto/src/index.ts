export const VERSION = '0.1.0';

export {
  type AddressRecord,
  type DerivationParams,
  deriveAddress,
  deriveKey,
  type KeyExport,
  type KeyKind,
} from './derive.ts';
export { CRYPTO_ERROR_CODES, CryptoError, type CryptoErrorCode, isCryptoError } from './errors.ts';
export { type AddressGroup, groupByAddressSpace } from './group.ts';
export {
  generateMnemonic,
  mnemonicToSeed,
  type Rng,
  splitMnemonic,
  validateMnemonic,
} from './primitives/bip39.ts';
export { HARDENED_OFFSET, MAX_INDEX, type PathShape } from './primitives/path.ts';
export { wipe } from './primitives/wipe.ts';
export {
  AddressProfile,
  type Chain,
  type Curve,
  type ProfileStatus,
} from './profiles/profile.ts';
export { registry } from './registry.ts';
export { isLanguage, LANGUAGES, type Language, wordSeparator } from './wordlists/index.ts';
