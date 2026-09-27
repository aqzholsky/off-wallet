import { ripemd160 } from '@noble/hashes/legacy.js';
import { sha256 } from '@noble/hashes/sha2.js';

export function hash160(bytes: Uint8Array): Uint8Array {
  return ripemd160(sha256(bytes));
}
