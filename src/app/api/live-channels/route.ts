import { NextResponse } from 'next/server';

function extractVideoLinks(html: string) {
  const matches = [...html.matchAll(/"videoId":"([^"]+)".*?"title":\{"runs":\[{"text":"([^"]+)"\]\}/g)];
  return matches.slice(0, 3).map((m) => ({
    platform: 'youtube',
    title: m[2],
    url: `https://www.youtube.com/watch?v=${m[1]}`,
    source: 'YouTube search',
  }));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const label = url.searchParams.get('label') || 'geopolitical situation';
  try {
    const response = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${label} live news OR live coverage OR breaking news`)}`, { cache: 'no-store' });
    const html = await response.text();
    return NextResponse.json(extractVideoLinks(html));
  } catch {
    return NextResponse.json([]);
  }
}
