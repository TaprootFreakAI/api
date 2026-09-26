import { describe, expect, test } from "bun:test";
import { submissionBody } from "./btcmap.ts";
import { createApp } from "./server.ts";
import { PlaceStore } from "./store.ts";

const body = {
  origin: "dfx",
  externalId: "store-1",
  name: "SPAR",
  lat: 47.37,
  lon: 8.54,
  category: "groceries",
  paymentMethods: "lightning",
};

function app(opts: {
  token?: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: (input: string, init: RequestInit) => Promise<Response>;
}) {
  const store = new PlaceStore(":memory:");
  return createApp({
    store,
    ...(opts.token === undefined ? {} : { ingestToken: opts.token }),
    env: opts.env ?? {},
    fetchImpl: opts.fetchImpl ?? fetch,
  });
}

describe("places", () => {
  test("GET is public and empty", async () => {
    const res = await app({}).request("/places");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ places: [] });
  });

  test("POST without a token is 503", async () => {
    const res = await app({}).request("/places", {
      method: "POST",
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(503);
  });

  test("a new place is stored once and pushed once", async () => {
    const calls: string[] = [];
    const fetchImpl = async (input: string, init: RequestInit) => {
      calls.push(String(input));
      const raw = JSON.parse(String(init?.body));
      expect(raw).toEqual({
        lat: 47.37,
        lon: 8.54,
        category: "groceries",
        name: "SPAR",
        extra_fields: { source: "dfx", payment_methods: "lightning" },
      });
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer map-token");
      return new Response("{}", { status: 201 });
    };
    const api = app({
      token: "secret",
      env: { BTCMAP_ACCESS_TOKEN: "map-token" },
      fetchImpl,
    });
    const created = await api.request("/places", {
      method: "POST",
      headers: { Authorization: "Bearer secret", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as { created: boolean; btcmap: string; id: string };
    expect(createdBody.created).toBe(true);
    expect(createdBody.btcmap).toBe("sent");

    const again = await api.request("/places", {
      method: "POST",
      headers: { Authorization: "Bearer secret", "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, name: "Other", lat: 1 }),
    });
    expect(again.status).toBe(200);
    const againBody = (await again.json()) as { created: boolean; btcmap: string; id: string };
    expect(againBody).toEqual({ created: false, id: createdBody.id, btcmap: "skipped" });
    expect(calls).toHaveLength(1);

    const list = await api.request("/places");
    const json = (await list.json()) as { places: Array<Record<string, unknown>> };
    expect(json.places).toEqual([
      {
        id: createdBody.id,
        origin: "dfx",
        name: "SPAR",
        lat: 47.37,
        lon: 8.54,
        category: "groceries",
      },
    ]);
  });

  test("a missing map token still stores the place", async () => {
    const api = app({ token: "secret", env: {} });
    const res = await api.request("/places", {
      method: "POST",
      headers: { Authorization: "Bearer secret" },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(201);
    expect((await res.json()) as { btcmap: string }).toMatchObject({ btcmap: "skipped" });
  });

  test("a wrong bearer is 401 and a bad body is 400", async () => {
    const api = app({ token: "secret" });
    const denied = await api.request("/places", {
      method: "POST",
      headers: { Authorization: "Bearer wrong" },
      body: JSON.stringify(body),
    });
    expect(denied.status).toBe(401);
    const bad = await api.request("/places", {
      method: "POST",
      headers: { Authorization: "Bearer secret" },
      body: JSON.stringify({ ...body, lat: "nope" }),
    });
    expect(bad.status).toBe(400);
  });

  test("submission body omits payment methods when they are absent", () => {
    const store = new PlaceStore(":memory:");
    const { place } = store.insertIfNew({ ...body, paymentMethods: null });
    expect(submissionBody(place).extra_fields).toEqual({ source: "dfx" });
    store.close();
  });
});
