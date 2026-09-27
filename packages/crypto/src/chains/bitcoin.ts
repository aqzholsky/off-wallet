import { Base58PkhProfile } from '../profiles/base58Pkh.ts';
import type { Chain } from '../profiles/profile.ts';
import { SegwitV0Profile } from '../profiles/segwitV0.ts';
import { TaprootProfile } from '../profiles/taproot.ts';

export class BitcoinLegacy extends Base58PkhProfile {
  readonly versionBytes = new Uint8Array([0x00]);
  constructor() {
    super({
      id: 'btc-legacy',
      chainId: 'bitcoin',
      network: 'Bitcoin',
      displayName: 'Legacy P2PKH',
      format: 'Legacy P2PKH',
      purpose: 44,
      coinType: 0,
      pathShape: 'BIP44_FULL',
      status: 'verified',
    });
  }
}

export class BitcoinSegwit extends SegwitV0Profile {
  readonly hrp = 'bc';
  constructor() {
    super({
      id: 'btc-segwit',
      chainId: 'bitcoin',
      network: 'Bitcoin',
      displayName: 'Native SegWit',
      format: 'Native SegWit',
      purpose: 84,
      coinType: 0,
      pathShape: 'BIP44_FULL',
      status: 'verified',
    });
  }
}

export class BitcoinTaproot extends TaprootProfile {
  readonly hrp = 'bc';
  constructor() {
    super({
      id: 'btc-taproot',
      chainId: 'bitcoin',
      network: 'Bitcoin',
      displayName: 'Taproot BIP-86',
      format: 'Taproot BIP-86',
      purpose: 86,
      coinType: 0,
      pathShape: 'BIP44_FULL',
      status: 'verified',
    });
  }
}

export const bitcoin: Chain = {
  id: 'bitcoin',
  displayName: 'Bitcoin',
  profiles: [new BitcoinLegacy(), new BitcoinSegwit(), new BitcoinTaproot()],
};
