import { Database } from "bun:sqlite";
import type { PlaceInput, StoredPlace } from "./place.ts";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS place (
  id TEXT PRIMARY KEY,
  origin TEXT NOT NULL,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  category TEXT NOT NULL,
  payment_methods TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (origin, external_id)
);
`;

type PlaceRow = {
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

function mapRow(row: PlaceRow): StoredPlace {
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
 * SQLite place store. A repeated origin and external id returns the first row.
 */
export class PlaceStore {
  readonly #db: Database;

  /**
   * @param filename - SQLite file, or `:memory:`.
   */
  constructor(filename: string) {
    this.#db = new Database(filename);
    this.#db.exec(SCHEMA);
  }

  /**
   * Insert when the pair is new. An existing pair is returned unchanged.
   *
   * @param input - Validated place.
   * @returns Whether this call inserted the row.
   */
  insertIfNew(input: PlaceInput): { created: boolean; place: StoredPlace } {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const result = this.#db
      .query(
        `INSERT INTO place (
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
      return {
        created: true,
        place: { ...input, id, createdAt },
      };
    }
    const existing = this.#db
      .query(
        `SELECT id, origin, external_id, name, lat, lon, category, payment_methods, created_at
         FROM place WHERE origin = ? AND external_id = ?`,
      )
      .get(input.origin, input.externalId) as PlaceRow | null;
    if (existing === null) {
      throw new Error("place insert conflict missing row");
    }
    return { created: false, place: mapRow(existing) };
  }

  /**
   * Newest places first.
   *
   * @param limit - Maximum rows, already bounded by the route.
   */
  list(limit: number): StoredPlace[] {
    const rows = this.#db
      .query(
        `SELECT id, origin, external_id, name, lat, lon, category, payment_methods, created_at
         FROM place
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
      )
      .all(limit) as PlaceRow[];
    return rows.map((row) => mapRow(row));
  }

  /** Close the database. */
  close(): void {
    this.#db.close();
  }
}
