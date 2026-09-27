import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { eip55 } from '../codecs/eip55.ts';
import { CryptoError } from '../errors.ts';
import { Secp256k1Profile } from './profile.ts';

export function evmAddressBytes(compressedPublicKey: Uint8Array): Uint8Array {
  let uncompressed: Uint8Array;
  try {
    uncompressed = secp256k1.Point.fromBytes(compressedPublicKey).toBytes(false);
  } catch {
    throw new CryptoError('ENCODING_FAILED', { reason: 'evm-public-key' });
  }
  return keccak_256(uncompressed.slice(1)).slice(-20);
}

export abstract class EvmProfile extends Secp256k1Profile {
  readonly formatFamily = 'evm';

  override encodeAddress(publicKey: Uint8Array): string {
    return eip55(evmAddressBytes(publicKey));
  }

  // The seven EVM networks derive the same key and must collapse into one result.
  // Casing carries no information here, so the space is the lower-case hex body.
  override addressSpace(address: string): string {
    return `evm:${address.slice(2).toLowerCase()}`;
  }
}
