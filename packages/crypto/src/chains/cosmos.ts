import { CosmosProfile } from '../profiles/cosmos.ts';
import type { Chain } from '../profiles/profile.ts';

export class CosmosHub extends CosmosProfile {
  readonly hrp = 'cosmos';
  constructor() {
    super({
      id: 'cosmos',
      chainId: 'cosmos',
      network: 'Cosmos Hub',
      displayName: 'Bech32 cosmos',
      format: 'Bech32 · cosmos',
      purpose: 44,
      coinType: 118,
      pathShape: 'BIP44_FULL',
      status: 'verified',
    });
  }
}

export const cosmos: Chain = {
  id: 'cosmos',
  displayName: 'Cosmos Hub',
  profiles: [new CosmosHub()],
};
