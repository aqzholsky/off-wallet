import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { copy, errorMessage } from '../i18n/en.ts';
import { SourcePanel, type SourcePanelProps } from './SourcePanel.tsx';

const props = (overrides: Partial<SourcePanelProps> = {}): SourcePanelProps => ({
  mnemonic: '',
  onMnemonicChange: vi.fn(),
  language: 'english',
  onLanguageChange: vi.fn(),
  wordCount: 12,
  onWordCountChange: vi.fn(),
  passphrase: '',
  onPassphraseChange: vi.fn(),
  account: '0',
  onAccountChange: vi.fn(),
  index: '0',
  onIndexChange: vi.fn(),
  error: null,
  onGenerate: vi.fn(),
  onClear: vi.fn(),
  ...overrides,
});

describe('SourcePanel', () => {
  it('renders every input with autofill suppressed', () => {
    render(<SourcePanel {...props()} />);
    const controls = [
      screen.getByLabelText(copy.mnemonicLabel),
      screen.getByLabelText(copy.passphraseLabel),
      screen.getByLabelText(copy.accountLabel),
      screen.getByLabelText(copy.indexLabel),
      screen.getByLabelText(copy.languageLabel),
    ];
    for (const control of controls) {
      expect(control.getAttribute('autocomplete')).toBe('off');
      expect(control.getAttribute('autocorrect')).toBe('off');
      expect(control.getAttribute('autocapitalize')).toBe('none');
      expect(control.getAttribute('spellcheck')).toBe('false');
    }
    expect(screen.getByLabelText(copy.passphraseLabel).getAttribute('type')).toBe('password');
    expect(screen.getByLabelText(copy.mnemonicLabel).getAttribute('placeholder')).toBe(
      copy.mnemonicPlaceholder,
    );
  });

  it('shows the inline error under the mnemonic with role alert', () => {
    const message = errorMessage('MNEMONIC_WORD_UNKNOWN', { wordIndex: 2 });
    render(<SourcePanel {...props({ error: { code: 'MNEMONIC_WORD_UNKNOWN', message } })} />);
    expect(screen.getByRole('alert').textContent).toContain(message);
    expect(screen.getByLabelText(copy.mnemonicLabel).getAttribute('aria-invalid')).toBe('true');
  });

  it('shows an index error next to the account fields instead', () => {
    const message = errorMessage('PATH_INDEX_RANGE');
    render(<SourcePanel {...props({ error: { code: 'PATH_INDEX_RANGE', message } })} />);
    expect(screen.getByLabelText(copy.mnemonicLabel).getAttribute('aria-invalid')).toBe('false');
    expect(screen.getByLabelText(copy.indexLabel).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText(copy.accountLabel).getAttribute('aria-invalid')).toBe('true');
    const describedBy = screen.getByLabelText(copy.accountLabel).getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy ?? '')?.textContent).toContain(message);
    expect(screen.getByRole('alert').textContent).toContain(message);
  });

  it('forwards typing, language, length, generate and clear', async () => {
    const user = userEvent.setup();
    const p = props();
    render(<SourcePanel {...p} />);
    await user.type(screen.getByLabelText(copy.mnemonicLabel), 'ab');
    expect(p.onMnemonicChange).toHaveBeenCalledWith('a');
    expect(p.onMnemonicChange).toHaveBeenCalledWith('b');
    await user.selectOptions(screen.getByLabelText(copy.languageLabel), 'japanese');
    expect(p.onLanguageChange).toHaveBeenCalledWith('japanese');
    await user.click(screen.getByLabelText(copy.words24));
    expect(p.onWordCountChange).toHaveBeenCalledWith(24);
    await user.click(screen.getByRole('button', { name: copy.generate }));
    expect(p.onGenerate).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: copy.clear }));
    expect(p.onClear).toHaveBeenCalledTimes(1);
  });

  it('lists the ten languages by their English names', () => {
    render(<SourcePanel {...props()} />);
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual([
      'English',
      'Japanese',
      'Korean',
      'Spanish',
      'Chinese Simplified',
      'Chinese Traditional',
      'French',
      'Italian',
      'Czech',
      'Portuguese',
    ]);
  });
});
