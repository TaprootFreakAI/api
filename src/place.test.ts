import { describe, expect, test } from "bun:test";
import { normalizePlace } from "./place.ts";

const valid = {
  origin: "dfx",
  externalId: "store-1",
  name: "SPAR",
  lat: 47.37,
  lon: 8.54,
  category: "groceries",
  paymentMethods: "lightning",
};

describe("normalizePlace", () => {
  test("rejects a non-object", () => {
    expect(normalizePlace(null).ok).toBe(false);
    expect(normalizePlace([]).ok).toBe(false);
  });

  test("rejects coordinates outside the geographic range", () => {
    const result = normalizePlace({ ...valid, lat: 91 });
    expect(result).toEqual({ ok: false, error: "Place must be a latitude and longitude" });
  });

  test("rounds coordinates and drops an unknown payment list", () => {
    const result = normalizePlace({
      ...valid,
      lat: 47.1234567,
      lon: -0,
      paymentMethods: "cash",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.lat).toBe(47.123457);
      expect(result.value.lon).toBe(0);
      expect(result.value.paymentMethods).toBeNull();
    }
  });

  test("rejects a bad origin, name, and category", () => {
    expect(normalizePlace({ ...valid, origin: "DFX" }).ok).toBe(false);
    expect(normalizePlace({ ...valid, name: "" }).ok).toBe(false);
    expect(normalizePlace({ ...valid, category: "Cafe" }).ok).toBe(false);
  });
});
