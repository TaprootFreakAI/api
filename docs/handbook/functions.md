# Functions

## Function: normalizeMapPlace

- **Purpose:** Validate a JSON body for one map pin. Coordinates must be finite and in range, then they are rounded to six decimals. An unknown payment list becomes null instead of an error.
- **Inputs:** Unknown JSON. Required fields are `origin`, `externalId`, `name`, `lat`, `lon`, and `category`.
- **Returns / side effects:** `{ ok: true, value }` or `{ ok: false, error }` with a fixed English message. No I/O.
- **Used by:** `mapRoutes` on `POST /map/places`.

## Function: toPublicMapPlace

- **Purpose:** Strip the caller id and payment methods before a pin is shown on the public map.
- **Inputs:** A stored map pin.
- **Returns / side effects:** `id`, `origin`, `name`, `lat`, `lon`, and `category`. No I/O.
- **Used by:** `mapRoutes` on `GET /map/places`.

## Function: MemoryMapPlaceStore

- **Purpose:** In-memory map store with the same create-once rule as SQLite. A repeat of origin plus external id returns the first row unchanged.
- **Inputs:** `insertIfNew` takes a validated pin. `list` takes a positive limit.
- **Returns / side effects:** `insertIfNew` reports whether it created the row. `list` is newest first, then id descending. `close` drops the rows.
- **Used by:** Unit tests. The process uses `SqliteMapPlaceStore`.

## Function: SqliteMapPlaceStore

- **Purpose:** SQLite driver for map pins. The schema is `MAP_PLACE_SCHEMA_SQL`. A conflicting insert does not overwrite the first row.
- **Inputs:** Constructor takes a SQLite filename or `:memory:`.
- **Returns / side effects:** Opens the file, applies the schema, and implements `MapPlaceStore`. `close` closes the handle.
- **Used by:** The process entrypoint. The HTTP end-to-end run exercises it.

## Function: mapSubmissionBody

- **Purpose:** Build the JSON body for the BTC Map user submission. `extra_fields.source` is the pin origin. `payment_methods` is included only when the pin has them.
- **Inputs:** A stored map pin.
- **Returns / side effects:** `{ lat, lon, category, name, extra_fields }`. No I/O.
- **Used by:** `pushMapPlace`.

## Function: pushMapPlace

- **Purpose:** POST one new pin to BTC Map. A missing or blank token skips the call. A network or HTTP failure returns `failed` and does not throw. The token is not logged.
- **Inputs:** Stored pin, environment (`BTCMAP_ACCESS_TOKEN`, optional `BTCMAP_SUBMIT_URL`), and fetch. The default URL is `https://api.btcmap.org/v4/place-submissions`.
- **Returns / side effects:** `sent`, `failed`, or `skipped`. Timeout is 5000 ms.
- **Used by:** `mapRoutes` after a new insert.

## Function: mapRoutes

- **Purpose:** `GET /map/places` is public. `POST /map/places` requires the ingest bearer and creates a pin at most once.
- **Inputs:** Store, optional ingest token, environment, and fetch.
- **Returns / side effects:** GET returns `{ places }`. POST returns 201 `{ created: true, id, btcmap }` or 200 `{ created: false, id, btcmap: "skipped" }`.
- **Used by:** `createApp`, mounted at `/map`.

## Function: healthRoutes

- **Purpose:** `GET /healthz` answers `{ ok: true }` when the process is up.
- **Inputs:** None.
- **Returns / side effects:** A Hono app with one public GET. No I/O.
- **Used by:** `createApp`, mounted at `/healthz`.

## Function: createApp

- **Purpose:** Build the HTTP application: health and the map routes.
- **Inputs:** Store, optional ingest token, environment, and fetch.
- **Returns / side effects:** A Hono app. It does not listen and does not open a second database.
- **Used by:** The process entrypoint and the tests.
