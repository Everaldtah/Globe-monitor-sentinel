import { NextResponse } from 'next/server';
import { EventsAggregator } from '@/lib/providers/events';

export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    const aggregator = new EventsAggregator();
    const result = await aggregator.fetchAll();

    return NextResponse.json(result.data, {
      headers: {
        'X-Data-Source': result.source,
        'X-Degraded': String(result.degraded),
        'X-Timestamp': result.timestamp,
      },
    });
  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
