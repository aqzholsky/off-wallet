import { SealQuestion } from '@phosphor-icons/react';
import { useMemo } from 'react';
import type { DerivationResult, DerivationStatus } from '../hooks/useDerivation.ts';
import { copy, resultSummary } from '../i18n/en.ts';
import { AddressCard, type KeyActionTarget } from './AddressCard.tsx';
import { buildCards } from './cards.ts';

export type ResultsPanelProps = {
  status: DerivationStatus;
  result: DerivationResult | null;
  notice: string | null;
  onCopyPublicKey(target: KeyActionTarget): void;
  onRequestPrivateKey(target: KeyActionTarget, opener: HTMLElement): void;
};

export function ResultsPanel(props: ResultsPanelProps) {
  const cards = useMemo(
    () => (props.result ? buildCards(props.result.groups) : []),
    [props.result],
  );
  const result = props.result;
  const summary = result
    ? resultSummary(
        cards.length,
        result.groups.length,
        result.groups.reduce((n, g) => n + g.origins.length, 0),
        result.elapsed,
      )
    : null;

  return (
    <section
      className="panel panel-results"
      aria-label={copy.sectionAddresses}
      aria-busy={props.status === 'working'}
    >
      <div className="section-head">
        <span className="section-num">03</span>
        <h2>{copy.sectionAddresses}</h2>
        {summary ? (
          <span className="muted" data-testid="result-summary">
            {summary}
          </span>
        ) : null}
      </div>
      <p className="status-line" role="status">
        {props.notice}
      </p>
      {props.status === 'working' ? <p className="status-line">{copy.working}</p> : null}

      {cards.length === 0 ? (
        <div className="empty" data-testid="empty-state">
          <SealQuestion size={28} aria-hidden="true" />
          <strong>{copy.emptyTitle}</strong>
          <p>{copy.emptyBody}</p>
        </div>
      ) : (
        <ul
          className="cards"
          aria-label={copy.ariaResults}
          style={{ listStyle: 'none', margin: 0, padding: 0 }}
        >
          {cards.map((card) => (
            <li key={card.key}>
              <AddressCard
                card={card}
                onCopyPublicKey={props.onCopyPublicKey}
                onRequestPrivateKey={props.onRequestPrivateKey}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
