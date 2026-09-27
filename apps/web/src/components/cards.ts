import { type AddressGroup, type AddressProfile, registry } from '@off-wallet/crypto';
import { copy, evmCardTitle, pluralize } from '../i18n/en.ts';

export type ResultCard = {
  key: string;
  title: string;
  meta: string;
  tag: string;
  chainIds: string[];
  entries: AddressGroup[];
};

const TAGS: Readonly<Record<string, string>> = {
  bitcoin: 'BTC',
  tron: 'TRX',
  cosmos: 'ATOM',
  osmosis: 'OSMO',
  thorchain: 'RUNE',
  solana: 'SOL',
};

const isEvmGroup = (group: AddressGroup): boolean =>
  group.origins.every((o) => registry.get(o.profileId).formatFamily === 'evm');

function cardKey(group: AddressGroup): string {
  if (isEvmGroup(group)) return 'evm';
  return group.origins[0]?.chainId ?? 'unknown';
}

function metaFor(key: string, entries: AddressGroup[]): string {
  if (key === 'evm') return copy.evmCardMeta;
  const profiles = entries.reduce((n, g) => n + g.origins.length, 0);
  const first = entries[0]?.origins[0];
  const profile = first ? registry.get(first.profileId) : null;
  const parts = [`${profiles} ${pluralize(profiles, 'profile', 'profiles')}`];
  if (profile) parts.push(profile.curve);
  if (profile?.curve === 'ed25519') parts.push('hardened-only');
  return parts.join(' · ');
}

export function buildCards(groups: readonly AddressGroup[]): ResultCard[] {
  const byKey = new Map<string, ResultCard>();
  for (const group of groups) {
    const key = cardKey(group);
    const chainIds = [...new Set(group.origins.map((o) => o.chainId))];
    const existing = byKey.get(key);
    if (existing) {
      existing.entries.push(group);
      for (const id of chainIds) if (!existing.chainIds.includes(id)) existing.chainIds.push(id);
      continue;
    }
    const first = group.origins[0];
    const title =
      key === 'evm' ? evmCardTitle(first?.network ?? '', chainIds.length) : (first?.network ?? '');
    byKey.set(key, {
      key,
      title,
      meta: '',
      tag: key === 'evm' ? 'EVM' : (TAGS[key] ?? key.toUpperCase()),
      chainIds,
      entries: [group],
    });
  }
  const cards = [...byKey.values()];
  for (const card of cards) card.meta = metaFor(card.key, card.entries);
  return cards;
}

export function entryNotes(profile: AddressProfile): string[] {
  const notes: string[] = [];
  if (!profile.supportsIndex) notes.push(copy.indexIgnored);
  const specific = copy.profileNotes[profile.id];
  if (specific) notes.push(specific);
  return notes;
}
