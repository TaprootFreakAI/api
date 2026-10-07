import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteMapPlaceStore } from '../src/lib/map/sqlite';
import { MAP_PLACE_SCHEMA_SQL } from '../src/lib/map/store';

const dir = mkdtempSync(join(tmpdir(), 'sqlite-backfill-'));
const filename = join(dir, 'map.sqlite');
let seed: Database | undefined;
let store: SqliteMapPlaceStore | undefined;
try {
  seed = new Database(filename);
  const statements = MAP_PLACE_SCHEMA_SQL.split(';')
    .map((part) => part.trim())
    .filter((part) => part !== '');
  for (const sql of statements) {
    seed.exec(sql);
  }
  const insert = seed.query(
    `INSERT INTO map_place (
       id, origin, external_id, name, lat, lon, category, payment_methods, created_at, tech_provider, country, shop_name
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insert.run(
    'spar-null-row',
    'spar',
    'spar-null',
    'Pin',
    47.37,
    8.54,
    'groceries',
    null,
    '2026-01-01T00:00:00.000Z',
    'DFX.swiss',
    null,
    null,
  );
  insert.run(
    'dfx-null-row',
    'dfx',
    'dfx-null',
    'Pin',
    47.37,
    8.54,
    'groceries',
    null,
    '2026-01-02T00:00:00.000Z',
    'DFX.swiss',
    null,
    null,
  );
  insert.run(
    'spar-migros-row',
    'spar',
    'spar-migros',
    'Pin',
    47.37,
    8.54,
    'groceries',
    null,
    '2026-01-03T00:00:00.000Z',
    'DFX.swiss',
    null,
    'Migros',
  );
  seed.close();
  seed = undefined;
  store = new SqliteMapPlaceStore(filename);
  const listed = store.list(10);
  const sparNull = listed.find((row) => row.externalId === 'spar-null');
  const dfxNull = listed.find((row) => row.externalId === 'dfx-null');
  const sparMigros = listed.find((row) => row.externalId === 'spar-migros');
  if (
    sparNull !== undefined &&
    dfxNull !== undefined &&
    sparMigros !== undefined &&
    sparNull.shopName === 'SPAR' &&
    dfxNull.shopName === null &&
    sparMigros.shopName === 'Migros'
  ) {
    process.stdout.write('ok\n');
  } else {
    process.stdout.write(
      `${JSON.stringify({
        'spar-null': sparNull === undefined ? null : sparNull.shopName,
        'dfx-null': dfxNull === undefined ? null : dfxNull.shopName,
        'spar-migros': sparMigros === undefined ? null : sparMigros.shopName,
      })}\n`,
    );
    process.exitCode = 1;
  }
} catch (error) {
  process.stdout.write(
    `${JSON.stringify({ error: error instanceof Error ? error.message : error })}\n`,
  );
  process.exitCode = 1;
} finally {
  try {
    if (seed !== undefined) {
      seed.close();
    }
    if (store !== undefined) {
      store.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
