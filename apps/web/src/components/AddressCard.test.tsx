import { deriveAddress, groupByAddressSpace, mnemonicToSeed, registry } from '@off-wallet/crypto';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copy } from '../i18n/en.ts';
import { AddressCard } from './AddressCard.tsx';
import { buildCards } from './cards.ts';

const seed = mnemonicToSeed(
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  '',
);
const cards = buildCards(
  groupByAddressSpace(
    registry.enabled().map((p) => deriveAddress(p, seed, { account: 0, index: 0 })),
  ),
);
const evmCard = cards.find((c) => c.tag === 'EVM');
const btcCard = cards.find((c) => c.tag === 'BTC');
if (!evmCard || !btcCard) throw new Error('fixture cards missing');

afterEach(() => {
  vi.useRealTimers();
});

describe('AddressCard', () => {
  it('renders the merged EVM entry with origin chips', () => {
    render(<AddressCard card={evmCard} onCopyPublicKey={vi.fn()} onRequestPrivateKey={vi.fn()} />);
    expect(screen.getByText('Ethereum and 6 EVM networks')).toBeTruthy();
    expect(screen.getByText('0x9858EfFD232B4033E47d90003D41EC34EcaEda94')).toBeTruthy();
    expect(screen.getByText(copy.sameAddressOn)).toBeTruthy();
    expect(screen.getByText('Avalanche C-Chain')).toBeTruthy();
    expect(screen.getAllByText("m/44'/60'/0'/0/0").length).toBeGreaterThan(0);
    expect(screen.getByText('SEC1 compressed · 33 bytes · hex')).toBeTruthy();
  });

  it('copies the address and flips the label to Copied for 1.5 s', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(async () => {});
    render(
      <AddressCard
        card={evmCard}
        onCopyPublicKey={vi.fn()}
        onRequestPrivateKey={vi.fn()}
        writeText={writeText}
      />,
    );
    const button = screen.getByRole('button', {
      name: copy.ariaCopyAddress('EOA · EIP-55 checksum'),
    });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(writeText).toHaveBeenCalledWith('0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
    expect(button.textContent).toContain(copy.copied);
    act(() => vi.advanceTimersByTime(1500));
    expect(button.textContent).toContain(copy.copyAddress);
    expect(button.textContent).not.toContain(copy.copied);
  });

  it('shows the taproot caveat and a derivation disclosure', async () => {
    const user = userEvent.setup();
    render(<AddressCard card={btcCard} onCopyPublicKey={vi.fn()} onRequestPrivateKey={vi.fn()} />);
    expect(screen.getByText(copy.profileNotes['btc-taproot'] ?? '')).toBeTruthy();
    const disclosures = screen.getAllByText(copy.derivationDetails);
    expect(disclosures).toHaveLength(3);
    await user.click(disclosures[0] as HTMLElement);
    expect(screen.getAllByText('44')).not.toHaveLength(0);
  });

  it('hands the key actions their target and the opening button', async () => {
    const user = userEvent.setup();
    const onCopyPublicKey = vi.fn();
    const onRequestPrivateKey = vi.fn();
    render(
      <AddressCard
        card={evmCard}
        onCopyPublicKey={onCopyPublicKey}
        onRequestPrivateKey={onRequestPrivateKey}
      />,
    );
    await user.click(
      screen.getByRole('button', { name: copy.ariaCopyPublicKey('EOA · EIP-55 checksum') }),
    );
    expect(onCopyPublicKey).toHaveBeenCalledTimes(1);
    expect(onCopyPublicKey.mock.calls[0]?.[0]).toMatchObject({ record: { profileId: 'eth' } });
    const privateButton = screen.getByRole('button', {
      name: copy.ariaCopyPrivateKey('EOA · EIP-55 checksum'),
    });
    await user.click(privateButton);
    expect(onRequestPrivateKey).toHaveBeenCalledTimes(1);
    expect(onRequestPrivateKey.mock.calls[0]?.[1]).toBe(privateButton);
  });
});
