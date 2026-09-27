import { type Language, registry } from '@off-wallet/crypto';
import { Hexagon, ShieldCheck } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDerivation } from '../hooks/useDerivation.ts';
import { copy, errorMessage } from '../i18n/en.ts';
import { type CopyLeafOutcome, copyLeaf } from '../keys/copyLeaf.ts';
import type { KeyActionTarget } from './AddressCard.tsx';
import { NetworkList } from './NetworkList.tsx';
import { PrivateKeyDialog } from './PrivateKeyDialog.tsx';
import { ResultsPanel } from './ResultsPanel.tsx';
import { type SourceError, SourcePanel } from './SourcePanel.tsx';

const ALL_PROFILE_IDS: readonly string[] = registry.list().map((p) => p.id);
const ENABLED_PROFILE_IDS: readonly string[] = registry.enabled().map((p) => p.id);

type Inputs = {
  mnemonic: string;
  language: Language;
  wordCount: 12 | 24;
  passphrase: string;
  account: string;
  index: string;
};

const DEFAULT_INPUTS: Inputs = {
  mnemonic: '',
  language: 'english',
  wordCount: 12,
  passphrase: '',
  account: '0',
  index: '0',
};

// An empty field must reach the worker as NaN so it is reported, not silently treated as 0.
const parseIndex = (text: string): number => (text.trim() === '' ? Number.NaN : Number(text));

type Dialog = {
  target: KeyActionTarget;
  opener: HTMLElement | null;
  revealed: string | null;
  notice: string | null;
};

// registry.get throws for an unknown id, which would unmount the tree from inside render.
const profileLabel = (profileId: string): string =>
  registry.list().find((p) => p.id === profileId)?.displayName ?? profileId;

function noticeFor(outcome: CopyLeafOutcome, success: string): string {
  if (outcome.ok) return success;
  if (outcome.reason === 'clipboard') return copy.clipboardFailed;
  if (outcome.reason === 'stale') return copy.keyStale;
  return copy.keyFailed;
}

