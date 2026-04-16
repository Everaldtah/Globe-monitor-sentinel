import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const newsRes = await fetch(
      'https://newsapi.org/v2/everything?q=geopolitical+OR+conflict+OR+war+OR+crisis&language=en&sortBy=publishedAt&pageSize=10&apiKey=demo',
      { next: { revalidate: 120 } }
    );
    const newsData = await newsRes.json();

    const newsItems = (newsData.articles || []).map((article: any, idx: number) => ({
      id: `news-${idx}`,
      title: article.title,
      source: article.source?.name || 'News',
      url: article.url,
      publishedAt: article.publishedAt,
      sentiment: 'neutral',
    }));

    return NextResponse.json(newsItems);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}
