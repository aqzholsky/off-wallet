import { secp256k1 } from '@noble/curves/secp256k1.js';
import { bytesToNumberBE, numberToBytesBE } from '@noble/curves/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { bech32m, convertBits } from '../codecs/bech32.ts';
import { CryptoError } from '../errors.ts';
import { Secp256k1Profile } from './profile.ts';

const Point = secp256k1.Point;
const CURVE_ORDER = Point.Fn.ORDER;
const TAP_TWEAK_TAG = sha256(utf8ToBytes('TapTweak'));

export function taprootOutputKey(xOnly: Uint8Array): Uint8Array {
  if (xOnly.length !== 32)
    throw new CryptoError('ENCODING_FAILED', { reason: 'taproot-x-only-length' });
  const tweak = bytesToNumberBE(sha256(concatBytes(TAP_TWEAK_TAG, TAP_TWEAK_TAG, xOnly)));
  if (tweak >= CURVE_ORDER)
    throw new CryptoError('ENCODING_FAILED', { reason: 'taproot-tweak-range' });

  let internal: ReturnType<typeof Point.fromBytes>;
  try {
    // BIP-340 lift_x: the even-y point with this x coordinate.
    internal = Point.fromBytes(concatBytes(new Uint8Array([2]), xOnly));
  } catch {
    throw new CryptoError('ENCODING_FAILED', { reason: 'taproot-lift-x' });
  }

  const output = internal.add(Point.BASE.multiply(tweak));
  if (output.is0()) throw new CryptoError('ENCODING_FAILED', { reason: 'taproot-infinity' });
  return numberToBytesBE(output.x, 32);
}

export abstract class TaprootProfile extends Secp256k1Profile {
  readonly formatFamily = 'taproot';
  abstract readonly hrp: string;

  override encodeAddress(publicKey: Uint8Array): string {
    const output = taprootOutputKey(publicKey.slice(1));
    return bech32m(this.hrp, [1, ...convertBits(output, 8, 5, true)]);
  }
}
