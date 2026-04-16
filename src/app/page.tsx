'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { GlobalEvent, FlightTrack, VesselTrack, WeatherOverlay } from '@/lib/types';
import EventPanel from '@/components/EventPanel/EventPanel';
import MarketCorrelations from '@/components/MarketCorrelations/MarketCorrelations';
import NewsTicker from '@/components/NewsTicker/NewsTicker';
import FilterSidebar from '@/components/FilterSidebar/FilterSidebar';
import { Globe, Activity, Shield, Navigation, Ship, Cloud, Youtube } from 'lucide-react';

const GlobeScene = dynamic(() => import('@/components/Globe/GlobeScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-accent-cyan flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
        <p className="text-sm text-muted">Initializing Globe...</p>
      </div>
    </div>
  )
});

const sampleEvents: GlobalEvent[] = [
  {
    id: 'evt-001',
    title: 'South China Sea Naval Exercises',
    description: 'Multiple nations conducting simultaneous military exercises in disputed waters. Risk of maritime incident elevated.',
    category: 'geopolitical',
    severity: 'high',
    location: { lat: 14.5995, lng: 120.9842, label: 'South China Sea', region: 'Asia-Pacific' },
    timestamp: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    sources: ['Reuters', 'AP News'],
    affectedMarkets: [
      { symbol: 'CL=F', name: 'Crude Oil', category: 'commodity', impact: 'volatile' },
      { symbol: 'FXI', name: 'China ETF', category: 'equity', impact: 'negative' },
    ],
    status: 'active',
    tags: ['naval', 'military', 'disputed-territory'],
  },
  {
    id: 'evt-002',
    title: 'Eastern Mediterranean Shipping Alert',
    description: 'Commercial shipping advised of increased piracy activity in eastern Mediterranean corridor.',
    category: 'security',
    severity: 'medium',
    location: { lat: 35.0, lng: 30.0, label: 'Eastern Mediterranean', region: 'Middle East' },
    timestamp: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    sources: ['Maritime Security Center'],
    affectedMarkets: [
      { symbol: 'CL=F', name: 'Crude Oil', category: 'commodity', impact: 'negative' },
      { symbol: 'DXY', name: 'US Dollar', category: 'currency', impact: 'positive' },
    ],
    status: 'active',
    tags: ['shipping', 'piracy', 'mediterranean'],
  },
  {
    id: 'evt-003',
    title: 'Northern Europe Pipeline Incident',
    description: 'Critical natural gas pipeline reports pressure anomaly. Investigation underway.',
    category: 'infrastructure',
    severity: 'critical',
    location: { lat: 58.5953, lng: 25.0136, label: 'Baltic Sea', region: 'Northern Europe' },
    timestamp: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    sources: ['Energy Monitor', 'Reuters'],
    affectedMarkets: [
      { symbol: 'NG=F', name: 'Natural Gas', category: 'commodity', impact: 'volatile' },
      { symbol: 'EQT', name: 'EQT Corp', category: 'equity', impact: 'positive' },
    ],
    status: 'active',
    tags: ['energy', 'pipeline', 'infrastructure'],
  },
  {
    id: 'evt-004',
    title: 'ASEAN Summit Trade Tensions',
    description: 'Regional trade negotiations stall over tariff disputes. No agreement reached on semiconductor supply chains.',
    category: 'geopolitical',
    severity: 'medium',
    location: { lat: 1.3521, lng: 103.8198, label: 'Singapore', region: 'Southeast Asia' },
    timestamp: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    sources: ['Bloomberg', 'Strait Times'],
    affectedMarkets: [
      { symbol: 'SMH', name: 'Semiconductor ETF', category: 'equity', impact: 'negative' },
      { symbol: 'TSM', name: 'TSMC', category: 'equity', impact: 'negative' },
    ],
    status: 'monitoring',
    tags: ['trade', 'semiconductors', 'ASEAN'],
  },
  {
    id: 'evt-005',
    title: 'Arctic Ice Shelf Calving Event',
    description: 'Large section of Arctic ice shelf separates. Climate monitoring stations report unusual activity.',
    category: 'disaster',
    severity: 'high',
    location: { lat: 81.2532, lng: -61.0751, label: 'Greenland Sea', region: 'Arctic' },
    timestamp: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    sources: ['National Geographic', 'Climate Research Unit'],
    affectedMarkets: [
      { symbol: 'GC=F', name: 'Gold', category: 'commodity', impact: 'volatile' },
    ],
    status: 'monitoring',
    tags: ['climate', 'arctic', 'environment'],
  },
];

