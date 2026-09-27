import { LockKey } from '@phosphor-icons/react';
import { type KeyboardEvent, type MouseEvent, useEffect, useId, useRef, useState } from 'react';
import { copy } from '../i18n/en.ts';
import type { KeyActionTarget } from './AddressCard.tsx';
import { ChainLogo } from './ChainLogo.tsx';

export type PrivateKeyDialogProps = {
  target: KeyActionTarget;
  opener: HTMLElement | null;
  revealed: string | null;
  notice: string | null;
  onCancel(): void;
  onConfirm(): Promise<void>;
};

export function PrivateKeyDialog({
  target,
  opener,
  revealed,
  notice,
  onCancel,
  onConfirm,
}: PrivateKeyDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    cancelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [opener]);

  // Disabling the focused button drops focus to <body>, which would leave Escape and the Tab
  // trap outside this subtree's key handler for the rest of the dialog's life.
  useEffect(() => {
    if (pending || document.activeElement !== document.body) return;
    confirmRef.current?.focus();
  }, [pending]);

  // WebKit skips buttons in the native tab order by platform preference, so both directions are
  // handled here instead of relying on the browser's focus cycling.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== 'Tab') return;
    const first = cancelRef.current;
    const last = confirmRef.current;
    if (!first || !last) return;
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || !event.currentTarget.contains(active)) {
        event.preventDefault();
        last.focus();
      }
      return;
    }
    if (active === last || !event.currentTarget.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  };

  const onBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onCancel();
  };

  const confirm = async () => {
    if (pending) return;
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  };

  const { profile, record } = target;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismissal mirrors the keyboard Escape path handled on the same element
    <div
      className="dialog-backdrop app-dialog"
      data-testid="dialog-backdrop"
      onClick={onBackdropClick}
      onKeyDown={onKeyDown}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="dialog-head">
          <LockKey size={20} aria-hidden="true" />
          <div id={titleId} className="dialog-title">
            {copy.modalTitle}
          </div>
        </div>
        <p id={descriptionId} className="dialog-body">
          {copy.modalWarning}
        </p>
        <dl className="dialog-grid">
          <dt>{copy.rowNetwork}</dt>
          <dd>
            <ChainLogo chainId={record.chainId} size={14} />
            {record.network}
          </dd>
          <dt>{copy.rowProfile}</dt>
          <dd>{`${profile.displayName} · ${profile.curve}`}</dd>
          <dt>{copy.rowPath}</dt>
          <dd className="mono">{record.path}</dd>
          <dt>{copy.rowFormat}</dt>
          <dd>{profile.privateKeyEncoding}</dd>
        </dl>
        <div className="dialog-reveal" aria-live="polite">
          {revealed ? (
            <div className="dialog-key">
              <div className="dialog-key-label">{copy.modalRevealLabel}</div>
              <div className="mono dialog-key-value" data-testid="revealed-private-key">
                {revealed}
              </div>
            </div>
          ) : null}
          {notice ? <p className="dialog-notice">{notice}</p> : null}
        </div>
        <div className="dialog-actions">
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-secondary btn-tall"
            onClick={onCancel}
            disabled={pending}
          >
            {revealed ? copy.modalClose : copy.modalCancel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="btn btn-primary btn-tall"
            onClick={confirm}
            disabled={pending}
          >
            <LockKey size={16} aria-hidden="true" />
            {revealed ? copy.modalCopyAgain : copy.modalConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
