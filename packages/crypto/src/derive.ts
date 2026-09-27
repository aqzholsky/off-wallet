import { CryptoError } from './errors.ts';
import { assertIndex } from './primitives/path.ts';
import { wipe } from './primitives/wipe.ts';
import type { AddressProfile } from './profiles/profile.ts';

export interface DerivationParams {
  readonly account: number;
  readonly index: number;
}

export interface AddressRecord {
  readonly profileId: string;
  readonly chainId: string;
  readonly displayName: string;
  readonly network: string;
  readonly format: string;
  readonly address: string;
  readonly addressSpace: string;
  readonly path: string;
  readonly account: number;
  readonly index?: number;
}

export type KeyKind = 'public' | 'private';

export interface KeyExport {
  readonly bytes: Uint8Array;
  readonly path: string;
  readonly encoding: string;
  readonly keyKind: KeyKind;
}

function assertParams(params: DerivationParams): void {
  assertIndex(params.account, 'account');
  assertIndex(params.index, 'index');
}

export function deriveAddress(
  profile: AddressProfile,
  seed: Uint8Array,
  params: DerivationParams,
): AddressRecord {
  assertParams(params);
  const requested = profile.derivationPath(params.account, params.index);
  const { node, path } = profile.deriveLeaf(seed, requested);
  try {
    const address = profile.encodeAddress(profile.publicKeyFromLeaf(node.key));
    const record: AddressRecord = {
      profileId: profile.id,
      chainId: profile.chainId,
      displayName: profile.displayName,
      network: profile.network,
      format: profile.format,
      address,
      addressSpace: profile.addressSpace(address),
      path,
      account: params.account,
      ...(profile.supportsIndex ? { index: params.index } : {}),
    };
    return record;
  } finally {
    wipe(node.key, node.chainCode);
  }
}

export function deriveKey(
  profile: AddressProfile,
  seed: Uint8Array,
  params: DerivationParams,
  kind: KeyKind,
): KeyExport {
  if (kind !== 'public' && kind !== 'private') throw new CryptoError('KEY_KIND_INVALID', { kind });
  assertParams(params);
  const requested = profile.derivationPath(params.account, params.index);
  const { node, path } = profile.deriveLeaf(seed, requested);
  try {
    // One kind per call: the other is never computed, so it cannot leak.
    const bytes =
      kind === 'public' ? profile.publicKeyFromLeaf(node.key) : Uint8Array.from(node.key);
    return {
      bytes,
      path,
      encoding: kind === 'public' ? profile.publicKeyEncoding : profile.privateKeyEncoding,
      keyKind: kind,
    };
  } finally {
    wipe(node.key, node.chainCode);
  }
}
