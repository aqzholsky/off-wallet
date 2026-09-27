import {
  type AddressRecord,
  type CryptoErrorCode,
  deriveAddress,
  deriveKey,
  generateMnemonic,
  groupByAddressSpace,
  isCryptoError,
  MAX_INDEX,
  mnemonicToSeed,
  registry,
  validateMnemonic,
  wipe,
} from '@off-wallet/crypto';
import type { DerivationInput, ProfileFailure, Request, Response } from './protocol.ts';

type ErrorPayload = { code: CryptoErrorCode; details?: Record<string, unknown> };

function errorPayload(error: unknown, fallback: CryptoErrorCode): ErrorPayload {
  if (!isCryptoError(error)) return { code: fallback };
  return error.details ? { code: error.code, details: { ...error.details } } : { code: error.code };
}

function isIndex(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_INDEX;
}

function seedFor(input: DerivationInput): Uint8Array {
  const canonical = validateMnemonic(input.mnemonic, input.language);
  return mnemonicToSeed(canonical, input.passphrase);
}

function handleGenerate(request: Extract<Request, { kind: 'generate' }>): Response {
  try {
    const mnemonic = generateMnemonic({ language: request.language, words: request.count });
    return { revision: request.revision, kind: 'generated', mnemonic };
  } catch (error) {
    // The only realistic non-typed failure here is a missing RNG, so that is the fallback code.
    return { revision: request.revision, kind: 'error', ...errorPayload(error, 'RNG_UNAVAILABLE') };
  }
}

function handleDerive(request: Extract<Request, { kind: 'derive' }>, now: () => number): Response {
  const { revision } = request;
  if (!isIndex(request.account) || !isIndex(request.index)) {
    return { revision, kind: 'error', code: 'PATH_INDEX_RANGE' };
  }
  const started = now();
  let seed: Uint8Array | undefined;
  try {
    seed = seedFor(request);
    const params = { account: request.account, index: request.index };
    const records: AddressRecord[] = [];
    const errors: ProfileFailure[] = [];
    for (const profileId of request.selected) {
      try {
        const profile = registry.get(profileId);
        if (profile.status !== 'verified') {
          errors.push({ profileId, code: 'PROFILE_NOT_VERIFIED' });
          continue;
        }
        records.push(deriveAddress(profile, seed, params));
      } catch (error) {
        errors.push({ profileId, ...errorPayload(error, 'ENCODING_FAILED') });
      }
    }
    return {
      revision,
      kind: 'result',
      groups: groupByAddressSpace(records),
      errors,
      elapsed: Math.max(0, Math.round(now() - started)),
    };
  } catch (error) {
    return { revision, kind: 'error', ...errorPayload(error, 'ENCODING_FAILED') };
  } finally {
    wipe(seed);
  }
}

function handleKey(request: Extract<Request, { kind: 'key' }>): Response {
  const { revision } = request;
  let seed: Uint8Array | undefined;
  try {
    if (!isIndex(request.account) || !isIndex(request.index)) throw new Error('index');
    seed = seedFor(request);
    const profile = registry.get(request.profileId);
    if (profile.status !== 'verified') throw new Error('draft');
    const exported = deriveKey(
      profile,
      seed,
      { account: request.account, index: request.index },
      request.keyKind,
    );
    return {
      revision,
      kind: 'key',
      bytes: exported.bytes,
      path: exported.path,
      encoding: exported.encoding,
      keyKind: exported.keyKind,
    };
  } catch {
    // Deliberately coarse: nothing about a failed key derivation may describe the secret.
    return { revision, kind: 'error', code: 'KEY_DERIVATION_FAILED' };
  } finally {
    wipe(seed);
  }
}

export function handleRequest(request: Request, now: () => number): Response {
  switch (request.kind) {
    case 'generate':
      return handleGenerate(request);
    case 'derive':
      return handleDerive(request, now);
    case 'key':
      return handleKey(request);
  }
}
