import {
  type AddressGroup,
  type CryptoErrorCode,
  type KeyKind,
  type Language,
  wipe,
} from '@off-wallet/crypto';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ProfileFailure, Request, Response } from '../worker/protocol.ts';

export type DerivationInputState = {
  mnemonic: string;
  language: Language;
  passphrase: string;
  account: number;
  index: number;
  selected: readonly string[];
};

export type DerivationStatus = 'idle' | 'working' | 'ready' | 'error';
export type DerivationResult = {
  groups: AddressGroup[];
  errors: ProfileFailure[];
  elapsed: number;
};
export type DerivationError = { code: CryptoErrorCode; details?: Record<string, unknown> };
export type KeyDelivery = { bytes: Uint8Array; path: string; encoding: string; keyKind: KeyKind };

export type UseDerivationOptions = { createWorker: () => Worker; debounceMs?: number };

export type Derivation = {
  status: DerivationStatus;
  result: DerivationResult | null;
  error: DerivationError | null;
  revision: number;
  generate(language: Language, count: 12 | 24): Promise<string>;
  requestKey(profileId: string, keyKind: KeyKind): Promise<KeyDelivery>;
  cancel(): void;
  clear(): void;
};

type Handlers = {
  onResponse(response: Response): void;
  onStale(): void;
};

type Live = {
  worker: Worker;
  handlers: Handlers;
  carriesKey: boolean;
  retired: boolean;
  fallback: ReturnType<typeof setTimeout> | null;
};

const STALE = 'stale';

// How long a superseded key worker is left alive so its already-posted message can be drained.
const DRAIN_MS = 2000;

function toError(response: Extract<Response, { kind: 'error' }>): DerivationError {
  return response.details
    ? { code: response.code, details: response.details }
    : { code: response.code };
}

