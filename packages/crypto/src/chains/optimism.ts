import { EvmProfile } from '../profiles/evm.ts';
import type { Chain } from '../profiles/profile.ts';

export class Optimism extends EvmProfile {
  constructor() {
    super({
      id: 'optimism',
      chainId: 'optimism',
      network: 'OP Mainnet',
      displayName: 'OP Mainnet',
      format: 'EOA · EIP-55 checksum',
      purpose: 44,
      coinType: 60,
      pathShape: 'BIP44_FULL',
      status: 'verified',
    });
  }
}

export const optimism: Chain = {
  id: 'optimism',
  displayName: 'OP Mainnet',
  profiles: [new Optimism()],
};