export function App({ createWorker }: { createWorker: () => Worker }) {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(ENABLED_PROFILE_IDS));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedIds = useMemo(() => ALL_PROFILE_IDS.filter((id) => selected.has(id)), [selected]);
  const derivationInput = useMemo(
    () => ({
      mnemonic: inputs.mnemonic,
      language: inputs.language,
      passphrase: inputs.passphrase,
      account: parseIndex(inputs.account),
      index: parseIndex(inputs.index),
      selected: selectedIds,
    }),
    [
      inputs.mnemonic,
      inputs.language,
      inputs.passphrase,
      inputs.account,
      inputs.index,
      selectedIds,
    ],
  );
  const derivation = useDerivation(derivationInput, { createWorker });
  const { revision, requestKey, generate, clear } = derivation;

  // Any revision bump (input change, generate, clear) invalidates an open confirmation and stale notices.
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is the trigger, not a value read in the body; dropping it would leave a dialog open against inputs that already moved on
  useEffect(() => {
    setDialog(null);
    setNotice(null);
  }, [revision]);

  const update = useCallback(<K extends keyof Inputs>(key: K, value: Inputs[K]) => {
    setInputs((current) => ({ ...current, [key]: value }));
  }, []);

  const onGenerate = useCallback(() => {
    generate(inputs.language, inputs.wordCount).then(
      (mnemonic) => update('mnemonic', mnemonic),
      () => {},
    );
  }, [generate, inputs.language, inputs.wordCount, update]);

  const onClear = useCallback(() => {
    setInputs(DEFAULT_INPUTS);
    setSelected(new Set(ENABLED_PROFILE_IDS));
    setDialog(null);
    setNotice(null);
    clear();
  }, [clear]);

  const toggleProfile = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setProfiles = useCallback((ids: readonly string[], on: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const onCopyPublicKey = useCallback(
    (target: KeyActionTarget) => {
      copyLeaf({
        requestKey,
        profileId: target.record.profileId,
        keyKind: 'public',
        expectedPath: target.record.path,
      }).then((outcome) => setNotice(noticeFor(outcome, copy.publicKeyCopied)));
    },
    [requestKey],
  );

  const onRequestPrivateKey = useCallback((target: KeyActionTarget, opener: HTMLElement) => {
    setDialog({ target, opener, revealed: null, notice: null });
  }, []);

  const onConfirmPrivateKey = useCallback(async () => {
    if (!dialog) return;
    const outcome = await copyLeaf({
      requestKey,
      profileId: dialog.target.record.profileId,
      keyKind: 'private',
      expectedPath: dialog.target.record.path,
    });
    const notice = noticeFor(outcome, copy.privateKeyCopied);
    // The dialog stays open so the key stays readable when the clipboard is unavailable or scrubbed.
    setDialog((current) =>
      current
        ? { ...current, revealed: outcome.ok ? outcome.text : current.revealed, notice }
        : current,
    );
    setNotice(notice);
  }, [dialog, requestKey]);

  const sourceError: SourceError | null = derivation.error
    ? {
        code: derivation.error.code,
        message: errorMessage(derivation.error.code, derivation.error.details),
      }
    : null;

  const profileFailures = derivation.result?.errors ?? [];

  return (
    <>
      <div className="page" data-testid="page" inert={dialog !== null}>
        <nav className="nav page-nav">
          <div className="nav-brand">
            <Hexagon size={18} aria-hidden="true" />
            {copy.brand}
          </div>
          <span className="tag tag-accent tag-icon">
            <ShieldCheck size={14} aria-hidden="true" />
            {copy.localBadge}
          </span>
        </nav>

        <header className="hero">
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1>{copy.heading}</h1>
          <p>{copy.intro}</p>
        </header>

        <main className="layout">
          <div className="layout-inputs">
            <SourcePanel
              mnemonic={inputs.mnemonic}
              onMnemonicChange={(value) => update('mnemonic', value)}
              language={inputs.language}
              onLanguageChange={(value) => update('language', value)}
              wordCount={inputs.wordCount}
              onWordCountChange={(value) => update('wordCount', value)}
              passphrase={inputs.passphrase}
              onPassphraseChange={(value) => update('passphrase', value)}
              account={inputs.account}
              onAccountChange={(value) => update('account', value)}
              index={inputs.index}
              onIndexChange={(value) => update('index', value)}
              error={sourceError}
              onGenerate={onGenerate}
              onClear={onClear}
            />
            <NetworkList
              chains={registry.chains()}
              selected={selected}
              onToggleProfile={toggleProfile}
              onSetProfiles={setProfiles}
              onSelectAll={() => setSelected(new Set(ENABLED_PROFILE_IDS))}
              onClearAll={() => setSelected(new Set())}
            />
          </div>
          <ResultsPanel
            status={derivation.status}
            result={derivation.result}
            notice={notice}
            onCopyPublicKey={onCopyPublicKey}
            onRequestPrivateKey={onRequestPrivateKey}
          />
        </main>

        <ul
          className="fine"
          style={{ margin: 0, padding: '0 var(--space-6)', listStyle: 'none' }}
          aria-live="polite"
        >
          {profileFailures.map((failure) => (
            <li key={failure.profileId}>
              {`${profileLabel(failure.profileId)}: ${errorMessage(failure.code, failure.details)}`}
            </li>
          ))}
        </ul>

        <footer className="page-footer">
          {copy.footer.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </footer>
      </div>

      {dialog ? (
        <PrivateKeyDialog
          target={dialog.target}
          opener={dialog.opener}
          revealed={dialog.revealed}
          notice={dialog.notice}
          onCancel={() => setDialog(null)}
          onConfirm={onConfirmPrivateKey}
        />
      ) : null}
    </>
  );
}
