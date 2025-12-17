import { NextResponse } from 'next/server';

// Cache for CryptoYa prices
let priceCache: {
  data: Record<string, { ask: number; bid: number; time: number } | null>;
  bestBuy: { exchange: string; price: number } | null;
  timestamp: number;
} | null = null;

const PRICE_CACHE_TTL_MS = 60000; // 60 seconds

export async function GET() {
  try {
    const now = Date.now();

    // Return cached data if still valid
    if (priceCache && (now - priceCache.timestamp) < PRICE_CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        data: {
          prices: priceCache.data,
          bestBuy: priceCache.bestBuy,
          timestamp: priceCache.timestamp,
          cached: true,
        },
      });
    }

    // Fetch from CryptoYa API
    const response = await fetch('https://criptoya.com/api/usdt/bob', {
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      // If rate limited but we have stale cache, return it
      if (response.status === 429 && priceCache) {
        return NextResponse.json({
          success: true,
          data: {
            prices: priceCache.data,
            bestBuy: priceCache.bestBuy,
            timestamp: priceCache.timestamp,
            cached: true,
            stale: true,
          },
        });
      }
      throw new Error(`CryptoYa API error: ${response.status}`);
    }

    const data = await response.json() as Record<string, {
      ask?: number;
      bid?: number;
      totalAsk?: number;
      totalBid?: number;
      time?: number
    }>;

    // Map exchange names
    const results: Record<string, { ask: number; bid: number; time: number } | null> = {
      binance: data.binancep2p ? {
        ask: data.binancep2p.ask || data.binancep2p.totalAsk || 0,
        bid: data.binancep2p.bid || data.binancep2p.totalBid || 0,
        time: data.binancep2p.time || Date.now() / 1000,
      } : null,
      bybit: data.bybitp2p ? {
        ask: data.bybitp2p.ask || data.bybitp2p.totalAsk || 0,
        bid: data.bybitp2p.bid || data.bybitp2p.totalBid || 0,
        time: data.bybitp2p.time || Date.now() / 1000,
      } : null,
      bitget: data.bitgetp2p ? {
        ask: data.bitgetp2p.ask || data.bitgetp2p.totalAsk || 0,
        bid: data.bitgetp2p.bid || data.bitgetp2p.totalBid || 0,
        time: data.bitgetp2p.time || Date.now() / 1000,
      } : null,
    };

    // Calculate best buy (lowest ask)
    let bestBuy: { exchange: string; price: number } | null = null;
    for (const [exchange, priceData] of Object.entries(results)) {
      if (priceData && priceData.ask > 0 && (!bestBuy || priceData.ask < bestBuy.price)) {
        bestBuy = { exchange, price: priceData.ask };
      }
    }

    // Update cache
    priceCache = {
      data: results,
      bestBuy,
      timestamp: now,
    };

    return NextResponse.json({
      success: true,
      data: {
        prices: results,
        bestBuy,
        timestamp: now,
        cached: false,
      },
    });
  } catch (error) {
    console.error('Error fetching exchange prices:', error);

    // If we have any cache, return it on error
    if (priceCache) {
      return NextResponse.json({
        success: true,
        data: {
          prices: priceCache.data,
          bestBuy: priceCache.bestBuy,
          timestamp: priceCache.timestamp,
          cached: true,
          stale: true,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get exchange prices' },
      { status: 500 }
    );
  }
}
