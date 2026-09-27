import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copy, errorMessage } from '../i18n/en.ts';
import { handleRequest } from '../worker/handle.ts';
import type { Request, Response } from '../worker/protocol.ts';
import { App } from './App.tsx';

const MNEMONIC_A =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const ETH = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94';
const ETH_PRIVATE = '1ab42cc412b618bdea3a599e3c9bae199ebf030895b039e9db1e30dafb12b727';

// Runs the real dispatcher on a macrotask so the app sees the same asynchrony as a Worker.
class InlineWorker {
  onmessage: ((event: MessageEvent<Response>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private alive = true;
  postMessage(request: Request): void {
    const response = handleRequest(request, () => performance.now());
    setTimeout(() => {
      if (this.alive) this.onmessage?.({ data: response } as MessageEvent<Response>);
    }, 0);
  }
  terminate(): void {
    this.alive = false;
  }
}
const createWorker = () => new InlineWorker() as unknown as Worker;

const mnemonicBox = () => screen.getByLabelText(copy.mnemonicLabel) as HTMLTextAreaElement;
const paste = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.click(mnemonicBox());
  await user.paste(text);
};

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('App', () => {
  it('starts empty with everything selected', () => {
    render(<App createWorker={createWorker} />);
    expect(screen.getByText(copy.emptyTitle)).toBeTruthy();
    expect(screen.getByText('16 of 16 profiles selected across 13 networks')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(copy.heading);
  });

  it('flow A: a pasted mnemonic derives addresses after the debounce', async () => {
    const user = userEvent.setup();
    render(<App createWorker={createWorker} />);
    await paste(user, MNEMONIC_A);
    expect(screen.getByText(copy.emptyTitle)).toBeTruthy();
    await screen.findByText(ETH, {}, { timeout: 4000 });
    expect(screen.getByText('Ethereum and 6 EVM networks')).toBeTruthy();
    expect(screen.getByText('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu')).toBeTruthy();
    expect(screen.getByText(/7 cards · 10 addresses · 16 profiles/)).toBeTruthy();
  });

  it('flow A: an invalid mnemonic shows the inline error and keeps the empty state', async () => {
    const user = userEvent.setup();
    render(<App createWorker={createWorker} />);
    await paste(user, MNEMONIC_A.replace('about', 'zzzz'));
    const alert = await screen.findByRole('alert', {}, { timeout: 4000 });
    expect(alert.textContent).toContain(errorMessage('MNEMONIC_WORD_UNKNOWN', { wordIndex: 11 }));
    expect(screen.getByText(copy.emptyTitle)).toBeTruthy();
  });

  it('flow B: Generate mnemonic fills the textarea in the chosen length and derives', async () => {
    const user = userEvent.setup();
    render(<App createWorker={createWorker} />);
    await user.click(screen.getByLabelText(copy.words24));
    await user.click(screen.getByRole('button', { name: copy.generate }));
    await waitFor(() => expect(mnemonicBox().value.split(' ')).toHaveLength(24), { timeout: 4000 });
    await waitFor(() => expect(screen.queryByText(copy.emptyTitle)).toBeNull(), { timeout: 4000 });
    expect(screen.getAllByText(/^0x[0-9a-fA-F]{40}$/)).toHaveLength(1);
  });

  it('clears results immediately when the input changes and again on Clear session', async () => {
    const user = userEvent.setup();
    render(<App createWorker={createWorker} />);
    await paste(user, MNEMONIC_A);
    await screen.findByText(ETH, {}, { timeout: 4000 });
    await user.type(screen.getByLabelText(copy.passphraseLabel), 'x');
    expect(screen.queryByText(ETH)).toBeNull();
    await screen.findAllByText(/^0x[0-9a-fA-F]{40}$/, {}, { timeout: 4000 });
    await user.click(screen.getByRole('button', { name: copy.clear }));
    expect(mnemonicBox().value).toBe('');
    expect((screen.getByLabelText(copy.passphraseLabel) as HTMLInputElement).value).toBe('');
    expect(screen.getByText(copy.emptyTitle)).toBeTruthy();
  });

  it('deselecting profiles removes their cards', async () => {
    const user = userEvent.setup();
    render(<App createWorker={createWorker} />);
    await paste(user, MNEMONIC_A);
    await screen.findByText(ETH, {}, { timeout: 4000 });
    await user.click(screen.getByRole('button', { name: copy.clearAll }));
    expect(screen.getByText(copy.emptyTitle)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Base58Check' }));
    await screen.findByText('TUEZSdKsoDHQMeZwihtdoBiN46zxhGWYdH', {}, { timeout: 4000 });
    expect(screen.queryByText(ETH)).toBeNull();
    expect(screen.getByText('1 of 16 profiles selected across 1 network')).toBeTruthy();
  });

  it('copies the private key only after explicit confirmation, then reports it', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<App createWorker={createWorker} />);
    await paste(user, MNEMONIC_A);
    await screen.findByText(ETH, {}, { timeout: 4000 });
    await user.click(
      screen.getByRole('button', { name: copy.ariaCopyPrivateKey('EOA · EIP-55 checksum') }),
    );
    const dialog = screen.getByRole('dialog');
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByTestId('page').hasAttribute('inert')).toBe(true);
    await user.click(screen.getByRole('button', { name: copy.modalConfirm }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(ETH_PRIVATE), { timeout: 4000 });
    await waitFor(() =>
      expect(screen.getByTestId('revealed-private-key').textContent).toBe(ETH_PRIVATE),
    );
    expect(dialog.isConnected).toBe(true);
    expect(within(dialog).getByText(copy.privateKeyCopied)).toBeTruthy();
    expect(screen.getByTestId('page').hasAttribute('inert')).toBe(true);
    await user.click(screen.getByRole('button', { name: copy.modalClose }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe(copy.privateKeyCopied);
    expect(screen.getByTestId('page').hasAttribute('inert')).toBe(false);
  });

  it('dismisses the dialog when the inputs change', async () => {
    const user = userEvent.setup();
    render(<App createWorker={createWorker} />);
    await paste(user, MNEMONIC_A);
    await screen.findByText(ETH, {}, { timeout: 4000 });
    await user.click(
      screen.getByRole('button', { name: copy.ariaCopyPrivateKey('EOA · EIP-55 checksum') }),
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(
      screen.getByRole('button', { name: copy.ariaCopyPrivateKey('EOA · EIP-55 checksum') }),
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    await user.type(screen.getByLabelText(copy.accountLabel), '1');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('copies the public key directly and reports it', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<App createWorker={createWorker} />);
    await paste(user, MNEMONIC_A);
    await screen.findByText(ETH, {}, { timeout: 4000 });
    await user.click(
      screen.getByRole('button', { name: copy.ariaCopyPublicKey('EOA · EIP-55 checksum') }),
    );
    await waitFor(
      () =>
        expect(writeText).toHaveBeenCalledWith(
          '0237b0bb7a8288d38ed49a524b5dc98cff3eb5ca824c9f9dc0dfdb3d9cd600f299',
        ),
      { timeout: 4000 },
    );
    expect(screen.getByRole('status').textContent).toBe(copy.publicKeyCopied);
  });
});
