import { NextResponse } from 'next/server';

function calculateSeverity(score: number): string {
  if (score >= 8) return 'critical';
  if (score >= 6) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

export async function GET() {
  try {
    const quakeRes = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
      { next: { revalidate: 60 } }
    );
    const quakeData = await quakeRes.json();

    const events = (quakeData.features || []).map((quake: any) => ({
      id: `quake-${quake.id}`,
      title: `Magnitude ${quake.properties.mag} Earthquake`,
      description: quake.properties.place || 'Seismic event detected',
      category: 'disaster',
      severity: calculateSeverity(quake.properties.mag || 4),
      location: {
        lat: quake.geometry?.coordinates?.[1] || 0,
        lng: quake.geometry?.coordinates?.[0] || 0,
        label: quake.properties.place || 'Unknown',
      },
      timestamp: new Date(quake.properties.time).toISOString(),
      lastUpdated: new Date(quake.properties.updated).toISOString(),
      sources: ['USGS Earthquake Hazards Program'],
      affectedMarkets: [{ symbol: 'GC=F', name: 'Gold', category: 'commodity', impact: 'volatile' }],
      status: 'active',
      tags: ['earthquake', 'seismic', 'USGS'],
    }));

    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}
