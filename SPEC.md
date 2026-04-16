# Sentinel Globe — Global Intelligence Observatory

## 1. Concept & Vision

Sentinel Globe is a Palantir-inspired real-time global intelligence platform that fuses live geopolitical events, conflict data, and market signals into a cinematic 3D command interface. It feels like sitting inside a futuristic defense operations center — dark, authoritative, and alive with data. Every pin on the globe tells a story; every pulse connects to a market.

## 2. Design Language

### Aesthetic Direction
**Palantir Command + Blade Runner Observatory** — Deep space blacks, electric cyan data streams, amber threat alerts, with subtle scanline textures and holographic glows. Typography is technical and precise. The globe breathes with ambient pulse animations.

### Color Palette
- **Background**: `#030810` (near-black navy)
- **Surface**: `#0a1628` (dark slate)
- **Panel**: `#0f2137` (elevated surface)
- **Primary**: `#00d4ff` (electric cyan — data, highlights)
- **Secondary**: `#6366f1` (indigo — secondary data)
- **Accent Warm**: `#f59e0b` (amber — warnings, medium threat)
- **Accent Danger**: `#ef4444` (red — high threat, conflict)
- **Accent Success**: `#10b981` (green — resolved, positive)
- **Text Primary**: `#e2e8f0`
- **Text Muted**: `#64748b`
- **Border**: `#1e3a5f`

### Typography
- **Display**: `Orbitron` (Google Fonts) — logo, major headings
- **UI/Body**: `JetBrains Mono` (Google Fonts) — all data, labels, values
- **Fallback**: `monospace`

### Motion Philosophy
- Globe auto-rotates slowly (0.1°/frame)
- Event markers pulse with radial glow (2s ease-in-out infinite)
- Panel slide-ins: 300ms cubic-bezier(0.16, 1, 0.3, 1)
- Data updates: fade + slight upward translate (200ms)
- Scanline overlay: 8s linear infinite

## 3. Layout & Structure

```
┌──────────────────────────────────────────────────────────────────────┐
│  HEADER: Logo | Global Stats Bar | Live Clock | Status Indicators    │
├────────────────────┬─────────────────────────────────────────────────┤
│                    │                                                 │
│   LEFT PANEL       │              GLOBE (centerpiece)                 │
│   - Event Filter   │              Three.js 3D globe                  │
│   - Category Tabs  │              ~70% of viewport                   │
│   - Search          │                                                 │
│                    │                                                 │
│   HEIGHT: 70vh     ├──────────────────────┬──────────────────────────┤
│                    │   RIGHT PANEL         │   BOTTOM TICKER          │
│                    │   - Event Detail      │   - Breaking News         │
│                    │   - Market Correl.    │   - Price Updates         │
│                    │   - Related Events    │   - Alert Feed            │
└────────────────────┴──────────────────────┴──────────────────────────┘
```

## 4. Features & Interactions

### 4.1 Interactive 3D Globe
- WebGL globe with Earth texture, city lights, atmosphere glow
- Event markers: colored circles by severity (red/amber/cyan/green)
- Hover marker → tooltip preview
- Click marker → right panel populates with full event details
- Drag to rotate, scroll to zoom
- Clustered markers for dense regions

### 4.2 Event Categories
- 🌍 Geopolitical Conflicts
- 💰 Market Moving Events  
- 🌊 Natural Disasters
- 🎯 Terrorism / Security
- 🚨 Critical Infrastructure
- 🔬 Epidemiological Alerts

### 4.3 Event Objects
```typescript
interface GlobalEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: { lat: number; lng: number; label: string };
  timestamp: Date;
  sources: string[];
  affectedMarkets: MarketCorrelation[];
  status: 'active' | 'monitoring' | 'resolved';
  tags: string[];
}
```

### 4.4 Market Correlations
Each event maps to affected financial instruments:
- **Oil/Gas conflicts** → Crude oil, Natural gas, energy equities
- **Middle East tensions** → Gold, USD, crypto, defense stocks
- **China tensions** → Semiconductor indices, Asian markets
- **EU instability** → EUR/USD, European indices
- **Natural disasters** → Insurance, reinsurance, commodities

### 4.5 Data Sources (Free APIs)
- **ACLED** conflict data via proxy
- **USGS** earthquake feed
- **GDELT** global events (free tier)
- **OpenWeatherMap** for disaster correlation
- **CryptoCompare** for crypto prices
- ** exchangerate-api** for currency
- **Alpha Vantage** for market data (free tier)

## 5. Component Inventory

| Component | States |
|-----------|--------|
| `Globe` | loading, idle, rotating, interacting |
| `EventMarker` | low/medium/high/critical, hover, selected |
| `EventPanel` | empty, loading, populated |
| `MarketCard` | positive (green glow), negative (red glow), neutral |
| `StatsBar` | loading skeleton, live data |
| `FilterSidebar` | collapsed, expanded |
| `NewsTicker` | scrolling, paused on hover |
| `ThreatMeter` | low→critical gradient fill |

## 6. Technical Approach

### Stack
- **Framework**: Next.js 14 (App Router)
- **Globe**: `@react-three/fiber` + `@react-three/drei`
- **Styling**: Tailwind CSS + CSS custom properties
- **State**: React hooks + Context
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Architecture
```
frontend/
├── app/
│   ├── page.tsx              # Main dashboard
│   ├── layout.tsx           # Root layout with fonts
│   └── globals.css          # Design tokens + base styles
├── components/
│   ├── Globe/
│   ├── EventPanel/
│   ├── FilterSidebar/
│   ├── MarketCorrelations/
│   ├── NewsTicker/
│   └── ui/ (shared primitives)
└── lib/
    ├── types.ts              # Event, Market interfaces
    ├── mockData.ts           # Realistic event generators
    └── marketCorrelations.ts  # Event → market mappings
```

### API Routes (Next.js Route Handlers)
- `GET /api/events` — list events (filterable)
- `GET /api/events/[id]` — single event
- `GET /api/markets` — current market data
- `GET /api/markets/correlations/[eventId]` — affected markets
- `GET /api/stream/events` — SSE for live updates

## 7. Example Data

```json
{
  "id": "evt-001",
  "title": "South China Sea Naval Exercise",
  "description": "Coordinated naval exercise by PLAN in disputed waters...",
  "category": "geopolitical",
  "severity": "high",
  "location": { "lat": 14.5, "lng": 118.2, "label": "South China Sea" },
  "affectedMarkets": ["oil", "shipping", "semiconductors"],
  "timestamp": "2024-01-15T08:30:00Z"
}
```
