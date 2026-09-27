import type { Chain } from '../profiles/profile.ts';
import { TronProfile } from '../profiles/tron.ts';

export class Tron extends TronProfile {
  constructor() {
    super({
      id: 'tron',
      chainId: 'tron',
      network: 'TRON',
      displayName: 'Base58Check',
      format: 'Base58Check',
      purpose: 44,
      coinType: 195,
      pathShape: 'BIP44_FULL',
      status: 'verified',
    });
  }
}

export const tron: Chain = {
  id: 'tron',
  displayName: 'TRON',
  profiles: [new Tron()],
};
