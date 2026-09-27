import { chainLogo } from '../assets/chains/index.ts';

type ChainLogoProps = { chainId: string; size?: number };

export function ChainLogo({ chainId, size = 22 }: ChainLogoProps) {
  const src = chainLogo[chainId];
  if (!src)
    return <span className="chain-logo" aria-hidden="true" style={{ width: size, height: size }} />;
  return <img className="chain-logo" src={src} alt="" width={size} height={size} />;
}
