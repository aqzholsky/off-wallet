import type { AddressProfile, Chain } from '@off-wallet/crypto';
import { copy } from '../i18n/en.ts';

export type NetworkRow = {
  key: string;
  name: string;
  curve: string;
  chainIds: string[];
  profiles: AddressProfile[];
};

const isEvmChain = (chain: Chain): boolean =>
  chain.profiles.length > 0 && chain.profiles.every((p) => p.formatFamily === 'evm');

export function buildNetworkRows(chains: readonly Chain[]): NetworkRow[] {
  const rows: NetworkRow[] = [];
  let evm: NetworkRow | null = null;
  for (const chain of chains) {
    if (isEvmChain(chain)) {
      if (!evm) {
        evm = {
          key: 'evm',
          name: copy.evmRowName,
          curve: copy.evmRowCurve,
          chainIds: [],
          profiles: [],
        };
        rows.push(evm);
      }
      evm.chainIds.push(chain.id);
      evm.profiles.push(...chain.profiles);
      continue;
    }
    rows.push({
      key: chain.id,
      name: chain.displayName,
      curve: chain.profiles[0]?.curve ?? '',
      chainIds: [chain.id],
      profiles: [...chain.profiles],
    });
  }
  return rows;
}
