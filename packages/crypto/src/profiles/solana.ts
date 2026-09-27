import { base58 } from '../codecs/base58.ts';
import { Ed25519Profile } from './profile.ts';

export abstract class SolanaProfile extends Ed25519Profile {
  readonly formatFamily = 'solana';

  override encodeAddress(publicKey: Uint8Array): string {
    return base58(publicKey);
  }
}
