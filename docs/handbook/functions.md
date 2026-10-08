# Functions

## Function: normalizePlaceOrigin

- **Purpose:** Trim a pin origin and accept only `^[a-z0-9][a-z0-9-]{0,31}$`. A leading digit is valid. Uppercase tokens such as SPAR are invalid.
- **Inputs:** Unknown value, typically a JSON field or the `origin` query string.
- **Returns / side effects:** `{ ok: true, value }` with the trimmed origin, or `{ ok: false, error: "Place origin is invalid" }`. No I/O.
- **Used by:** `normalizeMapPlace`, `normalizeMapPlaceKey`, and `mapRoutes` on `GET /map/places`.

## Function: normalizeMapPlace

- **Purpose:** Validate a JSON body for one map pin. Coordinates must be finite and in range, then they are rounded to six decimals. An unknown payment list becomes null instead of an error. An omitted tech provider is left unset so the store can default it. Optional `country` is the DFX country symbol (ISO 3166-1 alpha-2), trimmed and uppercased, or omitted. Optional `shopName` is a brand of 1 to 40 characters, not casefolded. Optional `supports` is a list of DFX payment-network and asset-name pairs; omitted leaves the field unset so an upsert can keep the stored rows.
- **Inputs:** Unknown JSON. Required fields are `origin`, `externalId`, `name`, `lat`, `lon`, and `category`. `techProvider`, `country`, `shopName`, and `supports` are optional.
- **Returns / side effects:** `{ ok: true, value }` or `{ ok: false, error }` with a fixed English message. No I/O.
- **Used by:** `mapRoutes` on `POST /map/places` and `PUT /map/places`.

## Function: normalizeMapPlaceFilter

- **Purpose:** Validate the optional `country`, `shopName`, `blockchain`, and `asset` query strings for the public map. Omitted parameters stay off the filter. `country` is trimmed and uppercased. `shopName` is trimmed and must be `SPAR` or `others`. `blockchain` and `asset` are trimmed and not casefolded.
- **Inputs:** Four optional raw query strings.
- **Returns / side effects:** `{ ok: true, value }` with the present filter fields, or `{ ok: false, error }` with `Place country is invalid`, `Place shop name is invalid`, or `Place support is invalid`. No I/O.
- **Used by:** `mapRoutes` on `GET /map/places` and `GET /map/filters`.

## Function: normalizeMapPlaceKey

- **Purpose:** Validate origin and external id for deleting a map pin. Extra JSON fields are ignored. The body does not need coordinates or a name.
- **Inputs:** Unknown JSON. Required fields are `origin` and `externalId`, with the same rules as `normalizeMapPlace`.
- **Returns / side effects:** `{ ok: true, value: { origin, externalId } }` or `{ ok: false, error }` with the same English messages as create. No I/O.
- **Used by:** `mapRoutes` on `DELETE /map/places`.

## Function: toPublicMapPlace

- **Purpose:** Strip the caller id and payment methods before a pin is shown on the public map. The tech provider, country, shop name, and supports stay on the public row.
- **Inputs:** A stored map pin.
- **Returns / side effects:** `id`, `origin`, `name`, `lat`, `lon`, `category`, `techProvider`, `country`, `shopName`, and `supports`. No I/O.
- **Used by:** `mapRoutes` on `GET /map/places`.

## Function: MemoryMapPlaceStore

- **Purpose:** In-memory map store with the same insert-once, upsert, and delete rules as SQLite. A repeat of origin plus external id on insert returns the first row unchanged, including its tech provider, country, shop name, and supports.
- **Inputs:** `insertIfNew` and `upsert` take a validated pin. `deleteByKey` takes origin and external id. `list` takes a positive limit and an optional filter object (`origin`, `country`, `shopName`, `blockchain`, `asset`). `filters` takes an optional blockchain.
- **Returns / side effects:** `insertIfNew` reports whether it created the row. `upsert` inserts or updates country and shop name from the body (`null` when omitted) and replaces supports only when that field is sent. `deleteByKey` is true only when a row was removed. `list` is newest first, then id descending. Predicates are AND and apply before sort and limit. `shopName` `SPAR` matches that stored brand; `others` matches a non-null brand other than SPAR. Blockchain and asset must occur on the same support row. `filters` returns distinct stored countries, blockchains, and assets; shop names are not read. `close` drops the rows.
- **Used by:** Unit tests. The process uses `SqliteMapPlaceStore`.

## Function: SqliteMapPlaceStore

- **Purpose:** SQLite driver for map pins. The schema is `MAP_PLACE_SCHEMA_SQL`. Opening an older file adds `tech_provider`, `country`, and `shop_name` when those columns are missing, creates `map_place_support` and its indexes if missing, and backfills `shop_name` to SPAR for origin `spar` when that column is null. A conflicting insert does not overwrite the first row.
- **Inputs:** Constructor takes a SQLite filename or `:memory:`. `upsert` and `deleteByKey` use the same origin and external id pair as insert. `list` takes a positive limit and an optional filter object. Predicates are AND and apply before sort and limit. SQLite binds every value. `filters` takes an optional blockchain.
- **Returns / side effects:** Opens the file, enables foreign keys, applies the schema, and implements `MapPlaceStore`. Present filter fields are AND-ed before the sort and the limit. Deleting a pin deletes its support rows. `close` closes the handle.
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
- **Used by:** `mapRoutes` after a new insert from POST or PUT.

## Function: mapRoutes

- **Purpose:** `GET /map/places` is public and may take `origin`, `country`, `shopName`, `blockchain`, and `asset` to restrict the list. `GET /map/filters` is public and returns the shop name tokens plus distinct countries, blockchains, and assets. `POST /map/places` requires the ingest bearer and creates a pin at most once. `PUT /map/places` upserts a pin. `DELETE /map/places` removes a pin by origin and external id.
- **Inputs:** Store, optional ingest token, environment, and fetch.
- **Returns / side effects:** GET `/places` returns `{ places }`. GET `/filters` returns `{ shopNames, countries, blockchains, assets }`. POST and PUT return 201 `{ created: true, id, btcmap }` or 200 `{ created: false, id, btcmap: "skipped" }`. DELETE returns 200 `{ deleted: true }` or `{ deleted: false }`.
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
