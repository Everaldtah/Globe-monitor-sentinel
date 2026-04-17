import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    return NextResponse.json([]);
  }

  try {
    const newsRes = await fetch(
      `https://newsapi.org/v2/everything?q=geopolitical+OR+conflict+OR+war+OR+crisis&language=en&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`,
      { next: { revalidate: 120 } }
    );
    const newsData = await newsRes.json();

    const newsItems = (newsData.articles || []).map((article: any, idx: number) => ({
      id: `news-${idx}`,
      title: article.title,
      source: article.source?.name || 'News',
      url: article.url,
      publishedAt: article.publishedAt,
      sentiment: 'neutral' as const,
    }));

    return NextResponse.json(newsItems);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}
