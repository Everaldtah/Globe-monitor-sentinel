'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { GlobalEvent } from '@/lib/types';
import EventPanel from '@/components/EventPanel/EventPanel';
import MarketCorrelations from '@/components/MarketCorrelations/MarketCorrelations';
import NewsTicker from '@/components/NewsTicker/NewsTicker';
import FilterSidebar from '@/components/FilterSidebar/FilterSidebar';
import { Globe, Activity, AlertTriangle, Zap, Shield, Radio } from 'lucide-react';

// Dynamic import for 3D Globe (no SSR)
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
    title: 'Arctic Ice Shelf calving event',
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

  useEffect(() => {
    // Calculate stats
    setStats({
      total: events.length,
      critical: events.filter(e => e.severity === 'critical').length,
      high: events.filter(e => e.severity === 'high').length,
      medium: events.filter(e => e.severity === 'medium').length,
      low: events.filter(e => e.severity === 'low').length,
    });
  }, [events]);

  const filteredEvents = events.filter(event => {
    if (filter !== 'all' && event.category !== filter) return false;
    if (severityFilter !== 'all' && event.severity !== severityFilter) return false;
    return true;
  });

  return (
    <main className="h-screen w-screen overflow-hidden bg-bg relative scanline">
      {/* Top Bar */}
      <header className="absolute top-0 left-0 right-0 z-40 h-16 bg-bg-surface/80 backdrop-blur-xl border-b border-accent-cyan/20 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Globe className="w-8 h-8 text-accent-cyan" />
            <h1 className="text-xl font-orbitron font-bold tracking-wider">
              <span className="text-white">SENTINEL</span>
              <span className="text-accent-cyan">GLOBE</span>
            </h1>
          </div>
          <div className="h-8 w-px bg-accent-cyan/30" />
          <div className="flex items-center gap-1 text-xs text-muted">
            <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-6">
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

        {/* Time Range */}
        <div className="flex items-center gap-4">
          <div className="flex bg-bg-panel rounded-lg border border-border/50 p-1">
            {['1h', '6h', '24h', '7d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  timeRange === range 
                    ? 'bg-accent-cyan text-bg' 
                    : 'text-muted hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* News Ticker */}
      <NewsTicker />

      {/* Main Content */}
      <div className="absolute top-16 bottom-0 left-0 right-0 flex">
        {/* Left Sidebar - Filters */}
        <FilterSidebar 
          filter={filter} 
          setFilter={setFilter}
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
          events={events}
        />

        {/* Center - Globe */}
        <div className="flex-1 relative">
          <GlobeScene 
            events={filteredEvents} 
            onEventSelect={setSelectedEvent}
            selectedEvent={selectedEvent}
          />

          {/* Bottom Stats Overlay */}
          <div className="absolute bottom-4 left-4 bg-bg-surface/80 backdrop-blur-xl rounded-lg border border-accent-cyan/20 p-4">
            <p className="text-xs text-muted mb-2 flex items-center gap-2">
              <Shield className="w-3 h-3" />
              Active Global Events
            </p>
            <p className="text-2xl font-orbitron font-bold text-white">{filteredEvents.length}</p>
            <p className="text-xs text-muted">of {stats.total} total events</p>
          </div>
        </div>

        {/* Right Sidebar - Markets */}
        <div className="w-80 p-4 bg-bg-surface/50 backdrop-blur-xl border-l border-accent-cyan/10">
          <MarketCorrelations 
            eventCategory={selectedEvent?.category}
            eventTags={selectedEvent?.tags}
          />
        </div>
      </div>

      {/* Event Detail Panel */}
      {selectedEvent && (
        <EventPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </main>
  );
}
