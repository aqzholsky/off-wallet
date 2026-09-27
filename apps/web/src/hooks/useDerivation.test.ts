import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from '../worker/protocol.ts';
import { type DerivationInputState, useDerivation } from './useDerivation.ts';

class MockWorker {
  static instances: MockWorker[] = [];
  onmessage: ((event: MessageEvent<Response>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: Request[] = [];
  terminated = false;
  constructor() {
    MockWorker.instances.push(this);
  }
  postMessage(message: Request): void {
    this.posted.push(message);
  }
  terminate(): void {
    this.terminated = true;
    // A real Worker's terminate() empties its message port queue, so nothing is delivered after it.
    this.onmessage = null;
  }
  reply(response: Response): void {
    this.onmessage?.({ data: response } as MessageEvent<Response>);
  }
  get request(): Request {
    const request = this.posted[0];
    if (!request) throw new Error('nothing posted');
    return request;
  }
}

const createWorker = () => new MockWorker() as unknown as Worker;

const latest = (): MockWorker => {
  const worker = MockWorker.instances.at(-1);
  if (!worker) throw new Error('no worker created');
  return worker;
};

const input: DerivationInputState = {
  mnemonic:
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  language: 'english',
  passphrase: '',
  account: 0,
  index: 0,
  selected: ['eth', 'tron'],
};

const resultFor = (revision: number): Response => ({
  revision,
  kind: 'result',
  groups: [],
  errors: [],
  elapsed: 1,
});

const setup = (initial: DerivationInputState = input) =>
  renderHook(
    (props: { input: DerivationInputState }) => useDerivation(props.input, { createWorker }),
    {
      initialProps: { input: initial },
    },
  );

beforeEach(() => {
  vi.useFakeTimers();
  MockWorker.instances.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDerivation', () => {
  it('does not dispatch for an empty mnemonic', () => {
    setup({ ...input, mnemonic: '' });
    act(() => vi.advanceTimersByTime(1000));
    expect(MockWorker.instances).toHaveLength(0);
  });

  it('debounces 250 ms and then posts one derive request carrying the current revision', () => {
    const { result } = setup();
    act(() => vi.advanceTimersByTime(249));
    expect(MockWorker.instances).toHaveLength(0);
    act(() => vi.advanceTimersByTime(1));
    expect(MockWorker.instances).toHaveLength(1);
    const request = latest().request;
    expect(request.kind).toBe('derive');
    expect(request.revision).toBe(result.current.revision);
    expect(result.current.status).toBe('working');
    if (request.kind === 'derive') expect(request.selected).toEqual(['eth', 'tron']);
  });

  it('stores a matching result and terminates the worker', () => {
    const { result } = setup();
    act(() => vi.advanceTimersByTime(250));
    const worker = latest();
    act(() => worker.reply(resultFor(worker.request.revision)));
    expect(result.current.status).toBe('ready');
    expect(result.current.result?.elapsed).toBe(1);
    expect(worker.terminated).toBe(true);
  });

  it('discards a response whose revision is stale', () => {
    const { result, rerender } = setup();
    act(() => vi.advanceTimersByTime(250));
    const first = latest();
    const staleRevision = first.request.revision;
    rerender({ input: { ...input, passphrase: 'x' } });
    expect(first.terminated).toBe(true);
    act(() => first.reply(resultFor(staleRevision)));
    expect(result.current.result).toBeNull();
    expect(result.current.status).toBe('idle');
    act(() => vi.advanceTimersByTime(250));
    const second = latest();
    expect(second).not.toBe(first);
    expect(second.request.revision).toBeGreaterThan(staleRevision);
    act(() => second.reply(resultFor(second.request.revision)));
    expect(result.current.status).toBe('ready');
  });

  it('clears results immediately on input change, before any new response', () => {
    const { result, rerender } = setup();
    act(() => vi.advanceTimersByTime(250));
    const worker = latest();
    act(() => worker.reply(resultFor(worker.request.revision)));
    expect(result.current.result).not.toBeNull();
    rerender({ input: { ...input, index: 1 } });
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(MockWorker.instances).toHaveLength(1);
  });

  it('surfaces a typed error', () => {
    const { result } = setup();
    act(() => vi.advanceTimersByTime(250));
    const worker = latest();
    act(() =>
      worker.reply({
        revision: worker.request.revision,
        kind: 'error',
        code: 'MNEMONIC_CHECKSUM',
      }),
    );
    expect(result.current.status).toBe('error');
    expect(result.current.error).toEqual({ code: 'MNEMONIC_CHECKSUM' });
  });

  it('resolves generate with the mnemonic', async () => {
    const { result } = setup({ ...input, mnemonic: '' });
    let promise: Promise<string> | undefined;
    act(() => {
      promise = result.current.generate('english', 24);
    });
    const worker = latest();
    expect(worker.request.kind).toBe('generate');
    act(() =>
      worker.reply({ revision: worker.request.revision, kind: 'generated', mnemonic: 'a b c' }),
    );
    await expect(promise).resolves.toBe('a b c');
  });

  it('resolves requestKey only for a matching revision and kind', async () => {
    const { result } = setup();
    act(() => vi.advanceTimersByTime(250));
    let promise: Promise<unknown> | undefined;
    act(() => {
      promise = result.current.requestKey('eth', 'private');
    });
    const worker = latest();
    expect(worker.request.kind).toBe('key');
    act(() =>
      worker.reply({
        revision: worker.request.revision,
        kind: 'key',
        bytes: new Uint8Array([1, 2]),
        path: "m/44'/60'/0'/0/0",
        encoding: 'Raw 32-byte scalar · 64 hex · no 0x',
        keyKind: 'private',
      }),
    );
    await expect(promise).resolves.toMatchObject({
      keyKind: 'private',
      path: "m/44'/60'/0'/0/0",
    });
    expect(worker.terminated).toBe(true);
  });

  it('rejects a pending requestKey with "stale" but keeps the worker alive to drain it', async () => {
    const { result, rerender } = setup();
    act(() => vi.advanceTimersByTime(250));
    let promise: Promise<unknown> | undefined;
    act(() => {
      promise = result.current.requestKey('eth', 'private');
    });
    const worker = latest();
    rerender({ input: { ...input, account: 1 } });
    await expect(promise).rejects.toThrow('stale');
    expect(worker.terminated).toBe(false);
  });

  it('terminates a drained key worker once the grace period expires', async () => {
    const { result, rerender } = setup();
    act(() => vi.advanceTimersByTime(250));
    let promise: Promise<unknown> | undefined;
    act(() => {
      promise = result.current.requestKey('eth', 'private');
    });
    const worker = latest();
    rerender({ input: { ...input, account: 4 } });
    await expect(promise).rejects.toThrow('stale');
    expect(worker.terminated).toBe(false);
    act(() => vi.advanceTimersByTime(2000));
    expect(worker.terminated).toBe(true);
  });

  it('terminates the derive worker immediately, since it carries no key material', () => {
    const { rerender } = setup();
    act(() => vi.advanceTimersByTime(250));
    const worker = latest();
    rerender({ input: { ...input, account: 9 } });
    expect(worker.terminated).toBe(true);
  });

  it('wipes and drops a key response that arrives for an old revision', async () => {
    const { result, rerender } = setup();
    act(() => vi.advanceTimersByTime(250));
    let promise: Promise<unknown> | undefined;
    act(() => {
      promise = result.current.requestKey('eth', 'private');
    });
    const worker = latest();
    const bytes = new Uint8Array([9, 9, 9]);
    rerender({ input: { ...input, account: 2 } });
    await expect(promise).rejects.toThrow('stale');
    act(() =>
      worker.reply({
        revision: worker.request.revision,
        kind: 'key',
        bytes,
        path: 'x',
        encoding: 'x',
        keyKind: 'private',
      }),
    );
    expect(Array.from(bytes)).toEqual([0, 0, 0]);
    expect(worker.terminated).toBe(true);
    expect(result.current.result).toBeNull();
  });

  it('settles a pending key request on unmount instead of leaving it hanging', async () => {
    const { result, unmount } = setup();
    act(() => vi.advanceTimersByTime(250));
    let promise: Promise<unknown> | undefined;
    act(() => {
      promise = result.current.requestKey('eth', 'private');
    });
    const worker = latest();
    unmount();
    await expect(promise).rejects.toThrow('stale');
    const bytes = new Uint8Array([4, 5, 6]);
    act(() =>
      worker.reply({
        revision: worker.request.revision,
        kind: 'key',
        bytes,
        path: 'x',
        encoding: 'x',
        keyKind: 'private',
      }),
    );
    expect(Array.from(bytes)).toEqual([0, 0, 0]);
  });

  it('cancel bumps the revision and empties the state', () => {
    const { result } = setup();
    act(() => vi.advanceTimersByTime(250));
    const worker = latest();
    act(() => worker.reply(resultFor(worker.request.revision)));
    const before = result.current.revision;
    act(() => result.current.cancel());
    expect(result.current.revision).toBe(before + 1);
    expect(result.current.result).toBeNull();
    expect(result.current.status).toBe('idle');
  });
});
