import { FlightTrack, GlobalEvent, LiveChannel, MarketData, VesselTrack, WeatherOverlay } from './types';

const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY || '';
const AISSTREAM_KEY = process.env.AISSTREAM_API_KEY || '';

function calculateSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 8) return 'critical';
  if (score >= 6) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function severityFromMagnitude(magnitude: number): 'low' | 'medium' | 'high' | 'critical' {
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

export async function fetchGDELTEvents(): Promise<GlobalEvent[]> {
  try {
    const response = await fetch(
      'https://api.gdeltproject.org/api/v2/events/ev?format=json&mode=artree&timespan=1hour&query=conflict OR war OR crisis OR sanctions OR attacks',
      { cache: 'no-store' }
    );
    const data = await response.json();
    const items = Array.isArray(data?.events) ? data.events : Array.isArray(data?.articles) ? data.articles : [];
    return items.slice(0, 20).map((item: any, idx: number) => ({
      id: `gdelt-${idx}-${Date.now()}`,
      title: clampText(item.title, 'Geopolitical Event'),
      description: clampText(item.summary || item.segmenttext || item.description, 'Live geopolitical update'),
      category: 'geopolitical' as const,
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
  } catch (error) {
    console.error('GDELT error:', error);
    return [];
  }
}

export async function fetchDisasterEvents(): Promise<GlobalEvent[]> {
  try {
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson', { cache: 'no-store' });
    const data = await response.json();
    return (data.features || []).slice(0, 20).map((quake: any, idx: number) => ({
      id: `quake-${idx}-${Date.now()}`,
      title: `Magnitude ${quake.properties.mag} Earthquake`,
      description: clampText(quake.properties.place, 'Seismic event detected'),
      category: 'disaster' as const,
      severity: severityFromMagnitude(Number(quake.properties.mag || 4)),
      location: {
        lat: Number(quake.geometry?.coordinates?.[1] ?? 0),
        lng: Number(quake.geometry?.coordinates?.[0] ?? 0),
        label: clampText(quake.properties.place, 'Unknown'),
      },
      timestamp: new Date(quake.properties.time).toISOString(),
      lastUpdated: new Date(quake.properties.updated).toISOString(),
      sources: ['USGS'],
      affectedMarkets: [{ symbol: 'GC=F', name: 'Gold', category: 'commodity', impact: 'volatile' }],
      status: 'active' as const,
      tags: ['earthquake', 'seismic'],
    }));
  } catch (error) {
    console.error('USGS error:', error);
    return [];
  }
}

export async function fetchWeatherOverlay(): Promise<WeatherOverlay[]> {
  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current=temperature_2m,precipitation,cloud_cover,wind_speed_10m&timezone=UTC', { cache: 'no-store' });
    const data = await response.json();
    const current = data.current || {};
    return [{
      lat: 0,
      lng: 0,
      cloudiness: Number(current.cloud_cover ?? 50),
      temperatureC: Number(current.temperature_2m ?? 0),
      windSpeed: Number(current.wind_speed_10m ?? 0),
      precipitationMm: Number(current.precipitation ?? 0),
    }];
  } catch {
    return [];
  }
}

export async function fetchLiveFlights(): Promise<FlightTrack[]> {
  try {
    const response = await fetch('https://opensky-network.org/api/states/all', { cache: 'no-store' });
    const data = await response.json();
    return (data.states || []).slice(0, 24).map((state: any, idx: number) => ({
      id: `flight-${idx}-${state[0] || idx}`,
      callsign: clampText(state[1], ''),
      origin: '',
      destination: '',
      lat: Number(state[6] || 0),
      lng: Number(state[5] || 0),
      altitude: Number(state[7] || 0),
      heading: Number(state[10] || 0),
      speed: Number(state[9] || 0),
      category: 'aircraft' as const,
    })).filter((item: FlightTrack) => item.lat && item.lng);
  } catch {
    return [];
  }
}

export async function fetchLiveVessels(): Promise<VesselTrack[]> {
  if (!AISSTREAM_KEY) return [];
  try {
    const response = await fetch('https://api.aisstream.io/v1/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AISSTREAM_KEY,
      },
      body: JSON.stringify({
        subscriptionType: 'LastKnownPosition',
        // The API requires one of the documented subscription shapes; keep it minimal here.
      }),
      cache: 'no-store' as RequestCache,
    });
    const text = await response.text();
    const lines = text.split('\n').filter(Boolean);
    return lines.slice(0, 20).map((line, idx) => {
      try {
        const msg = JSON.parse(line);
        const meta = msg.MetaData || {};
        return {
          id: `vessel-${idx}-${meta.MMSI || idx}`,
          name: clampText(meta.ShipName, ''),
          mmsi: meta.MMSI ? String(meta.MMSI) : undefined,
          lat: Number(meta.latitude || 0),
          lng: Number(meta.longitude || 0),
          sog: Number(msg.Message?.PositionReport?.Sog || 0),
          cog: Number(msg.Message?.PositionReport?.Cog || 0),
          category: 'vessel' as const,
        };
      } catch {
        return null;
      }
    }).filter(Boolean) as VesselTrack[];
  } catch {
    return [];
  }
}

export async function fetchLiveChannelsForEvent(event: GlobalEvent): Promise<LiveChannel[]> {
  try {
    const query = encodeURIComponent(`${event.location.label} live news OR live coverage OR breaking news`);
    const response = await fetch(`https://www.youtube.com/results?search_query=${query}`, { cache: 'no-store' });
    const html = await response.text();
    const matches = [...html.matchAll(/"videoId":"([^"]+)".*?"title":{"runs":\[{"text":"([^"]+)"\]}/g)].slice(0, 3);
    return matches.map((m) => ({
      platform: 'youtube' as const,
      title: m[2],
      url: `https://www.youtube.com/watch?v=${m[1]}`,
      source: 'YouTube search',
    }));
  } catch {
    return [];
  }
}

export async function fetchAllEvents(): Promise<GlobalEvent[]> {
  const [gdelts, disasters] = await Promise.allSettled([
    fetchGDELTEvents(),
    fetchDisasterEvents(),
  ]);

  const events: GlobalEvent[] = [];
  if (gdelts.status === 'fulfilled') events.push(...gdelts.value);
  if (disasters.status === 'fulfilled') events.push(...disasters.value);

  const severityOrder: Record<GlobalEvent['severity'], number> = { critical: 0, high: 1, medium: 2, low: 3 };
  events.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  return events.slice(0, 50);
}

export { calculateSeverity };
