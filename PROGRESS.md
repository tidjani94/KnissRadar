# KnissRadar — Progress Tracker

**Last updated:** 2026-07-21

## Sprint Status

| Sprint | Milestone | Issues | Status |
|--------|-----------|--------|--------|
| Sprint 1 | Extension Core | #1-8 | Not started |
| Sprint 2 | Backend Pipeline | #9-16 | In Progress |
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
| #9 | Provision infrastructure (Neon, Upstash, Railway) | — | Not started |
| #10 | Deploy Fastify API with core endpoints | @tidjani94 | Done |
| #11 | Implement telemetry endpoint with UPSERT logic | — | Not started |
| #12 | Build product group matching engine | — | Not started |
| #13 | BullMQ workers: product-group-agg + stale-listing-cleanup | — | Not started |
| #14 | Extension telemetry sender (service worker) | — | Not started |
| #15 | Migrate watchlist to backend API | — | Not started |
| #16 | Replace local price history with API calls | — | Not started |

## Sprint 3: Telegram Alerts (7 issues)

| Issue | Title | Assignee | Status |
|-------|-------|----------|--------|
| #17 | Create Telegram bot with /start flow | — | Not started |
| #18 | Alert dispatch worker (BullMQ) | — | Not started |
| #19 | Telegram alert message formatting | — | Not started |
| #20 | Extension to Telegram linking flow | — | Not started |
| #21 | Browser push notifications (chrome.notifications) | — | Not started |
| #22 | Alert history feed in popup | — | Not started |
| #23 | Background price checker (server-side cron) | — | Not started |

## Sprint 4: Partner Ads & Beta (9 issues)

| Issue | Title | Assignee | Status |
|-------|-------|----------|--------|
| #24 | Partner dashboard (knissradar.dz/partner) | — | Not started |
| #25 | Chargily Pay integration (CIB/EDAHABIA) | — | Not started |
| #26 | Sponsored deal placement in Smart Compare | — | Not started |
| #27 | Impression and click tracking | — | Not started |
| #28 | Partner analytics page | — | Not started |
| #29 | Free/Pro tier gating | — | Not started |
| #30 | Chrome Web Store submission | — | Not started |
| #31 | Beta testing with 50 invited users | — | Not started |
| #32 | Landing page (knissradar.dz) | — | Not started |

## How to Update

When working on an issue:
1. Assign yourself: `gh issue edit <number> --repo tidjani94/KnissRadar --add-assignee tidjani94`
2. Start work: move issue to "In Progress" column on GitHub Projects
3. Complete work: close issue with `gh issue close <number> --repo tidjani94/KnissRadar`
4. Update this file: change status from "Not started" to "In Progress" or "Done"
