/**
 * One pin on the OpenCryptoPay map. A caller submits it once.
 * Coordinates are rounded to six decimal places.
 */

export type MapPlaceInput = {
  origin: string;
  externalId: string;
  name: string;
  lat: number;
  lon: number;
  category: string;
  paymentMethods: string | null;
};

export type StoredMapPlace = MapPlaceInput & {
  id: string;
  createdAt: string;
};

/** Fields the public map may show. The caller's own id stays off this list. */
export type PublicMapPlace = {
  id: string;
  origin: string;
  name: string;
  lat: number;
  lon: number;
  category: string;
};

const COORD_ERROR = 'Place must be a latitude and longitude';
const ORIGIN_ERROR = 'Place origin is invalid';
const EXTERNAL_ID_ERROR = 'Place external id is required';
const NAME_ERROR = 'Place name is required';
const CATEGORY_ERROR = 'Place category is required';

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
 * Validate a JSON body for one map pin.
 *
 * @param input - Request JSON.
 * @returns The pin, or a fixed error message.
 */
export function normalizeMapPlace(
  input: unknown,
): { ok: true; value: MapPlaceInput } | { ok: false; error: string } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, error: COORD_ERROR };
  }
  const rec = input as Record<string, unknown>;
  const lat = rec['lat'];
  const lon = rec['lon'];
  if (
    typeof lat !== 'number' ||
    typeof lon !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return { ok: false, error: COORD_ERROR };
  }

  const rawOrigin = rec['origin'];
  if (typeof rawOrigin !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(rawOrigin.trim())) {
    return { ok: false, error: ORIGIN_ERROR };
  }

  const rawExternalId = rec['externalId'];
  if (typeof rawExternalId !== 'string') {
    return { ok: false, error: EXTERNAL_ID_ERROR };
  }
  const externalId = rawExternalId.trim();
  if (externalId.length < 1 || externalId.length > 80 || !hasNoControls(externalId)) {
    return { ok: false, error: EXTERNAL_ID_ERROR };
  }

  const rawName = rec['name'];
  if (typeof rawName !== 'string') {
    return { ok: false, error: NAME_ERROR };
  }
  const name = rawName.trim();
  if (name.length < 1 || name.length > 80 || !hasNoControls(name)) {
    return { ok: false, error: NAME_ERROR };
  }

  const rawCategory = rec['category'];
  if (typeof rawCategory !== 'string') {
    return { ok: false, error: CATEGORY_ERROR };
  }
  const category = rawCategory.trim();
  if (category.length < 1 || category.length > 40 || !/^[a-z0-9_-]+$/.test(category)) {
    return { ok: false, error: CATEGORY_ERROR };
  }

  let paymentMethods: string | null = null;
  const rawPayment = rec['paymentMethods'];
  if (typeof rawPayment === 'string') {
    const trimmed = rawPayment.trim();
    if (PAYMENT_METHODS.test(trimmed)) {
      paymentMethods = trimmed;
    }
  }

  return {
    ok: true,
    value: {
      origin: rawOrigin.trim(),
      externalId,
      name,
      lat: roundCoord(lat),
      lon: roundCoord(lon),
      category,
      paymentMethods,
    },
  };
}

/**
 * Drop fields that only the ingest caller needs.
 *
 * @param place - Stored pin.
 * @returns The public map row.
 */
export function toPublicMapPlace(place: StoredMapPlace): PublicMapPlace {
  return {
    id: place.id,
    origin: place.origin,
    name: place.name,
    lat: place.lat,
    lon: place.lon,
    category: place.category,
  };
}
