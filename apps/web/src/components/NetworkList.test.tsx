import { registry } from '@off-wallet/crypto';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { copy } from '../i18n/en.ts';
import { NetworkList, type NetworkListProps } from './NetworkList.tsx';
import { buildNetworkRows } from './networkRows.ts';

const ALL = registry.enabled().map((p) => p.id);

const props = (overrides: Partial<NetworkListProps> = {}): NetworkListProps => ({
  chains: registry.chains(),
  selected: new Set(ALL),
  onToggleProfile: vi.fn(),
  onSetProfiles: vi.fn(),
  onSelectAll: vi.fn(),
  onClearAll: vi.fn(),
  ...overrides,
});

describe('buildNetworkRows', () => {
  it('merges the seven EVM chains into one row and keeps the others', () => {
    const rows = buildNetworkRows(registry.chains());
    expect(rows.map((r) => r.name)).toEqual([
      'Bitcoin',
      copy.evmRowName,
      'TRON',
      'Cosmos Hub',
      'Osmosis',
      'THORChain',
      'Solana',
    ]);
    const evm = rows[1];
    expect(evm?.chainIds).toHaveLength(7);
    expect(evm?.profiles.map((p) => p.displayName)).toContain('Avalanche C-Chain');
    expect(evm?.curve).toBe(copy.evmRowCurve);
    expect(rows[6]?.curve).toBe('ed25519');
  });
});

describe('NetworkList', () => {
  it('summarises the selection', () => {
    render(<NetworkList {...props()} />);
    expect(screen.getByText('16 of 16 profiles selected across 13 networks')).toBeTruthy();
  });

  it('renders a pressed tag per profile and toggles one', async () => {
    const user = userEvent.setup();
    const p = props();
    render(<NetworkList {...p} />);
    const tag = screen.getByRole('button', { name: 'Taproot BIP-86' });
    expect(tag.getAttribute('aria-pressed')).toBe('true');
    await user.click(tag);
    expect(p.onToggleProfile).toHaveBeenCalledWith('btc-taproot');
  });

  it('toggles a whole row from its checkbox', async () => {
    const user = userEvent.setup();
    const p = props({ selected: new Set(ALL.filter((id) => id !== 'eth')) });
    render(<NetworkList {...p} />);
    const box = screen.getByLabelText(copy.ariaToggleAll(copy.evmRowName)) as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(box.indeterminate).toBe(true);
    await user.click(box);
    expect(p.onSetProfiles).toHaveBeenCalledWith(
      ['eth', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche'],
      true,
    );
  });

  it('wires select all and clear all', async () => {
    const user = userEvent.setup();
    const p = props();
    render(<NetworkList {...p} />);
    await user.click(screen.getByRole('button', { name: copy.selectAll }));
    await user.click(screen.getByRole('button', { name: copy.clearAll }));
    expect(p.onSelectAll).toHaveBeenCalledTimes(1);
    expect(p.onClearAll).toHaveBeenCalledTimes(1);
  });

  it('shows the profile-scope caveat and seven rows', () => {
    render(<NetworkList {...props()} />);
    expect(screen.getByText(copy.profileScope)).toBeTruthy();
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(7);
  });
});
