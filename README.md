# OpenCryptoPay API

Public list of places that accept OpenCryptoPay, and a create-only ingest for trusted callers.

`GET /places` needs no login. `POST /places` needs `Authorization: Bearer <OCP_PLACE_INGEST_TOKEN>`. The same `origin` and `externalId` returns the first row and does not submit the place again.

When `BTCMAP_ACCESS_TOKEN` is set, a new place is posted once to `https://api.btcmap.org/v4/place-submissions`. A missing token stores the place and skips that call.

## Run

Requires [Bun](https://bun.sh).

```sh
export OCP_PLACE_INGEST_TOKEN=replace-me
bun install
bun run start
```

The database file is `data/places.sqlite` unless `PLACE_DB` is set. `PORT` defaults to `8080`.

## Place body

`origin`, `externalId`, `name`, `lat`, `lon`, and `category` are required. `paymentMethods` is optional: a comma-separated list of `onchain`, `lightning`, and `nfc`.

`GET /places` returns `id`, `origin`, `name`, `lat`, `lon`, and `category`.
