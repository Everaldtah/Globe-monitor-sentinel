import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.AISSTREAM_API_KEY;
  if (!key) return NextResponse.json([]);
  try {
    const response = await fetch('https://api.aisstream.io/v1/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: key },
      body: JSON.stringify({ subscriptionType: 'LastKnownPosition' }),
      cache: 'no-store',
    });
    const text = await response.text();
    const vessels = text.split('\n').filter(Boolean).slice(0, 20).map((line, idx) => {
      const msg = JSON.parse(line);
      const meta = msg.MetaData || {};
      return {
        id: `vessel-${idx}-${meta.MMSI || idx}`,
        name: meta.ShipName || '',
        mmsi: meta.MMSI ? String(meta.MMSI) : undefined,
        lat: Number(meta.latitude || 0),
        lng: Number(meta.longitude || 0),
        sog: Number(msg.Message?.PositionReport?.Sog || 0),
        cog: Number(msg.Message?.PositionReport?.Cog || 0),
        category: 'vessel',
      };
    }).filter((item) => item.lat && item.lng);
    return NextResponse.json(vessels);
  } catch {
    return NextResponse.json([]);
  }
}
