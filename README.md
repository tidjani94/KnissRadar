# KnissRadar

Track price history on [ouedkniss.com](https://ouedkniss.com). See 30/90-day price trends, get alerts when prices drop, and compare similar deals.

## What It Does

- **Price History Graph** — See 7, 30, or 90-day trends on any listing
- **Price Drop Alerts** — Browser notifications + Telegram when prices hit your target
- **Smart Compare** — Compare similar products across sellers
- **B2B Sponsorships** — Partner dashboard for Algerian merchants

## Tech Stack

| Layer | Tech |
|-------|------|
| Extension | React 19, TypeScript, Tailwind CSS v4, Chart.js, Manifest V3 |
| Backend | Node.js 22, Fastify, PostgreSQL (Neon), Redis (Upstash), BullMQ |
| Payments | Chargily Pay (CIB + EDAHABIA) |
| Alerts | Telegram Bot API + chrome.notifications |

## Project Structure

```
knissradar-extension/       # Chrome extension (MV3)
  src/background/           # Service worker — telemetry, notifications
  src/content/              # Content scripts — Shadow DOM, GraphQL interception
  src/popup/                # Extension popup UI (React + Tailwind)
  src/widgets/              # Injected widgets (PriceGraph, TrackPriceDrop)
  src/shared/               # Types, API client, storage

knissradar-api/             # Backend API
  src/routes/               # Fastify routes
  src/lib/                  # Business logic (group-matcher, telegram, chargily)
  src/workers/              # BullMQ workers
  src/db/                   # PostgreSQL pool + migrations

knissradar-landing/         # Landing page (knissradar.dz)
```

## Quick Start

### Extension

```bash
cd knissradar-extension
npm install
npm run dev          # Vite dev server with HMR
npm run build        # Production build to dist/
```

### Backend

```bash
cd knissradar-api
cp .env.example .env  # Fill in real credentials
npm install
npm run dev           # Fastify dev server
npm run db:migrate    # Run PostgreSQL migrations
npm run worker        # Start BullMQ workers
```

### Local Dev with Docker

```bash
cd knissradar-api
docker-compose up -d  # PostgreSQL + Redis
```

## Environment Variables

Copy `knissradar-api/.env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `REDIS_URL` | Upstash Redis URL |
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `CHARGILY_API_KEY` | Chargily Pay API key |
| `CHARGILY_SECRET_KEY` | Chargily Pay secret key |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/listings/search` | Search listings |
| GET | `/api/v1/listings/:id` | Get listing details |
| GET | `/api/v1/listings/:id/history` | Price history |
| POST | `/api/v1/telemetry` | Batch upsert listings |
| GET | `/api/v1/groups` | Product groups |
| GET | `/api/v1/groups/sponsors` | Sponsored banners |
| GET/POST/DELETE | `/api/v1/watchlist` | Watchlist CRUD |
| POST | `/api/v1/partner/register` | Partner registration |
| GET | `/api/v1/partner/analytics` | Partner analytics |
| POST | `/api/v1/partner/payments/create` | Chargily checkout |

## Key Constraints

- **Shadow DOM mandatory** — All injected UI uses Shadow DOM to avoid CSS bleed
- **GraphQL interception preferred** — Immune to Ouedkniss layout changes
- **Chargily Pay only** — CIB + EDAHABIA (no Stripe/PayPal in Algeria)
- **Price values are integers** — DA (Algerian Dinar), e.g. `"price": 145000`
- **Bilingual UI** — French primary, Arabic fallback (Cairo font)
- **Brand colors** — `#FF4D00` (orange), `#1A1A2E` (navy dark)

## Deployment

### API (Railway)
```bash
# Railway auto-deploys from main branch
# Ensure DATABASE_URL and REDIS_URL are set in Railway dashboard
```

### Extension (Chrome Web Store)
```bash
cd knissradar-extension
npm run build
# Zip dist/ folder and upload to Chrome Web Store Developer Dashboard
```

### Landing (Vercel/Netlify)
```bash
# Deploy knissradar-landing/ directory
```

## License

Private — All rights reserved.

## Made in Algeria 🇩🇿
