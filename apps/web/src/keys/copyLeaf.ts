import { type KeyKind, wipe } from '@off-wallet/crypto';
import type { KeyDelivery } from '../hooks/useDerivation.ts';

export type CopyLeafOutcome =
  | { ok: true; text: string }
  | { ok: false; reason: 'stale' | 'derivation' | 'clipboard' };

export type CopyLeafParams = {
  requestKey(profileId: string, keyKind: KeyKind): Promise<KeyDelivery>;
  profileId: string;
  keyKind: KeyKind;
  expectedPath: string;
  writeText?(text: string): Promise<void>;
};

export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

const defaultWriteText = (text: string): Promise<void> => navigator.clipboard.writeText(text);

export async function copyLeaf(params: CopyLeafParams): Promise<CopyLeafOutcome> {
  let delivery: KeyDelivery;
  try {
    delivery = await params.requestKey(params.profileId, params.keyKind);
  } catch (error) {
    const stale = error instanceof Error && error.message === 'stale';
    return { ok: false, reason: stale ? 'stale' : 'derivation' };
  }
  try {
    if (delivery.keyKind !== params.keyKind || delivery.path !== params.expectedPath) {
      return { ok: false, reason: 'stale' };
    }
    const writeText = params.writeText ?? defaultWriteText;
    // The hex string is an immutable JS value the app cannot erase; the footer states this limit.
    const text = bytesToHex(delivery.bytes);
    await writeText(text);
    return { ok: true, text };
  } catch {
    return { ok: false, reason: 'clipboard' };
  } finally {
    wipe(delivery.bytes);
  }
}
