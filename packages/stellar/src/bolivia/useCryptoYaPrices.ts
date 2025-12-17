// CriptoYa Prices Hook
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ExchangePrices, CryptoYaPrice } from './types';

export interface UseCryptoYaPricesReturn {
  prices: ExchangePrices | null;
  bestBuy: { exchange: string; price: number } | null;
  bestSell: { exchange: string; price: number } | null;
  spread: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

interface ExchangePriceData {
  ask: number;
  bid: number;
  time: number;
}

interface ApiResponse {
  success: boolean;
  data: {
    prices: Record<string, ExchangePriceData | null>;
    bestBuy: { exchange: string; price: number } | null;
    timestamp: number;
  };
}

export function useCryptoYaPrices(refreshInterval = 30000): UseCryptoYaPricesReturn {
  const [prices, setPrices] = useState<ExchangePrices | null>(null);
  const [bestBuy, setBestBuy] = useState<{ exchange: string; price: number } | null>(null);
  const [bestSell, setBestSell] = useState<{ exchange: string; price: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Get API URL from environment or default to localhost
  const apiUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_RAMP_API_URL || 'http://localhost:3002')
    : 'http://localhost:3002';

  const fetchPrices = useCallback(async () => {
    try {
      setError(null);

      const response = await fetch(`${apiUrl}/api/prices/exchanges`);
      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }

      const data: ApiResponse = await response.json();
      if (!data.success) {
        throw new Error('API returned error');
      }

      // Convert API response to ExchangePrices format
      const exchangePrices: ExchangePrices = {
        binance: data.data.prices.binance ? {
          ask: data.data.prices.binance.ask,
          bid: data.data.prices.binance.bid,
          time: data.data.prices.binance.time,
        } : null,
        bybit: data.data.prices.bybit ? {
          ask: data.data.prices.bybit.ask,
          bid: data.data.prices.bybit.bid,
          time: data.data.prices.bybit.time,
        } : null,
        bitget: data.data.prices.bitget ? {
          ask: data.data.prices.bitget.ask,
          bid: data.data.prices.bitget.bid,
          time: data.data.prices.bitget.time,
        } : null,
        average: null,
      };

      // Calculate average
      const validPrices = [exchangePrices.binance, exchangePrices.bybit, exchangePrices.bitget]
        .filter((p): p is CryptoYaPrice => p !== null);

      if (validPrices.length > 0) {
        const sumAsk = validPrices.reduce((sum, p) => sum + p.ask, 0);
        const sumBid = validPrices.reduce((sum, p) => sum + p.bid, 0);
        exchangePrices.average = {
          ask: sumAsk / validPrices.length,
          bid: sumBid / validPrices.length,
        };
      }

      setPrices(exchangePrices);
      setBestBuy(data.data.bestBuy);

      // Calculate best sell (highest bid)
      let bestSellResult: { exchange: string; price: number } | null = null;
      for (const [exchange, priceData] of Object.entries(data.data.prices)) {
        if (priceData && (!bestSellResult || priceData.bid > bestSellResult.price)) {
          bestSellResult = { exchange, price: priceData.bid };
        }
      }
      setBestSell(bestSellResult);

      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch prices';
      setError(message);
      console.error('Price fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  // Initial fetch
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPrices, refreshInterval]);

  // Calculate spread
  const spread = bestBuy && bestSell
    ? ((bestBuy.price - bestSell.price) / bestSell.price) * 100
    : null;

  return {
    prices,
    bestBuy,
    bestSell,
    spread,
    isLoading,
    error,
    refetch: fetchPrices,
    lastUpdated,
  };
}
