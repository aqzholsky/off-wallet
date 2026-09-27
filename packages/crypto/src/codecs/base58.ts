import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes } from '@noble/hashes/utils.js';
import { CryptoError } from '../errors.ts';

export const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const ALPHABET_INDEX = new Map<string, number>(Array.from(BASE58_ALPHABET, (char, i) => [char, i]));

export function base58(bytes: Uint8Array): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

  const digits: number[] = [];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i] ?? 0;
    for (let j = 0; j < digits.length; j++) {
      carry += (digits[j] ?? 0) << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  let out = '1'.repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) out += BASE58_ALPHABET[digits[i] ?? 0];
  return out;
}

export function decode58(text: string): Uint8Array {
  let zeros = 0;
  while (zeros < text.length && text[zeros] === '1') zeros++;

  const bytes: number[] = [];
  for (let i = zeros; i < text.length; i++) {
    const value = ALPHABET_INDEX.get(text[i] ?? '');
    if (value === undefined)
      throw new CryptoError('ENCODING_FAILED', { reason: 'base58-char', position: i });
    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += (bytes[j] ?? 0) * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  const out = new Uint8Array(zeros + bytes.length);
  for (let i = 0; i < bytes.length; i++) out[zeros + i] = bytes[bytes.length - 1 - i] ?? 0;
  return out;
}

function checksum(payload: Uint8Array): Uint8Array {
  return sha256(sha256(payload)).slice(0, 4);
}

export function base58check(payload: Uint8Array): string {
  return base58(concatBytes(payload, checksum(payload)));
}

export function decode58check(text: string): Uint8Array {
  const raw = decode58(text);
  if (raw.length < 5) throw new CryptoError('ENCODING_FAILED', { reason: 'base58check-length' });
  const body = raw.slice(0, -4);
  const expected = checksum(body);
  const actual = raw.slice(-4);
  let diff = 0;
  for (let i = 0; i < 4; i++) diff |= (expected[i] ?? 0) ^ (actual[i] ?? 0);
  if (diff !== 0) throw new CryptoError('ENCODING_FAILED', { reason: 'base58check-checksum' });
  return body;
}
