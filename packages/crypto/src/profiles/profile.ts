import { type DerivedLeaf, deriveBip32, secp256k1PublicKey } from '../primitives/bip32.ts';
import { buildPath, type PathShape, shapeSupportsIndex } from '../primitives/path.ts';
import { deriveSlip10Ed25519, ed25519PublicKey } from '../primitives/slip10.ts';

export type Curve = 'secp256k1' | 'ed25519';
export type ProfileStatus = 'verified' | 'draft';

export interface ProfileDefinition {
  readonly id: string;
  readonly chainId: string;
  readonly network: string;
  readonly displayName: string;
  readonly format: string;
  readonly purpose: number;
  readonly coinType: number;
  readonly pathShape: PathShape;
  readonly status: ProfileStatus;
}

export abstract class AddressProfile {
  readonly id: string;
  readonly chainId: string;
  readonly network: string;
  readonly displayName: string;
  readonly format: string;
  readonly purpose: number;
  readonly coinType: number;
  readonly pathShape: PathShape;
  readonly status: ProfileStatus;

  abstract readonly curve: Curve;
  abstract readonly formatFamily: string;
  abstract readonly publicKeyEncoding: string;
  abstract readonly privateKeyEncoding: string;

  constructor(definition: ProfileDefinition) {
    this.id = definition.id;
    this.chainId = definition.chainId;
    this.network = definition.network;
    this.displayName = definition.displayName;
    this.format = definition.format;
    this.purpose = definition.purpose;
    this.coinType = definition.coinType;
    this.pathShape = definition.pathShape;
    this.status = definition.status;
  }

  // Final: subclasses declare purpose, coinType and pathShape, never a path string.
  derivationPath(account: number, index: number): string {
    return buildPath(this.pathShape, this.purpose, this.coinType, account, index);
  }

  get supportsIndex(): boolean {
    return shapeSupportsIndex(this.pathShape);
  }

  abstract deriveLeaf(seed: Uint8Array, path: string): DerivedLeaf;
  abstract publicKeyFromLeaf(privateKey: Uint8Array): Uint8Array;
  abstract encodeAddress(publicKey: Uint8Array): string;

  addressSpace(address: string): string {
    return `${this.formatFamily}:${address}`;
  }
}

export abstract class Secp256k1Profile extends AddressProfile {
  readonly curve = 'secp256k1' as const;
  readonly publicKeyEncoding = 'SEC1 compressed · 33 bytes · hex';
  readonly privateKeyEncoding = 'Raw 32-byte scalar · 64 hex · no 0x';

  override deriveLeaf(seed: Uint8Array, path: string): DerivedLeaf {
    return deriveBip32(seed, path);
  }

  override publicKeyFromLeaf(privateKey: Uint8Array): Uint8Array {
    return secp256k1PublicKey(privateKey);
  }
}

export abstract class Ed25519Profile extends AddressProfile {
  readonly curve = 'ed25519' as const;
  readonly publicKeyEncoding = 'Raw ed25519 public key · 32 bytes · hex';
  readonly privateKeyEncoding = 'Raw SLIP-0010 leaf seed · 32 bytes · hex';

  override deriveLeaf(seed: Uint8Array, path: string): DerivedLeaf {
    return deriveSlip10Ed25519(seed, path);
  }

  override publicKeyFromLeaf(privateKey: Uint8Array): Uint8Array {
    return ed25519PublicKey(privateKey);
  }
}

export interface Chain {
  readonly id: string;
  readonly displayName: string;
  readonly profiles: readonly AddressProfile[];
}
