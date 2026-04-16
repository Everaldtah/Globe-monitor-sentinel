'use client';
import { useEffect, useState } from 'react';
import { NewsItem } from '@/lib/types';
import { Radio } from 'lucide-react';

export default function NewsTicker() {
  const [news, setNews] = useState<NewsItem[]>([
    { title: 'Tensions rise in South China Sea over maritime boundaries', source: 'Reuters', url: '#', publishedAt: new Date().toISOString(), sentiment: 'negative' },
    { title: 'UN Security Council convenes emergency session on regional conflict', source: 'UN News', url: '#', publishedAt: new Date().toISOString(), sentiment: 'negative' },
    { title: 'Oil prices surge 3% amid Middle East supply concerns', source: 'Bloomberg', url: '#', publishedAt: new Date().toISOString(), sentiment: 'negative' },
    { title: 'Major cyberattack targets European financial infrastructure', source: 'FT', url: '#', publishedAt: new Date().toISOString(), sentiment: 'negative' },
    { title: 'Global shipping rates spike due to Red Sea security issues', source: 'WSJ', url: '#', publishedAt: new Date().toISOString(), sentiment: 'negative' },
    { title: 'Earthquake magnitude 5.8 strikes off Pacific coast', source: 'USGS', url: '#', publishedAt: new Date().toISOString(), sentiment: 'neutral' },
    { title: 'G7 nations announce new sanctions on bad actors', source: 'Politico', url: '#', publishedAt: new Date().toISOString(), sentiment: 'neutral' },
    { title: 'Tech sector faces regulatory scrutiny in multiple jurisdictions', source: 'The Verge', url: '#', publishedAt: new Date().toISOString(), sentiment: 'neutral' },
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % news.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [news.length]);

  return (
    <div className="bg-bg-surface/90 backdrop-blur-xl border-b border-accent-cyan/20 px-4 py-2">
      <div className="flex items-center gap-4 overflow-hidden">
        <div className="flex items-center gap-2 text-accent-cyan shrink-0">
          <Radio className="w-4 h-4 animate-pulse" />
          <span className="text-xs uppercase tracking-wider font-bold">Live Feed</span>
        </div>
        <div className="h-4 w-px bg-accent-cyan/30 shrink-0" />
        <div className="overflow-hidden flex-1">
          <p className="text-sm text-white/90 truncate">
            <span className="text-accent-cyan text-xs mr-2">[{news[currentIndex]?.source}]</span>
            {news[currentIndex]?.title}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          {news.slice(0, 5).map((_, idx) => (
            <div 
              key={idx} 
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                idx === currentIndex ? 'bg-accent-cyan' : 'bg-accent-cyan/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
