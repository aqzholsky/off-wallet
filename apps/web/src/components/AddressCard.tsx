import {
  type AddressGroup,
  type AddressProfile,
  type AddressRecord,
  registry,
} from '@off-wallet/crypto';
import { Check, Copy, Key, LockKey } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { copy } from '../i18n/en.ts';
import { ChainLogo } from './ChainLogo.tsx';
import { entryNotes, type ResultCard } from './cards.ts';

export type KeyActionTarget = { profile: AddressProfile; record: AddressRecord };

export type AddressCardProps = {
  card: ResultCard;
  onCopyPublicKey(target: KeyActionTarget): void;
  onRequestPrivateKey(target: KeyActionTarget, opener: HTMLElement): void;
  writeText?(text: string): Promise<void>;
};

const COPIED_MS = 1500;

function useCopied(): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  const flash = () => {
    setCopied(true);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };
  return [copied, flash];
}

function Entry({
  group,
  onCopyPublicKey,
  onRequestPrivateKey,
  writeText,
}: Omit<AddressCardProps, 'card'> & { group: AddressGroup }) {
  const [copied, flash] = useCopied();
  const primary = group.origins[0];
  if (!primary) return null;
  const profile = registry.get(primary.profileId);
  const write = writeText ?? ((text: string) => navigator.clipboard.writeText(text));
  const target: KeyActionTarget = { profile, record: primary };

  return (
    <div className="entry">
      <div className="entry-head">
        <span className="entry-format">{group.format}</span>
        <span className="entry-path mono">{primary.path}</span>
      </div>
      <div className="address-row">
        <span className="address mono" data-testid="address">
          {group.address}
        </span>
        <button
          type="button"
          className="btn btn-secondary"
          aria-label={copy.ariaCopyAddress(group.format)}
          onClick={() => {
            write(group.address).then(flash, () => {});
          }}
        >
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? copy.copied : copy.copyAddress}
        </button>
      </div>
      {group.origins.length > 1 ? (
        <div className="origins">
          <span>{copy.sameAddressOn}</span>
          {group.origins.map((origin) => (
            <span key={origin.profileId} className="origin-chip" data-testid="origin-chip">
              <ChainLogo chainId={origin.chainId} size={14} />
              {origin.network}
            </span>
          ))}
        </div>
      ) : null}
      {entryNotes(profile).map((note) => (
        <p key={note} className="fine">
          {note}
        </p>
      ))}
      <details>
        <summary>{copy.derivationDetails}</summary>
        <dl>
          <dt>{copy.rowPath}</dt>
          <dd className="mono">{primary.path}</dd>
          <dt>{copy.rowAccount}</dt>
          <dd className="mono">{primary.account}</dd>
          <dt>{copy.rowIndex}</dt>
          <dd className="mono">{primary.index ?? '—'}</dd>
          <dt>{copy.rowCurve}</dt>
          <dd>{profile.curve}</dd>
          <dt>{copy.rowPurpose}</dt>
          <dd className="mono">{profile.purpose}</dd>
          <dt>{copy.rowCoinType}</dt>
          <dd className="mono">{profile.coinType}</dd>
        </dl>
      </details>
      <div className="key-actions">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          aria-label={copy.ariaCopyPublicKey(group.format)}
          onClick={() => onCopyPublicKey(target)}
        >
          <Key size={14} aria-hidden="true" />
          {copy.copyPublicKey}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-small btn-private"
          aria-label={copy.ariaCopyPrivateKey(group.format)}
          onClick={(event) => onRequestPrivateKey(target, event.currentTarget)}
        >
          <LockKey size={14} aria-hidden="true" />
          {copy.copyPrivateKey}
        </button>
        <span className="encoding">{profile.publicKeyEncoding}</span>
      </div>
    </div>
  );
}

export function AddressCard({ card, ...actions }: AddressCardProps) {
  return (
    <article className="card result elev-sm" data-testid="result-card">
      <header className="card-head">
        <span className="logo-stack">
          {card.chainIds.map((chainId) => (
            <ChainLogo key={chainId} chainId={chainId} size={26} />
          ))}
        </span>
        <div className="card-titles">
          <strong>{card.title}</strong>
          <span>{card.meta}</span>
        </div>
        <span className="tag tag-neutral mono">{card.tag}</span>
      </header>
      {card.entries.map((group) => (
        <Entry key={group.addressSpace} group={group} {...actions} />
      ))}
    </article>
  );
}
