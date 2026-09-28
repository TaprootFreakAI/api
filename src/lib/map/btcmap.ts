import type { StoredMapPlace } from '@/lib/map/place';

const DEFAULT_URL = 'https://api.btcmap.org/v4/place-submissions';

export type MapPushResult = 'sent' | 'failed' | 'skipped';

/** HTTP fetch used by the one-shot BTC Map call. */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/**
 * JSON body for the BTC Map user submission endpoint.
 *
 * @param place - Stored map pin.
 * @returns Latitude, longitude, category, name, and extra fields.
 */
export function mapSubmissionBody(place: StoredMapPlace): {
  lat: number;
  lon: number;
  category: string;
  name: string;
  extra_fields: { source: string; payment_methods?: string };
} {
  const extraFields: { source: string; payment_methods?: string } = {
    source: place.origin,
  };
  if (place.paymentMethods !== null) {
    extraFields.payment_methods = place.paymentMethods;
  }
  return {
    lat: place.lat,
    lon: place.lon,
    category: place.category,
    name: place.name,
    extra_fields: extraFields,
  };
}

/**
 * POST a new pin once. A missing token skips the call. Failures do not throw
 * and the token is not logged.
 *
 * @param place - Stored pin.
 * @param env - `BTCMAP_ACCESS_TOKEN` and optional `BTCMAP_SUBMIT_URL`.
 * @param fetchImpl - HTTP fetch.
 * @returns `sent`, `failed`, or `skipped`.
 */
export async function pushMapPlace(
  place: StoredMapPlace,
  env: Record<string, string | undefined>,
  fetchImpl: FetchLike,
): Promise<MapPushResult> {
  const rawToken = env['BTCMAP_ACCESS_TOKEN'];
  if (rawToken === undefined || rawToken.trim() === '') {
    return 'skipped';
  }
  const rawUrl = env['BTCMAP_SUBMIT_URL'];
  const url =
    rawUrl !== undefined && rawUrl.trim() !== '' ? rawUrl.trim().replace(/\/+$/u, '') : DEFAULT_URL;
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${rawToken.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mapSubmissionBody(place)),
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}
