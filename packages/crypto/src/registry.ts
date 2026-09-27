import { arbitrum } from './chains/arbitrum.ts';
import { avalanche } from './chains/avalanche.ts';
import { base } from './chains/base.ts';
import { bitcoin } from './chains/bitcoin.ts';
import { bsc } from './chains/bsc.ts';
import { cosmos } from './chains/cosmos.ts';
import { ethereum } from './chains/ethereum.ts';
import { optimism } from './chains/optimism.ts';
import { osmosis } from './chains/osmosis.ts';
import { polygon } from './chains/polygon.ts';
import { solana } from './chains/solana.ts';
import { thorchain } from './chains/thorchain.ts';
import { tron } from './chains/tron.ts';
import { CryptoError } from './errors.ts';
import type { AddressProfile, Chain } from './profiles/profile.ts';

// Object.freeze is shallow, so freezing only the outer array would still let a consumer
// push into chain.profiles and desynchronise chains() from the list() snapshot below.
const CHAINS: readonly Chain[] = Object.freeze([
  bitcoin,
  ethereum,
  bsc,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  tron,
  cosmos,
  osmosis,
  thorchain,
  solana,
]);

for (const chain of CHAINS) {
  Object.freeze(chain.profiles);
  Object.freeze(chain);
}

const ALL: readonly AddressProfile[] = Object.freeze(CHAINS.flatMap((chain) => chain.profiles));
const ENABLED: readonly AddressProfile[] = Object.freeze(
  ALL.filter((p) => p.status === 'verified'),
);

const BY_ID = new Map<string, AddressProfile>();
for (const profile of ALL) {
  // A duplicate id would make registry.get ambiguous, so it fails at module load
  // rather than silently shadowing one profile with another.
  if (BY_ID.has(profile.id)) throw new Error(`duplicate profile id: ${profile.id}`);
  BY_ID.set(profile.id, profile);
}

export const registry = {
  list(): readonly AddressProfile[] {
    return ALL;
  },
  enabled(): readonly AddressProfile[] {
    return ENABLED;
  },
  get(profileId: string): AddressProfile {
    const profile = BY_ID.get(profileId);
    if (!profile) throw new CryptoError('PROFILE_UNKNOWN', { profileId });
    return profile;
  },
  chains(): readonly Chain[] {
    return CHAINS;
  },
};
