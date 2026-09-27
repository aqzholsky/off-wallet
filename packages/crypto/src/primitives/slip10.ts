import { ed25519 } from '@noble/curves/ed25519.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { CryptoError } from '../errors.ts';
import type { DerivedLeaf, HdNode } from './bip32.ts';
import { formatPath, HARDENED_OFFSET, parsePath } from './path.ts';
import { wipe } from './wipe.ts';

const MASTER_KEY = utf8ToBytes('ed25519 seed');
const MIN_SEED = 16;
const MAX_SEED = 64;

function indexBytes(index: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, index >>> 0);
  return out;
}

export function slip10MasterFromSeed(seed: Uint8Array): HdNode {
  if (seed.length < MIN_SEED || seed.length > MAX_SEED) {
    throw new CryptoError('SEED_LENGTH', { length: seed.length });
  }
  const state = hmac(sha512, MASTER_KEY, seed);
  try {
    return { key: state.slice(0, 32), chainCode: state.slice(32) };
  } finally {
    wipe(state);
  }
}

export function slip10ChildHardened(parent: HdNode, index: number): HdNode {
  if (index < HARDENED_OFFSET) throw new CryptoError('ED25519_NEEDS_HARDENED', { index });
  const data = concatBytes(new Uint8Array([0]), parent.key, indexBytes(index));
  const state = hmac(sha512, parent.chainCode, data);
  try {
    return { key: state.slice(0, 32), chainCode: state.slice(32) };
  } finally {
    wipe(state, data);
  }
}

export function deriveSlip10Ed25519(seed: Uint8Array, path: string): DerivedLeaf {
  const segments = parsePath(path);
  // Rejecting the whole path up front keeps a bad path from deriving, and stranding,
  // a master key before the offending segment is reached.
  for (const segment of segments) {
    if (!segment.hardened)
      throw new CryptoError('ED25519_NEEDS_HARDENED', { index: segment.index });
  }

  let node = slip10MasterFromSeed(seed);
  try {
    for (const segment of segments) {
      const child = slip10ChildHardened(node, segment.index + HARDENED_OFFSET);
      wipe(node.key, node.chainCode);
      node = child;
    }
  } catch (error) {
    wipe(node.key, node.chainCode);
    throw error;
  }
  // SLIP-0010 has no invalid-child case, so the derived path always equals the request.
  return { node, path: formatPath(segments) };
}

export function ed25519PublicKey(privateKey: Uint8Array): Uint8Array {
  return ed25519.getPublicKey(privateKey);
}
