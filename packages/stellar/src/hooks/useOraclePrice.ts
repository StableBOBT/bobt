// Oracle Price Hook
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBOBTClient } from '../client';
import { fromStroops, BOBT_DECIMALS, toStroops } from '../config';
import type { OraclePrice } from '../types';

// Ramp service URL for fallback price fetching
const RAMP_SERVICE_URL = process.env.NEXT_PUBLIC_RAMP_API_URL || 'http://localhost:3002';

export interface UseOraclePriceReturn {
  price: OraclePrice | null;
  midPrice: number;
  askPrice: number;
  bidPrice: number;
  spreadPercent: number;
  isValid: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
  source: 'contract' | 'api' | null;
}

// Fetch prices from ramp-service API (CriptoYa)
async function fetchApiPrice(): Promise<{ ask: number; bid: number; mid: number } | null> {
  try {
    const response = await fetch(`${RAMP_SERVICE_URL}/api/prices/exchanges`);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.success || !data.data.bestBuy) return null;

    // Use best prices from exchanges
    const prices = data.data.prices;
    let totalAsk = 0, totalBid = 0, count = 0;

    for (const exchange of Object.values(prices) as Array<{ ask: number; bid: number } | null>) {
      if (exchange && exchange.ask > 0 && exchange.bid > 0) {
        totalAsk += exchange.ask;
        totalBid += exchange.bid;
        count++;
      }
    }

    if (count === 0) return null;

    const avgAsk = totalAsk / count;
    const avgBid = totalBid / count;

    return {
      ask: avgAsk,
      bid: avgBid,
      mid: (avgAsk + avgBid) / 2,
    };
  } catch {
    return null;
  }
}

export function useOraclePrice(refreshInterval = 30000): UseOraclePriceReturn {
  const [price, setPrice] = useState<OraclePrice | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [source, setSource] = useState<'contract' | 'api' | null>(null);

  const fetchPrice = useCallback(async () => {
    try {
      setError(null);

      // Try on-chain oracle first
      try {
        const client = getBOBTClient();
        const [priceData, valid] = await Promise.all([
          client.getOraclePrice(),
          client.isPriceValid(),
        ]);

        // Check if on-chain price is valid and non-zero
        if (valid && priceData && Number(priceData.mid) > 0) {
          setPrice(priceData);
          setIsValid(true);
          setSource('contract');
          setLastUpdated(new Date());
          return;
        }
      } catch {
        // On-chain oracle failed, try API fallback
      }

      // Fallback to ramp-service API
      const apiPrice = await fetchApiPrice();
      if (apiPrice) {
        // Convert to OraclePrice format (stroops)
        const oraclePrice: OraclePrice = {
          ask: toStroops(apiPrice.ask, BOBT_DECIMALS),
          bid: toStroops(apiPrice.bid, BOBT_DECIMALS),
          mid: toStroops(apiPrice.mid, BOBT_DECIMALS),
          spreadBps: BigInt(Math.round((apiPrice.ask - apiPrice.bid) / apiPrice.mid * 10000)),
          timestamp: Math.floor(Date.now() / 1000),
          numSources: 3,
          ledger: 0,
        };
        setPrice(oraclePrice);
        setIsValid(true);
        setSource('api');
        setLastUpdated(new Date());
        return;
      }

      // Both sources failed
      setIsValid(false);
      setError('No price sources available');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch price';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(fetchPrice, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPrice, refreshInterval]);

  // Computed values
  const midPrice = price ? fromStroops(price.mid, BOBT_DECIMALS) : 0;
  const askPrice = price ? fromStroops(price.ask, BOBT_DECIMALS) : 0;
  const bidPrice = price ? fromStroops(price.bid, BOBT_DECIMALS) : 0;
  const spreadPercent = price ? Number(price.spreadBps) / 100 : 0;

  return {
    price,
    midPrice,
    askPrice,
    bidPrice,
    spreadPercent,
    isValid,
    isLoading,
    error,
    refetch: fetchPrice,
    lastUpdated,
    source,
  };
}
