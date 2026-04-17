'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { GlobalEvent, FlightTrack, VesselTrack, WeatherOverlay } from '@/lib/types';
import EventPanel from '@/components/EventPanel/EventPanel';
import MarketCorrelations from '@/components/MarketCorrelations/MarketCorrelations';
import NewsTicker from '@/components/NewsTicker/NewsTicker';
import FilterSidebar from '@/components/FilterSidebar/FilterSidebar';
import {
  Globe,
  Activity,
  Shield,
  Navigation,
  Ship,
  Cloud,
  Youtube,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Menu,
  X,
  Wifi,
  WifiOff,
} from 'lucide-react';

// Dynamic import for GlobeScene to avoid SSR issues
const GlobeScene = dynamic(() => import('@/components/Globe/GlobeScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-bg/50">
      <div className="text-accent-cyan flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
        <p className="text-sm text-muted">Initializing Globe...</p>
      </div>
    </div>
  ),
});

// Loading skeleton component
function DataSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-bg-panel/50 rounded w-3/4" />
      <div className="h-3 bg-bg-panel/50 rounded w-1/2" />
    </div>
  );
}

// Error banner component
interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
      <div className="flex items-center gap-2 text-red-400">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{message}</span>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Retry
      </button>
    </div>
  );
}

// Empty state component
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <Shield className="w-12 h-12 text-muted/50 mb-3" />
      <p className="text-sm text-muted">No events matching current filters</p>
      <p className="text-xs text-muted/60 mt-1">Try adjusting your filter settings</p>
    </div>
  );
}

// Layer toggle button component
interface LayerToggleProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  colorClass: string;
}

