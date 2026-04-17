import { BaseProvider } from './base';
import { GlobalEvent, Severity, EventCategory } from '../types';

// Geocode cache for common locations
const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  'washington': { lat: 38.9, lng: -77.0 },
  'vatican city': { lat: 41.9, lng: 12.45 },
  'kyiv': { lat: 50.45, lng: 30.52 },
  'gaza': { lat: 31.35, lng: 34.33 },
  'beirut': { lat: 33.89, lng: 35.50 },
  'tehran': { lat: 35.69, lng: 51.39 },
  'beijing': { lat: 39.91, lng: 116.40 },
  'moscow': { lat: 55.76, lng: 37.62 },
  'london': { lat: 51.51, lng: -0.13 },
  'paris': { lat: 48.86, lng: 2.35 },
  'berlin': { lat: 52.52, lng: 13.41 },
  'tokyo': { lat: 35.68, lng: 139.69 },
  'new delhi': { lat: 28.61, lng: 77.21 },
  'istanbul': { lat: 41.01, lng: 28.98 },
  'taipei': { lat: 25.03, lng: 121.57 },
  'seoul': { lat: 37.57, lng: 126.98 },
  'jerusalem': { lat: 31.77, lng: 35.23 },
  'damascus': { lat: 33.51, lng: 36.29 },
  'bangkok': { lat: 13.76, lng: 100.50 },
  'nairobi': { lat: -1.29, lng: 36.82 },
  'cairo': { lat: 30.04, lng: 31.24 },
  'buenos aires': { lat: -34.60, lng: -58.38 },
  'brasilia': { lat: -15.79, lng: -47.88 },
  'canberra': { lat: -35.28, lng: 149.13 },
  'ottawa': { lat: 45.42, lng: -75.70 },
  'united states': { lat: 38.0, lng: -97.0 },
  'usa': { lat: 38.0, lng: -97.0 },
  'ukraine': { lat: 48.38, lng: 31.17 },
  'russia': { lat: 61.52, lng: 105.32 },
  'china': { lat: 35.86, lng: 104.20 },
  'iran': { lat: 32.43, lng: 53.69 },
  'israel': { lat: 31.05, lng: 34.85 },
  'lebanon': { lat: 33.85, lng: 35.86 },
  'syria': { lat: 34.80, lng: 38.99 },
  'uk': { lat: 55.38, lng: -3.44 },
  'france': { lat: 46.23, lng: 2.21 },
  'germany': { lat: 51.17, lng: 10.45 },
  'japan': { lat: 36.20, lng: 138.25 },
  'india': { lat: 20.59, lng: 78.96 },
  'taiwan': { lat: 23.70, lng: 120.96 },
  'south korea': { lat: 35.91, lng: 127.77 },
  'australia': { lat: -25.27, lng: 133.78 },
  'brazil': { lat: -14.24, lng: -51.93 },
  'argentina': { lat: -38.42, lng: -63.62 },
  'nigeria': { lat: 9.08, lng: 8.68 },
  'egypt': { lat: 26.82, lng: 30.80 },
  'kenya': { lat: -0.02, lng: 37.91 },
  'south africa': { lat: -30.56, lng: 22.94 },
  'myanmar': { lat: 21.91, lng: 95.96 },
  'sudan': { lat: 12.86, lng: 30.22 },
  'ethiopia': { lat: 9.15, lng: 40.49 },
};

function geocodeLocation(locationStr: string): { lat: number; lng: number } {
  const lower = locationStr.toLowerCase().trim();
  // Try exact match first
  if (LOCATION_COORDS[lower]) return LOCATION_COORDS[lower];
  // Try partial match
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (lower.includes(key) || key.includes(lower)) return coords;
  }
  // Default: random spread so markers don't overlap
  return { lat: (Math.random() - 0.5) * 140, lng: (Math.random() - 0.5) * 360 };
}

