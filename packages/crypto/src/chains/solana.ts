import type { Chain } from '../profiles/profile.ts';
import { SolanaProfile } from '../profiles/solana.ts';

export class SolanaAccount extends SolanaProfile {
  constructor() {
    super({
      id: 'solana-a',
      chainId: 'solana',
      network: 'Solana',
      displayName: 'Ed25519 A',
      format: 'Ed25519 A',
      purpose: 44,
      coinType: 501,
      pathShape: 'ACCOUNT',
      status: 'verified',
    });
  }
}

export class SolanaChange extends SolanaProfile {
  constructor() {
    super({
      id: 'solana-b',
      chainId: 'solana',
      network: 'Solana',
      displayName: 'Ed25519 B',
      format: 'Ed25519 B',
      purpose: 44,
      coinType: 501,
      pathShape: 'ACCOUNT_CHANGE_H',
      status: 'verified',
    });
  }
}

export const solana: Chain = {
  id: 'solana',
  displayName: 'Solana',
  profiles: [new SolanaAccount(), new SolanaChange()],
};
