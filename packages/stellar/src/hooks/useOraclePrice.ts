// Oracle Price Hook
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBOBTClient } from '../client';
import { fromStroops, BOBT_DECIMALS } from '../config';
import type { OraclePrice } from '../types';

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
}

export function useOraclePrice(refreshInterval = 30000): UseOraclePriceReturn {
  const [price, setPrice] = useState<OraclePrice | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPrice = useCallback(async () => {
    try {
      setError(null);
      const client = getBOBTClient();

      const [priceData, valid] = await Promise.all([
        client.getOraclePrice(),
        client.isPriceValid(),
      ]);

      setPrice(priceData);
      setIsValid(valid);
      setLastUpdated(new Date());
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
  };
}