function mapSeverity(score: number): Severity {
  if (score >= 8) return 'critical';
  if (score >= 6) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function mapCategory(cat: string): EventCategory {
  const lower = (cat || '').toLowerCase();
  if (lower.includes('conflict') || lower.includes('war') || lower.includes('military')) return 'security';
  if (lower.includes('disaster') || lower.includes('earthquake') || lower.includes('storm') || lower.includes('flood')) return 'disaster';
  if (lower.includes('market') || lower.includes('economic') || lower.includes('trade')) return 'market';
  if (lower.includes('health') || lower.includes('disease') || lower.includes('pandemic')) return 'health';
  if (lower.includes('infrastructure') || lower.includes('tech') || lower.includes('cyber')) return 'infrastructure';
  return 'geopolitical';
}

interface FirecrawlEvent {
  title?: string;
  location?: { city?: string; country?: string } | string;
  description?: string;
  category?: string;
  severity?: number;
}

function parseLocation(loc: FirecrawlEvent['location']): string {
  if (!loc) return 'Unknown';
  if (typeof loc === 'string') return loc;
  const parts = [loc.city, loc.country].filter(Boolean);
  return parts.join(', ') || 'Unknown';
}

// Firecrawl provider scrapes live news and extracts structured events
export class FirecrawlProvider extends BaseProvider<GlobalEvent[]> {
  private apiKey: string;
  private sources: { url: string; focus: string }[];

  constructor() {
    super('Firecrawl', { maxRetries: 2, retryDelay: 2000 });
    this.apiKey = process.env.FIRECRAWL_API_KEY || '';
    this.sources = [
      { url: 'https://www.bbc.com/news/world', focus: 'global breaking news, conflicts, disasters, political crises' },
      { url: 'https://www.reuters.com/world/', focus: 'geopolitical events, sanctions, trade disputes, security incidents' },
      { url: 'https://news.google.com/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB', focus: 'global events, crises, and developing stories' },
    ];
  }

  async fetch(): Promise<GlobalEvent[]> {
    if (!this.apiKey) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    // Scrape up to 2 sources in parallel to conserve credits
    const scrapePromises = this.sources.slice(0, 2).map(source =>
      fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          url: source.url,
          formats: ['extract'],
          extract: {
            prompt: `Extract a list of up to 8 current global events from this page. For each event provide: title, location (city and country), description (1-2 sentences), category (conflict, disaster, political, economic, social, health), and severity level (1-10 scale). Focus on ${source.focus}. Return as a JSON object with an "events" array.`,
          },
        }),
      }).then(r => {
        if (!r.ok) throw new Error(`Firecrawl API ${r.status}`);
        return r.json();
      })
    );

    const results = await Promise.allSettled(scrapePromises);
    const allEvents: GlobalEvent[] = [];
    const seenTitles = new Set<string>();

    results.forEach((result, idx) => {
      if (result.status !== 'fulfilled') return;
      const data = result.value?.data?.extract;
      if (!data) return;

      // Handle both array and object-with-events-array formats
      const rawEvents: FirecrawlEvent[] = Array.isArray(data) ? data : (data.events || []);

      rawEvents.forEach((ev: FirecrawlEvent, eventIdx: number) => {
        if (!ev.title || seenTitles.has(ev.title.toLowerCase())) return;
        seenTitles.add(ev.title.toLowerCase());

        const locationStr = parseLocation(ev.location);
        const coords = geocodeLocation(locationStr);

        allEvents.push({
          id: `fc-${idx}-${eventIdx}-${Date.now()}`,
          title: ev.title.trim(),
          description: (ev.description || '').trim().slice(0, 300),
          category: mapCategory(ev.category || ''),
          severity: mapSeverity(ev.severity || 5),
          location: {
            lat: coords.lat,
            lng: coords.lng,
            label: locationStr,
          },
          timestamp: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          sources: [this.sources[idx]?.url?.includes('bbc') ? 'BBC News' : this.sources[idx]?.url?.includes('reuters') ? 'Reuters' : 'Google News', 'Firecrawl'],
          affectedMarkets: [],
          status: 'active' as const,
          tags: [ev.category || 'news', 'live', 'firecrawl'],
        });
      });
    });

    return allEvents;
  }

  getDegradedData(): GlobalEvent[] {
    return [];
  }
}
