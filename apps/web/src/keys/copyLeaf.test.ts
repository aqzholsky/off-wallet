import { describe, expect, it, vi } from 'vitest';
import type { KeyDelivery } from '../hooks/useDerivation.ts';
import { bytesToHex, copyLeaf } from './copyLeaf.ts';

const PATH = "m/44'/60'/0'/0/0";

const delivery = (bytes: Uint8Array, overrides: Partial<KeyDelivery> = {}): KeyDelivery => ({
  bytes,
  path: PATH,
  encoding: 'Raw 32-byte scalar · 64 hex · no 0x',
  keyKind: 'private',
  ...overrides,
});

describe('bytesToHex', () => {
  it('renders lowercase hex without a prefix', () => {
    expect(bytesToHex(new Uint8Array([0, 1, 171, 255]))).toBe('0001abff');
  });
});

describe('copyLeaf', () => {
  it('writes the hex to the clipboard and wipes the bytes', async () => {
    const bytes = new Uint8Array([1, 2, 255]);
    const writeText = vi.fn(async () => {});
    const outcome = await copyLeaf({
      requestKey: async () => delivery(bytes),
      profileId: 'eth',
      keyKind: 'private',
      expectedPath: PATH,
      writeText,
    });
    expect(outcome).toEqual({ ok: true, text: '0102ff' });
    expect(writeText).toHaveBeenCalledWith('0102ff');
    expect(Array.from(bytes)).toEqual([0, 0, 0]);
  });

  it('refuses a delivery whose path differs and still wipes', async () => {
    const bytes = new Uint8Array([7, 7]);
    const writeText = vi.fn(async () => {});
    const outcome = await copyLeaf({
      requestKey: async () => delivery(bytes, { path: "m/44'/60'/1'/0/0" }),
      profileId: 'eth',
      keyKind: 'private',
      expectedPath: PATH,
      writeText,
    });
    expect(outcome).toEqual({ ok: false, reason: 'stale' });
    expect(writeText).not.toHaveBeenCalled();
    expect(Array.from(bytes)).toEqual([0, 0]);
  });

  it('refuses a delivery of the wrong key kind', async () => {
    const outcome = await copyLeaf({
      requestKey: async () => delivery(new Uint8Array([1]), { keyKind: 'public' }),
      profileId: 'eth',
      keyKind: 'private',
      expectedPath: PATH,
      writeText: async () => {},
    });
    expect(outcome).toEqual({ ok: false, reason: 'stale' });
  });

  it('reports a clipboard failure and wipes', async () => {
    const bytes = new Uint8Array([5]);
    const outcome = await copyLeaf({
      requestKey: async () => delivery(bytes),
      profileId: 'eth',
      keyKind: 'private',
      expectedPath: PATH,
      writeText: async () => {
        throw new Error('denied');
      },
    });
    expect(outcome).toEqual({ ok: false, reason: 'clipboard' });
    expect(Array.from(bytes)).toEqual([0]);
  });

  it('maps a stale rejection and a derivation rejection', async () => {
    const stale = await copyLeaf({
      requestKey: async () => {
        throw new Error('stale');
      },
      profileId: 'eth',
      keyKind: 'private',
      expectedPath: PATH,
      writeText: async () => {},
    });
    expect(stale).toEqual({ ok: false, reason: 'stale' });
    const failed = await copyLeaf({
      requestKey: async () => {
        throw new Error('KEY_DERIVATION_FAILED');
      },
      profileId: 'eth',
      keyKind: 'private',
      expectedPath: PATH,
      writeText: async () => {},
    });
    expect(failed).toEqual({ ok: false, reason: 'derivation' });
  });

  it('uses navigator.clipboard by default', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    try {
      const outcome = await copyLeaf({
        requestKey: async () => delivery(new Uint8Array([16])),
        profileId: 'eth',
        keyKind: 'private',
        expectedPath: PATH,
      });
      expect(outcome).toEqual({ ok: true, text: '10' });
      expect(writeText).toHaveBeenCalledWith('10');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
