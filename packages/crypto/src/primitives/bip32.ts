import { secp256k1 } from '@noble/curves/secp256k1.js';
import { bytesToNumberBE, numberToBytesBE } from '@noble/curves/utils.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { CryptoError } from '../errors.ts';
import { formatPath, HARDENED_OFFSET, MAX_INDEX, parsePath } from './path.ts';
import { wipe } from './wipe.ts';

export interface HdNode {
  readonly key: Uint8Array;
  readonly chainCode: Uint8Array;
}

export interface DerivedLeaf {
  readonly node: HdNode;
  readonly path: string;
}

const CURVE_ORDER = secp256k1.Point.Fn.ORDER;
const MASTER_KEY = utf8ToBytes('Bitcoin seed');
const MIN_SEED = 16;
const MAX_SEED = 64;

function indexBytes(index: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, index >>> 0);
  return out;
}

export function bip32MasterFromSeed(seed: Uint8Array): HdNode {
  if (seed.length < MIN_SEED || seed.length > MAX_SEED) {
    throw new CryptoError('SEED_LENGTH', { length: seed.length });
  }
  const state = hmac(sha512, MASTER_KEY, seed);
  try {
    const key = state.slice(0, 32);
    const scalar = bytesToNumberBE(key);
    if (scalar === 0n || scalar >= CURVE_ORDER) {
      wipe(key);
      throw new CryptoError('BIP32_INVALID_MASTER');
    }
    return { key, chainCode: state.slice(32) };
  } finally {
    wipe(state);
  }
}

export function ckdPriv(parent: HdNode, index: number): HdNode | null {
  const suffix = indexBytes(index);
  const data =
    index >= HARDENED_OFFSET
      ? concatBytes(new Uint8Array([0]), parent.key, suffix)
      : concatBytes(secp256k1.getPublicKey(parent.key, true), suffix);
  const state = hmac(sha512, parent.chainCode, data);
  // slice() copies, so IL outlives the state buffer and has to be wiped on its own:
  // the parent scalar is recoverable from a child as child - IL mod n.
  const il = state.slice(0, 32);
  try {
    const tweak = bytesToNumberBE(il);
    if (tweak >= CURVE_ORDER) return null;
    // The scalars below are BigInts, so these two secrets survive in immutable
    // values that no fill(0) can reach. Removing that needs byte-level mod-n addition.
    const child = (tweak + bytesToNumberBE(parent.key)) % CURVE_ORDER;
    if (child === 0n) return null;
    return { key: numberToBytesBE(child, 32), chainCode: state.slice(32) };
  } finally {
    wipe(state, data, il);
  }
}

export function deriveBip32(seed: Uint8Array, path: string): DerivedLeaf {
  const segments = parsePath(path);
  let node = bip32MasterFromSeed(seed);
  const actual: { index: number; hardened: boolean }[] = [];

  try {
    for (const segment of segments) {
      let index = segment.index;
      let child: HdNode | null = null;
      // CKDpriv can reject a child with negligible probability; BIP-32 says to take
      // the next index, and the caller must read the path back rather than assume it.
      while (child === null) {
        if (index > MAX_INDEX) throw new CryptoError('BIP32_CHILD_EXHAUSTED');
        child = ckdPriv(node, segment.hardened ? index + HARDENED_OFFSET : index);
        if (child === null) index += 1;
      }
      wipe(node.key, node.chainCode);
      node = child;
      actual.push({ index, hardened: segment.hardened });
    }
  } catch (error) {
    // The walk owns every node it holds, so a throw mid-path would strand a live
    // private key. A finally would instead zero the node this returns.
    wipe(node.key, node.chainCode);
    throw error;
  }

  return { node, path: formatPath(actual) };
}

export function secp256k1PublicKey(privateKey: Uint8Array): Uint8Array {
  return secp256k1.getPublicKey(privateKey, true);
}
