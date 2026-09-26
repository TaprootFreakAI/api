import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { pushPlace, type FetchLike, type PushResult } from "./btcmap.ts";
import { normalizePlace, toPublicPlace } from "./place.ts";
import { PlaceStore } from "./store.ts";

export type AppDeps = {
  store: PlaceStore;
  /** Ingest bearer. Unset or blank means POST is not configured. */
  ingestToken?: string;
  env: Record<string, string | undefined>;
  fetchImpl: FetchLike;
};

function checkIngest(
  configured: string | undefined,
  authorization: string | undefined,
): "unconfigured" | "unauthorized" | "ok" {
  if (configured === undefined || configured.trim() === "") {
    return "unconfigured";
  }
  if (authorization === undefined || !authorization.startsWith("Bearer ")) {
    return "unauthorized";
  }
  const presented = authorization.slice("Bearer ".length).trim();
  const expected = configured.trim();
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return "unauthorized";
  }
  return "ok";
}

/**
 * HTTP API. `GET /places` is public. `POST /places` creates a place once.
 *
 * @param deps - Store, ingest token, and the environment used for the BTC Map call.
 * @returns The Hono app.
 */
export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  app.use(
    "/places",
    cors({
      origin: "*",
      allowMethods: ["GET", "OPTIONS"],
    }),
  );

  app.get("/healthz", (c) => c.json({ ok: true }));

  app.get("/places", (c) => {
    const limitQuery = c.req.query("limit");
    let limit = 1000;
    if (limitQuery !== undefined) {
      if (!/^\d+$/.test(limitQuery)) {
        return c.json({ error: "Invalid limit" }, 400);
      }
      const n = Number(limitQuery);
      if (n < 1 || n > 1000) {
        return c.json({ error: "Invalid limit" }, 400);
      }
      limit = n;
    }
    const places = deps.store.list(limit).map((place) => toPublicPlace(place));
    return c.json({ places });
  });

  app.post("/places", async (c) => {
    const auth = checkIngest(deps.ingestToken, c.req.header("authorization"));
    if (auth === "unconfigured") {
      return c.json({ error: "Place ingest is not configured" }, 503);
    }
    if (auth === "unauthorized") {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const raw: unknown = await c.req.json().catch(() => null);
    const parsed = normalizePlace(raw);
    if (!parsed.ok) {
      return c.json({ error: parsed.error }, 400);
    }
    const { created, place } = deps.store.insertIfNew(parsed.value);
    let btcmap: PushResult = "skipped";
    if (created) {
      btcmap = await pushPlace(place, deps.env, deps.fetchImpl);
    }
    return c.json({ created, id: place.id, btcmap }, created ? 201 : 200);
  });

  return app;
}
