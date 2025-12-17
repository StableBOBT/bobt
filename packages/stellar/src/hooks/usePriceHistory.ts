// Hook for price history with local caching
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBOBTClient } from '../client';

export interface PricePoint {
  time: string;
  timestamp: number;
  price: number;
  ask: number;
  bid: number;
}

export interface UsePriceHistoryReturn {
  history: PricePoint[];
  currentPrice: number | null;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'bobt_price_history';
const MAX_HISTORY_POINTS = 288; // 24 hours at 5-minute intervals

function loadFromStorage(): PricePoint[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // Filter out points older than 24 hours
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return data.filter((p: PricePoint) => p.timestamp > cutoff);
    }
  } catch {
    // Ignore storage errors
  }
  return [];
}

function saveToStorage(history: PricePoint[]) {
  if (typeof window === 'undefined') return;
  try {
    // Keep only last 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = history.filter(p => p.timestamp > cutoff).slice(-MAX_HISTORY_POINTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // Ignore storage errors
  }
}

export function usePriceHistory(): UsePriceHistoryReturn {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = useCallback(async () => {
    try {
      const client = getBOBTClient();
      const priceDetails = await client.getOraclePriceDetails();

      if (priceDetails && priceDetails.isValid) {
        const now = Date.now();
        const newPoint: PricePoint = {
          time: new Date(now).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          timestamp: now,
          price: priceDetails.mid,
          ask: priceDetails.ask,
          bid: priceDetails.bid,
        };

        setCurrentPrice(priceDetails.mid);

        setHistory(prev => {
          // Only add new point if at least 5 minutes since last one
          const lastPoint = prev[prev.length - 1];
          if (lastPoint && now - lastPoint.timestamp < 5 * 60 * 1000) {
            // Update the last point instead
            const updated = [...prev.slice(0, -1), newPoint];
            saveToStorage(updated);
            return updated;
          }

          const updated = [...prev, newPoint].slice(-MAX_HISTORY_POINTS);
          saveToStorage(updated);
          return updated;
        });

        setError(null);
      } else {
        setError('Oracle price is stale');
      }
    } catch (err) {
      console.error('Failed to fetch price:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load history from storage on mount
    const stored = loadFromStorage();
    if (stored.length > 0) {
      setHistory(stored);
      const lastPoint = stored[stored.length - 1];
      if (lastPoint) {
        setCurrentPrice(lastPoint.price);
      }
      setIsLoading(false);
    }

    // Initial fetch
    fetchPrice();

    // Fetch every 30 seconds
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  return {
    history,
    currentPrice,
    isLoading,
    error,
  };
}
