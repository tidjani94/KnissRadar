# KnissRadar — Project Planning & Specification Document

**Chrome Store Title:** `KnissRadar: Ouedkniss Price History & Alerts`  
**Version:** 1.0.0 MVP  
**Date:** July 2026  
**Target Platform:** Chrome Extension (Manifest V3), Backend (Node.js/PostgreSQL)

---

## Table of Contents

1. [Brand & UI/UX Integration](#1-brand--uiux-integration)
2. [Technical Architecture & Data Engine](#2-technical-architecture--data-engine)
3. [Database & Backend System Design](#3-database--backend-system-design)
4. [Monetization & Business Model](#4-monetization--business-model-algeria-context)
5. [Compliance, Bot Mitigation & Stability](#5-compliance-bot-mitigation--stability)
6. [Step-by-Step MVP Roadmap](#6-step-by-step-mvp-roadmap)

---

## 1. Brand & UI/UX Integration

### 1.1 Brand Identity

| Element | Specification |
|---|---|
| **Primary Color** | `#E95903` (Ouedkniss orange — borrowed for familiarity, distinct via accent) |
| **KnissRadar Brand Color** | `#FF4D00` (radar-orange) with `#1A1A2E` (deep navy) as dark background |
| **Logo** | Radar dish icon + "KnissRadar" in a rounded sans-serif (Inter or Cairo for AR) |
| **Tagline** | "تتبع الأسعار smarter on Ouedkniss" (bilingual FR/AR) |
| **Font** | Inter (Latin), Cairo (Arabic), both via Google Fonts CDN bundled in extension |

### 1.2 Visual Overlay — Listing Page Widget

Ouedkniss listing pages live at `ouedkniss.com/annonce/<slug>` (SPA-rendered into `<div id="app">`). The site is a **Vue.js SPA** loading from `cdn.ouedkniss.com` with the GraphQL API at `api.ouedkniss.com/graphql`.

**Injection Strategy: Shadow DOM Isolation**

To prevent CSS bleed with the host page and survive Ouedkniss DOM updates:

```
#kniss-radar-root (injected <div>)
  └── #shadow-root (mode: open)
       ├── <style> (bundled Tailwind CSS)
       ├── <div id="kniss-widget"> (React root)
       │     ├── PriceHistoryGraph
       │     ├── TrackPriceDrop
       │     └── SmartCompare
       └── <div id="kniss-toast"> (notification toasts)
```

**Widget Placement:** Fixed-position sidebar anchored to the right edge of the viewport. Does NOT modify host DOM layout — it floats as an overlay with `position: fixed; right: 0; top: 80px; z-index: 2147483647;`.

**Widget Dimensions:**
- **Collapsed state:** 48px x 48px radar icon button (bottom-right FAB)
- **Expanded state:** 380px wide x dynamic height, sliding in from right
- **Mobile/responsive:** Full-width bottom sheet on viewports < 768px

**Host Page Detection:**
```json
// manifest.json content_scripts
{
  "matches": [
    "https://www.ouedkniss.com/annonce/*",
    "https://ouedkniss.com/annonce/*"
  ],
  "js": ["content.js"],
  "css": [],
  "run_at": "document_idle"
}
```

### 1.3 Core Widget Features

#### A. Interactive Price Graph

- **Library:** Chart.js (bundled, ~70KB gzipped) via Shadow DOM — zero host conflicts
- **Data ranges:** 7-day, 30-day, 90-day toggles
- **Price points:** Median price line (solid), min/max shading (gradient fill), current price (red dot marker)
- **DA formatting:** `125,000 DA` with Arabic numeral fallback (`١٢٥٬٠٠٠ د.ج`)
- **Empty state:** "No history yet — KnissRadar is collecting data for this listing" with radar animation

**Graph Rendering Logic:**
```typescript
// content/widgets/PriceGraph.tsx (pseudocode)
interface PricePoint {
  date: string;       // ISO date
  price: number;      // numeric DA value
  source: 'direct' | 'telemetry';
}

function PriceGraph({ history }: { history: PricePoint[] }) {
  // Chart.js instance inside Shadow DOM canvas
  // X-axis: dates, Y-axis: DA price (no currency symbol in axis labels)
  // Tooltip: "12 Jul 2026 — 145,000 DA (source: community snapshot)"
}
```

#### B. Track Price Drop Button

```
+------------------------------------------+
|  Bell Icon Track Price Drop              |
|  +------------------------------------+  |
|  |  Target price: [________] DA       |  |
|  |  [x] Notify when price drops below |  |
|  |  [x] Notify when listing is new     |  |
|  |  -------------------------------- |  |
|  |  Send alerts to: [Telegram v]      |  |
|  +------------------------------------+  |
|  [  Track This Listing  ]                |
+------------------------------------------+
```

- **Default target:** Current price x 0.90 (10% below)
- **Min target:** 1 DA (user can set any positive integer)
- **Alert channels:** Extension push notification, Telegram bot, Email (Pro tier)

#### C. KnissRadar Smart Compare Box

Displayed below the price graph, shows:

```
+------------------------------------------+
|  Lightning Bolt Smart Compare            |
|  --------------------------------------  |
|  Similar active listings:                |
|  +------------------------------------+  |
|  | iPhone 15 Pro Max 256GB - 145k DA  |  |
|  | Location: Algiers - 3h ago          |  |
|  | [View on Ouedkniss]                |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  | iPhone 15 Pro Max 256GB - 138k DA  |  |
|  | Location: Oran - 1d ago            |  |
|  | [View on Ouedkniss]                |  |
|  +------------------------------------+  |
|  --------------------------------------  |
|  Store Icon Verified Shop Deals:         |
|  +------------------------------------+  |
|  | Brand new at PhoneShop DZ          |  |
|  | 165,000 DA - 4.2/5 - Verified      |  |
|  +------------------------------------+  |
+------------------------------------------+
```

**Matching Logic:** Fuzzy product matching against product groups (see Section 2.5). Returns top 5 similar listings ranked by price ascending + recency.

### 1.4 Extension Popup (Toolbar)

**Dimensions:** 400px x 520px  
**Layout:** React + Tailwind CSS

```
+--------------------------------------+
|  Red Dot KnissRadar       Gear Bell 3|
|  ----------------------------------- |
|  Chart My Watchlist (7)              |
|  +--------------------------------+  |
|  | iPhone 15 Pro Max 256GB        |  |
|  | 145,000 DA Down 5,000 DA (3.3%)|  |
|  | [View History] [Remove]        |  |
|  +--------------------------------+  |
|  | Samsung Galaxy S24 Ultra       |  |
|  | 110,000 DA -- unchanged        |  |
|  | [View History] [Remove]        |  |
|  +--------------------------------+  |
|  ----------------------------------- |
|  Bell Recent Alerts                  |
|  +--------------------------------+  |
|  | Down Arrow Price drop: iPhone 15|  |
|  | 145k -> 138k DA (Oran) - 2h ago|  |
|  +--------------------------------+  |
|  | New Listing: MacBook M3         |  |
|  | 280,000 DA (Algiers) - 5h ago  |  |
|  +--------------------------------+  |
|  ----------------------------------- |
|  Lightning Bolt Quick Actions        |
|  [Browse History] [Pro Tips]        |
|  ----------------------------------- |
|  KnissRadar v1.0 - ouedkniss.com    |
+--------------------------------------+
```

---

## 2. Technical Architecture & Data Engine

### 2.1 Browser Extension Architecture (Manifest V3)

```
knissradar-extension/
  manifest.json                    # MV3 manifest
  src/
    background/
      service-worker.ts            # Background SW (stateless, event-driven)
    content/
      inject.ts                    # Shadow DOM mount + widget bootstrap
      extractor.ts                 # DOM parser for listing data
      network-interceptor.ts       # GraphQL response interception
    popup/
      App.tsx                       # React popup root
      Watchlist.tsx                 # Watchlist panel
      AlertsFeed.tsx                # Alert notifications feed
      Settings.tsx                  # Extension settings
    shared/
      api.ts                        # Backend API client
      storage.ts                    # chrome.storage.local wrapper
      types.ts                      # Shared TypeScript types
      messaging.ts                 # Context message passing
    widgets/
      PriceGraph.tsx                # Chart.js price history widget
      TrackPriceDrop.tsx            # Target price form
      SmartCompare.tsx              # Comparison box
    styles/
      widget.css                    # Tailwind bundle (Shadow DOM safe)
  assets/
    icon-16.png
    icon-48.png
    icon-128.png
  vite.config.ts                    # @crxjs/vite-plugin
  tailwind.config.ts
  tsconfig.json
```

**manifest.json:**

```json
{
  "manifest_version": 3,
  "name": "KnissRadar: Ouedkniss Price History & Alerts",
  "version": "1.0.0",
  "description": "Track Ouedkniss price history, get drop alerts, and compare deals on ouedkniss.com",
  "permissions": [
    "storage",
    "alarms",
    "notifications",
    "activeTab"
  ],
  "host_permissions": [
    "https://api.ouedkniss.com/*",
    "https://*.ouedkniss.com/*"
  ],
  "background": {
    "service_worker": "dist/background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "https://www.ouedkniss.com/*",
        "https://ouedkniss.com/*"
      ],
      "js": ["dist/content/inject.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "dist/popup/index.html",
    "default_icon": {
      "16": "assets/icon-16.png",
      "48": "assets/icon-48.png",
      "128": "assets/icon-128.png"
    }
  },
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules.json"
    }]
  },
  "icons": {
    "16": "assets/icon-16.png",
    "48": "assets/icon-48.png",
    "128": "assets/icon-128.png"
  }
}
```

**Declarative Net Request rules** (`rules.json`):
```json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "modify-headers",
      "request_headers": [
        { "header": "X-KnissRadar-Client", "operation": "set", "value": "extension/1.0" }
      ]
    },
    "condition": {
      "url_filter": "||api.ouedkniss.com/graphql",
      "resource_types": ["xmlhttprequest"]
    }
  }
]
```

### 2.2 Data Extraction Strategy

**Two-pronged approach** — DOM parsing for instant extraction + GraphQL interception for structured data:

#### Prong 1: GraphQL Network Interception

Ouedkniss loads listing data via GraphQL POST to `https://api.ouedkniss.com/graphql`. The content script intercepts these responses:

```typescript
// content/network-interceptor.ts
// Intercept XHR/fetch responses to the GraphQL endpoint

const GRAPHQL_ENDPOINT = 'https://api.ouedkniss.com/graphql';

// Method: Override window.fetch to intercept GraphQL responses
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;

  if (url?.includes('ouedkniss.com/graphql')) {
    const clone = response.clone();
    const body = await clone.json();

    // Detect AnnouncementGet responses
    if (body?.data?.announcementDetails) {
      const listing = body.data.announcementDetails;
      window.dispatchEvent(new CustomEvent('kniss:listing-data', {
        detail: {
          id: listing.id,
          reference: listing.reference,
          title: listing.title,
          price: listing.price,           // numeric DA
          pricePreview: listing.pricePreview, // "125,000 DA" string
          oldPrice: listing.oldPrice,
          category: listing.category?.slug,
          specs: listing.specs,
          city: listing.cities?.[0]?.name,
          region: listing.cities?.[0]?.region?.name,
          storeId: listing.store?.id,
          storeName: listing.store?.name,
          createdAt: listing.createdAt,
          isFromStore: listing.isFromStore,
        }
      }));
    }

    // Detect SearchQuery responses (listing pages)
    if (body?.data?.search?.announcements?.data) {
      window.dispatchEvent(new CustomEvent('kniss:search-data', {
        detail: body.data.search.announcements.data
      }));
    }
  }

  return response;
};
```

#### Prong 2: DOM Fallback Parser

When GraphQL interception fails (e.g., cached data, SPA navigation without new fetch):

```typescript
// content/extractor.ts
interface ExtractedListing {
  id: string | null;
  title: string | null;
  price: number | null;
  city: string | null;
  category: string | null;
}

function extractFromDOM(): ExtractedListing {
  // Ouedkniss URL pattern: /annonce/<slug> -- extract reference from URL
  const urlMatch = window.location.pathname.match(/\/annonce\/([^/]+)/);
  const slug = urlMatch?.[1] ?? null;

  // DOM selectors (must be updated when Ouedkniss changes layout)
  const titleEl = document.querySelector('h1.announcement-title, [data-testid="announcement-title"]');
  const priceEl = document.querySelector('.announcement-price, [data-testid="price"]');
  const cityEl = document.querySelector('.announcement-city, [data-testid="city"]');

  return {
    id: slug, // fallback to slug, resolve ID via API
    title: titleEl?.textContent?.trim() ?? null,
    price: parseDAPrice(priceEl?.textContent ?? ''),
    city: cityEl?.textContent?.trim() ?? null,
    category: document.querySelector('[data-category]')?.getAttribute('data-category') ?? null,
  };
}

function parseDAPrice(text: string): number | null {
  // Handles: "125,000 DA", "125000", "125 000 DA", "125000.00 DA"
  const cleaned = text.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : null;
}
```

**Extracted Fields Summary:**

| Field | Source | Type |
|---|---|---|
| Listing ID | GraphQL `id` or URL slug | `string` |
| Title | GraphQL `title` | `string` |
| Price (numeric) | GraphQL `price` | `number` |
| Price (formatted) | GraphQL `pricePreview` | `string` |
| Old Price | GraphQL `oldPrice` | `number \| null` |
| Category | GraphQL `category.slug` | `string` |
| Specs (Marque, RAM, etc.) | GraphQL `specs[].specification.label` + `valueText` | `Record<string, string>` |
| City | GraphQL `cities[0].name` | `string` |
| Region | GraphQL `cities[0].region.name` | `string` |
| Store ID | GraphQL `store.id` | `string \| null` |
| Store Name | GraphQL `store.name` | `string \| null` |
| Publication Date | GraphQL `createdAt` (refreshedAt alias) | `ISO string` |
| Is From Store | GraphQL `isFromStore` | `boolean` |

### 2.3 Crowdsourced Price Engine — Passive Telemetry

The core innovation: KnissRadar extensions **passively send listing telemetry** as users naturally browse Ouedkniss, building the price database organically.

**Telemetry Flow:**

```
User browses Ouedkniss -> Content script extracts listing data
  -> Background service worker batches telemetry events
  -> Batch sent via POST /api/telemetry/listing (every 30s or 5 events)
  -> Backend deduplicates, updates price_snapshots
```

**Telemetry Payload:**

```json
POST /api/v1/telemetry
Content-Type: application/json
X-KnissRadar-Version: 1.0.0
X-KnissRadar-Client: extension

{
  "events": [
    {
      "listing_id": "abc123def456",
      "reference": "REF-78432",
      "title": "iPhone 15 Pro Max 256GB",
      "price": 145000,
      "currency": "DZD",
      "category_slug": "informatique-ordinateur-portable",
      "city": "Alger",
      "region": "Alger",
      "store_id": "store_xyz",
      "specs": {
        "Marque": "Apple",
        "Modele": "iPhone 15 Pro Max",
        "Stockage": "256 Go",
        "RAM": "8 Go"
      },
      "captured_at": "2026-07-21T14:32:00Z"
    }
  ]
}
```

**Background Service Worker Batching:**

```typescript
// background/service-worker.ts
const BATCH_SIZE = 5;
const BATCH_INTERVAL_MS = 30_000;
let pendingEvents: TelemetryEvent[] = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TELEMETRY_EVENT') {
    pendingEvents.push(msg.data);
    if (pendingEvents.length >= BATCH_SIZE) {
      flushTelemetry();
    }
  }
});

chrome.alarms.create('flush-telemetry', { periodInMinutes: 0.5 });

async function flushTelemetry() {
  if (pendingEvents.length === 0) return;
  const batch = pendingEvents.splice(0, BATCH_SIZE);

  try {
    await fetch('https://api.knissradar.dz/api/v1/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
    });
  } catch {
    // Re-queue failed events (max 3 retries)
    pendingEvents.push(...batch.filter(e => (e._retries ?? 0) < 3).map(e => ({...e, _retries: (e._retries ?? 0) + 1})));
  }
}
```

**Privacy Guarantees:**
- No user identifiers sent (no Chrome ID, no email, no IP — proxied through backend)
- Only listing data that is already public on Ouedkniss
- Users can opt out entirely via settings toggle
- Telemetry is 100% passive — no active scraping, only data seen during normal browsing

### 2.4 Backend API (Service Worker to KnissRadar API)

**Service Worker to Backend communication pattern:**

```typescript
// background/service-worker.ts
const API_BASE = 'https://api.knissradar.dz';

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'X-KnissRadar-Version': '1.0.0' },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Get price history for a listing
async function getPriceHistory(listingId: string, days: number = 30) {
  return apiGet<PriceHistory>(`/api/v1/history/${listingId}?days=${days}`);
}

// Add to watchlist
async function addToWatchlist(listingId: string, targetPrice?: number) {
  return apiPost('/api/v1/watchlist/add', { listing_id: listingId, target_price: targetPrice });
}
```

### 2.5 Fuzzy Product Matching Engine

**Problem:** Ouedkniss listings are user-generated with non-standardized titles. "iPhone 15 Pro Max 256GB", "Iphone 15 Pro Max 256", "APPLE IPHONE 15 PRO MAX 256GO" are all the same product.

**Strategy: Normalized Product Grouping**

```typescript
interface ProductGroup {
  group_id: string;           // UUID
  canonical_name: string;     // "Apple iPhone 15 Pro Max 256GB"
  brand: string;              // "Apple"
  model: string;              // "iPhone 15 Pro Max"
  storage: string;            // "256GB"
  category_slug: string;      // "telephonie-smartphone"
  specs_hash: string;         // SHA-256 of normalized specs
  listing_ids: string[];      // All matching Ouedkniss listing IDs
}

// Normalization pipeline:
function normalizeTitle(raw: string): NormalizedProduct {
  let title = raw
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  // Brand extraction (top 50 brands for Algerian market)
  const brand = extractBrand(title); // "apple", "samsung", "huawei", etc.

  // Model extraction via regex patterns per brand
  const model = extractModel(title, brand);

  // Storage/RAM extraction
  const storage = extractSpec(title, /(\d+)\s*(go|gb|to|tb)/i);
  const ram = extractSpec(title, /(\d+)\s*go?\s*ram/i);

  return { brand, model, storage, ram };
}

// Matching: group listings with identical (brand + model + storage) within same category
// Backend maintains product_groups table updated via cron job
```

**Specs Hash** combines normalized spec key-value pairs into a deterministic hash for deduplication:

```typescript
function computeSpecsHash(specs: Record<string, string>): string {
  const normalized = Object.entries(specs)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k.toLowerCase()}:${v.toLowerCase().trim()}`)
    .join('|');
  return sha256(normalized).slice(0, 16);
}
```

---

## 3. Database & Backend System Design

### 3.1 Database Schema (PostgreSQL)

```sql
-- Core entities

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chrome_extension_id VARCHAR(64) UNIQUE,  -- hashed, not raw
  telegram_chat_id    BIGINT,
  email               VARCHAR(255),
  plan                VARCHAR(20) DEFAULT 'free',  -- free | pro | partner
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE listings (
  id              VARCHAR(64) PRIMARY KEY,  -- Ouedkniss listing ID (from GraphQL)
  reference       VARCHAR(64),
  title           TEXT NOT NULL,
  description     TEXT,
  slug            VARCHAR(512),
  price           INTEGER,                  -- numeric DA price
  old_price       INTEGER,
  currency        VARCHAR(3) DEFAULT 'DZD',
  category_slug   VARCHAR(255),
  city            VARCHAR(128),
  region          VARCHAR(128),
  store_id        VARCHAR(64),
  store_name      VARCHAR(256),
  is_from_store   BOOLEAN DEFAULT false,
  specs           JSONB DEFAULT '{}',       -- {"Marque": "Apple", "RAM": "8 Go", ...}
  product_group_id UUID,                    -- FK -> product_groups
  first_seen_at   TIMESTAMPTZ DEFAULT now(),
  last_seen_at    TIMESTAMPTZ DEFAULT now(),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_listings_category ON listings(category_slug);
CREATE INDEX idx_listings_product_group ON listings(product_group_id);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_active ON listings(is_active) WHERE is_active = true;

CREATE TABLE price_snapshots (
  id              BIGSERIAL PRIMARY KEY,
  listing_id      VARCHAR(64) REFERENCES listings(id),
  price           INTEGER NOT NULL,
  captured_at     TIMESTAMPTZ DEFAULT now(),
  source          VARCHAR(20) DEFAULT 'telemetry'  -- telemetry | manual | cron
);

CREATE INDEX idx_snapshots_listing_time ON price_snapshots(listing_id, captured_at DESC);

-- Partition by month for performance (optional, for scale)
-- CREATE TABLE price_snapshots_y2026m07 PARTITION OF price_snapshots
--   FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE product_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name  TEXT NOT NULL,
  brand           VARCHAR(128),
  model           VARCHAR(256),
  storage         VARCHAR(64),
  ram             VARCHAR(64),
  category_slug   VARCHAR(255),
  specs_hash      VARCHAR(32),              -- deterministic hash of normalized specs
  listing_count   INTEGER DEFAULT 0,
  min_price       INTEGER,
  max_price       INTEGER,
  avg_price       NUMERIC(12,2),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_pg_specs_hash ON product_groups(specs_hash, category_slug);

CREATE TABLE watchlists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  listing_id      VARCHAR(64) REFERENCES listings(id),
  target_price    INTEGER,                  -- alert when price drops below this
  notify_telegram BOOLEAN DEFAULT false,
  notify_push     BOOLEAN DEFAULT true,
  notify_email    BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_watchlist_user ON watchlists(user_id) WHERE is_active = true;
CREATE INDEX idx_watchlist_listing ON watchlists(listing_id) WHERE is_active = true;

CREATE TABLE alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  watchlist_id    UUID REFERENCES watchlists(id),
  listing_id      VARCHAR(64) REFERENCES listings(id),
  alert_type      VARCHAR(32),              -- 'price_drop' | 'new_listing' | 'target_reached'
  old_price       INTEGER,
  new_price       INTEGER,
  target_price    INTEGER,
  message         TEXT,
  sent_at         TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE partner_stores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ouedkniss_store_id VARCHAR(64) UNIQUE,
  store_name      VARCHAR(256) NOT NULL,
  contact_email   VARCHAR(255),
  contact_phone   VARCHAR(32),
  subscription_plan VARCHAR(20) DEFAULT 'basic',  -- basic | premium | enterprise
  subscription_expires_at TIMESTAMPTZ,
  monthly_impressions INTEGER DEFAULT 0,
  monthly_clicks       INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE store_sponsored_deals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES partner_stores(id),
  product_group_id UUID REFERENCES product_groups(id),
  deal_price      INTEGER NOT NULL,
  deal_title      TEXT,
  deal_url        TEXT,
  is_verified     BOOLEAN DEFAULT true,
  starts_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deals_group ON store_sponsored_deals(product_group_id)
  WHERE is_verified = true AND expires_at > now();
```

### 3.2 API Endpoints

**Base URL:** `https://api.knissradar.dz`

```
GET  /api/v1/history/:listingId?days=30
POST /api/v1/watchlist/add
POST /api/v1/watchlist/remove
POST /api/v1/telemetry
GET  /api/v1/compare/:productGroupId
GET  /api/v1/alerts
GET  /api/v1/user/settings
PUT  /api/v1/user/settings
POST /api/v1/auth/extension       # Extension registration
POST /api/v1/payment/checkout     # Chargily Pay checkout
POST /api/v1/webhook/chargily     # Chargily webhook receiver
```

**Detailed Endpoint Specs:**

```yaml
# GET /api/v1/history/:listingId
# Returns price history for a specific listing
Response 200:
{
  "listing_id": "abc123",
  "title": "iPhone 15 Pro Max 256GB",
  "current_price": 145000,
  "currency": "DZD",
  "history": [
    { "date": "2026-07-21", "price": 145000, "source": "telemetry" },
    { "date": "2026-07-20", "price": 148000, "source": "telemetry" },
    { "date": "2026-07-15", "price": 152000, "source": "cron" }
  ],
  "stats": {
    "min_30d": 138000,
    "max_30d": 160000,
    "avg_30d": 148500,
    "trend": "down",
    "trend_pct": -2.1
  }
}

---
# POST /api/v1/telemetry
# Accepts batched listing telemetry from extensions
Request:
{
  "events": [
    {
      "listing_id": "abc123",
      "title": "...",
      "price": 145000,
      "category_slug": "...",
      "city": "Alger",
      "specs": { "Marque": "Apple", ... },
      "captured_at": "2026-07-21T14:32:00Z"
    }
  ]
}
Response 201: { "accepted": 1 }

---
# POST /api/v1/watchlist/add
Request:
{
  "listing_id": "abc123",
  "target_price": 135000,
  "notify_telegram": true,
  "notify_push": true
}
Response 201: {
  "watchlist_id": "uuid-...",
  "listing_id": "abc123",
  "target_price": 135000,
  "status": "active"
}

---
# GET /api/v1/compare/:productGroupId
Response 200:
{
  "product_group": {
    "canonical_name": "Apple iPhone 15 Pro Max 256GB",
    "min_active_price": 135000,
    "avg_active_price": 148000,
    "active_count": 12
  },
  "similar_listings": [
    {
      "listing_id": "...",
      "title": "iPhone 15 Pro Max 256GB",
      "price": 135000,
      "city": "Oran",
      "posted_ago": "3h",
      "url": "https://ouedkniss.com/annonce/..."
    }
  ],
  "sponsored_deals": [
    {
      "store_name": "PhoneShop DZ",
      "deal_price": 165000,
      "deal_url": "...",
      "rating": 4.2
    }
  ]
}
```

### 3.3 Background Processing

**Stack:** Node.js + BullMQ (Redis-backed job queue)

```
+---------------------------------------------+
|           KnissRadar Backend                 |
|                                              |
|  +-----------------+  +-------------------+ |
|  |  Express/Fastify |  |  PostgreSQL       | |
|  |  API Server      |  |  (Neon/Supabase)  | |
|  +--------+--------+  +-------------------+ |
|           |                                   |
|  +--------v--------+  +-------------------+ |
|  |  BullMQ Workers  |  |  Redis (Upstash)  | |
|  |  (price-check,   |  |  Job queue + cache| |
|  |   alert-dispatch)|  |                   | |
|  +-----------------+  +-------------------+ |
+---------------------------------------------+
```

**Cron Jobs:**

| Job | Schedule | Purpose |
|---|---|---|
| `price-checker` | Every 15 min (business hours) | Query Ouedkniss GraphQL for watchlisted listings, record price snapshots |
| `alert-dispatcher` | Every 5 min | Process watchlist alerts, send Telegram/push notifications |
| `product-group-agg` | Every 6 hours | Recalculate product group stats (min/avg/max, listing counts) |
| `stale-listing-cleanup` | Daily 03:00 UTC | Mark listings not seen in 7 days as inactive |
| `partner-impressions` | Hourly | Aggregate store impression/click counts for billing |

**Rate Limiting Strategy (avoiding Cloudflare):**
- Server-side GraphQL queries use residential proxy pool (1 request per 2-3 seconds max)
- Max 300 requests/hour per server IP across all accounts
- Exponential backoff on 429/503 responses
- Query only watchlisted listing IDs (no full-scrape behavior)
- Use `operationName: "AnnouncementGet"` (single listing) not `SearchQuery` (bulk) for monitoring

**Telemetry Ingest Pipeline:**

```
Extension POST /api/v1/telemetry
  -> API validates payload schema
  -> Inserts into price_snapshots (UPSERT: same listing_id + same day = single record)
  -> If new listing_id: INSERT INTO listings + trigger product_group matching
  -> If price changed from last snapshot: queue alert-dispatcher check
  -> Returns 201 (async processing happens in BullMQ)
```

---

## 4. Monetization & Business Model (Algeria Context)

### 4.1 Revenue Model Overview

Since Ouedkniss has **no open affiliate program**, KnissRadar cannot earn commissions from Ouedkniss directly. The monetization strategy is built around **B2B store sponsorships** and **B2C premium features**.

```
Revenue Streams:
|-- B2B Store Sponsorships (Primary)      ~60% of revenue
|   |-- Featured "Verified Shop Deal" placement in widget
|   |-- Monthly subscription (5,000 - 50,000 DA/month)
|   +-- Performance analytics dashboard for stores
|
|-- KnissRadar Pro (B2C)                  ~30% of revenue
|   |-- Instant Telegram alerts for under-market listings
|   |-- Unlimited watchlist (free tier: 5 listings)
|   +-- Advanced analytics & bulk alerts
|
+-- Data Insights (Future)                 ~10% of revenue
    +-- Market intelligence reports for local businesses
```

### 4.2 B2B Store Sponsorships

**How it works:**

Local Algerian retailers (phone shops, car dealers, electronics stores) that have Ouedkniss stores pay to have their offers featured inside the KnissRadar widget when users view comparable listings.

**Pricing Tiers:**

| Tier | Price (DA/month) | Features |
|---|---|---|
| **Basic** | 5,000 DA | "Available brand new at [Store] for X DA" badge on 5 product groups |
| **Premium** | 15,000 DA | Featured placement + analytics dashboard + 20 product groups |
| **Enterprise** | 50,000 DA | Top placement + priority support + unlimited groups + custom branding |

**Widget Integration:**

When a user views a listing (e.g., used iPhone 15 Pro Max at 145,000 DA), the Smart Compare box shows:

```
+------------------------------------------+
|  Store Icon Verified Shop Deal           |
|  +------------------------------------+  |
|  | Location: PhoneShop DZ (Algiers)   |  |
|  | Brand new iPhone 15 Pro Max 256GB  |  |
|  | 165,000 DA - 4.2/5 (12 reviews)    |  |
|  | [View on Ouedkniss]  [Call Now]    |  |
|  +------------------------------------+  |
+------------------------------------------+
```

**Store Onboarding Flow:**
1. Store owner visits `knissradar.dz/partner`
2. Creates account, links their Ouedkniss store URL
3. Selects subscription tier
4. Pays via Chargily Pay (CIB/EDAHABIA)
5. KnissRadar auto-indexes their Ouedkniss listings via GraphQL
6. Sponsorships activate within 24 hours

**Impression & Click Tracking:**
- Each sponsored deal view = 1 impression
- Each "View on Ouedkniss" click = 1 click
- Monthly analytics dashboard: impressions, clicks, CTR, top-performing products
- Minimum guaranteed 5,000 impressions/month per Basic tier

### 4.3 KnissRadar Pro (B2C Reseller Subscription)

**Target users:** Tech/phone/car resellers ("revendeurs") who actively flip items on Ouedkniss and need to spot underpriced listings instantly.

**Pricing:**

| Tier | Price | Features |
|---|---|---|
| **Free** | 0 DA | Price history graph, 5 watchlist items, browser notifications only |
| **Pro Monthly** | 500 DA/month | Unlimited watchlist, instant Telegram alerts, email alerts, early-bird listings |
| **Pro Annual** | 4,500 DA/year (25% off) | All Pro features + priority alert queue + bulk watchlist import |
| **Reseller Pack** | 2,000 DA/month | Pro features + price prediction + bulk listing monitor (100+ items) |

**Pro Feature Breakdown:**

- **Instant Telegram Alerts:** Price drops are pushed to user's Telegram within 60 seconds (vs. 5-minute delay for free users)
- **Under-Market Bargain Finder:** Algorithm identifies listings priced 20%+ below product group average -> immediate alert
- **Bulk Watchlist Import:** Upload CSV of Ouedkniss listing URLs to monitor 100+ items
- **Price Prediction (coming soon):** ML-based 7-day price forecast using historical data

### 4.4 Local Payment Integration

**Primary Gateway: Chargily Pay**

Chargily Pay is Algeria's dominant merchant gateway, supporting CIB (SATIM) and EDAHABIA (Algerie Poste) — the two card networks that cover essentially 100% of Algerian cardholders.

```typescript
// Backend: Chargily Pay integration
// docs: https://dev.chargily.com/pay-v2/introduction

import Chargily from '@chargily/chargily-pay';  // Node.js SDK

const chargily = new Chargily({
  secretKey: process.env.CHARGILY_SECRET_KEY,   // from chargily.com dashboard
  mode: 'production',  // or 'test'
});

// Create checkout for Pro subscription
async function createProCheckout(userId: string, plan: 'monthly' | 'annual') {
  const amount = plan === 'monthly' ? 500 : 4500; // DA

  const checkout = await chargily.checkout.create({
    amount: amount * 100,  // Chargily uses centimes
    currency: 'DZD',
    description: `KnissRadar Pro - ${plan}`,
    metadata: { userId, plan },
    success_url: 'https://knissradar.dz/payment/success',
    failure_url: 'https://knissradar.dz/payment/failed',
    webhook_url: 'https://api.knissradar.dz/api/v1/webhook/chargily',
  });

  return checkout.checkout_url; // Redirect user to this URL
}

// Webhook handler
app.post('/api/v1/webhook/chargily', async (req, res) => {
  const event = chargily.webhooks.verify(req.body, req.headers);

  if (event.type === 'checkout.successful') {
    const { userId, plan } = event.data.metadata;
    await activateProSubscription(userId, plan);
    // Send Telegram confirmation
  }

  res.sendStatus(200);
});
```

**Alternative: BaridiMob (CCP Transfer) for Manual Payments**

For users without CIB/EDAHABIA cards, offer manual CCP transfer:

```
+--------------------------------------+
|  Credit Card Pay via CCP Transfer    |
|  ----------------------------------- |
|  Transfer to:                         |
|  CCP: 76 XXX XXXX 0000 0000 00 00   |
|  Name: KnissRadar SARL               |
|  Amount: 500 DA                       |
|  Reference: KN-USER-XXXX-PRO         |
|                                      |
|  1. Make transfer via BaridiMob app  |
|  2. Enter reference in message       |
|  3. Paste transaction ID below       |
|                                      |
|  [Transaction ID: ________________]  |
|  [Confirm Payment]                   |
|  ----------------------------------- |
|  Clock Verification: ~30 minutes     |
+--------------------------------------+
```

**Payment Flow Summary:**

```
User clicks "Upgrade to Pro"
  -> Redirect to knissradar.dz/checkout
  -> Select plan + payment method
  |-- CIB/EDAHABIA -> Chargily Pay hosted checkout -> webhook confirms -> instant activation
  +-- CCP Transfer -> Manual entry -> Bot checks CCP statement hourly -> activation on match
```

---

## 5. Compliance, Bot Mitigation & Stability

### 5.1 Cloudflare Rate Limits & Anti-Scraping

**Critical insight:** Ouedkniss is behind Cloudflare. The extension runs inside the user's real Chrome browser — **Cloudflare sees legitimate human traffic** — but the backend server making GraphQL calls is exposed.

**Server-Side Mitigation:**

| Strategy | Implementation |
|---|---|
| **Residential Proxy Pool** | Use Bright Data or Smartproxy residential proxies for server-side GraphQL queries. Rotate IPs per session, not per request. |
| **Browser-Impersonating TLS** | Use `curl-impersonate` or `tls-client` library (matches Chrome 130 JA3 fingerprint). Avoid Python `requests` or Node.js `fetch` for direct API calls. |
| **Session Persistence** | Reuse `cf_clearance` cookies per IP session. Maintain session affinity for 15-30 minutes. |
| **Rate Throttling** | Max 1 GraphQL query per 3 seconds per IP. Max 200 queries/hour across all IPs. |
| **Query Minimization** | Only query watchlisted listing IDs (single `AnnouncementGet`, not `SearchQuery` bulk). Minimize response size. |
| **Off-Peak Crawling** | Server-side price checks run during Algerian off-peak hours (02:00-06:00 CET) |
| **User-Agent Rotation** | Rotate realistic Chrome User-Agent strings (latest 3 Chrome versions on Windows/Mac) |

**Extension-Side (PASSTHROUGH):** The extension itself does NOT need anti-bot evasion — it runs in the user's authenticated Chrome session. All GraphQL queries happen naturally as the user browses. The extension only intercepts responses; it does not make additional API calls.

### 5.2 Extension Stability Framework

**Problem:** Ouedkniss updates its Vue.js SPA regularly (current version: `3.5.25`). DOM selectors will break.

**Defensive Strategy:**

```typescript
// content/extractor.ts -- Multi-layer extraction with fallbacks

class ResilientExtractor {
  // Layer 1: GraphQL interception (preferred -- immune to DOM changes)
  private graphqlData: ListingData | null = null;

  // Layer 2: DOM selectors with versioned fallbacks
  private readonly DOM_SELECTORS = {
    title: [
      'h1.announcement-title',                    // Primary
      '[class*="announcement"] h1',                // Fallback 1
      'main h1',                                   // Fallback 2
    ],
    price: [
      '.announcement-price',
      '[class*="price"]',
      '[data-testid="price"]',
    ],
  };

  extract(): ExtractedListing | null {
    // Always prefer GraphQL data (stable, structured)
    if (this.graphqlData) return this.graphqlData;

    // Fall back to DOM parsing with selector cascade
    for (const selector of this.DOM_SELECTORS.title) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return this.parseDOM();
      }
    }

    return null; // Graceful degradation -- widget shows "loading" state
  }
}
```

**Selector Versioning:**

```json
// content/selectors-version.json -- Updated via extension updates
{
  "version": "3.5.25",
  "selectors": {
    "listing_title": ["h1.announcement-title", "h1[class*='title']"],
    "listing_price": [".announcement-price", "[class*='price'] span"],
    "listing_city": [".announcement-city", "[class*='location']"]
  },
  "notes": "Updated 2026-07-21 for v3.5.25 layout change"
}
```

**Monitoring:**
- Weekly automated check: Does the extension successfully extract data from a test listing?
- If extraction fails -> automatic GitHub issue created -> developer updates selectors
- Chrome Web Store update pushed within 24 hours of selector break

### 5.3 Chrome Web Store Compliance

| Policy | KnissRadar Compliance |
|---|---|
| **Trademark (Ouedkniss)** | KnissRadar does NOT claim affiliation. Uses "for Ouedkniss" phrasing. Does not use Ouedkniss logo. Widget clearly branded as "KnissRadar". |
| **Data Collection Disclosure** | Chrome Store listing clearly states: "This extension collects anonymous, non-personal listing data (product titles and prices) from ouedkniss.com pages you visit to build price history. No browsing history, personal data, or credentials are collected." |
| **Remote Code** | MV3 compliant — all code bundled at build time. No remote code execution. |
| **Permissions Justification** | `storage` (watchlist persistence), `alarms` (periodic telemetry flush), `notifications` (price alerts), `activeTab` (current page data) |
| **Content Script Scope** | Restricted to `ouedkniss.com/*` only — does not run on other sites |
| **Host Permissions** | `api.ouedkniss.com` needed for GraphQL interception; `api.knissradar.dz` needed for telemetry |

**Chrome Store Description:**

> **KnissRadar: Ouedkniss Price History & Alerts**
>
> Track price history on any Ouedkniss listing. See 30/90-day price trends, get alerts when prices drop, and compare similar deals.
>
> Features:
> - Interactive price history graphs on listing pages
> - Price drop alerts (browser notification + Telegram)
> - Smart comparison with similar active listings
> - Verified shop deals from local retailers
>
> This extension works exclusively on ouedkniss.com. It reads publicly available listing data to provide price tracking features. No personal data is collected or transmitted.

---

## 6. Step-by-Step MVP Roadmap

### Sprint 1: Extension Core & Local DOM Injection (2 weeks)

**Goal:** KnissRadar widget visible on Ouedkniss listing pages with local-only price tracking.

| Task | Details |
|---|---|
| Scaffold MV3 project | Vite + React 19 + Tailwind CSS v4 + TypeScript + @crxjs/vite-plugin |
| Implement Shadow DOM injection | Content script creates isolated Shadow DOM root on `ouedkniss.com/annonce/*` |
| Build GraphQL interceptor | `window.fetch` override to capture `AnnouncementGet` responses |
| DOM fallback extractor | Multi-selector cascade with versioned selector config |
| Build PriceGraph widget | Chart.js inside Shadow DOM, 30-day default view |
| Build TrackPriceDrop form | Target price input with DA validation |
| Local storage watchlist | `chrome.storage.local` for MVP — list of tracked listing IDs + target prices |
| Basic price history (local) | Store snapshots in `chrome.storage.local` (last 30 entries per listing) |
| Build extension popup | Watchlist view, basic settings |
| **Deliverable** | Extension loads on ouedkniss.com, shows price graph from locally stored data |

### Sprint 2: Backend Pipeline, Database Setup & Price Telemetry Engine (2 weeks)

**Goal:** Backend operational, crowdsourced telemetry flowing, persistent price history.

| Task | Details |
|---|---|
| Provision infrastructure | Neon PostgreSQL (free tier), Upstash Redis (free tier), Railway/Render for API |
| Deploy Express/Fastify API | `/api/v1/telemetry`, `/api/v1/history`, `/api/v1/watchlist/*` |
| Implement telemetry endpoint | Batch ingestion, UPSERT logic, deduplication |
| Product group matching engine | Normalized brand/model/storage extraction, specs hash matching |
| Background job: `product-group-agg` | BullMQ worker: recalculate group stats every 6 hours |
| Background job: `stale-listing-cleanup` | Mark inactive listings daily |
| Extension telemetry sender | Service worker batches events, sends every 30s |
| Migrate watchlist to backend | Extension syncs watchlist to backend (anonymous ID) |
| Replace local price history with API | `GET /api/v1/history/:listingId` |
| **Deliverable** | Extension + backend integrated, telemetry flowing, price history persistent |

### Sprint 3: Telegram Bot Integration & User Watchlist Alerts (2 weeks)

**Goal:** Users receive real-time price drop alerts via Telegram.

| Task | Details |
|---|---|
| Create Telegram bot | `@KnissRadarBot`, `/start` flow links user to extension |
| Implement alert dispatch worker | BullMQ `alert-dispatcher`: check watchlists every 5 min |
| Telegram alert messages | Formatted messages with listing title, old price -> new price, Ouedkniss link |
| Extension -> Telegram linking | Popup shows QR code / deep link to connect Telegram |
| Browser push notifications | `chrome.notifications` API for price drops |
| Alert history feed | Popup shows last 20 alerts with read/unread state |
| Background price checker | Server-side cron: query watchlisted listings via GraphQL (residential proxy) |
| **Deliverable** | Full alert pipeline: price drop -> Telegram + browser notification |

### Sprint 4: Partner Store Ad Placements & Beta Launch (2 weeks)

**Goal:** B2B sponsorship infrastructure + public beta on Chrome Web Store.

| Task | Details |
|---|---|
| Partner dashboard (basic) | `knissradar.dz/partner` — registration, Ouedkniss store linking |
| Chargily Pay integration | CIB/EDAHABIA checkout for Pro + Partner subscriptions |
| Sponsored deal placement | Smart Compare box shows verified shop deals |
| Impression/click tracking | Server-side counters per sponsored deal |
| Partner analytics page | Monthly impressions, clicks, CTR dashboard |
| Free/Pro tier gating | Extension checks subscription status from backend |
| Chrome Web Store submission | Store listing, screenshots, privacy policy, compliance review |
| Beta testing | 50 invited users (Algerian tech community, Telegram groups) |
| Landing page | `knissradar.dz` — product page, download CTA, partner signup |
| **Deliverable** | Public beta live on Chrome Web Store, B2B pipeline operational |

---

### Infrastructure Cost Estimate (Monthly, MVP)

| Service | Free Tier | Paid (if needed) |
|---|---|---|
| Neon PostgreSQL | 0.5 GB storage | $19/mo for 4 GB |
| Upstash Redis | 10K commands/day | $10/mo |
| Railway/Render API | $0 hobby | $7-20/mo |
| Residential Proxies | — | ~$15/mo (Smartproxy) |
| Chargily Pay | 0% setup, ~2% per tx | Transaction-based |
| Telegram Bot API | Free | Free |
| Domain (knissradar.dz) | — | ~5,000 DA/year (~$35) |
| **Total MVP** | | **~$40-80/mo** |

---

### Tech Stack Summary

| Layer | Technology |
|---|---|
| **Extension Frontend** | React 19, TypeScript, Tailwind CSS v4, Chart.js |
| **Extension Build** | Vite, @crxjs/vite-plugin, Manifest V3 |
| **Extension Storage** | chrome.storage.local, chrome.storage.sync |
| **Backend API** | Node.js 22, Fastify, TypeScript |
| **Database** | PostgreSQL (Neon) |
| **Cache/Queue** | Redis (Upstash) + BullMQ |
| **Auth** | Anonymous extension IDs (no user login required for MVP) |
| **Payments** | Chargily Pay (CIB + EDAHABIA) |
| **Notifications** | Telegram Bot API + chrome.notifications |
| **Proxies** | Smartproxy residential (backend only) |
| **Deployment** | Railway (API), Chrome Web Store (extension) |

---

## Ouedkniss API Reference (Confirmed)

**Base:** `https://api.ouedkniss.com/graphql`  
**Method:** POST  
**Auth:** None (public GraphQL API)

### SearchQuery (Category Browsing)

```json
{
  "operationName": "SearchQuery",
  "variables": {
    "q": null,
    "filter": {
      "categorySlug": "informatique-ordinateur-portable",
      "origin": null,
      "connected": false,
      "delivery": null,
      "regionIds": [],
      "cityIds": [],
      "priceRange": [null, null],
      "exchange": null,
      "hasPictures": false,
      "hasPrice": false,
      "priceUnit": null,
      "fields": [],
      "page": 1,
      "orderByField": {"field": "REFRESHED_AT"},
      "count": 60
    }
  },
  "query": "query SearchQuery($q: String, $filter: SearchFilterInput) { search(q: $q, filter: $filter) { announcements { data { id } paginatorInfo { lastPage hasMorePages } } } }"
}
```

### AnnouncementGet (Single Listing Details)

```json
{
  "operationName": "AnnouncementGet",
  "variables": { "id": "LISTING_ID" },
  "query": "query AnnouncementGet($id: ID!) { announcement: announcementDetails(id: $id) { id reference title slug description price pricePreview oldPrice priceType exchangeType priceUnit hasDelivery category { id slug name } defaultMedia(size: ORIGINAL) { mediaUrl } specs { specification { label codename } value valueText } user { id username displayName } isFromStore store { id name slug followerCount announcementsCount } cities { name region { name slug } } variants { id price pricePreview specifications { specification { label } valueText } } } }"
}
```

**Key Fields:**
- `id` — Ouedkniss listing ID (string)
- `price` — numeric DA price
- `pricePreview` — formatted string like "125,000 DA"
- `oldPrice` — previous price (if changed)
- `category.slug` — URL-friendly category name
- `specs[]` — array of `{specification: {label}, valueText}` pairs
- `cities[0].name` — wilaya/city name
- `cities[0].region.name` — region name
- `store` — store info if from a shop
- `createdAt` (alias for `refreshedAt`) — publication date