export default function Home() {
  const [events, setEvents] = useState<GlobalEvent[]>(sampleEvents);
  const [selectedEvent, setSelectedEvent] = useState<GlobalEvent | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [stats, setStats] = useState({ total: 0, critical: 0, high: 0, medium: 0, low: 0 });
  const [timeRange, setTimeRange] = useState('24h');
  const [flights, setFlights] = useState<FlightTrack[]>([]);
  const [vessels, setVessels] = useState<VesselTrack[]>([]);
  const [weather, setWeather] = useState<WeatherOverlay[]>([]);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const update = () => setMobile(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    setStats({
      total: events.length,
      critical: events.filter(e => e.severity === 'critical').length,
      high: events.filter(e => e.severity === 'high').length,
      medium: events.filter(e => e.severity === 'medium').length,
      low: events.filter(e => e.severity === 'low').length,
    });
  }, [events]);

  useEffect(() => {
    const load = async () => {
      try {
        const [eventsRes, flightsRes, weatherRes] = await Promise.all([
          fetch('/api/events', { headers: { Accept: 'application/json' } }),
          fetch('/api/flights', { headers: { Accept: 'application/json' } }).catch(() => null),
          fetch('/api/weather', { headers: { Accept: 'application/json' } }).catch(() => null),
        ]);

        if (eventsRes.ok) {
          const liveEvents = await eventsRes.json();
          if (Array.isArray(liveEvents) && liveEvents.length) setEvents(liveEvents);
        }
        if (flightsRes?.ok) {
          const liveFlights = await flightsRes.json();
          if (Array.isArray(liveFlights)) setFlights(liveFlights);
        }
        if (weatherRes?.ok) {
          const liveWeather = await weatherRes.json();
          if (Array.isArray(liveWeather)) setWeather(liveWeather);
        }
      } catch {}
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadVessels = async () => {
      try {
        const response = await fetch('/api/vessels', { headers: { Accept: 'application/json' } });
        if (response.ok) {
          const liveVessels = await response.json();
          if (Array.isArray(liveVessels)) setVessels(liveVessels);
        }
      } catch {}
    };
    loadVessels();
    const interval = setInterval(loadVessels, 90000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = events.filter(event => {
    if (filter !== 'all' && event.category !== filter) return false;
    if (severityFilter !== 'all' && event.severity !== severityFilter) return false;
    return true;
  });

  const selectedChannels = selectedEvent?.liveChannels || [];

  return (
    <main className="min-h-dvh w-full overflow-hidden bg-bg relative scanline">
      <header className="absolute top-0 left-0 right-0 z-40 h-14 md:h-16 bg-bg-surface/80 backdrop-blur-xl border-b border-accent-cyan/20 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="w-7 h-7 md:w-8 md:h-8 text-accent-cyan shrink-0" />
            <h1 className="text-lg md:text-xl font-orbitron font-bold tracking-wider truncate">
              <span className="text-white">SENTINEL</span>
              <span className="text-accent-cyan">GLOBE</span>
            </h1>
          </div>
          <div className="hidden sm:block h-8 w-px bg-accent-cyan/30" />
          <div className="flex items-center gap-1 text-xs text-muted shrink-0">
            <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>LIVE</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-muted">Critical:</span><span className="text-red-400 font-bold">{stats.critical}</span></div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-muted">High:</span><span className="text-amber-400 font-bold">{stats.high}</span></div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-400" /><span className="text-muted">Medium:</span><span className="text-cyan-400 font-bold">{stats.medium}</span></div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-muted">Low:</span><span className="text-emerald-400 font-bold">{stats.low}</span></div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex bg-bg-panel rounded-lg border border-border/50 p-1">
            {['1h', '6h', '24h', '7d'].map((range) => (
              <button key={range} onClick={() => setTimeRange(range)} className={`px-2.5 py-1 text-[10px] md:text-xs rounded transition-colors ${timeRange === range ? 'bg-accent-cyan text-bg' : 'text-muted hover:text-white'}`}>
                {range}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="hidden md:block absolute top-14 md:top-16 left-0 right-0 z-30">
        <NewsTicker />
      </div>

      <div className="absolute top-14 md:top-16 bottom-0 left-0 right-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        <div className="hidden lg:block">
          <FilterSidebar filter={filter} setFilter={setFilter} severityFilter={severityFilter} setSeverityFilter={setSeverityFilter} events={events} />
        </div>

        <div className="flex-1 relative min-h-[56svh] lg:min-h-0">
          <GlobeScene 
            events={filteredEvents} 
            onEventSelect={async (event) => {
              try {
                const response = await fetch(`/api/live-channels?lat=${event.location.lat}&lng=${event.location.lng}&label=${encodeURIComponent(event.location.label)}`, { headers: { Accept: 'application/json' } });
                if (response.ok) {
                  const channels = await response.json();
                  setSelectedEvent({ ...event, liveChannels: channels });
                  return;
                }
              } catch {}
              setSelectedEvent(event);
            }}
            selectedEvent={selectedEvent}
            flights={flights}
            vessels={vessels}
            weather={weather}
            mobileReduced={mobile}
          />

          <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 bg-bg-surface/80 backdrop-blur-xl rounded-lg border border-accent-cyan/20 p-3 md:p-4 max-w-[260px] md:max-w-none">
            <p className="text-xs text-muted mb-2 flex items-center gap-2"><Shield className="w-3 h-3" />Active Global Events</p>
            <p className="text-xl md:text-2xl font-orbitron font-bold text-white">{filteredEvents.length}</p>
            <p className="text-xs text-muted">of {stats.total} total events</p>
          </div>
        </div>

        <div className="hidden lg:block w-80 p-4 bg-bg-surface/50 backdrop-blur-xl border-l border-accent-cyan/10">
          <MarketCorrelations eventCategory={selectedEvent?.category} eventTags={selectedEvent?.tags} />
          <div className="mt-4 bg-bg-surface/80 rounded-xl border border-border/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-cyan"><Navigation className="w-3 h-3" />Flights</div>
            <div className="text-sm text-muted">{flights.length} live aircraft positions</div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-cyan"><Ship className="w-3 h-3" />Vessels</div>
            <div className="text-sm text-muted">{vessels.length} live vessels</div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-cyan"><Cloud className="w-3 h-3" />Weather</div>
            <div className="text-sm text-muted">{weather.length ? `${weather[0].cloudiness}% cloud cover` : 'Weather overlay active'}</div>
          </div>
        </div>

        <div className="lg:hidden px-3 pb-4 pt-3 grid gap-3">
          <FilterSidebar filter={filter} setFilter={setFilter} severityFilter={severityFilter} setSeverityFilter={setSeverityFilter} events={events} />
          <MarketCorrelations eventCategory={selectedEvent?.category} eventTags={selectedEvent?.tags} />
          <div className="bg-bg-surface/80 backdrop-blur-xl rounded-xl border border-accent-cyan/20 p-3 grid gap-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-cyan"><Navigation className="w-3 h-3" />Aircraft: {flights.length}</div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-cyan"><Ship className="w-3 h-3" />Ships: {vessels.length}</div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-cyan"><Cloud className="w-3 h-3" />Clouds: {weather.length ? `${weather[0].cloudiness}%` : 'live'}</div>
            {selectedChannels.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-cyan"><Youtube className="w-3 h-3" />Live coverage</div>
                <div className="space-y-1 mt-2">
                  {selectedChannels.slice(0, 3).map((channel) => (
                    <a key={channel.url} href={channel.url} target="_blank" rel="noreferrer" className="block text-sm text-white/90 hover:text-accent-cyan">{channel.title}</a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedEvent && (
        <EventPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </main>
  );
}
