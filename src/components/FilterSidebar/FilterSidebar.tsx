'use client';
import { GlobalEvent } from '@/lib/types';
import { Shield, TrendingUp, Wind, AlertTriangle, Zap, Heart, Filter } from 'lucide-react';

interface FilterSidebarProps {
  filter: string;
  setFilter: (filter: string) => void;
  severityFilter: string;
  setSeverityFilter: (filter: string) => void;
  events: GlobalEvent[];
}

const categories = [
  { id: 'all', label: 'All Events', icon: Shield, color: 'text-white' },
  { id: 'geopolitical', label: 'Geopolitical', icon: Shield, color: 'text-indigo-400' },
  { id: 'market', label: 'Market', icon: TrendingUp, color: 'text-amber-400' },
  { id: 'disaster', label: 'Disaster', icon: Wind, color: 'text-cyan-400' },
  { id: 'security', label: 'Security', icon: AlertTriangle, color: 'text-red-400' },
  { id: 'infrastructure', label: 'Infrastructure', icon: Zap, color: 'text-purple-400' },
  { id: 'health', label: 'Health', icon: Heart, color: 'text-emerald-400' },
];

export default function FilterSidebar({ filter, setFilter, severityFilter, setSeverityFilter, events }: FilterSidebarProps) {
  return (
    <aside className="w-56 bg-bg-surface/80 backdrop-blur-xl border-r border-accent-cyan/10 p-4 flex flex-col gap-6">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
        <Filter className="w-4 h-4" />
        <span>Filters</span>
      </div>

      {/* Category Filter */}
      <div>
        <p className="text-xs text-muted mb-2">Category</p>
        <div className="space-y-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const count = cat.id === 'all' ? events.length : events.filter(e => e.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                  filter === cat.id 
                    ? 'bg-accent-cyan/20 text-white border border-accent-cyan/30' 
                    : 'text-muted hover:text-white hover:bg-bg-panel'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${cat.color}`} />
                  <span>{cat.label}</span>
                </div>
                <span className={`text-xs ${filter === cat.id ? 'text-accent-cyan' : 'text-muted'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Severity Filter */}
      <div>
        <p className="text-xs text-muted mb-2">Severity</p>
        <div className="space-y-1">
          {[
            { id: 'all', label: 'All Levels', color: 'bg-white' },
            { id: 'critical', label: 'Critical', color: 'bg-red-500' },
            { id: 'high', label: 'High', color: 'bg-amber-500' },
            { id: 'medium', label: 'Medium', color: 'bg-cyan-400' },
            { id: 'low', label: 'Low', color: 'bg-emerald-500' },
          ].map((sev) => (
            <button
              key={sev.id}
              onClick={() => setSeverityFilter(sev.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                severityFilter === sev.id 
                  ? 'bg-accent-cyan/20 text-white border border-accent-cyan/30' 
                  : 'text-muted hover:text-white hover:bg-bg-panel'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${sev.color}`} />
              <span>{sev.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Filters */}
      {(filter !== 'all' || severityFilter !== 'all') && (
        <button 
          onClick={() => { setFilter('all'); setSeverityFilter('all'); }}
          className="text-xs text-accent-cyan hover:underline"
        >
          Clear all filters
        </button>
      )}
    </aside>
  );
}
