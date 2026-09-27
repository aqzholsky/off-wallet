import type { AddressGroup, CryptoErrorCode, KeyKind, Language } from '@off-wallet/crypto';

export type DerivationInput = {
  language: Language;
  mnemonic: string;
  passphrase: string;
  account: number;
  index: number;
};

export type Request = { revision: number } & (
  | { kind: 'generate'; language: Language; count: 12 | 24 }
  | ({ kind: 'derive'; selected: string[] } & DerivationInput)
  | ({ kind: 'key'; profileId: string; keyKind: KeyKind } & DerivationInput)
);

export type ProfileFailure = {
  profileId: string;
  code: CryptoErrorCode;
  details?: Record<string, unknown>;
};

export type Response = { revision: number } & (
  | { kind: 'generated'; mnemonic: string }
  | { kind: 'result'; groups: AddressGroup[]; errors: ProfileFailure[]; elapsed: number }
  | { kind: 'key'; bytes: Uint8Array; path: string; encoding: string; keyKind: KeyKind }
  | { kind: 'error'; code: CryptoErrorCode; details?: Record<string, unknown> }
);
