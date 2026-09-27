import { EvmProfile } from '../profiles/evm.ts';
import type { Chain } from '../profiles/profile.ts';

export class Polygon extends EvmProfile {
  constructor() {
    super({
      id: 'polygon',
      chainId: 'polygon',
      network: 'Polygon PoS',
      displayName: 'Polygon PoS',
      format: 'EOA · EIP-55 checksum',
      purpose: 44,
      coinType: 60,
      pathShape: 'BIP44_FULL',
      status: 'verified',
    });
  }
}

export const polygon: Chain = {
  id: 'polygon',
  displayName: 'Polygon PoS',
  profiles: [new Polygon()],
};
