import { describe, expect, it } from 'vitest';
import css from './style.css?raw';

describe('style.css', () => {
  it('carries the Nocturne tokens', () => {
    expect(css).toContain('--color-bg: #161826');
    expect(css).toContain('--color-accent: #9184d9');
    expect(css).toContain('.dialog-backdrop');
  });

  it('loads nothing from the network', () => {
    expect(css).not.toContain('@import');
    expect(css).not.toContain('http://');
    expect(css).not.toContain('https://');
  });

  it('defines the app layout classes', () => {
    for (const cls of ['.page', '.net-row', '.address', '.entry', '.field-error', '.app-dialog']) {
      expect(css).toContain(cls);
    }
  });
});
