export type EventCategory = 
  | 'geopolitical' 
  | 'market' 
  | 'disaster' 
  | 'security' 
  | 'infrastructure' 
  | 'health';

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type EventStatus = 'active' | 'monitoring' | 'resolved';

export interface Location {
  lat: number;
  lng: number;
  label: string;
  region?: string;
}

export interface MarketCorrelation {
  symbol: string;
  name: string;
  category: 'commodity' | 'currency' | 'crypto' | 'equity' | 'index';
  impact: 'positive' | 'negative' | 'volatile';
  currentPrice?: number;
  change?: number;
  changePercent?: number;
}

export interface GlobalEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  severity: Severity;
  location: Location;
  timestamp: string;
  lastUpdated: string;
  sources: string[];
  affectedMarkets: MarketCorrelation[];
  status: EventStatus;
  tags: string[];
  summary?: string;
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  type: string;
}
