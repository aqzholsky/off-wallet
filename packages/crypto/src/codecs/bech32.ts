import { CryptoError } from '../errors.ts';

export type Bech32Encoding = 'bech32' | 'bech32m';

export const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

const CHARSET_INDEX = new Map<string, number>(Array.from(BECH32_CHARSET, (char, i) => [char, i]));
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const BECH32_CONST = 1;
const BECH32M_CONST = 0x2bc830a3;
const MAX_LENGTH = 90;

function fail(reason: string): never {
  throw new CryptoError('ENCODING_FAILED', { reason });
}

function polymod(values: readonly number[]): number {
  let chk = 1;
  for (const value of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) {
      if ((top >>> i) & 1) chk ^= GENERATOR[i] ?? 0;
    }
  }
  return chk >>> 0;
}

function hrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (const char of hrp) out.push(char.charCodeAt(0) >> 5);
  out.push(0);
  for (const char of hrp) out.push(char.charCodeAt(0) & 31);
  return out;
}

function assertHrp(hrp: string): void {
  if (hrp.length < 1 || hrp.length > 83) fail('bech32-hrp-length');
  for (const char of hrp) {
    const code = char.charCodeAt(0);
    if (code < 33 || code > 126) fail('bech32-hrp-char');
  }
}

export function convertBits(
  data: ArrayLike<number>,
  from: number,
  to: number,
  pad: boolean,
): number[] {
  let acc = 0;
  let bits = 0;
  const out: number[] = [];
  const maxValue = (1 << to) - 1;
  for (let i = 0; i < data.length; i++) {
    const value = data[i] ?? 0;
    if (value < 0 || value >> from !== 0) fail('convert-bits-range');
    acc = (acc << from) | value;
    bits += from;
    while (bits >= to) {
      bits -= to;
      out.push((acc >>> bits) & maxValue);
    }
  }
  if (pad) {
    if (bits > 0) out.push((acc << (to - bits)) & maxValue);
  } else if (bits >= from || ((acc << (to - bits)) & maxValue) !== 0) {
    fail('convert-bits-padding');
  }
  return out;
}

function encode(hrp: string, words: readonly number[], constant: number): string {
  assertHrp(hrp);
  const lowerHrp = hrp.toLowerCase();
  for (const word of words) {
    if (!Number.isInteger(word) || word < 0 || word > 31) fail('bech32-word-range');
  }
  const values = [...hrpExpand(lowerHrp), ...words];
  const checksum = polymod([...values, 0, 0, 0, 0, 0, 0]) ^ constant;
  let out = `${lowerHrp}1`;
  for (const word of words) out += BECH32_CHARSET[word];
  for (let i = 0; i < 6; i++) out += BECH32_CHARSET[(checksum >>> (5 * (5 - i))) & 31];
  if (out.length > MAX_LENGTH) fail('bech32-length');
  return out;
}

export function bech32(hrp: string, words: readonly number[]): string {
  return encode(hrp, words, BECH32_CONST);
}

export function bech32m(hrp: string, words: readonly number[]): string {
  return encode(hrp, words, BECH32M_CONST);
}

export function decodeBech32(text: string): {
  hrp: string;
  words: number[];
  encoding: Bech32Encoding;
} {
  if (text.length < 8 || text.length > MAX_LENGTH) fail('bech32-length');
  const lower = text.toLowerCase();
  if (text !== lower && text !== text.toUpperCase()) fail('bech32-mixed-case');
  const separator = lower.lastIndexOf('1');
  if (separator < 1 || separator + 7 > lower.length) fail('bech32-separator');
  const hrp = lower.slice(0, separator);
  assertHrp(hrp);
  const words: number[] = [];
  for (let i = separator + 1; i < lower.length; i++) {
    const value = CHARSET_INDEX.get(lower[i] ?? '');
    if (value === undefined) fail('bech32-data-char');
    words.push(value);
  }
  const check = polymod([...hrpExpand(hrp), ...words]);
  const encoding: Bech32Encoding =
    check === BECH32_CONST
      ? 'bech32'
      : check === BECH32M_CONST
        ? 'bech32m'
        : fail('bech32-checksum');
  return { hrp, words: words.slice(0, -6), encoding };
}
