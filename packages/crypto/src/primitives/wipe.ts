export function wipe(...buffers: ReadonlyArray<Uint8Array | undefined>): void {
  for (const buffer of buffers) {
    buffer?.fill(0);
  }
}
