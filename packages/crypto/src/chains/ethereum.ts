import { EvmProfile } from '../profiles/evm.ts';
import type { Chain } from '../profiles/profile.ts';

export class Ethereum extends EvmProfile {
  constructor() {
    super({
      id: 'eth',
      chainId: 'ethereum',
      network: 'Ethereum',
      displayName: 'Ethereum',
      format: 'EOA · EIP-55 checksum',
      purpose: 44,
      coinType: 60,
      pathShape: 'BIP44_FULL',
      status: 'verified',
    });
  }
}

export const ethereum: Chain = {
  id: 'ethereum',
  displayName: 'Ethereum',
  profiles: [new Ethereum()],
};
