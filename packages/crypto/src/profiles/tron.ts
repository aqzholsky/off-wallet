import { concatBytes } from '@noble/hashes/utils.js';
import { base58check } from '../codecs/base58.ts';
import { evmAddressBytes } from './evm.ts';
import { Secp256k1Profile } from './profile.ts';

const TRON_PREFIX = new Uint8Array([0x41]);

export abstract class TronProfile extends Secp256k1Profile {
  readonly formatFamily = 'tron';

  override encodeAddress(publicKey: Uint8Array): string {
    return base58check(concatBytes(TRON_PREFIX, evmAddressBytes(publicKey)));
  }
}
