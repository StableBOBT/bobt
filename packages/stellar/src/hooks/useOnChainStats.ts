// Hook for on-chain statistics
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBOBTClient } from '../client';
import { fromStroops } from '../config';

export interface OnChainStats {
  totalSupply: number;
  dailyVolume: number;
  oracleUpdates: number;
  numSources: number;
  lastPriceUpdate: number;
  dailyMinted: number;
  dailyBurned: number;
}

export interface UseOnChainStatsReturn {
  stats: OnChainStats | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useOnChainStats(): UseOnChainStatsReturn {
  const [stats, setStats] = useState<OnChainStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const client = getBOBTClient();

      // Fetch all data in parallel
      const [totalSupplyRaw, priceDetails, rateLimits] = await Promise.all([
        client.getTotalSupply(),
        client.getOraclePriceDetails(),
        client.getTreasuryRateLimits(),
      ]);

      // Convert from stroops (7 decimals)
      const totalSupply = fromStroops(totalSupplyRaw);

      // Calculate daily volume from minted + burned
      const dailyMinted = rateLimits ? fromStroops(rateLimits.dailyMinted) : 0;
      const dailyBurned = rateLimits ? fromStroops(rateLimits.dailyBurned) : 0;
      const dailyVolume = dailyMinted + dailyBurned;

      setStats({
        totalSupply,
        dailyVolume,
        oracleUpdates: priceDetails?.numSources || 0,
        numSources: priceDetails?.numSources || 0,
        lastPriceUpdate: priceDetails?.timestamp || 0,
        dailyMinted,
        dailyBurned,
      });
    } catch (err) {
      console.error('Failed to fetch on-chain stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  };
}
