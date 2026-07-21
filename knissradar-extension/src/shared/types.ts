export interface ListingData {
  id: string;
  title: string;
  price: number;
  pricePreview: string;
  oldPrice?: number;
  category: {
    slug: string;
    name: string;
  };
  specs: Array<{
    specification: {
      label: string;
      codename: string;
    };
    value?: number;
    valueText: string;
  }>;
  cities: Array<{
    name: string;
    region: {
      name: string;
      slug: string;
    };
  }>;
  store?: {
    id: string;
    name: string;
    slug: string;
    followerCount: number;
    announcementsCount: number;
  };
  createdAt: string;
}

export interface ExtractedListing {
  id: string;
  title: string;
  price: number;
  pricePreview: string;
  categorySlug: string;
  specs: Record<string, string>;
  city: string;
  storeName?: string;
}

export interface PricePoint {
  price: number;
  timestamp: string;
}

export interface PriceHistory {
  listingId: string;
  prices: PricePoint[];
  stats: {
    min: number;
    max: number;
    median: number;
    trend: "up" | "down" | "stable";
  };
}

export interface WatchlistItem {
  listingId: string;
  title: string;
  currentPrice: number;
  targetPrice: number;
  lastChecked: string;
  history: PricePoint[];
}
