/**
 * A place a caller submits once. Coordinates are geographic and rounded
 * to six decimal places. `paymentMethods` is optional and not an error
 * when it is absent or not a known list.
 */

export type PlaceInput = {
  origin: string;
  externalId: string;
  name: string;
  lat: number;
  lon: number;
  category: string;
  paymentMethods: string | null;
};

export type StoredPlace = PlaceInput & {
  id: string;
  createdAt: string;
};

const COORD_ERROR = "Place must be a latitude and longitude";
const ORIGIN_ERROR = "Place origin is invalid";
const EXTERNAL_ID_ERROR = "Place external id is required";
const NAME_ERROR = "Place name is required";
const CATEGORY_ERROR = "Place category is required";

const PAYMENT_METHODS = /^(onchain|lightning|nfc)(,(onchain|lightning|nfc))*$/;

function roundCoord(n: number): number {
  const rounded = Math.round(n * 1e6) / 1e6;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function hasNoControls(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) {
      return false;
    }
  }
  return true;
}

/**
 * Validate a JSON place body.
 *
 * @param input - Request JSON.
 * @returns The place, or a fixed error message.
 */
export function normalizePlace(
  input: unknown,
): { ok: true; value: PlaceInput } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: COORD_ERROR };
  }
  const rec = input as Record<string, unknown>;
  const lat = rec["lat"];
  const lon = rec["lon"];
  if (
    typeof lat !== "number" ||
    typeof lon !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return { ok: false, error: COORD_ERROR };
  }

  const rawOrigin = rec["origin"];
  if (typeof rawOrigin !== "string" || !/^[a-z][a-z0-9-]{0,31}$/.test(rawOrigin.trim())) {
    return { ok: false, error: ORIGIN_ERROR };
  }
  const origin = rawOrigin.trim();

  const rawExternalId = rec["externalId"];
  if (typeof rawExternalId !== "string") {
    return { ok: false, error: EXTERNAL_ID_ERROR };
  }
  const externalId = rawExternalId.trim();
  if (externalId.length < 1 || externalId.length > 80 || !hasNoControls(externalId)) {
    return { ok: false, error: EXTERNAL_ID_ERROR };
  }

  const rawName = rec["name"];
  if (typeof rawName !== "string") {
    return { ok: false, error: NAME_ERROR };
  }
  const name = rawName.trim();
  if (name.length < 1 || name.length > 80 || !hasNoControls(name)) {
    return { ok: false, error: NAME_ERROR };
  }

  const rawCategory = rec["category"];
  if (typeof rawCategory !== "string") {
    return { ok: false, error: CATEGORY_ERROR };
  }
  const category = rawCategory.trim();
  if (category.length < 1 || category.length > 40 || !/^[a-z0-9_-]+$/.test(category)) {
    return { ok: false, error: CATEGORY_ERROR };
  }

  let paymentMethods: string | null = null;
  const rawPayment = rec["paymentMethods"];
  if (typeof rawPayment === "string") {
    const trimmed = rawPayment.trim();
    if (PAYMENT_METHODS.test(trimmed)) {
      paymentMethods = trimmed;
    }
  }

  return {
    ok: true,
    value: {
      origin,
      externalId,
      name,
      lat: roundCoord(lat),
      lon: roundCoord(lon),
      category,
      paymentMethods,
    },
  };
}

/** Public map row. The caller's own id stays off this list. */
export type PublicPlace = {
  id: string;
  origin: string;
  name: string;
  lat: number;
  lon: number;
  category: string;
};

/**
 * Drop fields that are only for the ingest caller.
 *
 * @param place - Stored row.
 * @returns The public shape.
 */
export function toPublicPlace(place: StoredPlace): PublicPlace {
  return {
    id: place.id,
    origin: place.origin,
    name: place.name,
    lat: place.lat,
    lon: place.lon,
    category: place.category,
  };
}
