const API_BASE = "https://knissradar-api.up.railway.app";

interface TelemetryListing {
  id: string;
  title: string;
  price: number;
  pricePreview?: string;
  oldPrice?: number;
  category: { slug: string; name: string };
  specs?: Array<{
    specification: { label: string; codename: string };
    value?: number;
    valueText: string;
  }>;
  cities?: Array<{
    name: string;
    region: { name: string; slug: string };
  }>;
  store?: { id: string; name: string };
  createdAt: string;
}

export async function sendTelemetry(
  listings: TelemetryListing[]
): Promise<{ ok: boolean; upserted?: number }> {
  if (listings.length === 0) return { ok: true, upserted: 0 };

  try {
    const response = await fetch(`${API_BASE}/api/v1/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "extension", listings }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = (await response.json()) as { upserted: number };
    return { ok: true, upserted: result.upserted };
  } catch {
    return { ok: false };
  }
}

export async function fetchListingHistory(
  listingId: string,
  days = 30
): Promise<{ price: number; timestamp: string }[]> {
  try {
    const response = await fetch(
      `${API_BASE}/api/v1/listings/${listingId}/history?days=${days}`
    );
    if (!response.ok) return [];

    const data = (await response.json()) as {
      prices: { price: number; timestamp: string }[];
    };
    return data.prices ?? [];
  } catch {
    return [];
  }
}

interface WatchlistItem {
  id: number;
  listing_id: string;
  target_price: number;
  title: string;
  current_price: number;
}

export async function fetchWatchlist(
  fingerprint: string
): Promise<WatchlistItem[]> {
  try {
    const response = await fetch(
      `${API_BASE}/api/v1/watchlist?fingerprint=${encodeURIComponent(fingerprint)}`
    );
    if (!response.ok) return [];

    const data = (await response.json()) as { watchlist: WatchlistItem[] };
    return data.watchlist ?? [];
  } catch {
    return [];
  }
}

export async function addToServerWatchlist(
  fingerprint: string,
  listingId: string,
  targetPrice: number
): Promise<{ ok: boolean; id?: number }> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/watchlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint, listingId, targetPrice }),
    });
    if (!response.ok) return { ok: false };

    const data = (await response.json()) as { ok: boolean; id: number };
    return data;
  } catch {
    return { ok: false };
  }
}

export async function removeFromServerWatchlist(
  id: number,
  fingerprint: string
): Promise<{ ok: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/watchlist/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint }),
    });
    if (!response.ok) return { ok: false };

    return { ok: true };
  } catch {
    return { ok: false };
  }
}
