import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { CryptoError } from '../errors.ts';

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export function eip55(address20: Uint8Array): string {
  if (address20.length !== 20) throw new CryptoError('ENCODING_FAILED', { reason: 'eip55-length' });
  const hex = bytesToHex(address20);
  const hash = bytesToHex(keccak_256(utf8ToBytes(hex)));
  let out = '0x';
  for (let i = 0; i < 40; i++) {
    const nibble = Number.parseInt(hash[i] ?? '0', 16);
    const char = hex[i] ?? '';
    out += nibble >= 8 ? char.toUpperCase() : char;
  }
  return out;
}

export function isEip55(text: string): boolean {
  if (!ADDRESS_PATTERN.test(text)) return false;
  return eip55(hexToBytes(text.slice(2))) === text;
}
