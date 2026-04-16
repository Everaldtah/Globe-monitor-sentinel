import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current=temperature_2m,precipitation,cloud_cover,wind_speed_10m&timezone=UTC', { cache: 'no-store' });
    const data = await response.json();
    return NextResponse.json([{
      lat: 0,
      lng: 0,
      cloudiness: Number(data.current?.cloud_cover ?? 50),
      temperatureC: Number(data.current?.temperature_2m ?? 0),
      windSpeed: Number(data.current?.wind_speed_10m ?? 0),
      precipitationMm: Number(data.current?.precipitation ?? 0),
    }]);
  } catch {
    return NextResponse.json([]);
  }
}
