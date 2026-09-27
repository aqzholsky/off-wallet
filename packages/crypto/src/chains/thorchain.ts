import { CosmosProfile } from '../profiles/cosmos.ts';
import type { Chain } from '../profiles/profile.ts';

export class Thorchain extends CosmosProfile {
  readonly hrp = 'thor';
  constructor() {
    super({
      id: 'thorchain',
      chainId: 'thorchain',
      network: 'THORChain',
      displayName: 'Bech32 thor',
      format: 'Bech32 · thor',
      purpose: 44,
      coinType: 931,
      pathShape: 'BIP44_FULL',
      status: 'verified',
    });
  }
}

export const thorchain: Chain = {
  id: 'thorchain',
  displayName: 'THORChain',
  profiles: [new Thorchain()],
};
