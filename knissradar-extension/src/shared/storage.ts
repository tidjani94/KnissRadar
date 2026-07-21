import type { WatchlistItem } from "./types";

const STORAGE_KEY = "knissradar_watchlist";

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as WatchlistItem[]) ?? [];
}

export async function addToWatchlist(item: WatchlistItem): Promise<void> {
  const watchlist = await getWatchlist();
  const existing = watchlist.findIndex(
    (w) => w.listingId === item.listingId
  );

  if (existing >= 0) {
    watchlist[existing] = item;
  } else {
    watchlist.push(item);
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: watchlist });
}

export async function removeFromWatchlist(
  listingId: string
): Promise<void> {
  const watchlist = await getWatchlist();
  const filtered = watchlist.filter((w) => w.listingId !== listingId);
  await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
}

export async function getWatchlistItem(
  listingId: string
): Promise<WatchlistItem | undefined> {
  const watchlist = await getWatchlist();
  return watchlist.find((w) => w.listingId === listingId);
}
