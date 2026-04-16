# Sentinel Globe

A Palantir-style global observatory dashboard built with Next.js. The repository focuses on a dark, cinematic command-centre interface for monitoring geopolitical events, disasters, news flow, and market correlations.

## What is currently implemented

### Frontend
- A full-screen dashboard layout in `src/app/page.tsx`
- A 3D globe view powered by React Three Fiber in `src/components/Globe/GlobeScene.tsx`
- An event detail drawer in `src/components/EventPanel/EventPanel.tsx`
- A left-hand filter rail in `src/components/FilterSidebar/FilterSidebar.tsx`
- A market panel in `src/components/MarketCorrelations/MarketCorrelations.tsx`
- A top news ticker in `src/components/NewsTicker/NewsTicker.tsx`
- Custom dark theme styling in `src/app/globals.css`

### API routes
- `GET /api/events` — earthquake events from the USGS 4.5+ daily feed
- `GET /api/markets` — basic market data from CoinGecko and Frankfurter
- `GET /api/news` — news list route built around NewsAPI-style article results

### Supporting data layer
- `src/lib/types.ts` defines the shared event, market, and news types
- `src/lib/dataService.ts` contains helper functions for aggregating live data sources

## Important accuracy note

The current homepage still uses sample event data defined in `src/app/page.tsx`. The live API routes exist, but they are not yet wired into the main UI. That means the repo is a working product shell with some live data endpoints, not a finished real-time ingestion pipeline.

## External data sources referenced in the code

- USGS earthquake feed
- CoinGecko price API
- Frankfurter exchange-rate API
- NewsAPI-style search endpoint
- Firecrawl-based scraping helper in `src/lib/dataService.ts`

Some of those routes and helpers will need real API keys or stricter source handling before they are reliable in production.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm start
```

## Deployment

The project is configured for Vercel via `vercel.json`.

## Project files

- `SPEC.md` — product brief and design direction
- `src/app/page.tsx` — dashboard homepage
- `src/app/api/*` — data endpoints
- `src/components/*` — UI building blocks
- `src/lib/*` — shared types and data helpers

## Notes for future work

- Wire the homepage to the live API routes instead of sample data
- Replace any placeholder or demo API usage with real keys and proper source handling
- Add an `.env.example` file if you want to formalise required secrets
- Expand the ingestion layer into a proper scheduled fetch/normalisation pipeline
