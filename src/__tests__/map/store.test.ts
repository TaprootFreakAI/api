import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAP_PLACE_SCHEMA_SQL, MemoryMapPlaceStore } from '@/lib/map/store';
import type { MapPlaceInput } from '@/lib/map/place';

const input: MapPlaceInput = {
  origin: 'dfx',
  externalId: 'store-1',
  name: 'SPAR',
  lat: 47.37,
  lon: 8.54,
  category: 'groceries',
  paymentMethods: 'lightning',
};

describe('MAP_PLACE_SCHEMA_SQL', () => {
  it('matches docs/schema/map-place.sql', () => {
    const docs = readFileSync(join(process.cwd(), 'docs/schema/map-place.sql'), 'utf8');
    const create = docs
      .split('\n')
      .filter((line) => !line.startsWith('--') && line.trim() !== '')
      .join('\n')
      .trim()
      .replace(/;\s*$/, '');
    expect(MAP_PLACE_SCHEMA_SQL.trim()).toBe(create);
  });
});

describe('MemoryMapPlaceStore', () => {
  it('inserts once and lists newest first without changing the first row', () => {
    const store = new MemoryMapPlaceStore();
    const first = store.insertIfNew(input);
    expect(first.created).toBe(true);
    const second = store.insertIfNew({ ...input, name: 'Other', lat: 1 });
    expect(second.created).toBe(false);
    expect(second.place.name).toBe('SPAR');
    expect(second.place.id).toBe(first.place.id);
    const later = store.insertIfNew({ ...input, externalId: 'store-2' });
    const listed = store.list(10);
    expect(listed.map((row) => row.externalId)).toEqual(['store-2', 'store-1']);
    expect(store.list(1)).toHaveLength(1);
    store.close();
    expect(store.list(10)).toHaveLength(0);
    expect(later.created).toBe(true);
  });

  it('orders a later timestamp first and breaks a tie by id', () => {
    let tick = 0;
    const rising = new MemoryMapPlaceStore(() => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)));
    rising.insertIfNew({ ...input, externalId: 'older' });
    rising.insertIfNew({ ...input, externalId: 'newer' });
    expect(rising.list(10).map((row) => row.externalId)).toEqual(['newer', 'older']);

    const fixed = new MemoryMapPlaceStore(() => new Date('2026-09-26T00:00:00.000Z'));
    const a = fixed.insertIfNew({ ...input, externalId: 'a' });
    const b = fixed.insertIfNew({ ...input, externalId: 'b' });
    const expected = [a.place.id, b.place.id].sort((left, right) => right.localeCompare(left));
    expect(fixed.list(10).map((row) => row.id)).toEqual(expected);
  });
});
