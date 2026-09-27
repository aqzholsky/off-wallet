import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { CryptoError } from '../errors.ts';
import { getWordlist, type Language, wordSeparator } from '../wordlists/index.ts';
import { wipe } from './wipe.ts';

export type Rng = (bytes: Uint8Array) => void;

type WebCryptoLike = { getRandomValues(buffer: Uint8Array): Uint8Array };

const PBKDF2_ROUNDS = 2048;
const SEED_LENGTH = 64;
const WORD_BITS = 11;

// The only place this package reaches for a host global. Porting to a new
// runtime means changing this function and nothing else.
export function defaultRng(): Rng {
  const webcrypto = (globalThis as { crypto?: WebCryptoLike }).crypto;
  if (!webcrypto?.getRandomValues) throw new CryptoError('RNG_UNAVAILABLE');
  return (buffer) => {
    webcrypto.getRandomValues(buffer);
  };
}

export function splitMnemonic(phrase: string): string[] {
  return phrase
    .normalize('NFKD')
    .split(/[\s　]+/u)
    .filter((word) => word.length > 0);
}

function checksumBits(entropy: Uint8Array): string {
  const hash = sha256(entropy);
  const bits = (entropy.length * 8) / 32;
  let out = '';
  for (let i = 0; i < bits; i++) out += ((hash[i >> 3] ?? 0) >> (7 - (i & 7))) & 1;
  return out;
}

export function entropyToMnemonic(entropy: Uint8Array, language: Language): string {
  if (entropy.length !== 16 && entropy.length !== 32) {
    throw new CryptoError('MNEMONIC_ENTROPY_LENGTH', { length: entropy.length });
  }
  const words = getWordlist(language);
  let bits = '';
  for (const byte of entropy) bits += byte.toString(2).padStart(8, '0');
  bits += checksumBits(entropy);

  const picked: string[] = [];
  for (let i = 0; i < bits.length; i += WORD_BITS) {
    picked.push(words[Number.parseInt(bits.slice(i, i + WORD_BITS), 2)] ?? '');
  }
  return picked.join(wordSeparator(language));
}

export function generateMnemonic(opts: { language: Language; words: 12 | 24; rng?: Rng }): string {
  const entropy = new Uint8Array(opts.words === 24 ? 32 : 16);
  try {
    (opts.rng ?? defaultRng())(entropy);
    return entropyToMnemonic(entropy, opts.language);
  } finally {
    wipe(entropy);
  }
}

export function validateMnemonic(phrase: string, language: Language): string {
  const words = getWordlist(language);
  const given = splitMnemonic(phrase);
  if (given.length !== 12 && given.length !== 24) {
    throw new CryptoError('MNEMONIC_LENGTH', { wordCount: given.length });
  }

  let bits = '';
  for (let i = 0; i < given.length; i++) {
    const index = words.indexOf(given[i] ?? '');
    if (index < 0) throw new CryptoError('MNEMONIC_WORD_UNKNOWN', { wordIndex: i });
    bits += index.toString(2).padStart(WORD_BITS, '0');
  }

  const entropyBits = (given.length * WORD_BITS * 32) / 33;
  const entropy = new Uint8Array(entropyBits / 8);
  try {
    for (let i = 0; i < entropyBits; i += 8) {
      entropy[i / 8] = Number.parseInt(bits.slice(i, i + 8), 2);
    }
    if (bits.slice(entropyBits) !== checksumBits(entropy))
      throw new CryptoError('MNEMONIC_CHECKSUM');
    return given.join(wordSeparator(language));
  } finally {
    wipe(entropy);
  }
}

export function mnemonicToSeed(canonical: string, passphrase: string): Uint8Array {
  const password = utf8ToBytes(canonical.normalize('NFKD'));
  const salt = utf8ToBytes(`mnemonic${passphrase.normalize('NFKD')}`);
  try {
    return pbkdf2(sha512, password, salt, { c: PBKDF2_ROUNDS, dkLen: SEED_LENGTH });
  } finally {
    wipe(password, salt);
  }
}
