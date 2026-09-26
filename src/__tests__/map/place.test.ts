import { describe, expect, it } from 'vitest';
import { normalizeMapPlace, toPublicMapPlace } from '@/lib/map/place';
import type { StoredMapPlace } from '@/lib/map/place';

const valid = {
  origin: 'dfx',
  externalId: 'store-1',
  name: 'SPAR',
  lat: 47.37,
  lon: 8.54,
  category: 'groceries',
  paymentMethods: 'lightning',
};

describe('normalizeMapPlace', () => {
  it('rejects a non-object and an array', () => {
    expect(normalizeMapPlace(null)).toEqual({
      ok: false,
      error: 'Place must be a latitude and longitude',
    });
    expect(normalizeMapPlace([])).toEqual({
      ok: false,
      error: 'Place must be a latitude and longitude',
    });
    expect(normalizeMapPlace('x')).toEqual({
      ok: false,
      error: 'Place must be a latitude and longitude',
    });
  });

  it('rejects coordinates that are not finite numbers in range', () => {
    expect(normalizeMapPlace({ ...valid, lat: '47' }).ok).toBe(false);
    expect(normalizeMapPlace({ ...valid, lon: Number.NaN }).ok).toBe(false);
    expect(normalizeMapPlace({ ...valid, lat: 91 }).ok).toBe(false);
    expect(normalizeMapPlace({ ...valid, lon: -181 }).ok).toBe(false);
  });

  it('rounds coordinates, trims the origin, and drops an unknown payment list', () => {
    const result = normalizeMapPlace({
      ...valid,
      origin: ' dfx ',
      lat: 47.1234567,
      lon: -0,
      paymentMethods: 'cash',
    });
    expect(result).toEqual({
      ok: true,
      value: {
        ...valid,
        lat: 47.123457,
        lon: 0,
        paymentMethods: null,
      },
    });
  });

  it('keeps a known payment list and ignores a non-string', () => {
    const kept = normalizeMapPlace({ ...valid, paymentMethods: ' onchain,lightning ' });
    expect(kept.ok && kept.value.paymentMethods).toBe('onchain,lightning');
    const ignored = normalizeMapPlace({ ...valid, paymentMethods: 1 });
    expect(ignored.ok && ignored.value.paymentMethods).toBeNull();
    const blank = normalizeMapPlace({ ...valid, paymentMethods: '  ' });
    expect(blank.ok && blank.value.paymentMethods).toBeNull();
  });

  it('rejects a bad origin, external id, name, and category', () => {
    expect(normalizeMapPlace({ ...valid, origin: 1 }).ok).toBe(false);
    expect(normalizeMapPlace({ ...valid, origin: 'DFX' }).ok).toBe(false);
    expect(normalizeMapPlace({ ...valid, externalId: 1 }).ok).toBe(false);
    expect(normalizeMapPlace({ ...valid, externalId: '' }).ok).toBe(false);
    expect(normalizeMapPlace({ ...valid, externalId: 'a'.repeat(81) }).ok).toBe(false);
    expect(normalizeMapPlace({ ...valid, externalId: 'bad\nid' }).ok).toBe(false);
    expect(normalizeMapPlace({ ...valid, name: 1 }).ok).toBe(false);
    expect(normalizeMapPlace({ ...valid, name: ' ' }).ok).toBe(false);
    expect(normalizeMapPlace({ ...valid, name: 'bad\u007fname' }).ok).toBe(false);
    expect(normalizeMapPlace({ ...valid, category: 1 }).ok).toBe(false);
    expect(normalizeMapPlace({ ...valid, category: 'Cafe' }).ok).toBe(false);
    expect(normalizeMapPlace({ ...valid, category: '' }).ok).toBe(false);
  });
});

describe('toPublicMapPlace', () => {
  it('omits the caller id and payment methods', () => {
    const stored: StoredMapPlace = {
      ...valid,
      id: 'id-1',
      createdAt: '2026-09-26T00:00:00.000Z',
    };
    expect(toPublicMapPlace(stored)).toEqual({
      id: 'id-1',
      origin: 'dfx',
      name: 'SPAR',
      lat: 47.37,
      lon: 8.54,
      category: 'groceries',
    });
  });
});
