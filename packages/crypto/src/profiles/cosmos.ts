import { bech32, convertBits } from '../codecs/bech32.ts';
import { hash160 } from '../codecs/hash160.ts';
import { Secp256k1Profile } from './profile.ts';

export abstract class CosmosProfile extends Secp256k1Profile {
  readonly formatFamily = 'cosmos';
  abstract readonly hrp: string;

  override encodeAddress(publicKey: Uint8Array): string {
    return bech32(this.hrp, convertBits(hash160(publicKey), 8, 5, true));
  }
}