function LayerToggle({ icon: Icon, label, isActive, onClick, colorClass }: LayerToggleProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
        isActive
          ? `bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30`
          : 'text-muted hover:text-white hover:bg-bg-panel'
      }`}
      title={`Toggle ${label}`}
    >
      {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      <Icon className={`w-3.5 h-3.5 ${isActive ? colorClass : ''}`} />
      <span>{label}</span>
    </button>
  );
}

// Last updated timestamp component
function LastUpdated({ timestamp }: { timestamp: Date | null }) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (!timestamp) {
      setTimeAgo('Never');
      return;
    }

    const updateTime = () => {
      const diff = Math.floor((Date.now() - timestamp.getTime()) / 1000);
      if (diff < 60) setTimeAgo('Just now');
      else if (diff < 3600) setTimeAgo(`${Math.floor(diff / 60)} min ago`);
      else if (diff < 86400) setTimeAgo(`${Math.floor(diff / 3600)} hr ago`);
      else setTimeAgo(timestamp.toLocaleTimeString());
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted">
      <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
      <span>Updated {timeAgo}</span>
    </div>
  );
}

// Data loading states
interface DataState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Layer visibility state
interface LayerVisibility {
  events: boolean;
  flights: boolean;
  vessels: boolean;
  weather: boolean;
  arcs: boolean;
}

export default function Home() {
  // State
  const [events, setEvents] = useState<GlobalEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<GlobalEvent | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [isMobile, setIsMobile] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Data states with loading/error tracking
  const [eventsState, setEventsState] = useState<DataState<GlobalEvent>>({
    data: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });
  const [flightsState, setFlightsState] = useState<DataState<FlightTrack>>({
    data: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });
  const [vesselsState, setVesselsState] = useState<DataState<VesselTrack>>({
    data: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });
  const [weatherState, setWeatherState] = useState<DataState<WeatherOverlay>>({
    data: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  // Layer visibility state
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    events: true,
    flights: true,
    vessels: true,
    weather: true,
    arcs: true,
  });

  // Track if all data sources have been fetched at least once
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  // Detect mobile/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Compute stats from events data
  const stats = useMemo(() => {
    return {
      total: eventsState.data.length,
      critical: eventsState.data.filter((e) => e.severity === 'critical').length,
      high: eventsState.data.filter((e) => e.severity === 'high').length,
      medium: eventsState.data.filter((e) => e.severity === 'medium').length,
      low: eventsState.data.filter((e) => e.severity === 'low').length,
    };
  }, [eventsState.data]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return eventsState.data.filter((event) => {
      if (filter !== 'all' && event.category !== filter) return false;
      if (severityFilter !== 'all' && event.severity !== severityFilter) return false;
      return true;
    });
  }, [eventsState.data, filter, severityFilter]);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setEventsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/events', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      if (Array.isArray(data)) {
        setEventsState({
          data,
          loading: false,
          error: null,
          lastUpdated: new Date(),
        });
        setEvents(data);
      }
    } catch (err) {
      setEventsState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load events',
      }));
    }
  }, []);

  // Fetch flights
  const fetchFlights = useCallback(async () => {
    setFlightsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/flights', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch flights');
      const data = await response.json();
      setFlightsState({
        data: Array.isArray(data) ? data : [],
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (err) {
      setFlightsState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load flights',
      }));
    }
  }, []);

  // Fetch vessels
  const fetchVessels = useCallback(async () => {
    setVesselsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/vessels', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch vessels');
      const data = await response.json();
      setVesselsState({
        data: Array.isArray(data) ? data : [],
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (err) {
      setVesselsState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load vessels',
      }));
    }
  }, []);

  // Fetch weather
  const fetchWeather = useCallback(async () => {
    setWeatherState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/weather', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch weather');
      const data = await response.json();
      setWeatherState({
        data: Array.isArray(data) ? data : [],
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (err) {
      setWeatherState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load weather',
      }));
    }
  }, []);

  // Fetch all data on mount
  useEffect(() => {
    const loadAll = async () => {
      await Promise.allSettled([fetchEvents(), fetchFlights(), fetchVessels(), fetchWeather()]);
      setHasInitialLoad(true);
    };
    loadAll();
  }, [fetchEvents, fetchFlights, fetchVessels, fetchWeather]);

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      if (!eventsState.loading) fetchEvents();
      if (!flightsState.loading) fetchFlights();
      if (!weatherState.loading) fetchWeather();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchEvents, fetchFlights, fetchWeather, eventsState.loading, flightsState.loading, weatherState.loading]);

  // Refresh vessels at different interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (!vesselsState.loading) fetchVessels();
    }, 90000);
    return () => clearInterval(interval);
  }, [fetchVessels, vesselsState.loading]);

  // Handle event selection with live channels
  const handleEventSelect = useCallback(
    async (event: GlobalEvent) => {
      try {
        const response = await fetch(
          `/api/live-channels?lat=${event.location.lat}&lng=${event.location.lng}&label=${encodeURIComponent(event.location.label)}`,
          { headers: { Accept: 'application/json' } }
        );
        if (response.ok) {
          const channels = await response.json();
          setSelectedEvent({ ...event, liveChannels: channels });
          return;
        }
      } catch {}
      setSelectedEvent(event);
    },
    []
  );

  // Compute combined last updated timestamp
  const combinedLastUpdated = useMemo(() => {
    const timestamps = [
      eventsState.lastUpdated,
      flightsState.lastUpdated,
      vesselsState.lastUpdated,
      weatherState.lastUpdated,
    ].filter(Boolean) as Date[];
    return timestamps.length > 0 ? new Date(Math.max(...timestamps.map((t) => t.getTime()))) : null;
  }, [eventsState.lastUpdated, flightsState.lastUpdated, vesselsState.lastUpdated, weatherState.lastUpdated]);

  // Check if any data source has errors
  const hasErrors = eventsState.error || flightsState.error || vesselsState.error || weatherState.error;

  // Selected channels for live coverage
  const selectedChannels = selectedEvent?.liveChannels || [];

  // Determine if data is still loading
  const isLoading = !hasInitialLoad && (eventsState.loading || flightsState.loading);

  return (
    <main className="min-h-dvh h-svh w-full overflow-hidden bg-bg relative scanline">
      {/* Header */}
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

        {/* Desktop Stats */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-muted">Critical:</span>
              <span className="text-red-400 font-bold">{stats.critical}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-muted">High:</span>
              <span className="text-amber-400 font-bold">{stats.high}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-muted">Medium:</span>
              <span className="text-cyan-400 font-bold">{stats.medium}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-muted">Low:</span>
              <span className="text-emerald-400 font-bold">{stats.low}</span>
            </div>
          </div>
        </div>

        {/* Right side: Time range + Mobile menu */}
        <div className="flex items-center gap-2 md:gap-4">
          <LastUpdated timestamp={combinedLastUpdated} />

          {/* Time range selector */}
          <div className="hidden sm:flex bg-bg-panel rounded-lg border border-border/50 p-1">
            {['1h', '6h', '24h', '7d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 text-[10px] md:text-xs rounded transition-colors ${
                  timeRange === range
                    ? 'bg-accent-cyan text-bg'
                    : 'text-muted hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Mobile filter menu button */}
          {isMobile && (
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="lg:hidden p-2 bg-bg-panel rounded-lg border border-border/50 text-muted hover:text-white"
              aria-label="Toggle filters"
            >
              {mobileFilterOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </header>

      {/* News Ticker - Desktop only */}
      <div className="hidden md:block absolute top-14 md:top-16 left-0 right-0 z-30">
        <NewsTicker />
      </div>

      {/* Layer Toggles Bar */}
      <div className="hidden lg:flex items-center gap-2 mt-14 md:mt-16 px-4 py-2 z-20">
        <span className="text-xs text-muted mr-2">Layers:</span>
        <LayerToggle
          icon={Shield}
          label="Events"
          isActive={layerVisibility.events}
          onClick={() => setLayerVisibility((prev) => ({ ...prev, events: !prev.events }))}
          colorClass="text-accent-cyan"
        />
        <LayerToggle
          icon={Navigation}
          label="Flights"
          isActive={layerVisibility.flights}
          onClick={() => setLayerVisibility((prev) => ({ ...prev, flights: !prev.flights }))}
          colorClass="text-amber-400"
        />
        <LayerToggle
          icon={Ship}
          label="Vessels"
          isActive={layerVisibility.vessels}
          onClick={() => setLayerVisibility((prev) => ({ ...prev, vessels: !prev.vessels }))}
          colorClass="text-cyan-400"
        />
        <LayerToggle
          icon={Cloud}
          label="Weather"
          isActive={layerVisibility.weather}
          onClick={() => setLayerVisibility((prev) => ({ ...prev, weather: !prev.weather }))}
          colorClass="text-emerald-400"
        />
      </div>

      {/* Mobile Layer Toggles */}
      {isMobile && (
        <div className="flex justify-center gap-1 flex-wrap px-3 py-2 mt-14 bg-bg-surface/50">
          {[
            { key: 'events', icon: Shield, label: 'Events' },
            { key: 'flights', icon: Navigation, label: 'Flights' },
            { key: 'vessels', icon: Ship, label: 'Vessels' },
            { key: 'weather', icon: Cloud, label: 'Weather' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() =>
                setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key as keyof LayerVisibility] }))
              }
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${
                layerVisibility[key as keyof LayerVisibility]
                  ? 'bg-accent-cyan/20 text-accent-cyan'
                  : 'text-muted'
              }`}
            >
              {layerVisibility[key as keyof LayerVisibility] ? (
                <Eye className="w-3 h-3" />
              ) : (
                <EyeOff className="w-3 h-3" />
              )}
              <Icon className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div
        className={`absolute left-0 right-0 bottom-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden ${
          isMobile ? 'top-32' : 'top-32 lg:top-28'
        }`}
      >
        {/* Desktop Filter Sidebar */}
        <div className="hidden lg:block">
          {eventsState.loading && hasInitialLoad ? (
            <aside className="w-56 bg-bg-surface/80 backdrop-blur-xl border-r border-accent-cyan/10 p-4">
              <DataSkeleton />
            </aside>
          ) : eventsState.error ? (
            <aside className="w-56 bg-bg-surface/80 backdrop-blur-xl border-r border-accent-cyan/10 p-4">
              <ErrorBanner message={eventsState.error} onRetry={fetchEvents} />
            </aside>
          ) : (
            <FilterSidebar
              filter={filter}
              setFilter={setFilter}
              severityFilter={severityFilter}
              setSeverityFilter={setSeverityFilter}
              events={eventsState.data}
            />
          )}
        </div>

        {/* Mobile Filter Drawer */}
        {mobileFilterOpen && isMobile && (
          <div className="fixed inset-0 z-50 bg-bg/90 backdrop-blur-xl lg:hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white">Filters</h2>
                <button onClick={() => setMobileFilterOpen(false)} className="text-muted hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <FilterSidebar
                filter={filter}
                setFilter={(f) => {
                  setFilter(f);
                  setMobileFilterOpen(false);
                }}
                severityFilter={severityFilter}
                setSeverityFilter={(s) => {
                  setSeverityFilter(s);
                  setMobileFilterOpen(false);
                }}
                events={eventsState.data}
              />
            </div>
          </div>
        )}

        {/* Globe Container */}
        <div className="flex-1 relative min-h-[50svh] lg:min-h-0">
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-bg/80">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
                <p className="text-sm text-muted">Loading global data...</p>
              </div>
            </div>
          )}

          {/* Error Summary */}
          {hasErrors && hasInitialLoad && (
            <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-2 pointer-events-none">
              {eventsState.error && (
                <div className="pointer-events-auto max-w-sm">
                  <ErrorBanner message="Events data unavailable" onRetry={fetchEvents} />
                </div>
              )}
            </div>
          )}

          <GlobeScene
            events={layerVisibility.events ? filteredEvents : []}
            onEventSelect={handleEventSelect}
            selectedEvent={selectedEvent}
            flights={layerVisibility.flights ? flightsState.data : []}
            vessels={layerVisibility.vessels ? vesselsState.data : []}
            weather={layerVisibility.weather ? weatherState.data : []}
            mobileReduced={isMobile}
          />

          {/* Empty State Overlay */}
          {hasInitialLoad &&
            !eventsState.loading &&
            !eventsState.error &&
            filteredEvents.length === 0 &&
            layerVisibility.events && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 px-4">
                <div className="max-w-md mx-auto">
                  <div className="bg-bg-surface/90 backdrop-blur-xl rounded-xl border border-accent-cyan/20 p-6">
                    <EmptyState />
                  </div>
                </div>
              </div>
            )}

          {/* Stats Badge */}
          <div className="absolute bottom-4 left-4 bg-bg-surface/80 backdrop-blur-xl rounded-lg border border-accent-cyan/20 p-3 md:p-4 max-w-[260px] md:max-w-none z-10">
            <p className="text-xs text-muted mb-2 flex items-center gap-2">
              <Shield className="w-3 h-3" />
              Active Global Events
            </p>
            <p className="text-xl md:text-2xl font-orbitron font-bold text-white">
              {filteredEvents.length}
            </p>
            <p className="text-xs text-muted">of {stats.total} total events</p>
          </div>

          {/* Data Source Indicators (Mobile) */}
          {isMobile && (
            <div className="absolute bottom-4 right-4 flex flex-col gap-1">
              {flightsState.error && (
                <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-bg-surface/90 px-2 py-1 rounded">
                  <WifiOff className="w-3 h-3" />
                  <span>Flights offline</span>
                </div>
              )}
              {vesselsState.error && (
                <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-bg-surface/90 px-2 py-1 rounded">
                  <WifiOff className="w-3 h-3" />
                  <span>Vessels offline</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Right Panel */}
        <div className="hidden lg:block w-80 p-4 bg-bg-surface/50 backdrop-blur-xl border-l border-accent-cyan/10 overflow-y-auto">
          {eventsState.loading && !hasInitialLoad ? (
            <DataSkeleton />
          ) : (
            <>
              <MarketCorrelations
                eventCategory={selectedEvent?.category}
                eventTags={selectedEvent?.tags}
              />
              <div className="mt-4 bg-bg-surface/80 rounded-xl border border-border/50 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-cyan">
                    <Navigation className="w-3 h-3" />
                    Flights
                  </div>
                  {flightsState.error && (
                    <div className="flex items-center gap-1 text-amber-400" title={flightsState.error}>
                      <WifiOff className="w-3 h-3" />
                    </div>
                  )}
                  {!flightsState.error && flightsState.loading && (
                    <div className="w-3 h-3 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
                  )}
                </div>
                <div className="text-sm text-muted">
                  {flightsState.data.length} live aircraft positions
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-cyan">
                    <Ship className="w-3 h-3" />
                    Vessels
                  </div>
                  {vesselsState.error && (
                    <div className="flex items-center gap-1 text-amber-400" title={vesselsState.error}>
                      <WifiOff className="w-3 h-3" />
                    </div>
                  )}
                  {!vesselsState.error && vesselsState.loading && (
                    <div className="w-3 h-3 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
                  )}
                </div>
                <div className="text-sm text-muted">
                  {vesselsState.data.length} live vessels
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-cyan">
                    <Cloud className="w-3 h-3" />
                    Weather
                  </div>
                  {weatherState.error && (
                    <div className="flex items-center gap-1 text-amber-400" title={weatherState.error}>
                      <WifiOff className="w-3 h-3" />
                    </div>
                  )}
                  {!weatherState.error && weatherState.loading && (
                    <div className="w-3 h-3 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
                  )}
                </div>
                <div className="text-sm text-muted">
                  {weatherState.data.length
                    ? `${weatherState.data[0].cloudiness}% cloud cover`
                    : 'Weather overlay active'}
                </div>
              </div>

              {/* Data Source Credibility */}
              <div className="mt-4 bg-bg-surface/80 rounded-xl border border-border/50 p-3">
                <p className="text-xs text-muted mb-2">Data Sources</p>
                <div className="flex flex-wrap gap-1">
                  {['USGS', 'Countries Now', 'GDELT', 'OpenSky', 'Open-Meteo'].map(
                    (source) => (
                      <span
                        key={source}
                        className="px-2 py-0.5 text-[10px] bg-bg-panel rounded text-muted/80 flex items-center gap-1"
                      >
                        <Wifi className="w-2.5 h-2.5 text-emerald-400" />
                        {source}
                      </span>
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mobile Bottom Section */}
        <div className="lg:hidden px-3 pb-safe pt-3 grid gap-3">
          {eventsState.error ? (
            <ErrorBanner message={eventsState.error} onRetry={fetchEvents} />
          ) : (
            <FilterSidebar
              filter={filter}
              setFilter={setFilter}
              severityFilter={severityFilter}
              setSeverityFilter={setSeverityFilter}
              events={eventsState.data}
            />
          )}

          <MarketCorrelations
            eventCategory={selectedEvent?.category}
            eventTags={selectedEvent?.tags}
          />

          <div className="bg-bg-surface/80 backdrop-blur-xl rounded-xl border border-accent-cyan/20 p-3 grid gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-cyan">
                <Navigation className="w-3 h-3" />
                Aircraft
              </div>
              <span className="text-xs text-muted">{flightsState.data.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-cyan">
                <Ship className="w-3 h-3" />
                Ships
              </div>
              <span className="text-xs text-muted">{vesselsState.data.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-cyan">
                <Cloud className="w-3 h-3" />
                Clouds
              </div>
              <span className="text-xs text-muted">
                {weatherState.data.length ? `${weatherState.data[0].cloudiness}%` : 'live'}
              </span>
            </div>

            {selectedChannels.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent-cyan">
                  <Youtube className="w-3 h-3" />
                  Live coverage
                </div>
                <div className="space-y-1 mt-2">
                  {selectedChannels.slice(0, 3).map((channel) => (
                    <a
                      key={channel.url}
                      href={channel.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm text-white/90 hover:text-accent-cyan truncate"
                    >
                      {channel.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Last Updated */}
          <div className="text-center text-xs text-muted/60">
            Last updated: <LastUpdated timestamp={combinedLastUpdated} />
          </div>
        </div>
      </div>

      {/* Event Panel */}
      {selectedEvent && (
        <EventPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </main>
  );
}
