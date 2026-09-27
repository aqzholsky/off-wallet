import { describe, expect, it, vi } from 'vitest';
import { handleWorkerMessage } from './handleMessage.ts';
import type { Request, Response } from './protocol.ts';

const MNEMONIC_A =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const keyRequest: Request = {
  revision: 5,
  kind: 'key',
  profileId: 'eth',
  keyKind: 'private',
  language: 'english',
  mnemonic: MNEMONIC_A,
  passphrase: '',
  account: 0,
  index: 0,
};

describe('handleWorkerMessage', () => {
  it('transfers the key buffer so the worker keeps no copy', () => {
    const post = vi.fn();
    handleWorkerMessage(keyRequest, post, () => 0);
    const [message, transfer] = post.mock.calls[0] as [Response, Transferable[]];
    expect(message.kind).toBe('key');
    expect(transfer).toHaveLength(1);
    if (message.kind === 'key') expect(transfer[0]).toBe(message.bytes.buffer);
  });

  it('wipes the scalar and reports a coarse failure when the transfer is refused', () => {
    let leaked: Uint8Array | undefined;
    const posted: Response[] = [];
    const post = vi.fn((message: Response, transfer?: Transferable[]) => {
      if (transfer) {
        if (message.kind === 'key') leaked = message.bytes;
        throw new DOMException('cannot transfer', 'DataCloneError');
      }
      posted.push(message);
    });
    handleWorkerMessage(keyRequest, post, () => 0);
    expect(leaked).toBeDefined();
    expect(Array.from(leaked ?? new Uint8Array())).toEqual(Array(32).fill(0));
    expect(posted).toEqual([{ revision: 5, kind: 'error', code: 'KEY_DERIVATION_FAILED' }]);
  });

  it('posts a non-key response without a transfer list', () => {
    const post = vi.fn();
    handleWorkerMessage(
      { revision: 1, kind: 'generate', language: 'english', count: 12 },
      post,
      () => 0,
    );
    expect(post.mock.calls[0]?.[1]).toBeUndefined();
  });
});
