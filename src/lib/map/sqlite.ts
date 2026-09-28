import { Database } from 'bun:sqlite';
import type { MapPlaceInput, StoredMapPlace } from '@/lib/map/place';
import { MAP_PLACE_SCHEMA_SQL, type MapPlaceStore } from '@/lib/map/store';

type MapPlaceRow = {
  id: string;
  origin: string;
  external_id: string;
  name: string;
  lat: number;
  lon: number;
  category: string;
  payment_methods: string | null;
  created_at: string;
};

function mapRow(row: MapPlaceRow): StoredMapPlace {
  return {
    id: row.id,
    origin: row.origin,
    externalId: row.external_id,
    name: row.name,
    lat: row.lat,
    lon: row.lon,
    category: row.category,
    paymentMethods: row.payment_methods,
    createdAt: row.created_at,
  };
}

/**
 * SQLite {@link MapPlaceStore}. Opened by the process entrypoint.
 * Unit tests use {@link MemoryMapPlaceStore}; this driver is exercised by
 * the HTTP end-to-end run.
 */
export class SqliteMapPlaceStore implements MapPlaceStore {
  readonly #db: Database;

  /**
   * @param filename - SQLite file, or `:memory:`.
   */
  constructor(filename: string) {
    this.#db = new Database(filename);
    this.#db.exec(MAP_PLACE_SCHEMA_SQL);
  }

  /**
   * Insert when the pair is new. An existing pair is returned unchanged.
   *
   * @param input - Validated pin.
   * @returns Whether this call inserted the row.
   */
  insertIfNew(input: MapPlaceInput): { created: boolean; place: StoredMapPlace } {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const result = this.#db
      .query(
        `INSERT INTO map_place (
           id, origin, external_id, name, lat, lon, category, payment_methods, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (origin, external_id) DO NOTHING`,
      )
      .run(
        id,
        input.origin,
        input.externalId,
        input.name,
        input.lat,
        input.lon,
        input.category,
        input.paymentMethods,
        createdAt,
      );
    if (result.changes === 1) {
      return { created: true, place: { ...input, id, createdAt } };
    }
    const existing = this.#db
      .query(
        `SELECT id, origin, external_id, name, lat, lon, category, payment_methods, created_at
         FROM map_place WHERE origin = ? AND external_id = ?`,
      )
      .get(input.origin, input.externalId) as MapPlaceRow | null;
    if (existing === null) {
      throw new Error('map place insert conflict missing row');
    }
    return { created: false, place: mapRow(existing) };
  }

  /**
   * Newest pins first.
   *
   * @param limit - Maximum rows.
   * @returns Stored pins.
   */
  list(limit: number): StoredMapPlace[] {
    const rows = this.#db
      .query(
        `SELECT id, origin, external_id, name, lat, lon, category, payment_methods, created_at
         FROM map_place
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
      )
      .all(limit) as MapPlaceRow[];
    return rows.map((row) => mapRow(row));
  }

  /** Close the database. */
  close(): void {
    this.#db.close();
  }
}
