import { BaseProvider } from './base';
import { FlightTrack } from '../types';

function clampText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.trim();
}

// OpenSky Network Provider for flight tracking
export class OpenSkyProvider extends BaseProvider<FlightTrack[]> {
  constructor() {
    super('OpenSky', { maxRetries: 3, retryDelay: 1000 });
  }

  async fetch(): Promise<FlightTrack[]> {
    const response = await fetch('https://opensky-network.org/api/states/all', { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`OpenSky API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // OpenSky states format: [icao24, callsign, origin_country, time_position, time_velocity, 
    // longitude, latitude, altitude, on_ground, velocity, heading, vertical_rate, sensors, 
    // geo_altitude, squawk, spi, position_source]
    return (data.states || [])
      .slice(0, 50)
      .map((state: any[], idx: number) => ({
        id: `flight-${state[0] || idx}-${Date.now()}`,
        callsign: clampText(state[1], '').trim(),
        origin: clampText(state[2], 'Unknown'),
        destination: '',
        lat: Number(state[6] || 0),
        lng: Number(state[5] || 0),
        altitude: Number(state[7] || 0),
        heading: Number(state[10] || 0),
        speed: Number(state[9] || 0), // velocity in m/s
        category: 'aircraft' as const,
      }))
      .filter((item: FlightTrack) => item.lat !== 0 && item.lng !== 0);
  }

  getDegradedData(): FlightTrack[] {
    // Return empty array or cached sample data
    return [];
  }
}

// Fallback provider with static/demo data when OpenSky is unavailable
export class FlightFallbackProvider extends BaseProvider<FlightTrack[]> {
  constructor() {
    super('FlightFallback', { maxRetries: 1, retryDelay: 500 });
  }

  async fetch(): Promise<FlightTrack[]> {
    return this.getDegradedData();
  }

  getDegradedData(): FlightTrack[] {
    // Return sample flight data for major airports
    const sampleFlights: FlightTrack[] = [
      { id: 'flight-demo-1', callsign: 'UAL123', origin: 'KJFK', destination: 'KLAX', lat: 40.7128, lng: -74.0060, altitude: 35000, heading: 270, speed: 250, category: 'aircraft' },
      { id: 'flight-demo-2', callsign: 'BAW456', origin: 'EGLL', destination: 'KJFK', lat: 51.4700, lng: -0.4543, altitude: 38000, heading: 290, speed: 260, category: 'aircraft' },
      { id: 'flight-demo-3', callsign: 'AAL789', origin: 'KLAX', destination: 'KORD', lat: 34.0522, lng: -118.2437, altitude: 32000, heading: 65, speed: 240, category: 'aircraft' },
      { id: 'flight-demo-4', callsign: 'DLH101', origin: 'EDDF', destination: 'VHHH', lat: 50.0379, lng: 8.5622, altitude: 41000, heading: 65, speed: 270, category: 'aircraft' },
      { id: 'flight-demo-5', callsign: 'JAL202', origin: 'RJTT', destination: 'KLAX', lat: 35.6762, lng: 139.6503, altitude: 39000, heading: 90, speed: 260, category: 'aircraft' },
    ];
    return sampleFlights;
  }
}

// Flight aggregator with fallback
export class FlightAggregator {
  private primaryProvider: OpenSkyProvider;
  private fallbackProvider: FlightFallbackProvider;

  constructor() {
    this.primaryProvider = new OpenSkyProvider();
    this.fallbackProvider = new FlightFallbackProvider();
  }

  async fetchWithFallback(): Promise<{ data: FlightTrack[]; degraded: boolean; source: string }> {
    const primaryResult = await this.primaryProvider.fetchWithRetry();
    
    if (!primaryResult.degraded && primaryResult.data.length > 0) {
      return {
        data: primaryResult.data.slice(0, 50),
        degraded: false,
        source: 'OpenSky',
      };
    }

    // Use fallback if primary failed or returned empty
    const fallbackResult = await this.fallbackProvider.fetchWithRetry();
    
    return {
      data: fallbackResult.data,
      degraded: true,
      source: 'OpenSky (degraded - using fallback data)',
    };
  }

  async healthCheck() {
    return await this.primaryProvider.healthCheck();
  }
}
