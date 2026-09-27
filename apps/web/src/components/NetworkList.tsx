import type { Chain } from '@off-wallet/crypto';
import { Check } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { copy, selectedSummary } from '../i18n/en.ts';
import { ChainLogo } from './ChainLogo.tsx';
import { buildNetworkRows, type NetworkRow } from './networkRows.ts';

export type NetworkListProps = {
  chains: readonly Chain[];
  selected: ReadonlySet<string>;
  onToggleProfile(profileId: string): void;
  onSetProfiles(profileIds: readonly string[], on: boolean): void;
  onSelectAll(): void;
  onClearAll(): void;
};

function RowCheckbox({
  row,
  selected,
  onSetProfiles,
}: Pick<NetworkListProps, 'selected' | 'onSetProfiles'> & { row: NetworkRow }) {
  const ids = row.profiles.map((p) => p.id);
  const count = ids.filter((id) => selected.has(id)).length;
  const all = count === ids.length;
  return (
    <span className="net-check">
      <input
        type="checkbox"
        aria-label={copy.ariaToggleAll(row.name)}
        checked={all}
        ref={(node) => {
          if (node) node.indeterminate = count > 0 && !all;
        }}
        onChange={() => onSetProfiles(ids, !all)}
      />
      <Check size={12} weight="bold" aria-hidden="true" />
    </span>
  );
}

export function NetworkList(props: NetworkListProps) {
  const rows = useMemo(() => buildNetworkRows(props.chains), [props.chains]);
  const all = props.chains.flatMap((c) => c.profiles);
  const chosen = all.filter((p) => props.selected.has(p.id));
  const networks = new Set(chosen.map((p) => p.chainId)).size;

  return (
    <section className="panel" aria-label={copy.sectionNetworks}>
      <div className="section-head">
        <span className="section-num">02</span>
        <h2>{copy.sectionNetworks}</h2>
        <div className="actions">
          <button type="button" className="btn btn-ghost btn-small" onClick={props.onSelectAll}>
            {copy.selectAll}
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={props.onClearAll}>
            {copy.clearAll}
          </button>
        </div>
      </div>
      <p className="muted" data-testid="selected-summary">
        {selectedSummary(chosen.length, all.length, networks)}
      </p>

      <ul className="net-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((row) => (
          <li key={row.key} className="net-row">
            <RowCheckbox row={row} selected={props.selected} onSetProfiles={props.onSetProfiles} />
            <span className="logo-stack">
              {row.chainIds.map((chainId) => (
                <ChainLogo key={chainId} chainId={chainId} size={22} />
              ))}
            </span>
            <div className="net-body">
              <div className="net-title">
                <strong>{row.name}</strong>
                <span>{row.curve}</span>
              </div>
              <div className="tag-list">
                {row.profiles.map((profile) => {
                  const on = props.selected.has(profile.id);
                  const draft = profile.status !== 'verified';
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      className={`tag tag-toggle ${on ? 'tag-accent' : 'tag-outline'}`}
                      aria-pressed={on}
                      disabled={draft}
                      onClick={() => props.onToggleProfile(profile.id)}
                    >
                      {on ? <Check size={10} weight="bold" aria-hidden="true" /> : null}
                      {row.key === 'evm' ? <ChainLogo chainId={profile.chainId} size={12} /> : null}
                      {profile.displayName}
                    </button>
                  );
                })}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="fine">{copy.profileScope}</p>
    </section>
  );
}
