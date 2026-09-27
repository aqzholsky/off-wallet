import { EvmProfile } from '../profiles/evm.ts';
import type { Chain } from '../profiles/profile.ts';

export class BaseChain extends EvmProfile {
  constructor() {
    super({
      id: 'base',
      chainId: 'base',
      network: 'Base',
      displayName: 'Base',
      format: 'EOA · EIP-55 checksum',
      purpose: 44,
      coinType: 60,
      pathShape: 'BIP44_FULL',
      status: 'verified',
    });
  }
}

export const base: Chain = {
  id: 'base',
  displayName: 'Base',
  profiles: [new BaseChain()],
};
