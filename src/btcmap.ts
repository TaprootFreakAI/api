import type { StoredPlace } from "./place.ts";

const DEFAULT_URL = "https://api.btcmap.org/v4/place-submissions";

export type PushResult = "sent" | "failed" | "skipped";

/**
 * JSON body for the BTC Map user submission endpoint.
 *
 * @param place - Stored place.
 * @returns `lat`, `lon`, `category`, `name`, and `extra_fields`.
 */
export function submissionBody(place: StoredPlace): {
  lat: number;
  lon: number;
  category: string;
  name: string;
  extra_fields: { source: string; payment_methods?: string };
} {
  const extra_fields: { source: string; payment_methods?: string } = {
    source: place.origin,
  };
  if (place.paymentMethods !== null) {
    extra_fields.payment_methods = place.paymentMethods;
  }
  return {
    lat: place.lat,
    lon: place.lon,
    category: place.category,
    name: place.name,
    extra_fields,
  };
}

/**
 * POST a new place once. A missing token skips the call. Failures do not throw
 * and the token is not logged.
 *
 * @param place - Stored place.
 * @param env - `BTCMAP_ACCESS_TOKEN` and optional `BTCMAP_SUBMIT_URL`.
 * @param fetchImpl - HTTP fetch.
 * @returns `sent`, `failed`, or `skipped`.
 */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export async function pushPlace(
  place: StoredPlace,
  env: Record<string, string | undefined>,
  fetchImpl: FetchLike,
): Promise<PushResult> {
  const rawToken = env["BTCMAP_ACCESS_TOKEN"];
  if (rawToken === undefined || rawToken.trim() === "") {
    return "skipped";
  }
  const rawUrl = env["BTCMAP_SUBMIT_URL"];
  const url =
    rawUrl !== undefined && rawUrl.trim() !== ""
      ? rawUrl.trim().replace(/\/+$/u, "")
      : DEFAULT_URL;
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rawToken.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionBody(place)),
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
