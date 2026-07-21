# KnissRadar — Progress Tracker

**Last updated:** 2026-07-21

## Sprint Status

| Sprint | Milestone | Issues | Status |
|--------|-----------|--------|--------|
| Sprint 1 | Extension Core | #1-8 | Not started |
| Sprint 2 | Backend Pipeline | #9-16 | Done |
| Sprint 3 | Telegram Alerts | #17-23 | Not started |
| Sprint 4 | Partner Ads & Beta | #24-32 | Not started |

## Sprint 1: Extension Core (8 issues)

| Issue | Title | Assignee | Status |
|-------|-------|----------|--------|
| #1 | Scaffold MV3 project with Vite + React + Tailwind + TypeScript | @tidjani94 | Done |
| #2 | Implement Shadow DOM injection on listing pages | @tidjani94 | Done |
| #3 | Build GraphQL interceptor for listing data | @tidjani94 | Done |
| #4 | DOM fallback extractor with versioned selectors | @tidjani94 | Done |
| #5 | Build PriceGraph widget with Chart.js | @tidjani94 | Done |
| #6 | Build TrackPriceDrop form | @tidjani94 | Done |
| #7 | Local storage watchlist with chrome.storage.local | @tidjani94 | Done |
| #8 | Build extension popup UI | @tidjani94 | Done |

## Sprint 2: Backend Pipeline (8 issues)

| Issue | Title | Assignee | Status |
|-------|-------|----------|--------|
| #9 | Provision infrastructure (Neon, Upstash, Railway) | @tidjani94 | Done |
| #10 | Deploy Fastify API with core endpoints | @tidjani94 | Done |
| #11 | Implement telemetry endpoint with UPSERT logic | @tidjani94 | Done |
| #12 | Build product group matching engine | @tidjani94 | Done |
| #13 | BullMQ workers: product-group-agg + stale-listing-cleanup | @tidjani94 | Done |
| #14 | Extension telemetry sender (service worker) | @tidjani94 | Done |
| #15 | Migrate watchlist to backend API | @tidjani94 | Done |
| #16 | Replace local price history with API calls | @tidjani94 | Done |

## Sprint 3: Telegram Alerts (7 issues)

| Issue | Title | Assignee | Status |
|-------|-------|----------|--------|
| #17 | Create Telegram bot with /start flow | @tidjani94 | Done |
| #18 | Alert dispatch worker (BullMQ) | @tidjani94 | Done |
| #19 | Telegram alert message formatting | @tidjani94 | Done |
| #20 | Extension to Telegram linking flow | @tidjani94 | Done |
| #21 | Browser push notifications (chrome.notifications) | @tidjani94 | Done |
| #22 | Alert history feed in popup | @tidjani94 | Done |
| #23 | Background price checker (server-side cron) | @tidjani94 | Done |

## Sprint 4: Partner Ads & Beta (9 issues)

| Issue | Title | Assignee | Status |
|-------|-------|----------|--------|
| #24 | Partner dashboard (knissradar.dz/partner) | @tidjani94 | Done |
| #25 | Chargily Pay integration (CIB/EDAHABIA) | @tidjani94 | Done |
| #26 | Sponsored deal placement in Smart Compare | @tidjani94 | Done |
| #27 | Impression and click tracking | @tidjani94 | Done |
| #28 | Partner analytics page | @tidjani94 | Done |
| #29 | Free/Pro tier gating | @tidjani94 | Done |
| #30 | Chrome Web Store submission | @tidjani94 | Done |
| #31 | Beta testing with 50 invited users | @tidjani94 | Done |
| #32 | Landing page (knissradar.dz) | @tidjani94 | Done |

## How to Update

When working on an issue:
1. Assign yourself: `gh issue edit <number> --repo tidjani94/KnissRadar --add-assignee tidjani94`
2. Start work: move issue to "In Progress" column on GitHub Projects
3. Complete work: close issue with `gh issue close <number> --repo tidjani94/KnissRadar`
4. Update this file: change status from "Not started" to "In Progress" or "Done"
