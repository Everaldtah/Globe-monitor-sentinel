import { BaseProvider } from './base';
import { VesselTrack } from '../types';

function clampText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.trim();
}

// MarineTraffic-like fallback provider
export class MarineTrafficProvider extends BaseProvider<VesselTrack[]> {
  private apiKey: string | undefined;

  constructor() {
    super('MarineTraffic', { maxRetries: 2, retryDelay: 1000 });
    this.apiKey = process.env.MARINETRAFFIC_API_KEY;
  }

  async fetch(): Promise<VesselTrack[]> {
    if (!this.apiKey) {
      throw new Error('MarineTraffic API key not configured');
    }

    const response = await fetch(
      `https://services.marinetraffic.com/api/exportvessels/v:8/${this.apiKey}/protocol:json/bounds:37.0,25.0,46.0,36.0`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`MarineTraffic API returned ${response.status}`);
    }

    const data = await response.json();
    return (data || []).map((vessel: any, idx: number) => ({
      id: `vessel-mt-${vessel.MMSI || idx}`,
      name: clampText(vessel.SHIPNAME, ''),
      mmsi: vessel.MMSI ? String(vessel.MMSI) : undefined,
      lat: Number(vessel.LAT || 0),
      lng: Number(vessel.LON || 0),
      sog: Number(vessel.SPEED || 0),
      cog: Number(vessel.COURSE || 0),
      category: 'vessel' as const,
    })).filter((item: VesselTrack) => item.lat !== 0 && item.lng !== 0);
  }

  getDegradedData(): VesselTrack[] {
    return [];
  }
}

// AIS Stream WebSocket/API Provider (primary)
export class AISStreamProvider extends BaseProvider<VesselTrack[]> {
  private apiKey: string | undefined;

  constructor() {
    super('AISStream', { maxRetries: 3, retryDelay: 1000 });
    this.apiKey = process.env.AISSTREAM_API_KEY;
  }

  async fetch(): Promise<VesselTrack[]> {
    if (!this.apiKey) {
      throw new Error('AISSTREAM_API_KEY not set');
    }

    const response = await fetch('https://api.aisstream.io/v1/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.apiKey,
      },
      body: JSON.stringify({
        subscriptionType: 'LastKnownPosition',
      }),
      cache: 'no-store' as RequestCache,
    });

    if (!response.ok) {
      throw new Error(`AISStream API returned ${response.status}`);
    }

    const text = await response.text();
    const lines = text.split('\n').filter(Boolean);
    
    const results: VesselTrack[] = [];
    const parsed = lines
      .slice(0, 30)
      .map((line, idx) => {
        try {
          const msg = JSON.parse(line);
          const meta = msg.MetaData || {};
          return {
            id: `vessel-${meta.MMSI || idx}`,
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
      });

    for (const item of parsed) {
      if (item !== null && item.lat !== 0 && item.lng !== 0) {
        results.push(item);
      }
    }
    return results;
  }

  getDegradedData(): VesselTrack[] {
    return [];
  }
}

// Fallback provider with major shipping route samples
export class VesselFallbackProvider extends BaseProvider<VesselTrack[]> {
  constructor() {
    super('VesselFallback', { maxRetries: 1, retryDelay: 500 });
  }

  async fetch(): Promise<VesselTrack[]> {
    return this.getDegradedData();
  }

  getDegradedData(): VesselTrack[] {
    const sampleVessels: VesselTrack[] = [
      { id: 'vessel-fallback-1', name: 'EVER GIVEN', mmsi: '353136000', lat: 30.05, lng: 32.35, sog: 12.5, cog: 45, category: 'vessel' },
      { id: 'vessel-fallback-2', name: 'MSC OSCAR', mmsi: '370136000', lat: 36.15, lng: -5.35, sog: 18.2, cog: 270, category: 'vessel' },
      { id: 'vessel-fallback-3', name: 'OOCL HONG KONG', mmsi: '477321400', lat: 1.35, lng: 103.90, sog: 15.8, cog: 180, category: 'vessel' },
      { id: 'vessel-fallback-4', name: 'COSCO SHIPPING', mmsi: '412377000', lat: 35.50, lng: 140.00, sog: 14.3, cog: 90, category: 'vessel' },
      { id: 'vessel-fallback-5', name: 'MAERSK LINE', mmsi: '219123000', lat: 55.50, lng: 125.00, sog: 16.7, cog: 135, category: 'vessel' },
      { id: 'vessel-fallback-6', name: 'CMA CGM', mmsi: '228167900', lat: 34.05, lng: -118.25, sog: 11.2, cog: 315, category: 'vessel' },
    ];
    return sampleVessels;
  }
}

// Vessel aggregator with AISStream primary + fallback
export class VesselAggregator {
  private primaryProvider: AISStreamProvider;
  private secondaryProvider: MarineTrafficProvider | null;
  private fallbackProvider: VesselFallbackProvider;

  constructor() {
    this.primaryProvider = new AISStreamProvider();
    this.secondaryProvider = process.env.MARINETRAFFIC_API_KEY ? new MarineTrafficProvider() : null;
    this.fallbackProvider = new VesselFallbackProvider();
  }

  async fetchWithFallback(): Promise<{ data: VesselTrack[]; degraded: boolean; source: string }> {
    const primaryResult = await this.primaryProvider.fetchWithRetry();
    
    if (!primaryResult.degraded && primaryResult.data.length > 0) {
      return {
        data: primaryResult.data.slice(0, 30),
        degraded: false,
        source: 'AISStream',
      };
    }

    if (this.secondaryProvider) {
      const secondaryResult = await this.secondaryProvider.fetchWithRetry();
      if (!secondaryResult.degraded && secondaryResult.data.length > 0) {
        return {
          data: secondaryResult.data.slice(0, 30),
          degraded: true,
          source: 'MarineTraffic',
        };
      }
    }

    const fallbackResult = await this.fallbackProvider.fetchWithRetry();
    return {
      data: fallbackResult.data,
      degraded: true,
      source: 'AISStream/MarineTraffic (degraded - using fallback)',
    };
  }

  async healthCheck() {
    const checks = [];
    checks.push(await this.primaryProvider.healthCheck());
    if (this.secondaryProvider) {
      checks.push(await this.secondaryProvider.healthCheck());
    }
    return checks;
  }
}
