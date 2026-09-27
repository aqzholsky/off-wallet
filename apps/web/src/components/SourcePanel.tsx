import { type CryptoErrorCode, isLanguage, LANGUAGES, type Language } from '@off-wallet/crypto';
import { Broom, CaretDown, Sparkle, Warning } from '@phosphor-icons/react';
import { useId } from 'react';
import { copy, languageLabels } from '../i18n/en.ts';

export type SourceError = { code: CryptoErrorCode; message: string };

export type SourcePanelProps = {
  mnemonic: string;
  onMnemonicChange(value: string): void;
  language: Language;
  onLanguageChange(value: Language): void;
  wordCount: 12 | 24;
  onWordCountChange(value: 12 | 24): void;
  passphrase: string;
  onPassphraseChange(value: string): void;
  account: string;
  onAccountChange(value: string): void;
  index: string;
  onIndexChange(value: string): void;
  error: SourceError | null;
  onGenerate(): void;
  onClear(): void;
};

const noAutofill = {
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'none',
  spellCheck: false,
} as const;

function FieldError({ id, message, testId }: { id: string; message: string; testId?: string }) {
  return (
    <p id={id} className="field-error" role="alert" data-testid={testId}>
      <Warning size={14} weight="bold" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export function SourcePanel(props: SourcePanelProps) {
  const ids = {
    mnemonic: useId(),
    language: useId(),
    passphrase: useId(),
    account: useId(),
    index: useId(),
    lengthGroup: useId(),
    error: useId(),
  };
  const indexError = props.error?.code === 'PATH_INDEX_RANGE' ? props.error : null;
  const mnemonicError = props.error && !indexError ? props.error : null;

  return (
    <section className="panel" aria-labelledby={`${ids.mnemonic}-section`}>
      <div className="section-head">
        <span className="section-num">01</span>
        <h2 id={`${ids.mnemonic}-section`}>{copy.sectionSource}</h2>
      </div>

      <div className="field">
        <label htmlFor={ids.mnemonic}>{copy.mnemonicLabel}</label>
        <textarea
          data-testid="mnemonic-input"
          id={ids.mnemonic}
          className="input mono mnemonic"
          rows={3}
          placeholder={copy.mnemonicPlaceholder}
          value={props.mnemonic}
          onChange={(event) => props.onMnemonicChange(event.target.value)}
          aria-invalid={mnemonicError !== null}
          aria-describedby={mnemonicError ? ids.error : undefined}
          {...noAutofill}
        />
        {mnemonicError ? (
          <FieldError id={ids.error} message={mnemonicError.message} testId="mnemonic-error" />
        ) : null}
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor={ids.language}>{copy.languageLabel}</label>
          <div className="select-wrap">
            <select
              id={ids.language}
              className="input"
              value={props.language}
              onChange={(event) => {
                const value = event.target.value;
                if (isLanguage(value)) props.onLanguageChange(value);
              }}
              {...noAutofill}
            >
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {languageLabels[language]}
                </option>
              ))}
            </select>
            <CaretDown size={14} aria-hidden="true" />
          </div>
        </div>

        <fieldset className="field" aria-labelledby={ids.lengthGroup}>
          <legend id={ids.lengthGroup}>{copy.lengthLabel}</legend>
          <div className="seg seg-full">
            <label className="seg-opt">
              <input
                type="radio"
                name={ids.lengthGroup}
                checked={props.wordCount === 12}
                onChange={() => props.onWordCountChange(12)}
              />
              {copy.words12}
            </label>
            <label className="seg-opt">
              <input
                type="radio"
                name={ids.lengthGroup}
                checked={props.wordCount === 24}
                onChange={() => props.onWordCountChange(24)}
              />
              {copy.words24}
            </label>
          </div>
        </fieldset>
      </div>

      <div className="field">
        <label htmlFor={ids.passphrase}>{copy.passphraseLabel}</label>
        <input
          id={ids.passphrase}
          className="input"
          type="password"
          placeholder={copy.passphrasePlaceholder}
          value={props.passphrase}
          onChange={(event) => props.onPassphraseChange(event.target.value)}
          {...noAutofill}
        />
        <p className="hint">{copy.passphraseHint}</p>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor={ids.account}>{copy.accountLabel}</label>
          <input
            data-testid="account-input"
            id={ids.account}
            className="input mono"
            type="number"
            inputMode="numeric"
            min={0}
            max={2147483647}
            step={1}
            value={props.account}
            onChange={(event) => props.onAccountChange(event.target.value)}
            aria-invalid={indexError !== null}
            aria-describedby={indexError ? ids.error : undefined}
            {...noAutofill}
          />
        </div>
        <div className="field">
          <label htmlFor={ids.index}>{copy.indexLabel}</label>
          <input
            data-testid="index-input"
            id={ids.index}
            className="input mono"
            type="number"
            inputMode="numeric"
            min={0}
            max={2147483647}
            step={1}
            value={props.index}
            onChange={(event) => props.onIndexChange(event.target.value)}
            aria-invalid={indexError !== null}
            aria-describedby={indexError ? ids.error : undefined}
            {...noAutofill}
          />
        </div>
      </div>
      {indexError ? <FieldError id={ids.error} message={indexError.message} /> : null}

      <div className="actions">
        <button type="button" className="btn btn-primary btn-tall" onClick={props.onGenerate}>
          <Sparkle size={16} aria-hidden="true" />
          {copy.generate}
        </button>
        <button type="button" className="btn btn-secondary btn-tall" onClick={props.onClear}>
          <Broom size={16} aria-hidden="true" />
          {copy.clear}
        </button>
      </div>
    </section>
  );
}
