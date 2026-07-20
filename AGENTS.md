# KnissRadar — Agent Instructions

## What This Is

Chrome Extension (Manifest V3) for tracking price history on ouedkniss.com. Full spec in `Plan.md`.

## Tech Stack

- **Extension:** React 19, TypeScript, Tailwind CSS v4, Chart.js, @crxjs/vite-plugin, Manifest V3
- **Backend:** Node.js 22, Fastify, TypeScript, BullMQ, PostgreSQL (Neon), Redis (Upstash)
- **Payments:** Chargily Pay (CIB + EDAHABIA) — Algerian payment gateway
- **Notifications:** Telegram Bot API + chrome.notifications

## Project Structure (Emerging)

```
knissradar-extension/       # Chrome extension (MV3)
  src/background/           # Service worker (stateless, event-driven)
  src/content/              # Content scripts — Shadow DOM injection, DOM parsing, GraphQL interception
  src/popup/                # Extension popup UI (React + Tailwind)
  src/widgets/              # Injected widget components (PriceGraph, TrackPriceDrop, SmartCompare)
  src/shared/               # Shared types, API client, storage wrapper, messaging
```

Backend will live in a separate `knissradar-api/` directory (or monorepo workspace) — not yet created.

## Key Constraints

- **Shadow DOM mandatory** for all injected UI — prevents CSS bleed with Ouedkniss's Vue.js SPA
- **GraphQL interception preferred** over DOM parsing — immune to Ouedkniss layout changes
- **No affiliate program exists** on Ouedkniss — monetization is B2B sponsorships + B2C Pro subscriptions
- **Chargily Pay only** for payments (CIB/EDAHABIA cards) — no Stripe, no PayPal in Algeria
- **Ouedkniss is behind Cloudflare** — backend server-side queries need residential proxies + browser-impersonating TLS (not `fetch`)
- **Extension runs in user's real Chrome** — Cloudflare sees legitimate traffic, no anti-bot evasion needed on extension side

## Ouedkniss API

Public GraphQL at `https://api.ouedkniss.com/graphql` (POST, no auth):
- `SearchQuery` — category browsing, paginated (max 60 per page)
- `AnnouncementGet` — single listing details (id, price, specs, store, city)

Listing URLs: `ouedkniss.com/annonce/<slug>`

## Build & Run

_No build tooling scaffolded yet. When it is:_

```bash
# Extension (from knissradar-extension/)
npm install
npm run dev          # Vite dev server + hot reload
npm run build        # Production build to dist/

# Backend (from knissradar-api/)
npm install
npm run dev          # Fastify dev server
npm run db:migrate   # Run PostgreSQL migrations
```

## Conventions

- TypeScript strict mode everywhere
- All UI components render inside Shadow DOM — never assume global CSS availability
- Price values are integers in DA (Algerian Dinar) — `"price": 145000` not `145000.00`
- Spec labels from Ouedkniss are in French/Arabic: `"Marque"`, `"Modele"`, `"RAM"`, `"Stockage"`
- Category slugs are URL-formatted: `"informatique-ordinateur-portable"`, `"telephonie-smartphone"`
- Listing IDs are strings from GraphQL (not numeric)
- Bilingual UI: French primary, Arabic fallback (Cairo font)
- Brand colors: `#FF4D00` (KnissRadar orange), `#1A1A2E` (deep navy dark bg)

## Common Pitfalls

- Ouedkniss DOM selectors WILL break on site updates — always prefer GraphQL interception as primary data source
- `pricePreview` from GraphQL is a formatted string (`"125,000 DA"`), `price` is the numeric value
- Service workers in MV3 terminate after ~30s idle — never assume state persists; use `chrome.storage.local`
- No `XMLHttpRequest` in service workers — use `fetch()` only
- Chargily Pay amounts are in centimes (multiply DA by 100)
