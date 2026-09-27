import { handleWorkerMessage } from './handleMessage.ts';
import type { Request, Response } from './protocol.ts';

type WorkerScope = {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage(message: Response, transfer?: Transferable[]): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event) => {
  handleWorkerMessage(
    event.data,
    (message, transfer) => scope.postMessage(message, transfer),
    () => performance.now(),
  );
};
