import DeriveWorker from './derive.worker.ts?worker&inline';

export function createDeriveWorker(): Worker {
  return new DeriveWorker({ name: 'derive' });
}
