import { GlobalEvent, NewsItem, MarketData } from './types';

const FIRECRAWL_KEY = 'fc-abd8a3b86a61450b96aa2f89425241d6';

// Severity scoring
function calculateSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 8) return 'critical';
  if (score >= 6) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

// Fetch from GDELT (free geopolitical events)
export async function fetchGDELTEvents(): Promise<GlobalEvent[]> {
  try {
    const response = await fetch(
      'https://api.gdeltproject.org/api/v2/events/ev?format=json&mode=artree&timespan=1hour&query=conflict OR war OR crisis',
      { cache: 'no-store' }
    );
    const data = await response.json();
    return (data.articles || data.events || []).slice(0, 20).map((item: any, idx: number) => ({
      id: `gdelt-${idx}-${Date.now()}`,
      title: item.title || item.name || 'Geopolitical Event',
      description: item.summary || item.segmenttext || '',
      category: 'geopolitical' as const,
      severity: calculateSeverity(item.GoldsteinScale || 5),
      location: {
        lat: item.latitude || item.geo?.lat || 0,
        lng: item.longitude || item.geo?.lon || 0,
        label: item.location || item.admin1 || 'Unknown',
        region: item.countrycode || item.geo?.country || 'Unknown',
      },
      timestamp: item.dateadded || item.seendate || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      sources: item.sources || ['GDELT'],
      affectedMarkets: getAffectedMarkets(item),
      status: 'active' as const,
      tags: item.themes || item.knowngrouptype || [],
    }));
  } catch (error) {
    console.error('GDELT error:', error);
    return [];
  }
}

// Fetch earthquake/disaster data from USGS
export async function fetchDisasterEvents(): Promise<GlobalEvent[]> {
  try {
    const response = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
      { cache: 'no-store' }
    );
    const data = await response.json();
    return data.features?.map((quake: any, idx: number) => ({
      id: `quake-${idx}-${Date.now()}`,
      title: `Magnitude ${quake.properties.mag} Earthquake`,
      description: quake.properties.place || 'Seismic event detected',
      category: 'disaster' as const,
      severity: calculateSeverity(quake.properties.mag || 4),
      location: {
        lat: quake.geometry?.coordinates?.[1] || 0,
        lng: quake.geometry?.coordinates?.[0] || 0,
        label: quake.properties.place || 'Unknown',
      },
      timestamp: new Date(quake.properties.time).toISOString(),
      lastUpdated: new Date(quake.properties.updated).toISOString(),
      sources: ['USGS'],
      affectedMarkets: [{ symbol: 'GC=F', name: 'Gold', category: 'commodity', impact: 'volatile' as const }],
      status: 'active' as const,
      tags: ['earthquake', 'seismic'],
    })) || [];
  } catch (error) {
    console.error('USGS error:', error);
    return [];
  }
}

// Fetch crisis events via Firecrawl
export async function fetchCrisisData(): Promise<GlobalEvent[]> {
  try {
    const response = await fetch(
      `https://api.firecrawl.dev/v0/scrape?url=https://www.crisis.net/updates&key=${FIRECRAWL_KEY}`,
      { cache: 'no-store' }
    );
    const data = await response.json();
    return data.data?.map((item: any, idx: number) => ({
      id: `crisis-${idx}-${Date.now()}`,
      title: item.title || 'Crisis Event',
      description: item.description || item.summary || '',
      category: 'security' as const,
      severity: calculateSeverity(item.severity || 6),
      location: {
        lat: item.lat || 0,
        lng: item.lng || 0,
        label: item.location || item.region || 'Unknown',
      },
      timestamp: item.timestamp || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      sources: item.sources || ['Crisis Monitor'],
      affectedMarkets: [],
      status: 'active' as const,
      tags: ['crisis', 'emergency'],
    })) || [];
  } catch (error) {
    console.error('Crisis data error:', error);
    return [];
  }
}

// Market correlation logic based on event type
function getAffectedMarkets(event: any): GlobalEvent['affectedMarkets'] {
  const themes = (event.themes || []).join(' ').toLowerCase();
  const markets: GlobalEvent['affectedMarkets'] = [];

  if (themes.includes('oil') || themes.includes('energy') || themes.includes('middle_east')) {
    markets.push(
      { symbol: 'CL=F', name: 'Crude Oil', category: 'commodity', impact: 'volatile' },
      { symbol: 'XOM', name: 'ExxonMobil', category: 'equity', impact: 'negative' }
    );
  }
  if (themes.includes('military') || themes.includes('war') || themes.includes('conflict')) {
    markets.push(
      { symbol: 'LMT', name: 'Lockheed Martin', category: 'equity', impact: 'positive' },
      { symbol: 'RTX', name: 'Raytheon', category: 'equity', impact: 'positive' }
    );
  }
  return markets;
}

// Aggregate all events
export async function fetchAllEvents(): Promise<GlobalEvent[]> {
  const [gdelts, disasters, crisis] = await Promise.allSettled([
    fetchGDELTEvents(),
    fetchDisasterEvents(),
    fetchCrisisData(),
  ]);

  const events: GlobalEvent[] = [];
  
  if (gdelts.status === 'fulfilled') events.push(...gdelts.value);
  if (disasters.status === 'fulfilled') events.push(...disasters.value);
  if (crisis.status === 'fulfilled') events.push(...crisis.value);

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  events.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return events.slice(0, 50);
}

export { calculateSeverity };
