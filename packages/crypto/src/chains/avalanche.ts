import { EvmProfile } from '../profiles/evm.ts';
import type { Chain } from '../profiles/profile.ts';

export class Avalanche extends EvmProfile {
  constructor() {
    super({
      id: 'avalanche',
      chainId: 'avalanche',
      network: 'Avalanche C-Chain',
      displayName: 'Avalanche C-Chain',
      format: 'EOA · EIP-55 checksum',
      purpose: 44,
      coinType: 60,
      pathShape: 'BIP44_FULL',
      status: 'verified',
    });
  }
}

export const avalanche: Chain = {
  id: 'avalanche',
  displayName: 'Avalanche C-Chain',
  profiles: [new Avalanche()],
};
