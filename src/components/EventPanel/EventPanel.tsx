'use client';
import { motion } from 'framer-motion';
import { GlobalEvent } from '@/lib/types';
import { 
  AlertTriangle, MapPin, Clock, TrendingUp, ExternalLink, 
  Shield, Wind, Zap, Heart, Youtube
} from 'lucide-react';

interface EventPanelProps {
  event: GlobalEvent | null;
  onClose: () => void;
}

const categoryIcons = {
  geopolitical: Shield,
  market: TrendingUp,
  disaster: Wind,
  security: AlertTriangle,
  infrastructure: Zap,
  health: Heart,
};

const severityColors = {
  critical: 'text-red-500',
  high: 'text-amber-500',
  medium: 'text-cyan-400',
  low: 'text-emerald-500',
};

export default function EventPanel({ event, onClose }: EventPanelProps) {
  if (!event) return null;

  const CategoryIcon = categoryIcons[event.category];

  return (
    <motion.div
      initial={{ y: 300, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 300, opacity: 0 }}
      className="fixed inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto md:bottom-auto h-[70vh] md:h-full w-full md:w-[420px] bg-bg-surface/95 backdrop-blur-xl border-t md:border-t-0 md:border-l border-accent-cyan/20 overflow-y-auto z-50 rounded-t-3xl md:rounded-none"
    >
      <div className="sticky top-0 bg-bg-surface/98 backdrop-blur-xl border-b border-accent-cyan/20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CategoryIcon className="w-5 h-5 text-accent-cyan" />
          <span className="text-xs uppercase tracking-wider text-accent-cyan">{event.category}</span>
        </div>
        <button onClick={onClose} className="text-muted hover:text-white transition-colors">✕</button>
      </div>

      <div className="p-5 space-y-6">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 text-xs font-bold uppercase rounded ${severityColors[event.severity]} bg-current/10 border border-current/30`}>{event.severity}</span>
          <span className={`px-2 py-1 text-xs rounded ${event.status === 'active' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{event.status}</span>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-2">{event.title}</h2>
          <p className="text-sm text-muted leading-relaxed">{event.description}</p>
        </div>

        <div className="flex items-start gap-3 p-3 bg-bg-panel rounded-lg border border-border/50">
          <MapPin className="w-5 h-5 text-accent-cyan mt-0.5" />
          <div>
            <p className="text-sm text-white">{event.location.label}</p>
            <p className="text-xs text-muted">Lat: {event.location.lat.toFixed(4)} | Lng: {event.location.lng.toFixed(4)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted">
          <Clock className="w-4 h-4" />
          <span>{new Date(event.timestamp).toLocaleString()}</span>
          <span className="text-xs text-muted/50">Updated: {new Date(event.lastUpdated).toLocaleTimeString()}</span>
        </div>

        {event.affectedMarkets.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Affected Markets</h3>
            <div className="grid grid-cols-2 gap-2">
              {event.affectedMarkets.map((market) => (
                <div key={market.symbol} className="p-3 bg-bg-panel rounded-lg border border-border/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white">{market.symbol}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${market.impact === 'negative' ? 'bg-red-500/20 text-red-400' : market.impact === 'positive' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{market.impact}</span>
                  </div>
                  <p className="text-xs text-muted">{market.name}</p>
                  <p className="text-xs text-muted">{market.category}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {event.tags.map((tag) => (
            <span key={tag} className="px-2 py-1 text-xs bg-bg-panel rounded border border-border/50 text-muted">{tag}</span>
          ))}
        </div>

        {event.liveChannels && event.liveChannels.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted mb-2 flex items-center gap-2"><Youtube className="w-4 h-4" />Live coverage</h3>
            <div className="space-y-2">
              {event.liveChannels.map((channel) => (
                <a key={channel.url} href={channel.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 bg-bg-panel rounded text-sm text-muted hover:text-accent-cyan transition-colors">
                  <span>{channel.title}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted mb-2">Sources</h3>
          <div className="space-y-2">
            {event.sources.map((source) => (
              <a key={source} href="#" className="flex items-center justify-between p-2 bg-bg-panel rounded text-sm text-muted hover:text-accent-cyan transition-colors">
                <span>{source}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
