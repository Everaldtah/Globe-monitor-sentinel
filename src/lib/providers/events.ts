import { BaseProvider, ProviderResult } from './base';
import { GlobalEvent, Severity, EventCategory } from '../types';
import { FirecrawlProvider } from './firecrawl';

function calculateSeverity(score: number): Severity {
  if (score >= 8) return 'critical';
  if (score >= 6) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function severityFromMagnitude(magnitude: number): Severity {
  if (magnitude >= 7) return 'critical';
  if (magnitude >= 6) return 'high';
  if (magnitude >= 5) return 'medium';
  return 'low';
}

function clampText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.trim();
}

function safeArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(v => String(v)).filter(Boolean);
  if (typeof value === 'string' && value) return [value];
  return [];
}

function getAffectedMarkets(event: any): GlobalEvent['affectedMarkets'] {
  const text = `${safeArray(event.themes).join(' ')} ${safeArray(event.title).join(' ')}`.toLowerCase();
  const markets: GlobalEvent['affectedMarkets'] = [];

  if (text.includes('oil') || text.includes('energy') || text.includes('middle east') || text.includes('shipping')) {
    markets.push(
      { symbol: 'CL=F', name: 'Crude Oil', category: 'commodity', impact: 'volatile' },
      { symbol: 'XOM', name: 'ExxonMobil', category: 'equity', impact: 'negative' },
      { symbol: 'ZIM', name: 'ZIM Integrated Shipping', category: 'equity', impact: 'negative' }
    );
  }

  if (text.includes('war') || text.includes('conflict') || text.includes('military') || text.includes('sanction')) {
    markets.push(
      { symbol: 'LMT', name: 'Lockheed Martin', category: 'equity', impact: 'positive' },
      { symbol: 'RTX', name: 'RTX', category: 'equity', impact: 'positive' },
      { symbol: 'IAU', name: 'Gold ETF', category: 'equity', impact: 'positive' }
    );
  }

  if (text.includes('earthquake') || text.includes('storm') || text.includes('flood')) {
    markets.push({ symbol: 'GC=F', name: 'Gold', category: 'commodity', impact: 'volatile' });
  }

  return markets.slice(0, 4);
}

// USGS Provider for earthquake data
export class USGSProvider extends BaseProvider<GlobalEvent[]> {
  constructor() {
    super('USGS', { maxRetries: 3, retryDelay: 1000 });
  }

  async fetch(): Promise<GlobalEvent[]> {
    const response = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
      { next: { revalidate: 60 } }
    );
    
    if (!response.ok) {
      throw new Error(`USGS API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    return (data.features || []).map((quake: any) => ({
      id: `quake-${quake.id}`,
      title: `Magnitude ${quake.properties.mag} Earthquake`,
      description: clampText(quake.properties.place, 'Seismic event detected'),
      category: 'disaster' as EventCategory,
      severity: severityFromMagnitude(Number(quake.properties.mag || 4)),
      location: {
        lat: Number(quake.geometry?.coordinates?.[1] ?? 0),
        lng: Number(quake.geometry?.coordinates?.[0] ?? 0),
        label: clampText(quake.properties.place, 'Unknown'),
      },
      timestamp: new Date(quake.properties.time).toISOString(),
      lastUpdated: new Date(quake.properties.updated).toISOString(),
      sources: ['USGS Earthquake Hazards Program'],
      affectedMarkets: [{ symbol: 'GC=F', name: 'Gold', category: 'commodity', impact: 'volatile' }],
      status: 'active' as const,
      tags: ['earthquake', 'seismic', 'USGS'],
    }));
  }

  getDegradedData(): GlobalEvent[] {
    return [];
  }
}

// GDELT Provider for geopolitical events
export class GDELTProvider extends BaseProvider<GlobalEvent[]> {
  constructor() {
    super('GDELT', { maxRetries: 3, retryDelay: 1000 });
  }

  async fetch(): Promise<GlobalEvent[]> {
    const response = await fetch(
      'https://api.gdeltproject.org/api/v2/events/ev?format=json&mode=artree&timespan=1hour&query=conflict OR war OR crisis OR sanctions OR attacks',
      { cache: 'no-store' }
    );
    
    if (!response.ok) {
      throw new Error(`GDELT API returned ${response.status}`);
    }
    
    const data = await response.json();
    const items = Array.isArray(data?.events) ? data.events : Array.isArray(data?.articles) ? data.articles : [];
    
    return items.slice(0, 20).map((item: any, idx: number) => ({
      id: `gdelt-${idx}-${Date.now()}`,
      title: clampText(item.title, 'Geopolitical Event'),
      description: clampText(item.summary || item.segmenttext || item.description, 'Live geopolitical update'),
      category: 'geopolitical' as EventCategory,
      severity: calculateSeverity(Number(item.GoldsteinScale ?? 5)),
      location: {
        lat: Number(item.latitude ?? item.geo?.lat ?? 0),
        lng: Number(item.longitude ?? item.geo?.lon ?? 0),
        label: clampText(item.location || item.admin1 || item.countrycode, 'Unknown'),
        region: clampText(item.countrycode || item.geo?.country, 'Unknown'),
      },
      timestamp: clampText(item.dateadded || item.seendate, new Date().toISOString()),
      lastUpdated: new Date().toISOString(),
      sources: safeArray(item.sources).length ? safeArray(item.sources) : ['GDELT'],
      affectedMarkets: getAffectedMarkets(item),
      status: 'active' as const,
      tags: safeArray(item.themes).slice(0, 5),
    }));
  }

  getDegradedData(): GlobalEvent[] {
    return [];
  }
}

// Multi-provider aggregator for events
export class EventsAggregator {
  private providers: BaseProvider<GlobalEvent[]>[];

  constructor() {
    this.providers = [new USGSProvider(), new GDELTProvider(), new FirecrawlProvider()];
  }

  async fetchAll(): Promise<ProviderResult<GlobalEvent[]>> {
    const results = await Promise.allSettled(
      this.providers.map(p => p.fetchWithRetry())
    );

    let allEvents: GlobalEvent[] = [];
    let hasDegraded = false;
    const errors: string[] = [];

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        allEvents.push(...result.value.data);
        if (result.value.degraded) {
          hasDegraded = true;
          if (result.value.error) errors.push(result.value.error);
        }
      } else {
        hasDegraded = true;
        errors.push(result.reason?.message || String(result.reason));
      }
    });

    // Sort by severity
    const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    allEvents.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return {
      data: allEvents.slice(0, 50),
      degraded: hasDegraded,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      source: 'USGS/GDELT/Firecrawl Aggregator',
      timestamp: new Date().toISOString(),
    };
  }

  async healthCheck() {
    const checks = await Promise.all(this.providers.map(p => p.healthCheck()));
    return checks;
  }
}
