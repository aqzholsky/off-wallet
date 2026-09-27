import { EvmProfile } from '../profiles/evm.ts';
import type { Chain } from '../profiles/profile.ts';

export class BnbSmartChain extends EvmProfile {
  constructor() {
    super({
      id: 'bsc',
      chainId: 'bsc',
      network: 'BNB Smart Chain',
      displayName: 'BNB Smart Chain',
      format: 'EOA · EIP-55 checksum',
      purpose: 44,
      coinType: 60,
      pathShape: 'BIP44_FULL',
      status: 'verified',
    });
  }
}

export const bsc: Chain = {
  id: 'bsc',
  displayName: 'BNB Smart Chain',
  profiles: [new BnbSmartChain()],
};
