import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cryptoRes = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true',
      { next: { revalidate: 30 } }
    );
    const cryptoData = await cryptoRes.json();

    const forexRes = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,CHF',
      { next: { revalidate: 60 } }
    );
    const forexData = await forexRes.json();

    const markets = [
      { symbol: 'BTC', name: 'Bitcoin', price: cryptoData.bitcoin?.usd || 0, change: cryptoData.bitcoin?.usd_24h_change || 0, changePercent: cryptoData.bitcoin?.usd_24h_change || 0, type: 'crypto' },
      { symbol: 'ETH', name: 'Ethereum', price: cryptoData.ethereum?.usd || 0, change: cryptoData.ethereum?.usd_24h_change || 0, changePercent: cryptoData.ethereum?.usd_24h_change || 0, type: 'crypto' },
      { symbol: 'EURUSD', name: 'EUR/USD', price: forexData.rates?.EUR || 0, change: 0, changePercent: 0, type: 'forex' },
      { symbol: 'GBPUSD', name: 'GBP/USD', price: forexData.rates?.GBP || 0, change: 0, changePercent: 0, type: 'forex' },
      { symbol: 'USDJPY', name: 'USD/JPY', price: forexData.rates?.JPY || 0, change: 0, changePercent: 0, type: 'forex' },
    ];

    return NextResponse.json(markets);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}
