import { describe, expect, it } from 'vitest';
import { CryptoError } from '../../src/errors.ts';
import {
  assertIndex,
  buildPath,
  formatPath,
  HARDENED_OFFSET,
  MAX_INDEX,
  PATH_SHAPES,
  parsePath,
  shapeSupportsIndex,
} from '../../src/primitives/path.ts';

const REJECTED = [
  -1,
  2147483648,
  0.5,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
];

describe('constants', () => {
  it('matches BIP-32', () => {
    expect(HARDENED_OFFSET).toBe(0x80000000);
    expect(MAX_INDEX).toBe(2147483647);
    expect(PATH_SHAPES).toEqual([
      'ACCOUNT',
      'ACCOUNT_CHANGE_H',
      'ACCOUNT_CHANGE_INDEX_H',
      'BIP44_FULL',
    ]);
  });
});

describe('assertIndex', () => {
  it('accepts the whole valid range', () => {
    for (const value of [0, 1, 2, 2147483647]) {
      expect(() => assertIndex(value, 'account')).not.toThrow();
    }
  });

  it.each(REJECTED)('rejects %p with PATH_INDEX_RANGE', (value) => {
    expect(() => assertIndex(value, 'index')).toThrowError(CryptoError);
    expect(() => assertIndex(value, 'index')).toThrowError(/PATH_INDEX_RANGE/);
  });

  it('names the offending parameter in details', () => {
    try {
      assertIndex(-1, 'account');
      throw new Error('expected failure');
    } catch (error) {
      expect((error as CryptoError).details).toEqual({ name: 'account' });
    }
  });
});

describe('shapeSupportsIndex', () => {
  it('is true only for the two shapes that place the index in the path', () => {
    expect(shapeSupportsIndex('ACCOUNT')).toBe(false);
    expect(shapeSupportsIndex('ACCOUNT_CHANGE_H')).toBe(false);
    expect(shapeSupportsIndex('ACCOUNT_CHANGE_INDEX_H')).toBe(true);
    expect(shapeSupportsIndex('BIP44_FULL')).toBe(true);
  });
});

describe('buildPath', () => {
  it('renders each known path template', () => {
    expect(buildPath('ACCOUNT', 44, 501, 0, 0)).toBe("m/44'/501'/0'");
    expect(buildPath('ACCOUNT_CHANGE_H', 44, 501, 2, 9)).toBe("m/44'/501'/2'/0'");
    expect(buildPath('ACCOUNT_CHANGE_INDEX_H', 44, 1815, 1, 7)).toBe("m/44'/1815'/1'/0'/7'");
    expect(buildPath('BIP44_FULL', 84, 0, 2, 3)).toBe("m/84'/0'/2'/0/3");
  });

  it('ignores the index for shapes that do not support one', () => {
    expect(buildPath('ACCOUNT', 44, 501, 2, 3)).toBe(buildPath('ACCOUNT', 44, 501, 2, 0));
    expect(buildPath('ACCOUNT_CHANGE_H', 44, 501, 2, 3)).toBe(
      buildPath('ACCOUNT_CHANGE_H', 44, 501, 2, 0),
    );
  });

  it.each(REJECTED)('rejects account %p', (value) => {
    expect(() => buildPath('BIP44_FULL', 44, 0, value, 0)).toThrowError(/PATH_INDEX_RANGE/);
  });

  it.each(REJECTED)('rejects index %p for shapes that use it', (value) => {
    expect(() => buildPath('BIP44_FULL', 44, 0, 0, value)).toThrowError(/PATH_INDEX_RANGE/);
  });

  it('validates the index even when the shape ignores it', () => {
    expect(() => buildPath('ACCOUNT', 44, 501, 0, -1)).toThrowError(/PATH_INDEX_RANGE/);
  });
});

describe('parsePath', () => {
  it('parses the master path to no segments', () => {
    expect(parsePath('m')).toEqual([]);
  });

  it('parses hardened and non-hardened segments', () => {
    expect(parsePath("m/44'/0'/0'/0/5")).toEqual([
      { index: 44, hardened: true },
      { index: 0, hardened: true },
      { index: 0, hardened: true },
      { index: 0, hardened: false },
      { index: 5, hardened: false },
    ]);
  });

  it('accepts the h and H suffixes as hardened', () => {
    expect(parsePath('m/44h/0H')).toEqual([
      { index: 44, hardened: true },
      { index: 0, hardened: true },
    ]);
  });

  it('accepts the largest index', () => {
    expect(parsePath("m/2147483647'")).toEqual([{ index: 2147483647, hardened: true }]);
  });

  it.each([
    '',
    'n/0',
    'm/',
    'm//0',
    "m/0''",
    'm/-1',
    'm/0.5',
    'm/2147483648',
    "m/2147483648'",
    'm/0x10',
    'M/0',
    'm/ 0',
  ])('rejects %j with PATH_INVALID', (path) => {
    expect(() => parsePath(path)).toThrowError(/PATH_INVALID/);
  });
});

describe('formatPath', () => {
  it('round-trips every built path', () => {
    for (const path of [
      "m/44'/501'/0'",
      "m/44'/501'/2'/0'",
      "m/44'/1815'/1'/0'/7'",
      "m/84'/0'/2'/0/3",
      'm',
    ]) {
      expect(formatPath(parsePath(path))).toBe(path);
    }
  });
});
