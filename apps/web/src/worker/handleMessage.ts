import { wipe } from '@off-wallet/crypto';
import { handleRequest } from './handle.ts';
import type { Request, Response } from './protocol.ts';

export type PostMessage = (message: Response, transfer?: Transferable[]) => void;

export function handleWorkerMessage(request: Request, post: PostMessage, now: () => number): void {
  const response = handleRequest(request, now);
  if (response.kind !== 'key') {
    post(response);
    return;
  }
  try {
    // Transferring detaches the buffer here, so the worker keeps no copy of the key.
    post(response, [response.bytes.buffer as ArrayBuffer]);
  } catch {
    // The transfer failed, so this worker still owns the scalar and must zero it before reporting.
    wipe(response.bytes);
    post({ revision: response.revision, kind: 'error', code: 'KEY_DERIVATION_FAILED' });
  }
}
