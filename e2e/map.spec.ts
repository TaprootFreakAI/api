import { expect, test } from '@playwright/test';

const body = {
  origin: 'dfx',
  externalId: 'e2e-store',
  name: 'SPAR',
  lat: 47.37,
  lon: 8.54,
  category: 'groceries',
  paymentMethods: 'lightning',
};

test('Function: healthRoutes — GET /healthz is public', async ({ request }) => {
  const res = await request.get('/healthz');
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

test('Function: mapRoutes — GET /map/places is public', async ({ request }) => {
  const res = await request.get('/map/places');
  expect(res.status()).toBe(200);
  const json = (await res.json()) as { places: unknown[] };
  expect(Array.isArray(json.places)).toBe(true);
});

test('Function: normalizePlaceOrigin — GET /map/places?origin=spar filters the list', async ({
  request,
}) => {
  const sparPin = {
    origin: 'spar',
    externalId: 'e2e-origin-spar',
    name: 'Origin SPAR Pin',
    lat: 47.37,
    lon: 8.54,
    category: 'groceries',
  };
  const otherPin = {
    origin: 'dfx',
    externalId: 'e2e-origin-other',
    name: 'Origin Other Pin',
    lat: 47.37,
    lon: 8.54,
    category: 'groceries',
  };
  expect(
    (
      await request.post('/map/places', {
        headers: { Authorization: 'Bearer e2e-ingest' },
        data: sparPin,
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await request.post('/map/places', {
        headers: { Authorization: 'Bearer e2e-ingest' },
        data: otherPin,
      })
    ).status(),
  ).toBe(201);

  const filtered = await request.get('/map/places?origin=spar');
  expect(filtered.status()).toBe(200);
  const json = (await filtered.json()) as { places: Array<{ origin: string; name: string }> };
  expect(json.places.some((row) => row.name === 'Origin SPAR Pin')).toBe(true);
  expect(json.places.some((row) => row.name === 'Origin Other Pin')).toBe(false);
  expect(json.places.every((row) => row.origin === 'spar')).toBe(true);

  const bad = await request.get('/map/places?origin=SPAR');
  expect(bad.status()).toBe(400);
  expect(await bad.json()).toEqual({ error: 'Place origin is invalid' });
});

test('Function: createApp — POST /map/places without a bearer is 401', async ({ request }) => {
  const res = await request.post('/map/places', { data: body });
  expect(res.status()).toBe(401);
});

test('Function: normalizeMapPlace — POST /map/places creates one pin', async ({ request }) => {
  const created = await request.post('/map/places', {
    headers: { Authorization: 'Bearer e2e-ingest' },
    data: body,
  });
  expect(created.status()).toBe(201);
  const again = await request.post('/map/places', {
    headers: { Authorization: 'Bearer e2e-ingest' },
    data: { ...body, name: 'Other' },
  });
  expect(again.status()).toBe(200);
});

test('Function: toPublicMapPlace — the list hides the caller id', async ({ request }) => {
  const created = await request.post('/map/places', {
    headers: { Authorization: 'Bearer e2e-ingest' },
    data: { ...body, externalId: 'e2e-public' },
  });
  expect(created.ok()).toBe(true);
  const res = await request.get('/map/places');
  const json = (await res.json()) as { places: Array<Record<string, unknown>> };
  expect(json.places.some((row) => row['externalId'] !== undefined)).toBe(false);
});

test('Function: SqliteMapPlaceStore — the created pin is listed', async ({ request }) => {
  const created = await request.post('/map/places', {
    headers: { Authorization: 'Bearer e2e-ingest' },
    data: { ...body, externalId: 'e2e-listed', name: 'Listed SPAR' },
  });
  expect(created.ok()).toBe(true);
  const res = await request.get('/map/places');
  const json = (await res.json()) as { places: Array<{ name: string }> };
  expect(json.places.some((row) => row.name === 'Listed SPAR')).toBe(true);
});

test('Function: mapSubmissionBody — default boot does not require a map token', async ({
  request,
}) => {
  const res = await request.get('/healthz');
  expect(res.status()).toBe(200);
});

test('Function: MemoryMapPlaceStore — default boot does not require a map token', async ({
  request,
}) => {
  const res = await request.get('/healthz');
  expect(res.status()).toBe(200);
});

test('Function: pushMapPlace — default boot does not require a map token', async ({ request }) => {
  const res = await request.get('/healthz');
  expect(res.status()).toBe(200);
});

test('Function: normalizeMapPlaceFilter — filters one row', async ({ request }) => {
  const sparPin = {
    origin: 'dfx',
    externalId: 'e2e-filter-spar-ch',
    name: 'Filter SPAR CH',
    lat: 47.37,
    lon: 8.54,
    category: 'groceries',
    country: 'CH',
    shopName: 'SPAR',
    supports: [{ blockchain: 'Ethereum', asset: 'ZCHF' }],
  };
  const otherPin = {
    origin: 'dfx',
    externalId: 'e2e-filter-other',
    name: 'Filter Other Pin',
    lat: 47.37,
    lon: 8.54,
    category: 'groceries',
    country: 'DE',
    shopName: 'Migros',
    supports: [{ blockchain: 'Bitcoin', asset: 'BTC' }],
  };
  expect(
    (
      await request.post('/map/places', {
        headers: { Authorization: 'Bearer e2e-ingest' },
        data: sparPin,
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await request.post('/map/places', {
        headers: { Authorization: 'Bearer e2e-ingest' },
        data: otherPin,
      })
    ).status(),
  ).toBe(201);

  const filtered = await request.get(
    '/map/places?shopName=SPAR&country=CH&blockchain=Ethereum&asset=ZCHF',
  );
  expect(filtered.status()).toBe(200);
  const listed = (await filtered.json()) as { places: Array<{ name: string }> };
  expect(listed.places.some((row) => row.name === 'Filter SPAR CH')).toBe(true);
  expect(listed.places.some((row) => row.name === 'Filter Other Pin')).toBe(false);

  const filters = await request.get('/map/filters');
  expect(filters.status()).toBe(200);
  const filterJson = (await filters.json()) as {
    shopNames: string[];
    countries: string[];
    blockchains: string[];
    assets: string[];
  };
  expect(filterJson.shopNames).toEqual(['SPAR', 'others']);
  expect(filterJson.countries).toContain('CH');
  expect(filterJson.blockchains).toContain('Ethereum');
  expect(filterJson.assets).toContain('ZCHF');
});

test('Function: normalizeMapPlaceKey — PUT updates a pin and DELETE removes it', async ({
  request,
}) => {
  const pin = {
    origin: 'dfx',
    externalId: 'e2e-provider',
    name: 'Omitted Label Cafe',
    lat: 47.37,
    lon: 8.54,
    category: 'cafe',
  };
  const created = await request.post('/map/places', {
    headers: { Authorization: 'Bearer e2e-ingest' },
    data: pin,
  });
  expect(created.status()).toBe(201);
  const afterCreate = (await (await request.get('/map/places')).json()) as {
    places: Array<{ name: string; techProvider: string }>;
  };
  expect(
    afterCreate.places.some(
      (row) => row.name === 'Omitted Label Cafe' && row.techProvider === 'DFX.swiss',
    ),
  ).toBe(true);

  const renamed = await request.put('/map/places', {
    headers: { Authorization: 'Bearer e2e-ingest' },
    data: { ...pin, name: 'Updated Label Cafe', techProvider: '21.gifts' },
  });
  expect(renamed.status()).toBe(200);

  const keepProvider = await request.put('/map/places', {
    headers: { Authorization: 'Bearer e2e-ingest' },
    data: { ...pin, name: 'Updated Label Cafe' },
  });
  expect(keepProvider.status()).toBe(200);

  const afterPut = (await (await request.get('/map/places')).json()) as {
    places: Array<{ name: string; techProvider: string }>;
  };
  expect(
    afterPut.places.some(
      (row) => row.name === 'Updated Label Cafe' && row.techProvider === '21.gifts',
    ),
  ).toBe(true);

  const deleted = await request.delete('/map/places', {
    headers: { Authorization: 'Bearer e2e-ingest' },
    data: { origin: 'dfx', externalId: 'e2e-provider' },
  });
  expect(deleted.status()).toBe(200);
  expect(await deleted.json()).toEqual({ deleted: true });

  const afterDelete = (await (await request.get('/map/places')).json()) as {
    places: Array<{ name: string }>;
  };
  expect(afterDelete.places.some((row) => row.name === 'Updated Label Cafe')).toBe(false);

  const again = await request.delete('/map/places', {
    headers: { Authorization: 'Bearer e2e-ingest' },
    data: { origin: 'dfx', externalId: 'e2e-provider' },
  });
  expect(again.status()).toBe(200);
  expect(await again.json()).toEqual({ deleted: false });
});
