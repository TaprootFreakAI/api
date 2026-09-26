import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp } from "./server.ts";
import { PlaceStore } from "./store.ts";

const filename = process.env["PLACE_DB"]?.trim() || "data/places.sqlite";
if (filename !== ":memory:") {
  mkdirSync(dirname(filename), { recursive: true });
}
const store = new PlaceStore(filename);
const port = Number(process.env["PORT"] ?? "8080");

const app = createApp({
  store,
  ...(process.env["OCP_PLACE_INGEST_TOKEN"] === undefined
    ? {}
    : { ingestToken: process.env["OCP_PLACE_INGEST_TOKEN"] }),
  env: process.env,
  fetchImpl: (input, init) => globalThis.fetch(input, init),
});

export default {
  port: Number.isInteger(port) && port > 0 ? port : 8080,
  fetch: app.fetch,
};
