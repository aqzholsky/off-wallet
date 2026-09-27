import { CryptoError } from '../errors.ts';
import chineseSimplified from './chinese_simplified.json';
import chineseTraditional from './chinese_traditional.json';
import czech from './czech.json';
import english from './english.json';
import french from './french.json';
import italian from './italian.json';
import japanese from './japanese.json';
import korean from './korean.json';
import portuguese from './portuguese.json';
import spanish from './spanish.json';

export const LANGUAGES = [
  'english',
  'japanese',
  'korean',
  'spanish',
  'chinese_simplified',
  'chinese_traditional',
  'french',
  'italian',
  'czech',
  'portuguese',
] as const;

export type Language = (typeof LANGUAGES)[number];

const WORDLISTS: Record<Language, readonly string[]> = {
  english,
  japanese,
  korean,
  spanish,
  chinese_simplified: chineseSimplified,
  chinese_traditional: chineseTraditional,
  french,
  italian,
  czech,
  portuguese,
};

export function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value);
}

export function getWordlist(language: Language): readonly string[] {
  const words = WORDLISTS[language];
  if (!words) throw new CryptoError('LANGUAGE_UNKNOWN', { language });
  return words;
}

// BIP-39 joins Japanese mnemonics with the ideographic space; NFKD later folds it
// to U+0020 for the PBKDF2 input, so the separator only affects what is displayed.
export function wordSeparator(language: Language): ' ' | '　' {
  return language === 'japanese' ? '　' : ' ';
}
