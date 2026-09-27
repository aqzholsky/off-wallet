import { CryptoError } from '../errors.ts';

export const HARDENED_OFFSET = 0x80000000;
export const MAX_INDEX = 2147483647;

export const PATH_SHAPES = [
  'ACCOUNT',
  'ACCOUNT_CHANGE_H',
  'ACCOUNT_CHANGE_INDEX_H',
  'BIP44_FULL',
] as const;

export type PathShape = (typeof PATH_SHAPES)[number];

export interface PathSegment {
  readonly index: number;
  readonly hardened: boolean;
}

const SEGMENT_PATTERN = /^(0|[1-9][0-9]*)(['hH])?$/;

export function assertIndex(value: number, name: 'account' | 'index'): void {
  if (!Number.isInteger(value) || value < 0 || value > MAX_INDEX) {
    throw new CryptoError('PATH_INDEX_RANGE', { name });
  }
}

export function shapeSupportsIndex(shape: PathShape): boolean {
  return shape === 'ACCOUNT_CHANGE_INDEX_H' || shape === 'BIP44_FULL';
}

export function buildPath(
  shape: PathShape,
  purpose: number,
  coinType: number,
  account: number,
  index: number,
): string {
  assertIndex(account, 'account');
  assertIndex(index, 'index');
  const prefix = `m/${purpose}'/${coinType}'/${account}'`;
  switch (shape) {
    case 'ACCOUNT':
      return prefix;
    case 'ACCOUNT_CHANGE_H':
      return `${prefix}/0'`;
    case 'ACCOUNT_CHANGE_INDEX_H':
      return `${prefix}/0'/${index}'`;
    case 'BIP44_FULL':
      return `${prefix}/0/${index}`;
  }
}

export function parsePath(path: string): PathSegment[] {
  const parts = path.split('/');
  if (parts[0] !== 'm') throw new CryptoError('PATH_INVALID', { reason: 'prefix' });
  const segments: PathSegment[] = [];
  for (let i = 1; i < parts.length; i++) {
    const match = SEGMENT_PATTERN.exec(parts[i] ?? '');
    if (!match) throw new CryptoError('PATH_INVALID', { reason: 'segment', position: i });
    const index = Number(match[1]);
    if (index > MAX_INDEX)
      throw new CryptoError('PATH_INVALID', { reason: 'segment-range', position: i });
    segments.push({ index, hardened: match[2] !== undefined });
  }
  return segments;
}

export function formatPath(segments: readonly PathSegment[]): string {
  let out = 'm';
  for (const segment of segments) out += `/${segment.index}${segment.hardened ? "'" : ''}`;
  return out;
}