export function useDerivation(
  input: DerivationInputState,
  options: UseDerivationOptions,
): Derivation {
  const { createWorker, debounceMs = 250 } = options;
  const revisionRef = useRef(0);
  const liveRef = useRef(new Set<Live>());
  const drainingRef = useRef(new Set<Live>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef(input);
  inputRef.current = input;
  // Held in a ref so an inline `createWorker` prop cannot change `dispatch`'s identity and
  // re-trigger the derive effect, which bumps the revision — that loop never terminates.
  const createWorkerRef = useRef(createWorker);
  createWorkerRef.current = createWorker;

  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState<DerivationStatus>('idle');
  const [result, setResult] = useState<DerivationResult | null>(null);
  const [error, setError] = useState<DerivationError | null>(null);

  const dispatch = useCallback((request: Request, handlers: Handlers) => {
    const worker = createWorkerRef.current();
    const live: Live = {
      worker,
      handlers,
      carriesKey: request.kind === 'key',
      retired: false,
      fallback: null,
    };
    liveRef.current.add(live);
    const finish = () => {
      liveRef.current.delete(live);
      drainingRef.current.delete(live);
      if (live.fallback !== null) {
        clearTimeout(live.fallback);
        live.fallback = null;
      }
      worker.terminate();
    };
    worker.onmessage = (event: MessageEvent<Response>) => {
      const response = event.data;
      finish();
      if (live.retired || response.revision !== revisionRef.current) {
        // Stale delivery: the caller has moved on, so the payload is dropped and any key wiped.
        // `retired` also covers unmount, where the revision itself never changes.
        if (response.kind === 'key') wipe(response.bytes);
        handlers.onStale();
        return;
      }
      handlers.onResponse(response);
    };
    worker.onerror = () => {
      finish();
      handlers.onStale();
    };
    worker.postMessage(request);
  }, []);

  // Terminating a worker empties its message port queue, so a key response already in flight would
  // be dropped with the transferred scalar never zeroed; a key worker is drained instead of killed.
  const retire = useCallback((live: Live) => {
    liveRef.current.delete(live);
    live.retired = true;
    live.handlers.onStale();
    if (!live.carriesKey) {
      live.worker.terminate();
      return;
    }
    drainingRef.current.add(live);
    live.fallback = setTimeout(() => {
      drainingRef.current.delete(live);
      live.worker.terminate();
    }, DRAIN_MS);
  }, []);

  const invalidate = useCallback((): number => {
    revisionRef.current += 1;
    setRevision(revisionRef.current);
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    for (const live of [...liveRef.current]) retire(live);
    liveRef.current.clear();
    setResult(null);
    setError(null);
    setStatus('idle');
    return revisionRef.current;
  }, [retire]);

  const { mnemonic, language, passphrase, account, index } = input;
  const selectedKey = input.selected.join('\u0000');
  const selected = useMemo(
    () => (selectedKey === '' ? [] : selectedKey.split('\u0000')),
    [selectedKey],
  );

  // Layout, not passive: the old addresses must be gone before the new input paints.
  useLayoutEffect(() => {
    const current = invalidate();
    if (mnemonic.trim() === '' || selected.length === 0) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setStatus('working');
      dispatch(
        {
          revision: current,
          kind: 'derive',
          selected: [...selected],
          language,
          mnemonic,
          passphrase,
          account,
          index,
        },
        {
          onResponse(response) {
            if (response.kind === 'result') {
              setResult({
                groups: response.groups,
                errors: response.errors,
                elapsed: response.elapsed,
              });
              setStatus('ready');
            } else if (response.kind === 'error') {
              setError(toError(response));
              setStatus('error');
            }
          },
          onStale() {},
        },
      );
    }, debounceMs);
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [mnemonic, language, passphrase, account, index, selected, debounceMs, dispatch, invalidate]);

  useEffect(
    () => () => {
      for (const live of [...liveRef.current]) retire(live);
      liveRef.current.clear();
    },
    [retire],
  );

  const generate = useCallback(
    (nextLanguage: Language, count: 12 | 24): Promise<string> =>
      new Promise((resolve, reject) => {
        const current = invalidate();
        setStatus('working');
        dispatch(
          { revision: current, kind: 'generate', language: nextLanguage, count },
          {
            onResponse(response) {
              if (response.kind === 'generated') {
                resolve(response.mnemonic);
                return;
              }
              if (response.kind === 'error') {
                setError(toError(response));
                setStatus('error');
                reject(new Error(response.code));
                return;
              }
              // A protocol-impossible kind must still settle the promise, never hang the caller.
              reject(new Error(STALE));
            },
            onStale() {
              reject(new Error(STALE));
            },
          },
        );
      }),
    [dispatch, invalidate],
  );

  const requestKey = useCallback(
    (profileId: string, keyKind: KeyKind): Promise<KeyDelivery> =>
      new Promise((resolve, reject) => {
        const snapshot = inputRef.current;
        dispatch(
          {
            revision: revisionRef.current,
            kind: 'key',
            profileId,
            keyKind,
            language: snapshot.language,
            mnemonic: snapshot.mnemonic,
            passphrase: snapshot.passphrase,
            account: snapshot.account,
            index: snapshot.index,
          },
          {
            onResponse(response) {
              if (response.kind === 'key' && response.keyKind === keyKind) {
                resolve({
                  bytes: response.bytes,
                  path: response.path,
                  encoding: response.encoding,
                  keyKind: response.keyKind,
                });
                return;
              }
              if (response.kind === 'key') wipe(response.bytes);
              reject(
                new Error(response.kind === 'error' ? response.code : 'KEY_DERIVATION_FAILED'),
              );
            },
            onStale() {
              reject(new Error(STALE));
            },
          },
        );
      }),
    [dispatch],
  );

  const cancel = useCallback(() => {
    invalidate();
  }, [invalidate]);

  return { status, result, error, revision, generate, requestKey, cancel, clear: cancel };
}
