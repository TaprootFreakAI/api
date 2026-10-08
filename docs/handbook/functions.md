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

- **Purpose:** Validate the optional `country`, `shopName`, `blockchain`, and `asset` query strings for the public map. Omitted parameters stay off the filter. `country` is trimmed and uppercased. `shopName` is trimmed and must be `SPAR` or `others`. `blockchain` and `asset` are trimmed and not casefolded. A filter blockchain may be a stored payment-network name or a payment-link network such as BinancePay or KucoinPay. A filter asset may be a ticker, a prefixed ticker, or a catalog name such as ckBTC, USDC.e, or USDbC. A support body still uses the stricter stored-pair rules.
- **Inputs:** Four optional raw query strings.
- **Returns / side effects:** `{ ok: true, value }` with the present filter fields, or `{ ok: false, error }` with `Place country is invalid`, `Place shop name is invalid`, or `Place support is invalid`. No I/O.
- **Used by:** `mapRoutes` on `GET /map/places` and `GET /map/filters`.

## Function: isCatalogBlockchain

- **Purpose:** Report whether a trimmed blockchain query is in the hardcoded payment-link catalog. Test networks, Plasma, and names that are not payment-link networks are excluded. BinancePay and KucoinPay are included.
- **Inputs:** A trimmed blockchain string.
- **Returns / side effects:** True or false. No I/O.
- **Used by:** `normalizeMapPlaceFilter` when a blockchain query is not a stored payment-network name.

## Function: isCatalogAsset

- **Purpose:** Report whether a trimmed asset query is in the hardcoded payment-link catalog. This includes names that are not plain tickers, such as ckBTC, USDC.e, and USDbC.
- **Inputs:** A trimmed asset string.
- **Returns / side effects:** True or false. No I/O.
- **Used by:** `normalizeMapPlaceFilter` when an asset query is not a ticker or a prefixed ticker.

## Function: matchesUnstatedPayment

- **Purpose:** Decide whether a pin with no stored support rows matches a blockchain or asset filter. Origin `21gifts` or tech provider `21.gifts` matches Lightning and BTC only. Every other pin matches a catalog network, a catalog asset, or a catalog pair. An omitted filter matches.
- **Inputs:** Stored origin, stored tech provider, and the optional blockchain and asset from the query.
- **Returns / side effects:** True when the pin stays in the list. No I/O.
- **Used by:** `MemoryMapPlaceStore.list`. The SQLite driver uses `unstatedPaymentSql` for the same rule.

## Function: unstatedPaymentSql

- **Purpose:** Build the SQLite predicate for a blockchain or asset filter. Stored support rows still match. A pin with no support rows matches only when the hardcoded catalog offers that network or asset for its origin and tech provider. A request outside the catalog returns null so only stored rows match.
- **Inputs:** Optional blockchain and asset query values.
- **Returns / side effects:** A parenthesised SQL fragment and its bound parameters, or null. No I/O.
- **Used by:** `SqliteMapPlaceStore.list`.

## Function: publicFilterResponse

- **Purpose:** Merge distinct stored filter values with the hardcoded payment-link catalog for `GET /map/filters`. `?blockchain=` limits the top-level asset list. `techProviders` always contains the full `DFX.swiss` offer and the `21.gifts` offer of Lightning and BTC.
- **Inputs:** Stored countries, blockchains, and assets, plus an optional blockchain query.
- **Returns / side effects:** `{ shopNames, countries, blockchains, assets, techProviders }`. No I/O.
- **Used by:** `mapRoutes` on `GET /map/filters`.

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
- **Returns / side effects:** `insertIfNew` reports whether it created the row. `upsert` inserts or updates country and shop name from the body (`null` when omitted) and replaces supports only when that field is sent. `deleteByKey` is true only when a row was removed. `list` is newest first, then id descending. Predicates are AND and apply before sort and limit. `shopName` `SPAR` matches that stored brand; `others` matches every other pin, including a missing brand. A pin with support rows matches a blockchain or asset only on those rows, and a pair must be the same row. A pin with no support rows matches the hardcoded payment-link catalog. `filters` returns distinct stored countries, blockchains, and assets; shop names are not read. `close` drops the rows.
- **Used by:** Unit tests. The process uses `SqliteMapPlaceStore`.

## Function: SqliteMapPlaceStore

- **Purpose:** SQLite driver for map pins. The schema is `MAP_PLACE_SCHEMA_SQL`. Opening an older file adds `tech_provider`, `country`, and `shop_name` when those columns are missing, creates `map_place_support` and its indexes if missing, and backfills `shop_name` to SPAR for origin `spar` when that column is null. A conflicting insert does not overwrite the first row.
- **Inputs:** Constructor takes a SQLite filename or `:memory:`. `upsert` and `deleteByKey` use the same origin and external id pair as insert. `list` takes a positive limit and an optional filter object. Predicates are AND and apply before sort and limit. A pin with no support rows uses the same hardcoded payment-link catalog as the memory store. SQLite binds every value. `filters` takes an optional blockchain.
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

- **Purpose:** `GET /map/places` is public and may take `origin`, `country`, `shopName`, `blockchain`, and `asset` to restrict the list. `GET /map/filters` is public and returns the shop name tokens, distinct countries, the payment-link catalog merged with stored blockchains and assets, and `techProviders`. `POST /map/places` requires the ingest bearer and creates a pin at most once. `PUT /map/places` upserts a pin. `DELETE /map/places` removes a pin by origin and external id.
- **Inputs:** Store, optional ingest token, environment, and fetch.
- **Returns / side effects:** GET `/places` returns `{ places }`. GET `/filters` returns `{ shopNames, countries, blockchains, assets, techProviders }`. POST and PUT return 201 `{ created: true, id, btcmap }` or 200 `{ created: false, id, btcmap: "skipped" }`. DELETE returns 200 `{ deleted: true }` or `{ deleted: false }`.
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
