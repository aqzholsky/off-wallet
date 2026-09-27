import { type AddressRecord, registry } from '@off-wallet/crypto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copy } from '../i18n/en.ts';
import { PrivateKeyDialog } from './PrivateKeyDialog.tsx';

const profile = registry.get('eth');
const record: AddressRecord = {
  profileId: 'eth',
  chainId: 'ethereum',
  displayName: 'Ethereum',
  network: 'Ethereum',
  format: 'EOA · EIP-55 checksum',
  address: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
  addressSpace: 'evm:9858effd232b4033e47d90003d41ec34ecaeda94',
  path: "m/44'/60'/0'/0/0",
  account: 0,
  index: 0,
};

function mount(
  overrides: {
    onCancel?: () => void;
    onConfirm?: () => Promise<void>;
    revealed?: string | null;
    notice?: string | null;
  } = {},
) {
  const opener = document.createElement('button');
  opener.textContent = 'opener';
  document.body.appendChild(opener);
  opener.focus();
  const onCancel = overrides.onCancel ?? vi.fn();
  const onConfirm = overrides.onConfirm ?? vi.fn(async () => {});
  const view = render(
    <PrivateKeyDialog
      target={{ profile, record }}
      opener={opener}
      revealed={overrides.revealed ?? null}
      notice={overrides.notice ?? null}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  );
  return { ...view, opener, onCancel, onConfirm };
}

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

describe('PrivateKeyDialog', () => {
  it('is an accessible modal with the pinned copy and derivation context', () => {
    mount();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const labelledBy = dialog.getAttribute('aria-labelledby') ?? '';
    const describedBy = dialog.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(labelledBy)?.textContent).toBe(copy.modalTitle);
    expect(document.getElementById(describedBy)?.textContent).toBe(copy.modalWarning);
    expect(screen.getByText('Ethereum')).toBeTruthy();
    expect(screen.getByText("m/44'/60'/0'/0/0")).toBeTruthy();
    expect(screen.getByText('Raw 32-byte scalar · 64 hex · no 0x')).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('focuses Cancel first and derives nothing on open', () => {
    const { onConfirm } = mount();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: copy.modalCancel }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('dismisses on Cancel, Escape and backdrop click without confirming', async () => {
    const user = userEvent.setup();
    const first = mount();
    await user.click(screen.getByRole('button', { name: copy.modalCancel }));
    expect(first.onCancel).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = mount();
    await user.keyboard('{Escape}');
    expect(second.onCancel).toHaveBeenCalledTimes(1);
    second.unmount();

    const third = mount();
    await user.click(screen.getByTestId('dialog-backdrop'));
    expect(third.onCancel).toHaveBeenCalledTimes(1);
    expect(third.onConfirm).not.toHaveBeenCalled();
  });

  it('does not dismiss when the dialog surface itself is clicked', async () => {
    const user = userEvent.setup();
    const { onCancel } = mount();
    await user.click(screen.getByRole('dialog'));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('traps Tab in both directions', async () => {
    const user = userEvent.setup();
    mount();
    const cancel = screen.getByRole('button', { name: copy.modalCancel });
    const confirm = screen.getByRole('button', { name: copy.modalConfirm });
    expect(document.activeElement).toBe(cancel);
    await user.tab();
    expect(document.activeElement).toBe(confirm);
    await user.tab();
    expect(document.activeElement).toBe(cancel);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(confirm);
  });

  it('calls onConfirm once and disables the buttons while pending', async () => {
    const user = userEvent.setup();
    let release: () => void = () => {};
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));
    mount({ onConfirm });
    const confirm = screen.getByRole('button', { name: copy.modalConfirm });
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    release();
  });

  it('shows the key and keeps the buttons once it is revealed', () => {
    const key = 'a'.repeat(64);
    mount({ revealed: key, notice: copy.privateKeyCopied });
    expect(screen.getByTestId('revealed-private-key').textContent).toBe(key);
    expect(screen.getByText(copy.privateKeyCopied)).toBeTruthy();
    expect(screen.getByRole('button', { name: copy.modalClose })).toBeTruthy();
    expect(screen.getByRole('button', { name: copy.modalCopyAgain })).toBeTruthy();
  });

  it('shows no key area before confirmation', () => {
    mount();
    expect(screen.queryByTestId('revealed-private-key')).toBeNull();
  });

  it('returns focus to the opener and unlocks scroll on close', () => {
    const { unmount, opener } = mount();
    unmount();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe('');
  });
});
