import { registry } from '@off-wallet/crypto';
import { describe, expect, it } from 'vitest';
import { handleRequest } from './handle.ts';
import type { Request, Response } from './protocol.ts';

const MNEMONIC_A =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const ALL = registry.enabled().map((p) => p.id);
const EVM = ['eth', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche'];

const hex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const derive = (overrides: Partial<Extract<Request, { kind: 'derive' }>> = {}): Request => ({
  revision: 7,
  kind: 'derive',
  selected: ALL,
  language: 'english',
  mnemonic: MNEMONIC_A,
  passphrase: '',
  account: 0,
  index: 0,
  ...overrides,
});

const expectKind = <K extends Response['kind']>(
  response: Response,
  kind: K,
): Extract<Response, { kind: K }> => {
  expect(response.kind).toBe(kind);
  return response as Extract<Response, { kind: K }>;
};

describe('handleRequest generate', () => {
  it('returns a 12-word english mnemonic tagged with the revision', () => {
    const response = expectKind(
      handleRequest({ revision: 3, kind: 'generate', language: 'english', count: 12 }, () => 0),
      'generated',
    );
    expect(response.revision).toBe(3);
    expect(response.mnemonic.split(' ')).toHaveLength(12);
  });

  it('returns 24 words when asked', () => {
    const response = expectKind(
      handleRequest({ revision: 4, kind: 'generate', language: 'spanish', count: 24 }, () => 0),
      'generated',
    );
    expect(response.mnemonic.split(' ')).toHaveLength(24);
  });
});

describe('handleRequest derive', () => {
  it('derives all 16 profiles and collapses the EVM networks into one group', () => {
    let tick = 100;
    const response = expectKind(
      handleRequest(derive(), () => {
        tick += 5;
        return tick;
      }),
      'result',
    );
    expect(response.revision).toBe(7);
    expect(response.errors).toEqual([]);
    expect(response.elapsed).toBeGreaterThan(0);

    const evm = response.groups.find(
      (g) => g.address === '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
    );
    expect(evm).toBeDefined();
    expect(evm?.origins.map((o) => o.profileId).sort()).toEqual([...EVM].sort());

    const tron = response.groups.find((g) => g.origins[0]?.profileId === 'tron');
    expect(tron?.address).toBe('TUEZSdKsoDHQMeZwihtdoBiN46zxhGWYdH');
    expect(tron?.origins).toHaveLength(1);

    const segwit = response.groups.find((g) => g.origins[0]?.profileId === 'btc-segwit');
    expect(segwit?.address).toBe('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');

    const solanaB = response.groups.find((g) => g.origins[0]?.profileId === 'solana-b');
    expect(solanaB?.address).toBe('HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk');
    expect(solanaB?.origins[0]?.path).toBe("m/44'/501'/0'/0'");

    expect(response.groups).toHaveLength(10);
  });

  it('reports an invalid mnemonic as a typed error with the word position', () => {
    const response = expectKind(
      handleRequest(derive({ mnemonic: MNEMONIC_A.replace('about', 'zzzz') }), () => 0),
      'error',
    );
    expect(response.code).toBe('MNEMONIC_WORD_UNKNOWN');
    expect(response.details).toEqual({ wordIndex: 11 });
  });

  it('reports a wrong word count before touching any profile', () => {
    const response = expectKind(
      handleRequest(derive({ mnemonic: 'abandon zzzz' }), () => 0),
      'error',
    );
    expect(response.code).toBe('MNEMONIC_LENGTH');
  });

  it('rejects an out-of-range index once, not once per profile', () => {
    const response = expectKind(
      handleRequest(derive({ index: -1 }), () => 0),
      'error',
    );
    expect(response.code).toBe('PATH_INDEX_RANGE');
  });

  it('keeps the good profiles when one selected id is unknown', () => {
    const response = expectKind(
      handleRequest(derive({ selected: ['eth', 'nope', 'tron'] }), () => 0),
      'result',
    );
    expect(response.groups).toHaveLength(2);
    expect(response.errors).toEqual([
      { profileId: 'nope', code: 'PROFILE_UNKNOWN', details: { profileId: 'nope' } },
    ]);
  });

  it('never composes a sentence', () => {
    const response = expectKind(
      handleRequest(derive({ selected: ['nope'] }), () => 0),
      'result',
    );
    for (const failure of response.errors) {
      expect(Object.keys(failure).sort()).toEqual(['code', 'details', 'profileId']);
      for (const value of Object.values(failure.details ?? {})) {
        expect(typeof value === 'string' && value.includes(' ')).toBe(false);
      }
    }
  });
});

describe('handleRequest key', () => {
  const key = (keyKind: 'public' | 'private', profileId = 'eth'): Request => ({
    revision: 9,
    kind: 'key',
    profileId,
    keyKind,
    language: 'english',
    mnemonic: MNEMONIC_A,
    passphrase: '',
    account: 0,
    index: 0,
  });

  it('returns exactly the private leaf scalar for eth (0,0)', () => {
    const response = expectKind(
      handleRequest(key('private'), () => 0),
      'key',
    );
    expect(response.revision).toBe(9);
    expect(response.keyKind).toBe('private');
    expect(response.path).toBe("m/44'/60'/0'/0/0");
    expect(response.encoding).toBe('Raw 32-byte scalar · 64 hex · no 0x');
    expect(hex(response.bytes)).toBe(
      '1ab42cc412b618bdea3a599e3c9bae199ebf030895b039e9db1e30dafb12b727',
    );
  });

  it('returns the compressed public key when asked for public', () => {
    const response = expectKind(
      handleRequest(key('public'), () => 0),
      'key',
    );
    expect(response.keyKind).toBe('public');
    expect(response.encoding).toBe('SEC1 compressed · 33 bytes · hex');
    expect(hex(response.bytes)).toBe(
      '0237b0bb7a8288d38ed49a524b5dc98cff3eb5ca824c9f9dc0dfdb3d9cd600f299',
    );
  });

  it('returns the raw SLIP-0010 seed for solana-a private', () => {
    const response = expectKind(
      handleRequest(key('private', 'solana-a'), () => 0),
      'key',
    );
    expect(response.path).toBe("m/44'/501'/0'");
    expect(hex(response.bytes)).toBe(
      'ec252c5d95bcf80a4b22df119cedd4ae1aed07364578e8d43bdfa0435625dbd1',
    );
  });

  it('collapses every failure into KEY_DERIVATION_FAILED without details', () => {
    const bad = { ...key('private'), mnemonic: 'abandon zzzz' } as Request;
    const response = expectKind(
      handleRequest(bad, () => 0),
      'error',
    );
    expect(response.code).toBe('KEY_DERIVATION_FAILED');
    expect('details' in response).toBe(false);

    const unknown = expectKind(
      handleRequest(key('private', 'nope'), () => 0),
      'error',
    );
    expect(unknown.code).toBe('KEY_DERIVATION_FAILED');
  });
});
