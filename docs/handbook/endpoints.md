# Endpoints

## Endpoint: GET /healthz

- **Purpose:** Process health for the map API. Returns `{ ok: true }`.
- **Errors:** No error body. The process is up when this answers 200.
- **Used by:** The container health check and deploy checks.
- **Auth:** none.

## Endpoint: GET /map/places

- **Purpose:** Public map list, newest first. Each item is `id`, `origin`, `name`, `lat`, `lon`, and `category`. The caller id and payment methods are not included.
- **Errors:** 400 `{ error: "Invalid limit" }` when `limit` is not an integer from 1 to 1000. Omitted `limit` means 1000.
- **Used by:** The OpenCryptoPay map.
- **Auth:** none. Browser calls are allowed from any origin.

## Endpoint: POST /map/places

- **Purpose:** Create one map pin. The same `origin` and `externalId` returns the first row and does not call BTC Map again. A new row is posted once when `BTCMAP_ACCESS_TOKEN` is set.
- **Errors:** 503 `{ error: "Place ingest is not configured" }` when the ingest token is unset or blank. 401 `{ error: "Unauthorized" }` when the bearer does not match. 400 with the validator message for a bad body. A BTC Map failure still returns 201 with `btcmap: "failed"`.
- **Used by:** Trusted callers that add a shop the first time it appears.
- **Auth:** `Authorization: Bearer` must equal `OCP_PLACE_INGEST_TOKEN`. Status 201 when new, 200 when the pair already exists.
