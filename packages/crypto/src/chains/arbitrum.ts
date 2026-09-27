import { EvmProfile } from '../profiles/evm.ts';
import type { Chain } from '../profiles/profile.ts';

export class Arbitrum extends EvmProfile {
  constructor() {
    super({
      id: 'arbitrum',
      chainId: 'arbitrum',
      network: 'Arbitrum One',
      displayName: 'Arbitrum One',
      format: 'EOA · EIP-55 checksum',
      purpose: 44,
      coinType: 60,
      pathShape: 'BIP44_FULL',
      status: 'verified',
    });
  }
}

export const arbitrum: Chain = {
  id: 'arbitrum',
  displayName: 'Arbitrum One',
  profiles: [new Arbitrum()],
};
