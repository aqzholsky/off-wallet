import { concatBytes } from '@noble/hashes/utils.js';
import { base58check } from '../codecs/base58.ts';
import { hash160 } from '../codecs/hash160.ts';
import { Secp256k1Profile } from './profile.ts';

export abstract class Base58PkhProfile extends Secp256k1Profile {
  readonly formatFamily = 'p2pkh';
  abstract readonly versionBytes: Uint8Array;

  override encodeAddress(publicKey: Uint8Array): string {
    return base58check(concatBytes(this.versionBytes, hash160(publicKey)));
  }
}
