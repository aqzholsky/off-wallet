import type { CryptoErrorCode, Language } from '@off-wallet/crypto';

export function pluralize(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export const languageLabels: Record<Language, string> = {
  english: 'English',
  japanese: 'Japanese',
  korean: 'Korean',
  spanish: 'Spanish',
  chinese_simplified: 'Chinese Simplified',
  chinese_traditional: 'Chinese Traditional',
  french: 'French',
  italian: 'Italian',
  czech: 'Czech',
  portuguese: 'Portuguese',
};

export const copy = {
  brand: 'Multi-Chain Address Generator',
  localBadge: 'Everything stays on your device',
  eyebrow: 'MULTI-NETWORK GENERATOR',
  heading: 'One phrase. Your addresses.',
  intro:
    'Generate and verify addresses across blockchains. No wallet connection, no sign-up, no RPC.',
  sectionSource: 'Source data',
  sectionNetworks: 'Networks and profiles',
  sectionAddresses: 'Your addresses',
  mnemonicLabel: 'BIP-39 mnemonic',
  mnemonicPlaceholder: 'Enter 12 or 24 words',
  languageLabel: 'Mnemonic language',
  lengthLabel: 'Next generation',
  words12: '12 words',
  words24: '24 words',
  passphraseLabel: 'BIP-39 passphrase · optional',
  passphrasePlaceholder: 'Leave empty unless your wallet uses one',
  passphraseHint:
    'Any character, including a space, changes every address. This is not an application password.',
  accountLabel: 'Account',
  indexLabel: 'Address index',
  generate: 'Generate mnemonic',
  clear: 'Clear session',
  selectAll: 'Select all',
  clearAll: 'Clear all',
  copyAddress: 'Copy',
  copied: 'Copied',
  copyPublicKey: 'Copy public key',
  copyPrivateKey: 'Copy private key',
  derivationDetails: 'Derivation parameters',
  emptyTitle: 'Start with a mnemonic',
  emptyBody:
    'Addresses for the selected networks appear here. Matching addresses are merged into one card.',
  working: 'Deriving addresses…',
  modalTitle: 'Copy private key',
  modalWarning:
    'A private key grants full control of the funds it holds. It will be placed on your system clipboard.',
  modalCancel: 'Cancel',
  modalConfirm: 'Copy private key',
  modalClose: 'Close',
  modalCopyAgain: 'Copy again',
  modalRevealLabel: 'Private key',
  rowNetwork: 'Network',
  rowProfile: 'Profile',
  rowPath: 'Path',
  rowFormat: 'Format',
  rowAccount: 'Account',
  rowIndex: 'Address index',
  rowCurve: 'Curve',
  rowPurpose: 'Purpose',
  rowCoinType: 'Coin type',
  sameAddressOn: 'Same address on',
  evmRowName: 'EVM networks',
  evmRowCurve: 'secp256k1 · one address, 7 networks',
  evmCardMeta: 'One address · 7 profiles · keccak256 / EIP-55',
  profileScope:
    'A profile is one documented derivation convention, not a guarantee of universal wallet compatibility.',
  indexIgnored: 'Address index is ignored for this profile.',
  profileNotes: {
    'btc-taproot': 'Key exports are the untweaked BIP-32 leaf, not the tweaked spending key.',
  } as Readonly<Record<string, string>>,
  footer: [
    'Nothing is stored and no request leaves this page after it loads. Clipboard writes already handed to the OS cannot be revoked, and clearing the session does not clear the system clipboard or its history.',
    'JavaScript strings and garbage-collector copies cannot be guaranteed erased.',
  ] as readonly string[],
  privateKeyCopied: 'Private key copied to the clipboard.',
  publicKeyCopied: 'Public key copied to the clipboard.',
  clipboardFailed:
    'The clipboard rejected the write. Nothing was copied. Open the confirmation again to retry.',
  keyStale: 'Inputs changed before the key was ready. Nothing was copied.',
  keyFailed: 'The key could not be derived. Nothing was copied.',
  ariaToggleAll: (name: string) => `Select all ${name} profiles`,
  ariaCopyAddress: (format: string) => `Copy ${format} address`,
  ariaCopyPublicKey: (format: string) => `Copy ${format} public key`,
  ariaCopyPrivateKey: (format: string) => `Copy ${format} private key`,
  ariaResults: 'Derived addresses',
} as const;

export function selectedSummary(selected: number, total: number, networks: number): string {
  return `${selected} of ${total} profiles selected across ${networks} ${pluralize(networks, 'network', 'networks')}`;
}

export function resultSummary(
  cards: number,
  addresses: number,
  profiles: number,
  ms: number,
): string {
  return [
    `${cards} ${pluralize(cards, 'card', 'cards')}`,
    `${addresses} ${pluralize(addresses, 'address', 'addresses')}`,
    `${profiles} ${pluralize(profiles, 'profile', 'profiles')}`,
    `${ms} ms`,
  ].join(' · ');
}

export function evmCardTitle(firstNetwork: string, networkCount: number): string {
  if (networkCount <= 1) return firstNetwork;
  const others = networkCount - 1;
  return `${firstNetwork} and ${others} EVM ${pluralize(others, 'network', 'networks')}`;
}

export function errorMessage(code: CryptoErrorCode, details?: Record<string, unknown>): string {
  switch (code) {
    case 'MNEMONIC_LENGTH':
      return 'A mnemonic has 12 or 24 words.';
    case 'MNEMONIC_WORD_UNKNOWN': {
      const position = typeof details?.wordIndex === 'number' ? details.wordIndex + 1 : null;
      return position === null
        ? 'A word is not in the selected wordlist.'
        : `Word ${position} is not in the selected wordlist.`;
    }
    case 'MNEMONIC_CHECKSUM':
      return 'The mnemonic checksum does not match. Check every word.';
    case 'MNEMONIC_ENTROPY_LENGTH':
      return 'Entropy must be 128 or 256 bits.';
    case 'LANGUAGE_UNKNOWN':
      return 'The selected mnemonic language is not supported.';
    case 'PATH_INVALID':
      return 'The derivation path is malformed.';
    case 'PATH_INDEX_RANGE':
      return 'Account and address index must be whole numbers from 0 to 2147483647.';
    case 'SEED_LENGTH':
      return 'The seed must be between 16 and 64 bytes.';
    case 'ED25519_NEEDS_HARDENED':
      return 'Ed25519 derivation supports hardened path components only.';
    case 'BIP32_INVALID_MASTER':
      return 'This seed produces an invalid master key. Change the passphrase or the mnemonic.';
    case 'BIP32_CHILD_EXHAUSTED':
      return 'No valid child key exists at or after the requested index.';
    case 'PROFILE_UNKNOWN':
      return 'This profile is not in the registry.';
    case 'PROFILE_NOT_VERIFIED':
      return 'This profile has no independent verification yet and is disabled.';
    case 'KEY_KIND_INVALID':
      return 'The key kind must be public or private.';
    case 'KEY_DERIVATION_FAILED':
      return 'The key could not be derived.';
    case 'ENCODING_FAILED':
      return 'The address could not be encoded.';
    case 'RNG_UNAVAILABLE':
      return 'No secure random number generator is available in this browser.';
    default: {
      // A new CryptoErrorCode without a sentence must fail typecheck, not ship a blank error.
      const exhaustive: never = code;
      return exhaustive;
    }
  }
}
