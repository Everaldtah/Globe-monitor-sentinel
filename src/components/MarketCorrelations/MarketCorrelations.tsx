'use client';
import { useEffect, useState } from 'react';
import { MarketData } from '@/lib/types';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

interface MarketCorrelationsProps {
  eventCategory?: string;
  eventTags?: string[];
}

export default function MarketCorrelations({ eventCategory, eventTags }: MarketCorrelationsProps) {
  const [markets, setMarkets] = useState<MarketData[]>([
    { symbol: 'BTC', name: 'Bitcoin', price: 67420, change: 1245, changePercent: 1.88, type: 'crypto' },
    { symbol: 'ETH', name: 'Ethereum', price: 3521, change: -42, changePercent: -1.18, type: 'crypto' },
    { symbol: 'CL=F', name: 'Crude Oil', price: 78.42, change: 1.24, changePercent: 1.61, type: 'commodity' },
    { symbol: 'GC=F', name: 'Gold', price: 2341.80, change: 12.30, changePercent: 0.53, type: 'commodity' },
    { symbol: 'EURUSD', name: 'EUR/USD', price: 1.0872, change: -0.0012, changePercent: -0.11, type: 'forex' },
    { symbol: 'DXY', name: 'US Dollar', price: 104.32, change: 0.24, changePercent: 0.23, type: 'forex' },
    { symbol: 'SPY', name: 'S&P 500', price: 542.18, change: 3.42, changePercent: 0.63, type: 'equity' },
    { symbol: 'QQQ', name: 'Nasdaq', price: 458.72, change: 2.18, changePercent: 0.48, type: 'equity' },
  ]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/markets');
        if (response.ok) {
          const data = await response.json();
          setMarkets(data);
        }
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number, symbol: string) => {
    if (symbol.includes('USD') || symbol === 'EURUSD') return price.toFixed(4);
    if (price < 100) return price.toFixed(2);
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-bg-surface/80 backdrop-blur-xl rounded-xl border border-accent-cyan/20 p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-wider text-accent-cyan flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Market Correlations
        </h3>
        <button className="text-muted hover:text-accent-cyan transition-colors">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2">
        {markets.map((market) => (
          <div 
            key={market.symbol} 
            className="flex items-center justify-between p-2 rounded hover:bg-bg-panel/50 transition-colors"
          >
            <div>
              <span className="text-sm font-bold text-white">{market.symbol}</span>
              <p className="text-xs text-muted">{market.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono text-white">${formatPrice(market.price, market.symbol)}</p>
              <div className="flex items-center gap-1 justify-end">
                {market.change >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                ) : market.change < 0 ? (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                ) : (
                  <Minus className="w-3 h-3 text-muted" />
                )}
                <span className={`text-xs font-mono ${
                  market.changePercent > 0 ? 'text-emerald-400' : 
                  market.changePercent < 0 ? 'text-red-400' : 'text-muted'
                }`}>
                  {market.changePercent > 0 ? '+' : ''}{market.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live correlation indicator */}
      <div className="mt-4 p-3 bg-bg-panel/50 rounded-lg border border-border/30">
        <p className="text-xs text-muted mb-2">Active Correlations</p>
        <div className="flex flex-wrap gap-1">
          {['Oil → Middle East', 'BTC → Risk Sentiment', 'Gold → Inflation'].map((corr) => (
            <span key={corr} className="px-2 py-1 text-[10px] bg-accent-cyan/10 text-accent-cyan rounded border border-accent-cyan/20">
              {corr}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
