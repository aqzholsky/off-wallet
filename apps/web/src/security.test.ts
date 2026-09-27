import { describe, expect, it } from 'vitest';
import indexHtml from '../index.html?raw';

const sources = import.meta.glob<string>('./**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const FORBIDDEN = [
  'localStorage',
  'sessionStorage',
  'document.cookie',
  'indexedDB',
  'fetch(',
  'XMLHttpRequest',
  'console.',
  'location.search',
  'location.hash',
  'history.pushState',
  'history.replaceState',
  'https://',
  'http://',
] as const;

const shipped = Object.entries(sources).filter(([path]) => !path.includes('.test.'));

describe('security invariants', () => {
  it('scans a meaningful number of shipped source files', () => {
    expect(shipped.length).toBeGreaterThan(15);
  });

  it('no shipped source references storage, network, logging or the URL', () => {
    for (const [path, text] of shipped) {
      for (const token of FORBIDDEN) {
        expect(text.includes(token), `${path} contains ${token}`).toBe(false);
      }
    }
  });

  it('index.html loads nothing external', () => {
    expect(/\b(src|href)=["']https?:/i.test(indexHtml)).toBe(false);
    expect(indexHtml).toContain('<meta name="referrer" content="no-referrer"');
  });

  it('the worker is imported inline exactly once', () => {
    const importers = shipped.filter(([, text]) => text.includes('?worker'));
    expect(importers.map(([path]) => path)).toEqual(['./worker/createWorker.ts']);
    expect(importers[0]?.[1]).toContain('?worker&inline');
  });

  it('every text-like input suppresses autofill', () => {
    const panel = sources['./components/SourcePanel.tsx'] ?? '';
    expect(panel).toContain("autoComplete: 'off'");
    expect(panel).toContain("autoCorrect: 'off'");
    expect(panel).toContain("autoCapitalize: 'none'");
    expect(panel).toContain('spellCheck: false');
  });
});
