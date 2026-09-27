import { CosmosProfile } from '../profiles/cosmos.ts';
import type { Chain } from '../profiles/profile.ts';

export class Osmosis extends CosmosProfile {
  readonly hrp = 'osmo';
  constructor() {
    super({
      id: 'osmosis',
      chainId: 'osmosis',
      network: 'Osmosis',
      displayName: 'Bech32 osmo',
      format: 'Bech32 · osmo',
      purpose: 44,
      coinType: 118,
      pathShape: 'BIP44_FULL',
      status: 'verified',
    });
  }
}

export const osmosis: Chain = {
  id: 'osmosis',
  displayName: 'Osmosis',
  profiles: [new Osmosis()],
};
