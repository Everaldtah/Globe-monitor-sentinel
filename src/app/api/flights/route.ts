import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://opensky-network.org/api/states/all', { cache: 'no-store' });
    const data = await response.json();
    const flights = (data.states || []).slice(0, 24).map((state: any, idx: number) => ({
      id: `flight-${idx}-${state[0] || idx}`,
      callsign: String(state[1] || '').trim(),
      lat: Number(state[6] || 0),
      lng: Number(state[5] || 0),
      altitude: Number(state[7] || 0),
      heading: Number(state[10] || 0),
      speed: Number(state[9] || 0),
      category: 'aircraft',
    })).filter((item: any) => item.lat && item.lng);
    return NextResponse.json(flights);
  } catch {
    return NextResponse.json([]);
  }
}
