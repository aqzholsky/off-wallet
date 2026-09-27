import type { AddressRecord } from './derive.ts';

export interface AddressGroup {
  readonly address: string;
  readonly addressSpace: string;
  readonly format: string;
  readonly origins: AddressRecord[];
}

export function groupByAddressSpace(records: readonly AddressRecord[]): AddressGroup[] {
  const groups = new Map<string, AddressGroup>();
  for (const record of records) {
    const existing = groups.get(record.addressSpace);
    if (existing) {
      existing.origins.push(record);
      continue;
    }
    groups.set(record.addressSpace, {
      address: record.address,
      addressSpace: record.addressSpace,
      format: record.format,
      origins: [record],
    });
  }
  return [...groups.values()];
}
